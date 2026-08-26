package worker

import (
	"fmt"
	"log"
	"time"

	"github.com/anivora/server/internal/config"
	"github.com/anivora/server/internal/model"
	"github.com/anivora/server/internal/provider"
	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

type WorkerService struct {
	db      *gorm.DB
	cfg     *config.Config
	anichin *provider.AnichinAdapter
	cron    *cron.Cron
}

func NewWorkerService(db *gorm.DB, cfg *config.Config) *WorkerService {
	return &WorkerService{
		db:      db,
		cfg:     cfg,
		anichin: provider.NewAnichinAdapter(""),
		cron:    cron.New(cron.WithSeconds()),
	}
}

func (w *WorkerService) Start() {
	log.Println("[Worker] Starting In-Process Ingestion Scheduler...")

	// 1. Run initial sync in background goroutine
	go func() {
		time.Sleep(2 * time.Second)
		log.Println("[Worker] Running initial catalog sync...")
		w.SyncLatest()

		// Run deep sync in background to fetch older donghua
		log.Println("[Worker] Running DeepSync...")
		w.DeepSync()
	}()

	// 2. Schedule periodic cron job (every N minutes)
	cronExpr := fmt.Sprintf("0 */%d * * * *", w.cfg.SyncIntervalMinutes)
	_, err := w.cron.AddFunc(cronExpr, func() {
		log.Println("[Worker] Triggering scheduled catalog sync...")
		w.SyncLatest()
	})
	if err != nil {
		log.Printf("[Worker] Failed to schedule cron: %v", err)
	} else {
		w.cron.Start()
		log.Printf("[Worker] Cron scheduled every %d minutes", w.cfg.SyncIntervalMinutes)
	}
}

func (w *WorkerService) Stop() {
	if w.cron != nil {
		w.cron.Stop()
	}
}

func (w *WorkerService) DeepSync() {
	// Scrape page 2 to 15 for backfilling old donghua
	for page := 2; page <= 15; page++ {
		log.Printf("[Worker] DeepSyncing page %d...", page)
		w.SyncPage(page)
		time.Sleep(5 * time.Second) // rate limit protection
	}
	log.Println("[Worker] DeepSync completed.")
}

func (w *WorkerService) SyncLatest() {
	w.SyncPage(1)
}

func (w *WorkerService) SyncPage(page int) {
	items, err := w.anichin.FetchLatest(page)
	if err != nil {
		log.Printf("[Worker] Failed to fetch latest from Anichin page %d: %v", page, err)
		return
	}

	log.Printf("[Worker] Scraped %d latest items from Anichin page %d. Ingesting to DB...", len(items), page)

	for _, item := range items {
		// 1. Find or create Content
		var content model.Content
		err := w.db.Where("slug = ?", item.Slug).First(&content).Error
		if err != nil {
			// Try to fetch full details using the derived series URL
			seriesUrl := fmt.Sprintf("%s/anime/%s/", w.anichin.BaseUrl, item.Slug)
			detail, detailErr := w.anichin.FetchDetail(seriesUrl)
			
			// Create new content
			content = model.Content{
				Slug:        item.Slug,
				Title:       item.Title,
				PosterUrl:   item.ThumbnailUrl,
				BannerUrl:   item.ThumbnailUrl, // Fallback
				ContentType: item.ContentType,
				Status:      model.ContentStatusOngoing,
				IsPopular:   true,
				SourceUrl:   seriesUrl,
			}

			var genres []model.Genre
			if detailErr == nil && detail != nil {
				if detail.Title != "" {
					content.Title = detail.Title
				}
				if detail.PosterUrl != "" {
					content.PosterUrl = detail.PosterUrl
				}
				content.Synopsis = detail.Synopsis
				content.Status = detail.Status
				content.Rating = detail.Rating

				// Process Genres
				for _, gName := range detail.Genres {
					var g model.Genre
					gSlug := model.ToSlug(gName)
					if err := w.db.Where("slug = ?", gSlug).FirstOrCreate(&g, model.Genre{Name: gName, Slug: gSlug}).Error; err == nil {
						genres = append(genres, g)
					}
				}
			}

			if err := w.db.Create(&content).Error; err != nil {
				log.Printf("[Worker] Failed to create content %s: %v", item.Title, err)
				continue
			}

			// Associate Genres
			if len(genres) > 0 {
				w.db.Model(&content).Association("Genres").Append(genres)
			}

			// Ingest all episodes from detail
			if detailErr == nil && detail != nil {
				for _, epData := range detail.Episodes {
					var existing model.Episode
					if err := w.db.Where("content_id = ? AND episode_number = ?", content.ID, epData.EpisodeNumber).First(&existing).Error; err != nil {
						epModel := model.Episode{
							ContentID:     content.ID,
							EpisodeNumber: epData.EpisodeNumber,
							Title:         epData.Title,
							ThumbnailUrl:  content.PosterUrl, // Detail page doesn't have individual episode thumbnails
							SourceUrl:     epData.EpisodeUrl,
						}
						if epModel.Title == "" {
							epModel.Title = fmt.Sprintf("Episode %d", epData.EpisodeNumber)
						}
						w.db.Create(&epModel)
						go w.ingestEpisodeStream(epModel.ID, epModel.SourceUrl)
					}
				}
			}
		} else {
			// Existing content: Check if we missed older episodes
			var epCount int64
			w.db.Model(&model.Episode{}).Where("content_id = ?", content.ID).Count(&epCount)

			// If the latest episode number is greater than the number of episodes we have, fetch missing ones
			if int64(item.EpisodeNumber) > epCount {
				log.Printf("[Worker] Content %s has %d episodes in DB, but latest is %d. Fetching missing episodes...", content.Title, epCount, item.EpisodeNumber)
				seriesUrl := fmt.Sprintf("%s/anime/%s/", w.anichin.BaseUrl, item.Slug)
				detail, detailErr := w.anichin.FetchDetail(seriesUrl)
				if detailErr == nil && detail != nil {
					for _, epData := range detail.Episodes {
						var existingEp model.Episode
						if err := w.db.Where("content_id = ? AND episode_number = ?", content.ID, epData.EpisodeNumber).First(&existingEp).Error; err != nil {
							epModel := model.Episode{
								ContentID:     content.ID,
								EpisodeNumber: epData.EpisodeNumber,
								Title:         epData.Title,
								ThumbnailUrl:  content.PosterUrl,
								SourceUrl:     epData.EpisodeUrl,
							}
							if epModel.Title == "" {
								epModel.Title = fmt.Sprintf("Episode %d", epData.EpisodeNumber)
							}
							w.db.Create(&epModel)
							go w.ingestEpisodeStream(epModel.ID, epModel.SourceUrl)
						}
					}
				}
			}
		}

		// 2. Find or create Episode
		var episode model.Episode
		err = w.db.Where("content_id = ? AND episode_number = ?", content.ID, item.EpisodeNumber).First(&episode).Error
		if err != nil {
			episode = model.Episode{
				ContentID:     content.ID,
				EpisodeNumber: item.EpisodeNumber,
				Title:         fmt.Sprintf("Episode %d", item.EpisodeNumber),
				ThumbnailUrl:  item.ThumbnailUrl,
				SourceUrl:     item.EpisodeUrl,
			}
			if err := w.db.Create(&episode).Error; err != nil {
				log.Printf("[Worker] Failed to create episode %d for %s: %v", item.EpisodeNumber, content.Title, err)
				continue
			}

			// 3. Scrape stream embeds for this episode in background
			go w.ingestEpisodeStream(episode.ID, item.EpisodeUrl)
		}
	}

	log.Printf("[Worker] Catalog sync for page %d completed.", page)
}

func (w *WorkerService) ingestEpisodeStream(episodeId, epUrl string) {
	sources, err := w.anichin.FetchEpisodeEmbeds(epUrl)
	if err != nil {
		log.Printf("[Worker] Failed to fetch stream embeds for episode %s: %v", episodeId, err)
		return
	}

	for _, src := range sources {
		var existing model.StreamSource
		err := w.db.Where("episode_id = ? AND stream_url = ?", episodeId, src.StreamUrl).First(&existing).Error
		if err != nil {
			stream := model.StreamSource{
				EpisodeID:  episodeId,
				ProviderID: "provider-anichin",
				ServerName: src.ServerName,
				Quality:    src.Quality,
				StreamUrl:  src.StreamUrl,
			}
			_ = w.db.Create(&stream).Error
		}
	}
}

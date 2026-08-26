package service

import (
	"errors"
	"time"

	"github.com/anivora/server/internal/model"
	"github.com/anivora/server/internal/provider"
	"github.com/anivora/server/internal/resolver"
	"gorm.io/gorm"
)

type PlaybackService struct {
	db      *gorm.DB
	anichin *provider.AnichinAdapter
}

func NewPlaybackService(db *gorm.DB) *PlaybackService {
	return &PlaybackService{
		db:      db,
		anichin: provider.NewAnichinAdapter(""),
	}
}

type PlaybackResponse struct {
	EpisodeID             string                    `json:"episodeId"`
	ContentID             string                    `json:"contentId"`
	ContentTitle          string                    `json:"contentTitle"`
	EpisodeNumber         int                       `json:"episodeNumber"`
	Title                 string                    `json:"title"`
	SelectedSource        resolver.ResolvedStream   `json:"selectedSource"`
	AlternativeSources    []resolver.ResolvedStream `json:"alternativeSources"`
	ResumePositionSeconds int                       `json:"resumePositionSeconds"`
}

func (s *PlaybackService) ResolveEpisode(episodeId string) (*PlaybackResponse, error) {
	var episode model.Episode
	if err := s.db.Preload("StreamSources").First(&episode, "id = ?", episodeId).Error; err != nil {
		return nil, errors.New("episode not found")
	}

	var content model.Content
	s.db.First(&content, "id = ?", episode.ContentID)

	// If no stream sources stored in DB, scrape them on the fly
	if len(episode.StreamSources) == 0 && episode.SourceUrl != "" {
		scraped, err := s.anichin.FetchEpisodeEmbeds(episode.SourceUrl)
		if err == nil {
			for _, src := range scraped {
				st := model.StreamSource{
					EpisodeID:  episode.ID,
					ProviderID: "provider-anichin",
					ServerName: src.ServerName,
					Quality:    src.Quality,
					StreamUrl:  src.StreamUrl,
				}
				s.db.Create(&st)
				episode.StreamSources = append(episode.StreamSources, st)
			}
		}
	}

	if len(episode.StreamSources) == 0 {
		return nil, errors.New("no playback stream sources available for this episode")
	}

	var resolvedSources []resolver.ResolvedStream
	for _, src := range episode.StreamSources {
		res := resolver.Resolve(src.StreamUrl, src.ServerName, src.Quality)
		if res.StreamUrl != "" {
			resolvedSources = append(resolvedSources, res)
		}
	}

	if len(resolvedSources) == 0 {
		return nil, errors.New("failed to resolve any playable video stream")
	}

	// Priority: choose first HLS direct stream if available, otherwise first stream
	selected := resolvedSources[0]
	for _, r := range resolvedSources {
		if r.IsHLS {
			selected = r
			break
		}
	}

	var alternatives []resolver.ResolvedStream
	for _, r := range resolvedSources {
		if r.StreamUrl != selected.StreamUrl {
			alternatives = append(alternatives, r)
		}
	}

	// Fetch watch history resume position
	resumePos := 0
	var history model.WatchHistory
	res := s.db.Where("episode_id = ?", episodeId).Order("last_watched_at DESC").Limit(1).Find(&history)
	if res.Error == nil && res.RowsAffected > 0 {
		resumePos = history.PositionSeconds
	}

	return &PlaybackResponse{
		EpisodeID:             episode.ID,
		ContentID:             content.ID,
		ContentTitle:          content.Title,
		EpisodeNumber:         episode.EpisodeNumber,
		Title:                 episode.Title,
		SelectedSource:        selected,
		AlternativeSources:    alternatives,
		ResumePositionSeconds: resumePos,
	}, nil
}

func (s *PlaybackService) SyncProgress(episodeId, contentId string, pos, duration int, completed bool) error {
	var history model.WatchHistory
	res := s.db.Where("episode_id = ?", episodeId).Limit(1).Find(&history)
	
	if res.Error != nil {
		return res.Error
	}
	
	if res.RowsAffected == 0 {
		history = model.WatchHistory{
			ContentID:       contentId,
			EpisodeID:       episodeId,
			PositionSeconds: pos,
			DurationSeconds: duration,
			IsCompleted:     completed,
			LastWatchedAt:   time.Now(),
		}
		return s.db.Create(&history).Error
	}

	history.PositionSeconds = pos
	history.DurationSeconds = duration
	history.IsCompleted = completed
	history.LastWatchedAt = time.Now()
	return s.db.Save(&history).Error
}

func (s *PlaybackService) GetHistory() ([]model.WatchHistory, error) {
	var history []model.WatchHistory
	err := s.db.Preload("Content").Preload("Episode").Order("last_watched_at DESC").Limit(20).Find(&history).Error
	return history, err
}

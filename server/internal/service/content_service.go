package service

import (
	"strings"

	"github.com/anivora/server/internal/model"
	"gorm.io/gorm"
)

type ContentService struct {
	db *gorm.DB
}

func NewContentService(db *gorm.DB) *ContentService {
	return &ContentService{db: db}
}

type HomeFeedResponse struct {
	Hero            []model.Content `json:"hero"`
	PopularDonghua  []model.Content `json:"popularDonghua"`
	LatestEpisodes  []LatestEpisode `json:"latestEpisodes"`
	AllContent      []model.Content `json:"allContent"`
}

type LatestEpisode struct {
	ID            string    `json:"id"`
	ContentID     string    `json:"contentId"`
	ContentTitle  string    `json:"contentTitle"`
	ContentSlug   string    `json:"contentSlug"`
	EpisodeNumber int       `json:"episodeNumber"`
	Title         string    `json:"title"`
	ThumbnailUrl  string    `json:"thumbnailUrl"`
	PosterUrl     string    `json:"posterUrl"`
}

func (s *ContentService) GetHomeFeed() (*HomeFeedResponse, error) {
	var hero []model.Content
	var popularDonghua []model.Content
	var allContent []model.Content

	// Hero banner (Top rated / popular)
	s.db.Preload("Genres").Order("rating DESC, updated_at DESC").Limit(5).Find(&hero)

	// Popular Donghua
	s.db.Preload("Genres").Where("content_type = ?", model.ContentTypeDonghua).Order("rating DESC, updated_at DESC").Limit(15).Find(&popularDonghua)

	// All content
	s.db.Preload("Genres").Order("created_at DESC").Limit(50).Find(&allContent)

	// Latest Episodes — satu episode terbaru (nomor tertinggi) per konten,
	// diurutkan berdasarkan created_at DESC konten terbaru.
	// Dua langkah: (1) ambil episode_id per konten, (2) fetch detail tiap episode.
	type latestEpRow struct {
		EpisodeID string `db:"episode_id"`
	}
	var latestRows []latestEpRow
	s.db.Raw(`
		SELECT e.id AS episode_id
		FROM episodes e
		INNER JOIN (
			SELECT content_id, MAX(episode_number) AS max_ep
			FROM episodes
			GROUP BY content_id
		) g ON e.content_id = g.content_id AND e.episode_number = g.max_ep
		ORDER BY e.created_at DESC
		LIMIT 20
	`).Scan(&latestRows)

	var latestEps []LatestEpisode
	for _, row := range latestRows {
		var ep model.Episode
		if err := s.db.First(&ep, "id = ?", row.EpisodeID).Error; err != nil {
			continue
		}
		var content model.Content
		s.db.Select("id, title, slug, poster_url").First(&content, "id = ?", ep.ContentID)
		if content.ID == "" {
			continue
		}
		latestEps = append(latestEps, LatestEpisode{
			ID:            ep.ID,
			ContentID:     ep.ContentID,
			ContentTitle:  content.Title,
			ContentSlug:   content.Slug,
			EpisodeNumber: ep.EpisodeNumber,
			Title:         ep.Title,
			ThumbnailUrl:  ep.ThumbnailUrl,
			PosterUrl:     content.PosterUrl,
		})
	}


	return &HomeFeedResponse{
		Hero:           hero,
		PopularDonghua: popularDonghua,
		LatestEpisodes: latestEps,
		AllContent:     allContent,
	}, nil
}

func (s *ContentService) GetContentDetail(slugOrId string) (*model.Content, error) {
	var content model.Content
	err := s.db.Preload("Genres").Preload("Episodes", func(db *gorm.DB) *gorm.DB {
		return db.Order("episode_number ASC")
	}).Where("id = ? OR slug = ?", slugOrId, slugOrId).First(&content).Error

	if err != nil {
		return nil, err
	}
	return &content, nil
}

func (s *ContentService) GetEpisodes(contentId string) ([]model.Episode, error) {
	var episodes []model.Episode
	err := s.db.Where("content_id = ?", contentId).Order("episode_number ASC").Find(&episodes).Error
	return episodes, err
}

func (s *ContentService) Search(query string) ([]model.Content, error) {
	var contents []model.Content
	q := "%" + strings.ToLower(query) + "%"
	err := s.db.Preload("Genres").Where("LOWER(title) LIKE ? OR LOWER(slug) LIKE ?", q, q).Limit(30).Find(&contents).Error
	return contents, err
}

func (s *ContentService) GetGenres() ([]model.Genre, error) {
	var genres []model.Genre
	err := s.db.Order("name ASC").Find(&genres).Error
	return genres, err
}

type AllDonghuaResponse struct {
	Data       []model.Content `json:"data"`
	Total      int64           `json:"total"`
	Page       int             `json:"page"`
	Limit      int             `json:"limit"`
	TotalPages int             `json:"totalPages"`
}

func (s *ContentService) GetAllDonghua(page, limit int, search string) (*AllDonghuaResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 30
	}
	offset := (page - 1) * limit

	query := s.db.Model(&model.Content{}).Where("content_type = ?", model.ContentTypeDonghua)
	if search != "" {
		q := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(slug) LIKE ?", q, q)
	}

	var total int64
	query.Count(&total)

	var contents []model.Content
	err := query.Preload("Genres").Order("rating DESC, title ASC").Limit(limit).Offset(offset).Find(&contents).Error
	if err != nil {
		return nil, err
	}

	totalPages := int(total) / limit
	if int(total)%limit != 0 {
		totalPages++
	}

	return &AllDonghuaResponse{
		Data:       contents,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

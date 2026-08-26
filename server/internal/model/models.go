package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ContentType string

const (
	ContentTypeAnime   ContentType = "ANIME"
	ContentTypeDonghua ContentType = "DONGHUA"
)

type ContentStatus string

const (
	ContentStatusOngoing   ContentStatus = "ONGOING"
	ContentStatusCompleted ContentStatus = "COMPLETED"
	ContentStatusUpcoming  ContentStatus = "UPCOMING"
)

type Content struct {
	ID            string        `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Slug          string        `gorm:"uniqueIndex;type:varchar(255);not null" json:"slug"`
	Title         string        `gorm:"index;type:varchar(255);not null" json:"title"`
	NativeTitle   string        `gorm:"type:varchar(255)" json:"nativeTitle"`
	RomajiTitle   string        `gorm:"type:varchar(255)" json:"romajiTitle"`
	Synopsis      string        `gorm:"type:text" json:"synopsis"`
	PosterUrl     string        `gorm:"type:text" json:"posterUrl"`
	BannerUrl     string        `gorm:"type:text" json:"bannerUrl"`
	ContentType   ContentType   `gorm:"type:varchar(20);index;not null" json:"contentType"`
	Status        ContentStatus `gorm:"type:varchar(20);default:'ONGOING'" json:"status"`
	ReleaseYear   int           `gorm:"index" json:"releaseYear"`
	Season        string        `gorm:"type:varchar(50)" json:"season"`
	Studio        string        `gorm:"type:varchar(100)" json:"studio"`
	Rating        float64       `gorm:"type:decimal(3,1);default:0.0" json:"rating"`
	TotalEpisodes int           `gorm:"default:0" json:"totalEpisodes"`
	IsFeatured    bool          `gorm:"default:false;index" json:"isFeatured"`
	IsPopular     bool          `gorm:"default:false;index" json:"isPopular"`
	SourceUrl     string        `gorm:"type:text" json:"sourceUrl"`
	CreatedAt     time.Time     `json:"createdAt"`
	UpdatedAt     time.Time     `json:"updatedAt"`

	Genres   []Genre   `gorm:"many2many:content_genres;" json:"genres,omitempty"`
	Episodes []Episode `gorm:"foreignKey:ContentID;constraint:OnDelete:CASCADE;" json:"episodes,omitempty"`
}

func (c *Content) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

type Genre struct {
	ID        string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Slug      string    `gorm:"uniqueIndex;type:varchar(100);not null" json:"slug"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (g *Genre) BeforeCreate(tx *gorm.DB) error {
	if g.ID == "" {
		g.ID = uuid.New().String()
	}
	return nil
}

type Episode struct {
	ID             string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ContentID      string    `gorm:"index;type:varchar(36);not null" json:"contentId"`
	EpisodeNumber  int       `gorm:"index;not null" json:"episodeNumber"`
	Title          string    `gorm:"type:varchar(255);not null" json:"title"`
	ThumbnailUrl   string    `gorm:"type:text" json:"thumbnailUrl"`
	DurationSecond int       `gorm:"default:0" json:"durationSecond"`
	AiredDate      *time.Time `json:"airedDate"`
	SourceUrl      string    `gorm:"type:text" json:"sourceUrl"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`

	StreamSources []StreamSource `gorm:"foreignKey:EpisodeID;constraint:OnDelete:CASCADE;" json:"streamSources,omitempty"`
}

func (e *Episode) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

type Provider struct {
	ID              string    `gorm:"primaryKey;type:varchar(50)" json:"id"`
	Name            string    `gorm:"type:varchar(100);not null" json:"name"`
	Slug            string    `gorm:"uniqueIndex;type:varchar(50);not null" json:"slug"`
	BaseUrl         string    `gorm:"type:varchar(255);not null" json:"baseUrl"`
	Priority        int       `gorm:"default:1" json:"priority"`
	IsActive        bool      `gorm:"default:true" json:"isActive"`
	SupportsAnime   bool      `gorm:"default:true" json:"supportsAnime"`
	SupportsDonghua bool      `gorm:"default:true" json:"supportsDonghua"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type StreamSource struct {
	ID         string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	EpisodeID  string    `gorm:"index;type:varchar(36);not null" json:"episodeId"`
	ProviderID string    `gorm:"type:varchar(50);not null" json:"providerId"`
	ServerName string    `gorm:"type:varchar(50);not null" json:"serverName"` // e.g. "Rumble", "Dailymotion", "Anichin"
	Quality    string    `gorm:"type:varchar(20);default:'720p'" json:"quality"`
	StreamUrl  string    `gorm:"type:text;not null" json:"streamUrl"` // Direct .m3u8, .mp4, or embed url
	IsHLS      bool      `gorm:"default:false" json:"isHls"`
	IsDirect   bool      `gorm:"default:false" json:"isDirect"`
	Priority   int       `gorm:"default:1" json:"priority"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func (s *StreamSource) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

type WatchHistory struct {
	ID              string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ContentID       string    `gorm:"index;type:varchar(36);not null" json:"contentId"`
	EpisodeID       string    `gorm:"index;type:varchar(36);not null" json:"episodeId"`
	PositionSeconds int       `gorm:"default:0" json:"positionSeconds"`
	DurationSeconds int       `gorm:"default:0" json:"durationSeconds"`
	IsCompleted     bool      `gorm:"default:false" json:"isCompleted"`
	LastWatchedAt   time.Time `gorm:"index" json:"lastWatchedAt"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`

	Content *Content `gorm:"foreignKey:ContentID" json:"content,omitempty"`
	Episode *Episode `gorm:"foreignKey:EpisodeID" json:"episode,omitempty"`
}

func (w *WatchHistory) BeforeCreate(tx *gorm.DB) error {
	if w.ID == "" {
		w.ID = uuid.New().String()
	}
	return nil
}

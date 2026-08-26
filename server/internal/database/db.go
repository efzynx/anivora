package database

import (
	"log"

	"github.com/anivora/server/internal/config"
	"github.com/anivora/server/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func InitDB(cfg *config.Config) *gorm.DB {
	var dialector gorm.Dialector

	if cfg.DbType == "postgres" {
		dialector = postgres.Open(cfg.DatabaseUrl)
	} else {
		// SQLite WAL mode for high concurrency
		dsn := cfg.DatabaseUrl
		if dsn == "anivora.db" || dsn == "" {
			dsn = "anivora.db"
		}
		dialector = sqlite.Open(dsn)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("[Database] Failed to connect to database: %v", err)
	}

	log.Printf("[Database] Connected successfully (%s)", cfg.DbType)

	// Auto-migrate tables
	err = db.AutoMigrate(
		&model.Genre{},
		&model.Content{},
		&model.Episode{},
		&model.Provider{},
		&model.StreamSource{},
		&model.WatchHistory{},
	)
	if err != nil {
		log.Fatalf("[Database] Failed to auto-migrate tables: %v", err)
	}

	seedInitialData(db)

	return db
}

func seedInitialData(db *gorm.DB) {
	// Seed default provider: Anichin
	var count int64
	db.Model(&model.Provider{}).Where("slug = ?", "anichin").Count(&count)
	if count == 0 {
		anichin := model.Provider{
			ID:              "provider-anichin",
			Name:            "Anichin",
			Slug:            "anichin",
			BaseUrl:         "https://anichin.link",
			Priority:        1,
			IsActive:        true,
			SupportsAnime:   false,
			SupportsDonghua: true,
		}
		db.Create(&anichin)
		log.Println("[Database] Seeded default provider: Anichin")
	}

	// Seed default genres
	defaultGenres := []string{
		"Action", "Adventure", "Comedy", "Drama", "Fantasy",
		"Martial Arts", "Mystery", "Romance", "Sci-Fi", "Cultivation",
		"Historical", "Supernatural", "Reincarnation",
	}

	for _, gName := range defaultGenres {
		var gCount int64
		slug := model.ToSlug(gName)
		db.Model(&model.Genre{}).Where("slug = ?", slug).Count(&gCount)
		if gCount == 0 {
			db.Create(&model.Genre{
				Slug: slug,
				Name: gName,
			})
		}
	}
}

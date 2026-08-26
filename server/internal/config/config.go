package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	ApiPrefix           string
	DbType              string // "sqlite" or "postgres"
	DatabaseUrl         string
	SyncIntervalMinutes int
}

func Load() *Config {
	// Load local .env first, fallback to root ../.env
	_ = godotenv.Load(".env", "../.env")

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	apiPrefix := os.Getenv("API_PREFIX")
	if apiPrefix == "" {
		apiPrefix = "/api/v1"
	}

	dbType := os.Getenv("DB_TYPE")
	if dbType == "" {
		dbType = "sqlite"
	}

	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		if dbType == "sqlite" {
			dbUrl = "anivora.db"
		} else {
			dbUrl = "host=localhost user=anivora_user password=anivora_secure_password dbname=anivora_db port=5432 sslmode=disable"
		}
	}

	syncMinutes := 15
	if s := os.Getenv("SYNC_INTERVAL_MINUTES"); s != "" {
		if val, err := strconv.Atoi(s); err == nil && val > 0 {
			syncMinutes = val
		}
	}

	return &Config{
		Port:                port,
		ApiPrefix:           apiPrefix,
		DbType:              dbType,
		DatabaseUrl:         dbUrl,
		SyncIntervalMinutes: syncMinutes,
	}
}

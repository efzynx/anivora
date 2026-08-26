package api

import (
	"time"

	"github.com/anivora/server/internal/api/handler"
	"github.com/anivora/server/internal/config"
	"github.com/anivora/server/internal/service"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRouter(db *gorm.DB, cfg *config.Config) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// CORS Setup for TV App, Web preview, and mobile clients
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	contentService := service.NewContentService(db)
	playbackService := service.NewPlaybackService(db)
	apiHandler := handler.NewApiHandler(contentService, playbackService)

	v1 := r.Group(cfg.ApiPrefix)
	{
		// Home
		v1.GET("/home", apiHandler.GetHome)

		// Contents
		v1.GET("/contents/:id", apiHandler.GetContentDetail)
		v1.GET("/contents/:id/episodes", apiHandler.GetEpisodes)

		// Search & Discovery
		v1.GET("/search", apiHandler.Search)
		v1.GET("/genres", apiHandler.GetGenres)
		v1.GET("/donghua", apiHandler.GetAllDonghua)

		// Playback & Watch History
		v1.GET("/episodes/:id/play", apiHandler.ResolvePlayback)
		v1.POST("/episodes/:id/progress", apiHandler.SyncProgress)
		v1.GET("/history", apiHandler.GetHistory)
	}

	// Health Check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "ANIVORA Backend (Go Monolith)",
			"time":    time.Now().Format(time.RFC3339),
		})
	})

	return r
}

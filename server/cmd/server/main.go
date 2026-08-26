package main

import (
	"fmt"
	"log"

	"github.com/anivora/server/internal/api"
	"github.com/anivora/server/internal/config"
	"github.com/anivora/server/internal/database"
	"github.com/anivora/server/internal/worker"
)

func main() {
	log.Println("==================================================")
	log.Println("  ANIVORA - Unified Go Backend Engine")
	log.Println("  TV-first. Lightweight. Provider-independent.")
	log.Println("==================================================")

	// 1. Load Config
	cfg := config.Load()

	// 2. Initialize Database & Migrations
	db := database.InitDB(cfg)

	// 3. Start Background Ingestion Worker (Goroutines + Cron)
	workerService := worker.NewWorkerService(db, cfg)
	workerService.Start()
	defer workerService.Stop()

	// 4. Setup HTTP Router
	router := api.SetupRouter(db, cfg)

	// 5. Start Server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[Server] ANIVORA API listening on http://localhost%s%s", addr, cfg.ApiPrefix)
	log.Printf("[Server] Health check at http://localhost%s/health", addr)

	if err := router.Run(addr); err != nil {
		log.Fatalf("[Server] Failed to run server: %v", err)
	}
}

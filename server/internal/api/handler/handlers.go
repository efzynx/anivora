package handler

import (
	"net/http"
	"strconv"

	"github.com/anivora/server/internal/service"
	"github.com/anivora/server/internal/resolver"
	"github.com/gin-gonic/gin"
)

type ApiHandler struct {
	contentService  *service.ContentService
	playbackService *service.PlaybackService
	sankaService    *service.SankaService
}

func NewApiHandler(contentService *service.ContentService, playbackService *service.PlaybackService, sankaService *service.SankaService) *ApiHandler {
	return &ApiHandler{
		contentService:  contentService,
		playbackService: playbackService,
		sankaService:    sankaService,
	}
}

func (h *ApiHandler) GetHome(c *gin.Context) {
	feed, err := h.contentService.GetHomeFeed()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, feed)
}

func (h *ApiHandler) GetContentDetail(c *gin.Context) {
	id := c.Param("id")
	content, err := h.contentService.GetContentDetail(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Content not found"})
		return
	}
	c.JSON(http.StatusOK, content)
}

func (h *ApiHandler) GetEpisodes(c *gin.Context) {
	id := c.Param("id")
	episodes, err := h.contentService.GetEpisodes(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, episodes)
}

func (h *ApiHandler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusOK, []any{})
		return
	}
	results, err := h.contentService.Search(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, results)
}

func (h *ApiHandler) GetGenres(c *gin.Context) {
	genres, err := h.contentService.GetGenres()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, genres)
}

func (h *ApiHandler) ResolvePlayback(c *gin.Context) {
	episodeId := c.Param("id")
	playback, err := h.playbackService.ResolveEpisode(episodeId)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, playback)
}

type SyncProgressDto struct {
	ContentID       string `json:"contentId" binding:"required"`
	PositionSeconds int    `json:"positionSeconds"`
	DurationSeconds int    `json:"durationSeconds"`
	IsCompleted     bool   `json:"isCompleted"`
}

func (h *ApiHandler) SyncProgress(c *gin.Context) {
	episodeId := c.Param("id")
	var dto SyncProgressDto
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.playbackService.SyncProgress(episodeId, dto.ContentID, dto.PositionSeconds, dto.DurationSeconds, dto.IsCompleted)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *ApiHandler) GetHistory(c *gin.Context) {
	history, err := h.playbackService.GetHistory()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}

func (h *ApiHandler) GetAllDonghua(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "30")
	search := c.Query("q")

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

	result, err := h.contentService.GetAllDonghua(page, limit, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *ApiHandler) ProxyWebProviders(c *gin.Context) {
	path := c.Param("path")
	query := c.Request.URL.Query()

	ctx := c.Request.Context()
	data, err := h.sankaService.ProxyRequest(ctx, path, query)
	if err != nil {
		if err.Error() == "akses ke konten 18+ tidak diizinkan" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}

	c.Data(http.StatusOK, "application/json", data)
}

type ResolveRequestDto struct {
	Sources []struct {
		ServerName string `json:"serverName"`
		Quality    string `json:"quality"`
		Url        string `json:"url"`
	} `json:"sources"`
	EpisodeId string `json:"episodeId"`
	Title     string `json:"title"`
}

func (h *ApiHandler) ResolveWebProvider(c *gin.Context) {
	var dto ResolveRequestDto
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var resolvedSources []resolver.ResolvedStream
	for _, src := range dto.Sources {
		res := resolver.Resolve(src.Url, src.ServerName, src.Quality)
		if res.StreamUrl != "" {
			resolvedSources = append(resolvedSources, res)
		}
	}

	if len(resolvedSources) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "failed to resolve any playable video stream"})
		return
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

	resp := service.PlaybackResponse{
		EpisodeID:             dto.EpisodeId,
		ContentID:             "web_provider_content",
		ContentTitle:          dto.Title,
		Title:                 dto.Title,
		SelectedSource:        selected,
		AlternativeSources:    alternatives,
		ResumePositionSeconds: 0,
	}

	c.JSON(http.StatusOK, resp)
}

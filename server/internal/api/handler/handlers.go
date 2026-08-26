package handler

import (
	"net/http"
	"strconv"

	"github.com/anivora/server/internal/service"
	"github.com/gin-gonic/gin"
)

type ApiHandler struct {
	contentService  *service.ContentService
	playbackService *service.PlaybackService
}

func NewApiHandler(contentService *service.ContentService, playbackService *service.PlaybackService) *ApiHandler {
	return &ApiHandler{
		contentService:  contentService,
		playbackService: playbackService,
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

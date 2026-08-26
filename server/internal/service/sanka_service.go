package service

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"golang.org/x/time/rate"
)

type SankaService struct {
	client  *http.Client
	limiter *rate.Limiter
	baseUrl string
}

func NewSankaService() *SankaService {
	return &SankaService{
		client: &http.Client{Timeout: 15 * time.Second},
		// 30 requests per minute = 1 request every 2 seconds
		limiter: rate.NewLimiter(rate.Every(2*time.Second), 1),
		baseUrl: "https://www.sankavollerei.web.id",
	}
}

// ProxyRequest proxies the request to sankavollerei API, enforcing rate limits and filtering 18+ content.
func (s *SankaService) ProxyRequest(ctx context.Context, path string, query url.Values) ([]byte, error) {
	// Block 18+ nekopoi endpoints
	if strings.Contains(strings.ToLower(path), "nekopoi") {
		return nil, fmt.Errorf("akses ke konten 18+ tidak diizinkan")
	}

	// Wait for the rate limiter
	if err := s.limiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limiter error: %w", err)
	}

	// Construct the URL
	targetUrl := fmt.Sprintf("%s/%s", s.baseUrl, strings.TrimPrefix(path, "/"))
	if len(query) > 0 {
		targetUrl = fmt.Sprintf("%s?%s", targetUrl, query.Encode())
	}

	req, err := http.NewRequestWithContext(ctx, "GET", targetUrl, nil)
	if err != nil {
		return nil, err
	}
	
	// Add user agent to prevent being blocked by basic checks
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upstream returned status %d: %s", resp.StatusCode, string(body))
	}

	return body, nil
}

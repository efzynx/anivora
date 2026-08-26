package resolver

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type ResolvedStream struct {
	StreamUrl  string            `json:"streamUrl"`
	ServerName string            `json:"serverName"`
	Quality    string            `json:"quality"`
	IsHLS      bool              `json:"isHls"`
	Headers    map[string]string `json:"headers,omitempty"`
}

type PlaybackResolution struct {
	EpisodeID          string           `json:"episodeId"`
	SelectedSource     ResolvedStream   `json:"selectedSource"`
	AlternativeSources []ResolvedStream `json:"alternativeSources"`
}

var (
	rumbleIdRegex = regexp.MustCompile(`rumble\.com/embed/([a-zA-Z0-9]+)`)
	hlsRegex      = regexp.MustCompile(`"(?:hls|url)":"([^"]+\.m3u8[^"]*)"`)
	mp4Regex      = regexp.MustCompile(`"mp4":"([^"]+\.mp4[^"]*)"`)
	client        = &http.Client{Timeout: 10 * time.Second}
)

// Resolve extracts direct playable stream URLs from embeds or raw links.
func Resolve(sourceUrl string, serverName string, quality string) ResolvedStream {
	if quality == "" {
		quality = "720p"
	}
	if serverName == "" {
		serverName = "Default"
	}

	// 1. Direct HLS or MP4 URL
	if strings.Contains(sourceUrl, ".m3u8") {
		return ResolvedStream{
			StreamUrl:  sourceUrl,
			ServerName: serverName,
			Quality:    quality,
			IsHLS:      true,
		}
	}
	if strings.Contains(sourceUrl, ".mp4") {
		return ResolvedStream{
			StreamUrl:  sourceUrl,
			ServerName: serverName,
			Quality:    quality,
			IsHLS:      false,
		}
	}

	// 2. Rumble Embed Extractor
	if strings.Contains(sourceUrl, "rumble.com") {
		if directUrl, isHls, err := extractRumble(sourceUrl); err == nil && directUrl != "" {
			return ResolvedStream{
				StreamUrl:  directUrl,
				ServerName: "Rumble (Direct)",
				Quality:    quality,
				IsHLS:      isHls,
			}
		}
	}

	// 3. Dailymotion Embed Extractor
	if strings.Contains(sourceUrl, "dailymotion.com") {
		if directUrl, err := extractDailymotion(sourceUrl); err == nil && directUrl != "" {
			return ResolvedStream{
				StreamUrl:  directUrl,
				ServerName: "Dailymotion (HLS)",
				Quality:    quality,
				IsHLS:      true,
			}
		}
	}

	// 3.5 Ok.ru Extractor
	if strings.Contains(sourceUrl, "ok.ru") {
		if directUrl, err := extractOkru(sourceUrl); err == nil && directUrl != "" {
			return ResolvedStream{
				StreamUrl:  directUrl,
				ServerName: "Ok.ru (HLS)",
				Quality:    quality,
				IsHLS:      true,
			}
		}
	}

	// 4. Anichin Stream Extractor
	if strings.Contains(sourceUrl, "anichin.stream") {
		if idMatch := regexp.MustCompile(`id=([^&]+)`).FindStringSubmatch(sourceUrl); len(idMatch) > 1 {
			return ResolvedStream{
				StreamUrl:  fmt.Sprintf("https://anichin.stream/hls/%s.m3u8", idMatch[1]),
				ServerName: "Anichin Stream (Direct)",
				Quality:    quality,
				IsHLS:      true,
			}
		}
	}

	// Fallback check
	if strings.HasSuffix(sourceUrl, ".m3u8") || strings.HasSuffix(sourceUrl, ".mp4") {
		return ResolvedStream{
			StreamUrl:  sourceUrl,
			ServerName: serverName,
			Quality:    quality,
			IsHLS:      strings.HasSuffix(sourceUrl, ".m3u8"),
		}
	}

	// Not a playable direct URL, discard
	return ResolvedStream{}
}

func extractRumble(embedUrl string) (string, bool, error) {
	match := rumbleIdRegex.FindStringSubmatch(embedUrl)
	if len(match) < 2 {
		return embedUrl, false, nil
	}
	videoId := match[1]

	req, err := http.NewRequest("GET", fmt.Sprintf("https://rumble.com/embed/%s/", videoId), nil)
	if err != nil {
		return "", false, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return "", false, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", false, err
	}
	html := string(body)

	// Check HLS (.m3u8)
	if hlsMatch := hlsRegex.FindStringSubmatch(html); len(hlsMatch) >= 2 {
		clean := strings.ReplaceAll(hlsMatch[1], `\`, "")
		return clean, true, nil
	}

	// Check MP4
	if mp4Match := mp4Regex.FindStringSubmatch(html); len(mp4Match) >= 2 {
		clean := strings.ReplaceAll(mp4Match[1], `\`, "")
		return clean, false, nil
	}

	return embedUrl, false, nil
}

func extractDailymotion(embedUrl string) (string, error) {
	// Extract video ID from dailymotion.com/embed/video/kXXXXX or geo.dailymotion.com/player.html?video=kXXXXX
	var videoId string
	if strings.Contains(embedUrl, "video=") {
		parts := strings.Split(embedUrl, "video=")
		if len(parts) > 1 {
			videoId = strings.Split(parts[1], "&")[0]
		}
	} else {
		parts := strings.Split(embedUrl, "/")
		videoId = parts[len(parts)-1]
		if idx := strings.Index(videoId, "?"); idx != -1 {
			videoId = videoId[:idx]
		}
	}

	if videoId == "" {
		return embedUrl, nil
	}

	metadataUrl := fmt.Sprintf("https://www.dailymotion.com/player/metadata/video/%s", videoId)
	req, err := http.NewRequest("GET", metadataUrl, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var data struct {
		Qualities map[string][]struct {
			Type string `json:"type"`
			Url  string `json:"url"`
		} `json:"qualities"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&data); err == nil {
		if autoList, exists := data.Qualities["auto"]; exists && len(autoList) > 0 {
			return autoList[0].Url, nil
		}
	}

	return embedUrl, nil
}

func extractOkru(embedUrl string) (string, error) {
	req, err := http.NewRequest("GET", embedUrl, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	html := string(body)

	re := regexp.MustCompile(`data-options="(.*?)"`)
	matches := re.FindStringSubmatch(html)
	if len(matches) > 1 {
		dataOpts := strings.ReplaceAll(matches[1], "&quot;", "\"")
		
		var opts struct {
			Flashvars struct {
				Metadata string `json:"metadata"`
			} `json:"flashvars"`
		}
		if err := json.Unmarshal([]byte(dataOpts), &opts); err == nil {
			var meta struct {
				HlsManifestUrl string `json:"hlsManifestUrl"`
			}
			if err := json.Unmarshal([]byte(opts.Flashvars.Metadata), &meta); err == nil {
				if meta.HlsManifestUrl != "" {
					return meta.HlsManifestUrl, nil
				}
			}
		}
	}
	return "", fmt.Errorf("failed to extract ok.ru hls url")
}

package provider

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/anivora/server/internal/model"
)

type ScrapedLatestItem struct {
	Title         string
	Slug          string
	EpisodeNumber int
	ThumbnailUrl  string
	EpisodeUrl    string
	ContentType   model.ContentType
}

type ScrapedDetail struct {
	Title         string
	NativeTitle   string
	Synopsis      string
	PosterUrl     string
	Status        model.ContentStatus
	Rating        float64
	Studio        string
	Genres        []string
	Episodes      []ScrapedEpisode
}

type ScrapedEpisode struct {
	EpisodeNumber int
	Title         string
	EpisodeUrl    string
	StreamSources []ScrapedStreamSource
}

type ScrapedStreamSource struct {
	ServerName string
	StreamUrl  string
	Quality    string
}

type AnichinAdapter struct {
	BaseUrl string
	client  *http.Client
}

func NewAnichinAdapter(baseUrl string) *AnichinAdapter {
	if baseUrl == "" {
		baseUrl = "https://anichin.watch"
	}
	return &AnichinAdapter{
		BaseUrl: strings.TrimRight(baseUrl, "/"),
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

var epNumberRegex = regexp.MustCompile(`(?:Episode|Ep|Eps|Vol)?\s*(\d+)`)

func (a *AnichinAdapter) FetchLatest(page int) ([]ScrapedLatestItem, error) {
	url := a.BaseUrl
	if page > 1 {
		url = fmt.Sprintf("%s/page/%d/", a.BaseUrl, page)
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("anichin returned status: %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	var results []ScrapedLatestItem

	doc.Find("div.listupd article.bs").Each(func(i int, s *goquery.Selection) {
		linkTag := s.Find("div.bsx > a")
		titleTag := s.Find("div.tt")
		epTag := s.Find("div.bt span.epx")
		imgTag := s.Find("div.limit img")

		title := strings.TrimSpace(titleTag.Text())
		parts := strings.Split(title, "\t")
		if len(parts) > 1 {
			title = strings.TrimSpace(parts[0])
		}
		if title == "" {
			title = strings.TrimSpace(linkTag.AttrOr("title", ""))
			parts = strings.Split(title, "\t")
			if len(parts) > 1 {
				title = strings.TrimSpace(parts[0])
			}
		}
		epUrl := linkTag.AttrOr("href", "")
		thumb := imgTag.AttrOr("src", "")
		if thumb == "" {
			thumb = imgTag.AttrOr("data-src", "")
		}
		if thumb != "" && !strings.HasPrefix(thumb, "http") {
			if strings.HasPrefix(thumb, "//") {
				thumb = "https:" + thumb
			} else {
				if strings.HasPrefix(thumb, "/wp-content") {
					thumb = "https://anichin.watch" + thumb
				} else if strings.HasPrefix(thumb, "/") {
					thumb = "https://anichin.watch/wp-content/uploads" + thumb
				}
			}
		}

		epText := epTag.Text()
		epNum := 1
		if matches := epNumberRegex.FindStringSubmatch(epText); len(matches) >= 2 {
			if n, err := strconv.Atoi(matches[1]); err == nil {
				epNum = n
			}
		}

		// Derive content slug from title or URL
		slug := model.ToSlug(title)
		// Strip "-episode-XX" suffix if present in slug
		slug = regexp.MustCompile(`-episode-\d+.*$`).ReplaceAllString(slug, "")

		if title != "" && epUrl != "" {
			results = append(results, ScrapedLatestItem{
				Title:         title,
				Slug:          slug,
				EpisodeNumber: epNum,
				ThumbnailUrl:  thumb,
				EpisodeUrl:    epUrl,
				ContentType:   model.ContentTypeDonghua,
			})
		}
	})

	return results, nil
}

func (a *AnichinAdapter) FetchEpisodeEmbeds(epUrl string) ([]ScrapedStreamSource, error) {
	req, err := http.NewRequest("GET", epUrl, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	var sources []ScrapedStreamSource

	// 1. Direct player iframe
	doc.Find("iframe").Each(func(i int, s *goquery.Selection) {
		src := s.AttrOr("src", "")
		if src != "" {
			if strings.HasPrefix(src, "//") {
				src = "https:" + src
			}
			serverName := "Main Server"
			if strings.Contains(src, "anichin.stream") {
				serverName = "Anichin Stream"
			} else if strings.Contains(src, "rumble.com") {
				serverName = "Rumble"
			} else if strings.Contains(src, "dailymotion.com") {
				serverName = "Dailymotion"
			}
			
			// Only add if it looks like a video embed
			if strings.Contains(src, "anichin.stream") || strings.Contains(src, "rumble") || strings.Contains(src, "dailymotion") || strings.Contains(src, "video") || strings.Contains(src, "player") {
				sources = append(sources, ScrapedStreamSource{
					ServerName: serverName,
					StreamUrl:  src,
					Quality:    "720p",
				})
			}
		}
	})

	// 2. Mirror server options (select / buttons)
	srcRe := regexp.MustCompile(`src=["'](.*?)["']`)
	doc.Find("select.mirror option").Each(func(i int, s *goquery.Selection) {
		val := s.AttrOr("value", "")
		name := strings.TrimSpace(s.Text())
		if val != "" && val != "0" {
			streamUrl := val
			// decode base64 if it is base64 encoded iframe
			if decoded, err := base64.StdEncoding.DecodeString(val); err == nil {
				decodedStr := string(decoded)
				if strings.Contains(decodedStr, "iframe") {
					if matches := srcRe.FindStringSubmatch(decodedStr); len(matches) > 1 {
						streamUrl = matches[1]
					}
				}
			}

			if strings.HasPrefix(streamUrl, "//") {
				streamUrl = "https:" + streamUrl
			}

			sources = append(sources, ScrapedStreamSource{
				ServerName: name,
				StreamUrl:  streamUrl,
				Quality:    "720p",
			})
		}
	})

	return sources, nil
}

func (a *AnichinAdapter) FetchDetail(contentUrl string) (*ScrapedDetail, error) {
	req, err := http.NewRequest("GET", contentUrl, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("anichin returned status: %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	detail := &ScrapedDetail{
		Status: model.ContentStatusOngoing, // default
	}

	// Title: handle potential duplications or episode info
	rawTitle := strings.TrimSpace(doc.Find("h1.entry-title").Text())
	parts := strings.Split(rawTitle, "\t")
	if len(parts) > 1 {
		detail.Title = strings.TrimSpace(parts[0])
	} else {
		// Strip episode info if present
		idx := strings.Index(rawTitle, " Episode ")
		if idx > 0 {
			detail.Title = strings.TrimSpace(rawTitle[:idx])
		} else {
			detail.Title = rawTitle
		}
	}

	// Poster
	detail.PosterUrl = doc.Find("div.thumb img").AttrOr("src", "")
	if detail.PosterUrl == "" {
		detail.PosterUrl = doc.Find("div.thumb img").AttrOr("data-src", "")
	}
	if detail.PosterUrl != "" && !strings.HasPrefix(detail.PosterUrl, "http") {
		if strings.HasPrefix(detail.PosterUrl, "//") {
			detail.PosterUrl = "https:" + detail.PosterUrl
		} else {
			if strings.HasPrefix(detail.PosterUrl, "/wp-content") {
				detail.PosterUrl = "https://anichin.watch" + detail.PosterUrl
			} else if strings.HasPrefix(detail.PosterUrl, "/") {
				detail.PosterUrl = "https://anichin.watch/wp-content/uploads" + detail.PosterUrl
			}
		}
	}

	// Synopsis
	synopsis := strings.TrimSpace(doc.Find("div[itemprop='description']").Text())
	if synopsis == "" {
		doc.Find("div.entry-content p").Each(func(i int, s *goquery.Selection) {
			text := strings.TrimSpace(s.Text())
			if text != "" {
				if synopsis != "" {
					synopsis += "\n\n"
				}
				synopsis += text
			}
		})
	}
	if synopsis == "" {
		synopsis = strings.TrimSpace(doc.Find("div.entry-content").Text())
	}
	detail.Synopsis = synopsis

	// Meta info block
	doc.Find("div.info-content div.spe span, .tsinfo .imptdt").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		lowerText := strings.ToLower(text)
		
		if strings.Contains(lowerText, "status:") || strings.Contains(lowerText, "status ") {
			if strings.Contains(lowerText, "completed") {
				detail.Status = model.ContentStatusCompleted
			} else {
				detail.Status = model.ContentStatusOngoing
			}
		} else if strings.Contains(lowerText, "studio:") || strings.Contains(lowerText, "studio ") {
			parts := strings.Split(text, ":")
			if len(parts) > 1 {
				detail.Studio = strings.TrimSpace(parts[1])
			} else {
				detail.Studio = strings.TrimSpace(strings.Replace(text, "Studio", "", 1))
			}
		}
	})

	// Rating
	ratingText := strings.TrimSpace(doc.Find(".rating strong, [itemprop='ratingValue']").First().Text())
	ratingText = strings.Replace(ratingText, "Rating", "", 1)
	ratingText = strings.TrimSpace(ratingText)
	if rating, err := strconv.ParseFloat(ratingText, 64); err == nil {
		detail.Rating = rating
	}

	// Genres
	doc.Find("div.genxed a").Each(func(i int, s *goquery.Selection) {
		genre := strings.TrimSpace(s.Text())
		if genre != "" {
			detail.Genres = append(detail.Genres, genre)
		}
	})

	// Episodes
	doc.Find("div.eplister ul li").Each(func(i int, s *goquery.Selection) {
		link := s.Find("a").AttrOr("href", "")
		if link == "" {
			return
		}
		epNumText := strings.TrimSpace(s.Find("div.epl-num").Text())
		epTitleText := strings.TrimSpace(s.Find("div.epl-title").Text())
		
		epNum := 0
		if matches := epNumberRegex.FindStringSubmatch(epNumText); len(matches) >= 2 {
			if n, err := strconv.Atoi(matches[1]); err == nil {
				epNum = n
			}
		} else if matches := epNumberRegex.FindStringSubmatch(epTitleText); len(matches) >= 2 {
			if n, err := strconv.Atoi(matches[1]); err == nil {
				epNum = n
			}
		}

		if epNum > 0 {
			detail.Episodes = append(detail.Episodes, ScrapedEpisode{
				EpisodeNumber: epNum,
				Title:         epTitleText,
				EpisodeUrl:    link,
			})
		}
	})

	return detail, nil
}

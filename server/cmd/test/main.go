package main

import (
	"fmt"
	"github.com/anivora/server/internal/provider"
)

func main() {
	adapter := provider.NewAnichinAdapter("https://anichin.watch")
	items, err := adapter.FetchLatest(1)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	if len(items) > 0 {
		fmt.Printf("Item 0: Title='%s', Slug='%s', EpUrl='%s'\n", items[0].Title, items[0].Slug, items[0].EpisodeUrl)
        
        detailUrl := fmt.Sprintf("https://anichin.watch/anime/%s/", items[0].Slug)
        fmt.Printf("Detail URL: %s\n", detailUrl)
        detail, err := adapter.FetchDetail(detailUrl)
        if err != nil {
            fmt.Println("Detail Error:", err)
        } else {
            fmt.Printf("Detail Title='%s', Synopsis='%s', Eps=%d\n", detail.Title, detail.Synopsis, len(detail.Episodes))
        }
	}
}

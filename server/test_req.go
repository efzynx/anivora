package main

import (
	"fmt"
	"io"
	"net/http"
)

func main() {
	req, _ := http.NewRequest("GET", "https://www.sankavollerei.web.id/anime/anime/youjo-senki-s2-sub-indo", nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json")
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer resp.Body.Close()
	
	fmt.Println("Status:", resp.Status)
	body, _ := io.ReadAll(resp.Body)
	fmt.Println("Body:", string(body))
}

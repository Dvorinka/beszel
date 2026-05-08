package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

func main() {
	testDomains := []string{"bookra.eu", "sportcreative.eu"}

	for _, domain := range testDomains {
		fmt.Printf("Testing EURid web scraping for: %s\n", domain)
		fmt.Println("----------------------------------------")

		// EURid web WHOIS URL
		url := fmt.Sprintf("https://www.eurid.eu/en/registrations/search/?domain=%s", domain)
		
		req, err := http.NewRequestWithContext(context.Background(), "GET", url, nil)
		if err != nil {
			fmt.Printf("Failed to create request: %v\n", err)
			continue
		}
		
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
		req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
		
		client := &http.Client{Timeout: 15 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("Failed to fetch EURid web page: %v\n", err)
			continue
		}
		defer resp.Body.Close()
		
		if resp.StatusCode != 200 {
			fmt.Printf("EURid web page returned status %d\n", resp.StatusCode)
			continue
		}
		
		// Read the HTML response
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			fmt.Printf("Failed to read EURid response: %v\n", err)
			continue
		}
		
		html := string(body)
		fmt.Printf("HTML length: %d characters\n", len(html))
		
		// Look for expiry date patterns
		expiryPatterns := []string{
			`Expiry date:\s*</strong>\s*(\d{2}/\d{2}/\d{4})`,
			`Expiry date:</strong>\s*(\d{2}/\d{2}/\d{4})`,
			`Expiry date</strong>\s*(\d{2}/\d{2}/\d{4})`,
			`"expiryDate":"([^"]+)"`,
			`data-expiry="([^"]+)"`,
			`\d{2}/\d{2}/\d{4}`, // Generic date pattern
		}
		
		fmt.Println("\n=== Searching for expiry dates ===")
		for _, pattern := range expiryPatterns {
			re := regexp.MustCompile(pattern)
			matches := re.FindAllStringSubmatch(html, -1)
			if len(matches) > 0 {
				fmt.Printf("Pattern '%s' found %d matches:\n", pattern, len(matches))
				for i, match := range matches {
					if len(match) > 1 {
						fmt.Printf("  Match %d: %s\n", i+1, match[1])
					}
				}
			}
		}
		
		// Look for registrar patterns
		registrarPatterns := []string{
			`Registrar:\s*</strong>\s*([^<\n]+)`,
			`Registrar:</strong>\s*([^<\n]+)`,
			`Registrar</strong>\s*([^<\n]+)`,
			`"registrar":"([^"]+)"`,
			`data-registrar="([^"]+)"`,
		}
		
		fmt.Println("\n=== Searching for registrar ===")
		for _, pattern := range registrarPatterns {
			re := regexp.MustCompile(pattern)
			matches := re.FindAllStringSubmatch(html, -1)
			if len(matches) > 0 {
				fmt.Printf("Pattern '%s' found %d matches:\n", pattern, len(matches))
				for i, match := range matches {
					if len(match) > 1 {
						fmt.Printf("  Match %d: %s\n", i+1, strings.TrimSpace(match[1]))
					}
				}
			}
		}
		
		// Show some sample HTML to understand the structure
		fmt.Println("\n=== Sample HTML (first 1000 chars) ===")
		if len(html) > 1000 {
			fmt.Printf("%s...\n", html[:1000])
		} else {
			fmt.Printf("%s\n", html)
		}
		
		fmt.Println("\n========================================\n")
	}
}

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

func tryEURidEndpoint(ctx context.Context, url, domainName string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	
	// Use more realistic browser headers
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")
	req.Header.Set("Sec-Ch-Ua", "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"")
	req.Header.Set("Sec-Ch-Ua-Mobile", "?0")
	req.Header.Set("Sec-Ch-Ua-Platform", "\"Windows\"")
	req.Header.Set("Sec-Fetch-Dest", "document")
	req.Header.Set("Sec-Fetch-Mode", "navigate")
	req.Header.Set("Sec-Fetch-Site", "none")
	req.Header.Set("Sec-Fetch-User", "?1")
	req.Header.Set("Upgrade-Insecure-Requests", "1")
	
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch EURid web page: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("EURid web page returned status %d", resp.StatusCode)
	}
	
	// Read the HTML response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read EURid response: %w", err)
	}
	
	return string(body), nil
}

func parseEURidWebHTML(html, domainName string) {
	fmt.Printf("HTML length: %d characters\n", len(html))
	
	// Look for expiry date patterns
	expiryPatterns := []string{
		`Expiry date:\s*</strong>\s*(\d{2}/\d{2}/\d{4})`,
		`Expiry date:</strong>\s*(\d{2}/\d{2}/\d{4})`,
		`Expiry date</strong>\s*(\d{2}/\d{2}/\d{4})`,
		`"expiryDate":"([^"]+)"`,
		`data-expiry="([^"]+)"`,
		`\d{2}/\d{2}/\d{4}`, // Generic date pattern
		`\d{4}-\d{2}-\d{2}`, // ISO date pattern
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
	
	// Look for any JSON data
	jsonPatterns := []string{
		`\{[^}]*"expiry[^}]*\}`,
		`\{[^}]*"registrar[^}]*\}`,
		`\{[^}]*"domain"[^}]*\}`,
	}
	
	fmt.Println("\n=== Searching for JSON data ===")
	for _, pattern := range jsonPatterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindAllString(html, -1)
		if len(matches) > 0 {
			fmt.Printf("Pattern '%s' found %d matches:\n", pattern, len(matches))
			for i, match := range matches {
				fmt.Printf("  Match %d: %s\n", i+1, match)
			}
		}
	}
	
	// Show sample HTML
	fmt.Println("\n=== Sample HTML (first 2000 chars) ===")
	if len(html) > 2000 {
		fmt.Printf("%s...\n", html[:2000])
	} else {
		fmt.Printf("%s\n", html)
	}
}

func main() {
	testDomains := []string{"bookra.eu", "sportcreative.eu"}
	
	for _, domain := range testDomains {
		fmt.Printf("Testing EURid web scraping for: %s\n", domain)
		fmt.Println("========================================")
		
		// Try multiple EURid endpoints
		endpoints := []string{
			fmt.Sprintf("https://whois.eurid.eu/en/?q=%s", domain),
			fmt.Sprintf("https://whois.eurid.eu/en/search?q=%s", domain),
			fmt.Sprintf("https://www.eurid.eu/en/whois/?domain=%s", domain),
		}
		
		for i, url := range endpoints {
			fmt.Printf("\n--- Attempt %d: %s ---\n", i+1, url)
			
			html, err := tryEURidEndpoint(context.Background(), url, domain)
			if err != nil {
				fmt.Printf("Error: %v\n", err)
				continue
			}
			
			parseEURidWebHTML(html, domain)
			break // If we got HTML, don't try other endpoints
		}
		
		fmt.Println("\n========================================\n")
	}
}

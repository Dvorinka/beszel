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

func tryAlternativeWHOISService(ctx context.Context, serviceName, url, domainName string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request for %s: %w", serviceName, err)
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch %s: %w", serviceName, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("%s returned status %d", serviceName, resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read %s response: %w", serviceName, err)
	}

	return string(body), nil
}

func parseAlternativeWHOISHTML(html, domainName, serviceName string) {
	fmt.Printf("HTML length from %s: %d characters\n", serviceName, len(html))

	// Look for expiry date patterns (common across WHOIS services)
	expiryPatterns := []string{
		`Expiry Date:\s*</[^>]*>\s*([^<\n]+)`,
		`Expiry Date:</[^>]*>\s*([^<\n]+)`,
		`Expires on:\s*</[^>]*>\s*([^<\n]+)`,
		`Expires:\s*</[^>]*>\s*([^<\n]+)`,
		`"expiry":"([^"]+)"`,
		`"expires":"([^"]+)"`,
		`data-expiry="([^"]+)"`,
		`expiry_date["\s]*:\s*"([^"]+)"`,
		`expires["\s]*:\s*"([^"]+)"`,
		`\d{4}-\d{2}-\d{2}`, // ISO date pattern
		`\d{2}/\d{2}/\d{4}`, // DD/MM/YYYY pattern
		`\d{2}-\d{2}-\d{4}`, // MM-DD-YYYY pattern
		`202\d-\d{2}-\d{2}`, // 202x-xx-xx pattern
	}

	fmt.Printf("\n=== Searching for expiry dates on %s ===\n", serviceName)
	for _, pattern := range expiryPatterns {
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

	// Look for registrar name
	registrarPatterns := []string{
		`Registrar:\s*</[^>]*>\s*([^<\n]+)`,
		`Registrar:</[^>]*>\s*([^<\n]+)`,
		`Registered through:\s*</[^>]*>\s*([^<\n]+)`,
		`"registrar":"([^"]+)"`,
		`data-registrar="([^"]+)"`,
	}

	fmt.Printf("\n=== Searching for registrar on %s ===\n", serviceName)
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

	// Look for status
	statusPatterns := []string{
		`Status:\s*</[^>]*>\s*([^<\n]+)`,
		`Status:</[^>]*>\s*([^<\n]+)`,
		`"status":"([^"]+)"`,
		`data-status="([^"]+)"`,
	}

	fmt.Printf("\n=== Searching for status on %s ===\n", serviceName)
	for _, pattern := range statusPatterns {
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

	// Show sample HTML
	fmt.Printf("\n=== Sample HTML from %s (first 1500 chars) ===\n", serviceName)
	if len(html) > 1500 {
		fmt.Printf("%s...\n", html[:1500])
	} else {
		fmt.Printf("%s\n", html)
	}
}

func main() {
	testDomains := []string{"bookra.eu", "sportcreative.eu"}

	for _, domain := range testDomains {
		fmt.Printf("Testing alternative WHOIS services for: %s\n", domain)
		fmt.Println("========================================")

		// Try multiple alternative WHOIS services
		services := []struct {
			name string
			url  string
		}{
			{"whois.com", fmt.Sprintf("https://www.whois.com/whois/%s", domain)},
			{"who.is", fmt.Sprintf("https://who.is/whois/%s", domain)},
			{"ip2location.com", fmt.Sprintf("https://www.ip2location.com/whois/%s", domain)},
		}

		for _, service := range services {
			fmt.Printf("\n--- Testing %s ---\n", service.name)

			html, err := tryAlternativeWHOISService(context.Background(), service.name, service.url, domain)
			if err != nil {
				fmt.Printf("Error: %v\n", err)
				continue
			}

			parseAlternativeWHOISHTML(html, domain, service.name)
		}

		fmt.Println("\n========================================\n")
	}
}

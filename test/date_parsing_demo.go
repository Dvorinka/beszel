package main

import (
	"fmt"
	"regexp"
	"strconv"
)

// parseFlexibleDate parses dates in various formats
func parseFlexibleDate(dateString string) string {
	if dateString == "" {
		return ""
	}
	
	// Remove common separators and normalize
	normalized := regexp.MustCompile(`[./-]`).ReplaceAllString(dateString, "-")
	normalized = regexp.MustCompile(`\s+`).ReplaceAllString(normalized, "")
	
	// Try different date formats
	formats := []string{
		// DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
		`^(\d{2})[-/.](\d{2})[-/.](\d{4})$`,
		// YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
		`^(\d{4})[-/.](\d{2})[-/.](\d{2})$`,
		// MM-DD-YYYY, MM/DD/YYYY, MM.DD.YYYY
		`^(\d{2})[-/.](\d{2})[-/.](\d{4})$`,
	}
	
	for _, format := range formats {
		re := regexp.MustCompile(format)
		match := re.FindStringSubmatch(normalized)
		if match != nil {
			part1, part2, part3 := match[1], match[2], match[3]
			
			// Determine if it's DD.MM.YYYY or YYYY.MM.DD format
			var year, month, day string
			
			if len(part1) == 4 {
				// YYYY.MM.DD format
				year = part1
				month = part2
				day = part3
			} else {
				// DD.MM.YYYY format (most common)
				day = part1
				month = part2
				year = part3
			}
			
			// Validate and format
			yearNum, _ := strconv.Atoi(year)
			monthNum, _ := strconv.Atoi(month)
			dayNum, _ := strconv.Atoi(day)
			
			if yearNum >= 2000 && yearNum <= 2100 && monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 {
				return fmt.Sprintf("%s-%s-%s", year, fmt.Sprintf("%02s", month), fmt.Sprintf("%02s", day))
			}
		}
	}
	
	return ""
}

func main() {
	testDates := []string{
		"15.06.2026",
		"13.11.2029",
		"2026-06-15",
		"15/06/2026",
		"13-11-2029",
		"2026.06.15",
		"15 06 2026",
		"invalid-date",
		"32.13.2026", // Invalid day/month
		"1999.12.31", // Too old
	}
	
	fmt.Println("Testing Flexible Date Parsing")
	fmt.Println("=============================")
	
	for _, date := range testDates {
		result := parseFlexibleDate(date)
		status := "✅"
		if result == "" {
			status = "❌"
		}
		fmt.Printf("%s '%s' -> '%s'\n", status, date, result)
	}
	
	fmt.Println("\nExample Usage:")
	fmt.Println("=============")
	fmt.Println("User can paste: '15.06.2026, 13.11.2029'")
	fmt.Println("System will parse: '2026-06-15', '2029-11-13'")
}

package pagespeed

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// PageSpeedResponse represents the PageSpeed API response
type PageSpeedResponse struct {
	LighthouseResult struct {
		Categories struct {
			Performance struct {
				Score float64 `json:"score"`
			} `json:"performance"`
			Accessibility struct {
				Score float64 `json:"score"`
			} `json:"accessibility"`
			BestPractices struct {
				Score float64 `json:"best-practices"`
			} `json:"best-practices"`
			SEO struct {
				Score float64 `json:"score"`
			} `json:"seo"`
			PWA struct {
				Score float64 `json:"score"`
			} `json:"pwa"`
		} `json:"categories"`
		Audits struct {
			Fcp struct {
				DisplayValue string  `json:"displayValue"`
				NumericValue float64 `json:"numericValue"`
			} `json:"first-contentful-paint"`
			Lcp struct {
				DisplayValue string  `json:"displayValue"`
				NumericValue float64 `json:"numericValue"`
			} `json:"largest-contentful-paint"`
			Ttfb struct {
				DisplayValue string  `json:"displayValue"`
				NumericValue float64 `json:"numericValue"`
			} `json:"server-response-time"`
			Cls struct {
				DisplayValue string  `json:"displayValue"`
				NumericValue float64 `json:"numericValue"`
			} `json:"cumulative-layout-shift"`
			Tbt struct {
				DisplayValue string  `json:"displayValue"`
				NumericValue float64 `json:"numericValue"`
			} `json:"total-blocking-time"`
			SpeedIndex struct {
				DisplayValue string  `json:"displayValue"`
				NumericValue float64 `json:"numericValue"`
			} `json:"speed-index"`
			Interactive struct {
				DisplayValue string  `json:"displayValue"`
				NumericValue float64 `json:"numericValue"`
			} `json:"interactive"`
		} `json:"audits"`
	} `json:"lighthouseResult"`
	AnalysisUTCTimestamp string `json:"analysisUTCTimestamp"`
	Id                   string `json:"id"`
}

// Metrics represents the extracted performance metrics
type Metrics struct {
	Performance     float64       `json:"performance"`
	Accessibility   float64       `json:"accessibility"`
	BestPractices   float64       `json:"bestPractices"`
	SEO             float64       `json:"seo"`
	PWA             float64       `json:"pwa"`
	FCP             float64       `json:"fcp"`             // First Contentful Paint (ms)
	LCP             float64       `json:"lcp"`             // Largest Contentful Paint (ms)
	TTFB            float64       `json:"ttfb"`            // Time to First Byte (ms)
	CLS             float64       `json:"cls"`             // Cumulative Layout Shift
	TBT             float64       `json:"tbt"`             // Total Blocking Time (ms)
	SpeedIndex      float64       `json:"speedIndex"`      // Speed Index (ms)
	TTI             float64       `json:"tti"`             // Time to Interactive (ms)
	CheckedAt       time.Time     `json:"checkedAt"`
	URL             string        `json:"url"`
	Strategy        string        `json:"strategy"` // mobile or desktop
}

// Checker handles PageSpeed checks
type Checker struct {
	apiKey string
	client *http.Client
}

// NewChecker creates a new PageSpeed checker
func NewChecker(apiKey string) *Checker {
	return &Checker{
		apiKey: apiKey,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// CheckURL runs a PageSpeed check on a URL
func (c *Checker) CheckURL(url string, strategy string) (*Metrics, error) {
	if strategy == "" {
		strategy = "mobile"
	}

	// Build PageSpeed API URL
	apiURL := fmt.Sprintf(
		"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=%s&strategy=%s&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO&category=PWA",
		url,
		strategy,
	)

	if c.apiKey != "" {
		apiURL += "&key=" + c.apiKey
	}

	resp, err := c.client.Get(apiURL)
	if err != nil {
		return nil, fmt.Errorf("pagespeed API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("pagespeed API returned status %d: %s", resp.StatusCode, string(body))
	}

	var result PageSpeedResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode pagespeed response: %w", err)
	}

	metrics := &Metrics{
		URL:           url,
		Strategy:      strategy,
		CheckedAt:     time.Now(),
		Performance:   result.LighthouseResult.Categories.Performance.Score * 100,
		Accessibility: result.LighthouseResult.Categories.Accessibility.Score * 100,
		BestPractices: result.LighthouseResult.Categories.BestPractices.Score * 100,
		SEO:           result.LighthouseResult.Categories.SEO.Score * 100,
		PWA:           result.LighthouseResult.Categories.PWA.Score * 100,
		FCP:           result.LighthouseResult.Audits.Fcp.NumericValue,
		LCP:           result.LighthouseResult.Audits.Lcp.NumericValue,
		TTFB:          result.LighthouseResult.Audits.Ttfb.NumericValue,
		CLS:           result.LighthouseResult.Audits.Cls.NumericValue,
		TBT:           result.LighthouseResult.Audits.Tbt.NumericValue,
		SpeedIndex:    result.LighthouseResult.Audits.SpeedIndex.NumericValue,
		TTI:           result.LighthouseResult.Audits.Interactive.NumericValue,
	}

	return metrics, nil
}

// Grade returns a letter grade based on score
func Grade(score float64) string {
	switch {
	case score >= 90:
		return "A"
	case score >= 80:
		return "B"
	case score >= 70:
		return "C"
	case score >= 60:
		return "D"
	default:
		return "F"
	}
}

// GradeColor returns a color for the grade
func GradeColor(score float64) string {
	switch {
	case score >= 90:
		return "brightgreen"
	case score >= 80:
		return "green"
	case score >= 70:
		return "yellow"
	case score >= 60:
		return "orange"
	default:
		return "red"
	}
}

// GetCoreWebVitalsStatus returns the status for Core Web Vitals
func GetCoreWebVitalsStatus(metrics *Metrics) map[string]string {
	return map[string]string{
		"lcp":  getLCPStatus(metrics.LCP),
		"fid":  getFIDStatus(metrics.TBT), // Using TBT as proxy for FID
		"cls":  getCLSStatus(metrics.CLS),
		"fcp":  getFCPStatus(metrics.FCP),
		"ttfb": getTTFBStatus(metrics.TTFB),
	}
}

func getLCPStatus(value float64) string {
	if value <= 2500 {
		return "good"
	} else if value <= 4000 {
		return "needs-improvement"
	}
	return "poor"
}

func getFIDStatus(value float64) string {
	if value <= 100 {
		return "good"
	} else if value <= 300 {
		return "needs-improvement"
	}
	return "poor"
}

func getCLSStatus(value float64) string {
	if value <= 0.1 {
		return "good"
	} else if value <= 0.25 {
		return "needs-improvement"
	}
	return "poor"
}

func getFCPStatus(value float64) string {
	if value <= 1800 {
		return "good"
	} else if value <= 3000 {
		return "needs-improvement"
	}
	return "poor"
}

func getTTFBStatus(value float64) string {
	if value <= 800 {
		return "good"
	} else if value <= 1800 {
		return "needs-improvement"
	}
	return "poor"
}

// FormatDuration formats milliseconds to readable string
func FormatDuration(ms float64) string {
	if ms < 1000 {
		return fmt.Sprintf("%.0fms", ms)
	}
	return fmt.Sprintf("%.1fs", ms/1000)
}

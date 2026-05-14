package main

import (
	"context"
	"fmt"
	"time"

	"github.com/henrygd/beszel/internal/hub/domains/whois"
)

func main() {
	// Create a new lookup service with a dummy API key
	lookupService := whois.NewLookupService("dummy-api-key")

	// Test domains including .eu domain
	testDomains := []string{
		"google.com",
		"bookra.eu",        // Your .eu domain
		"sportcreative.eu", // Another .eu domain
		"github.com",
	}

	ctx := context.Background()

	fmt.Println("=== WHOIS Lookup Test ===")
	fmt.Println()

	for _, domainName := range testDomains {
		fmt.Printf("Testing domain: %s\n", domainName)
		fmt.Println("----------------------------------------")

		start := time.Now()

		// Test WHOIS lookup
		whoisData, _, err := lookupService.LookupWHOIS(ctx, domainName)

		duration := time.Since(start)
		fmt.Printf("Lookup duration: %v\n", duration)

		if err != nil {
			fmt.Printf("ERROR: %v\n", err)
		} else if whoisData != nil {
			fmt.Printf("✅ WHOIS Data Found:\n")
			fmt.Printf("  Domain: %s\n", whoisData.DomainName)
			fmt.Printf("  Status: %v\n", whoisData.Status)
			fmt.Printf("  DNSSEC: %s\n", whoisData.DNSSEC)

			if whoisData.Dates.ExpiryDate != nil && !whoisData.Dates.ExpiryDate.IsZero() {
				fmt.Printf("  Expiry Date: %s\n", whoisData.Dates.ExpiryDate.Format("2006-01-02"))
			}
			if whoisData.Dates.CreationDate != nil && !whoisData.Dates.CreationDate.IsZero() {
				fmt.Printf("  Creation Date: %s\n", whoisData.Dates.CreationDate.Format("2006-01-02"))
			}
			if whoisData.Dates.UpdatedDate != nil && !whoisData.Dates.UpdatedDate.IsZero() {
				fmt.Printf("  Updated Date: %s\n", whoisData.Dates.UpdatedDate.Format("2006-01-02"))
			}

			if whoisData.Registrar.Name != "" {
				fmt.Printf("  Registrar: %s\n", whoisData.Registrar.Name)
			}
			if whoisData.Registrar.ID != "" {
				fmt.Printf("  Registrar ID: %s\n", whoisData.Registrar.ID)
			}

			if whoisData.Registrant.Name != "" || whoisData.Registrant.Organization != "" {
				fmt.Printf("  Registrant: %s (%s)\n", whoisData.Registrant.Name, whoisData.Registrant.Organization)
			}
			if whoisData.Registrant.Country != "" {
				fmt.Printf("  Registrant Country: %s\n", whoisData.Registrant.Country)
			}
		} else {
			fmt.Printf("❌ No WHOIS data returned\n")
		}

		fmt.Println()
		fmt.Println("=== Full Domain Lookup Test ===")

		// Test full domain lookup
		fullDomain, err := lookupService.LookupDomain(ctx, domainName)
		if err != nil {
			fmt.Printf("Full lookup ERROR: %v\n", err)
		} else if fullDomain != nil {
			fmt.Printf("✅ Full Domain Data:\n")
			fmt.Printf("  Domain: %s\n", fullDomain.DomainName)
			fmt.Printf("  Status: %s\n", fullDomain.Status)
			fmt.Printf("  Active: %t\n", fullDomain.Active)
			if fullDomain.ExpiryDate != nil {
				fmt.Printf("  Expiry: %s\n", fullDomain.ExpiryDate.Format("2006-01-02"))
				daysUntil := int(fullDomain.ExpiryDate.Sub(time.Now()).Hours() / 24)
				fmt.Printf("  Days Until Expiry: %d\n", daysUntil)
			}
			fmt.Printf("  Registrar: %s\n", fullDomain.RegistrarName)
			fmt.Printf("  DNSSEC: %s\n", fullDomain.DNSSEC)

			if len(fullDomain.IPv4Addresses) > 0 {
				fmt.Printf("  IPv4 Addresses: %v\n", fullDomain.IPv4Addresses)
			}
			if len(fullDomain.IPv6Addresses) > 0 {
				fmt.Printf("  IPv6 Addresses: %v\n", fullDomain.IPv6Addresses)
			}
			if len(fullDomain.NameServers) > 0 {
				fmt.Printf("  Name Servers: %v\n", fullDomain.NameServers)
			}
			if len(fullDomain.MXRecords) > 0 {
				fmt.Printf("  MX Records: %v\n", fullDomain.MXRecords)
			}

			if fullDomain.SSLValidTo != nil {
				fmt.Printf("  SSL Valid Until: %s\n", fullDomain.SSLValidTo.Format("2006-01-02"))
				sslDaysUntil := int(fullDomain.SSLValidTo.Sub(time.Now()).Hours() / 24)
				fmt.Printf("  SSL Days Until: %d\n", sslDaysUntil)
			}
		}

		fmt.Println()
		fmt.Println("========================================")
		fmt.Println()
	}
}

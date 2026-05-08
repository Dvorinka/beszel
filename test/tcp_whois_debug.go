package main

import (
	"fmt"
	"net"
	"strings"
	"time"
)

func main() {
	// Test TCP WHOIS for .eu domains
	testDomains := []string{"bookra.eu", "sportcreative.eu"}

	for _, domainName := range testDomains {
		fmt.Printf("Testing TCP WHOIS for: %s\n", domainName)
		fmt.Println("----------------------------------------")

		// Extract TLD
		parts := strings.Split(domainName, ".")
		if len(parts) < 2 {
			fmt.Printf("Invalid domain format: %s\n", domainName)
			continue
		}
		tld := strings.ToLower(parts[len(parts)-1])

		// WHOIS server for .eu
		server := "whois.eu"
		if tld != "eu" {
			fmt.Printf("Skipping non-eu domain: %s\n", domainName)
			continue
		}

		addr := net.JoinHostPort(server, "43")
		fmt.Printf("Connecting to: %s\n", addr)

		// Use longer timeout for .eu domains
		timeout := 20 * time.Second
		dialer := &net.Dialer{Timeout: timeout}

		start := time.Now()
		conn, err := dialer.Dial("tcp", addr)
		if err != nil {
			fmt.Printf("TCP WHOIS dial failed: %v\n", err)
			continue
		}
		defer conn.Close()

		fmt.Printf("Connected in: %v\n", time.Since(start))

		// Send query
		query := domainName + "\r\n"
		fmt.Printf("Sending query: %q\n", query)

		writeStart := time.Now()
		if _, err := conn.Write([]byte(query)); err != nil {
			fmt.Printf("TCP WHOIS write failed: %v\n", err)
			continue
		}
		fmt.Printf("Write completed in: %v\n", time.Since(writeStart))

		// Set read deadline
		if err := conn.SetReadDeadline(time.Now().Add(timeout)); err != nil {
			fmt.Printf("Failed to set read deadline: %v\n", err)
			continue
		}

		// Read response
		var output strings.Builder
		buf := make([]byte, 4096)
		totalRead := 0

		readStart := time.Now()
		for {
			n, err := conn.Read(buf)
			if n > 0 {
				output.Write(buf[:n])
				totalRead += n
				fmt.Printf("Read %d bytes (total: %d)\n", n, totalRead)
			}
			if err != nil {
				if err.Error() != "EOF" {
					fmt.Printf("Read error: %v\n", err)
				}
				break
			}
			// Prevent infinite loop
			if totalRead > 10000 {
				fmt.Printf("Stopping read after 10KB\n")
				break
			}
		}

		fmt.Printf("Read completed in: %v\n", time.Since(readStart))
		fmt.Printf("Total bytes read: %d\n", totalRead)

		response := output.String()
		if len(response) > 0 {
			fmt.Printf("✅ WHOIS Response (first 500 chars):\n")
			if len(response) > 500 {
				fmt.Printf("%s...\n", response[:500])
			} else {
				fmt.Printf("%s\n", response)
			}
		} else {
			fmt.Printf("❌ No response received\n")
		}

		fmt.Println()
		fmt.Println("========================================")
		fmt.Println()
	}
}

package whois

import (
	"context"
	"crypto/rsa"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os/exec"
	"regexp"
	"strings"
	"time"

	"github.com/henrygd/beszel/internal/entities/domain"
)

// LookupService handles WHOIS lookups with multiple fallback methods
type LookupService struct {
	whoisXMLAPIKey string
	rdapCache      map[string]string
}

// NewLookupService creates a new WHOIS lookup service
func NewLookupService(apiKey string) *LookupService {
	return &LookupService{
		whoisXMLAPIKey: apiKey,
		rdapCache:      make(map[string]string),
	}
}

// LookupDomain performs a comprehensive domain lookup (WHOIS, DNS, SSL, Host)
func (s *LookupService) LookupDomain(ctx context.Context, domainName string) (*domain.Domain, error) {
	// Clean domain name
	domainName = cleanDomain(domainName)

	// Initialize domain struct
	d := &domain.Domain{
		DomainName:      domainName,
		Active:          true,
		AlertDaysBefore: 30, // Default: alert 30 days before expiry
		Tags:            []string{},
		NameServers:     []string{},
		MXRecords:       []string{},
		TXTRecords:      []string{},
		IPv4Addresses:   []string{},
		IPv6Addresses:   []string{},
	}

	// Perform WHOIS lookup
	whoisData, err := s.LookupWHOIS(ctx, domainName)
	if err == nil && whoisData != nil {
		s.applyWHOISData(d, whoisData)
	}

	// Perform DNS lookups
	s.lookupDNS(ctx, domainName, d)

	// Perform SSL lookup
	s.lookupSSL(ctx, domainName, d)

	// Perform host lookup (using first IPv4)
	if len(d.IPv4Addresses) > 0 {
		s.lookupHost(d.IPv4Addresses[0], d)
	}

	// Fetch favicon
	d.FaviconURL = fmt.Sprintf("https://www.google.com/s2/favicons?domain=%s&sz=128", domainName)

	d.LastChecked = time.Now()
	return d, nil
}

// LookupWHOIS performs WHOIS lookup with multiple fallback methods
func (s *LookupService) LookupWHOIS(ctx context.Context, domainName string) (*domain.WHOISData, error) {
	var lastErr error

	// Try RDAP first (modern replacement for WHOIS)
	data, err := s.tryRDAP(ctx, domainName)
	if err == nil && data != nil && hasValidData(data) {
		return data, nil
	}
	lastErr = err

	// Try pure-Go TCP WHOIS (works in containers without whois binary)
	data, err = s.tryTCPWHOIS(ctx, domainName)
	if err == nil && data != nil && hasValidData(data) {
		return data, nil
	}
	if lastErr == nil {
		lastErr = err
	}

	// Try native whois command
	data, err = s.tryNativeWHOIS(ctx, domainName)
	if err == nil && data != nil && hasValidData(data) {
		return data, nil
	}
	if lastErr == nil {
		lastErr = err
	}

	// Try WhoisXML API if key is configured
	if s.whoisXMLAPIKey != "" {
		data, err = s.tryWhoisXML(ctx, domainName)
		if err == nil && data != nil {
			return data, nil
		}
	}

	return nil, fmt.Errorf("all WHOIS lookup methods failed for %s: %w", domainName, lastErr)
}

// tryRDAP attempts RDAP lookup
func (s *LookupService) tryRDAP(ctx context.Context, domainName string) (*domain.WHOISData, error) {
	// Get TLD
	parts := strings.Split(domainName, ".")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid domain format")
	}
	tld := parts[len(parts)-1]

	// Get RDAP base URL
	baseURL, err := s.getRDAPBaseURL(ctx, tld)
	if err != nil {
		return nil, err
	}

	// Make RDAP request
	url := fmt.Sprintf("%s/domain/%s", baseURL, domainName)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/rdap+json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("RDAP returned status %d", resp.StatusCode)
	}

	var rdapResp struct {
		LdhName string   `json:"ldhName"`
		Handle  string   `json:"handle"`
		Status  []string `json:"status"`
		Events  []struct {
			EventAction string `json:"eventAction"`
			EventDate   string `json:"eventDate"`
		} `json:"events"`
		Entities []struct {
			Roles     []string `json:"roles"`
			PublicIds []struct {
				Type       string `json:"type"`
				Identifier string `json:"identifier"`
			} `json:"publicIds"`
			VCardArray []interface{} `json:"vcardArray"`
		} `json:"entities"`
		SecureDNS struct {
			ZoneSigned bool `json:"zoneSigned"`
		} `json:"secureDNS"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&rdapResp); err != nil {
		return nil, err
	}

	// Parse events
	var creationDate, expiryDate, updatedDate *time.Time
	for _, event := range rdapResp.Events {
		t, _ := time.Parse(time.RFC3339, event.EventDate)
		switch event.EventAction {
		case "registration":
			creationDate = &t
		case "expiration":
			expiryDate = &t
		case "last changed":
			updatedDate = &t
		}
	}

	// Find registrar
	var registrarName, registrarID string
	for _, entity := range rdapResp.Entities {
		for _, role := range entity.Roles {
			if role == "registrar" {
				// Try to get name from vCard
				if len(entity.VCardArray) > 1 {
					if vcard, ok := entity.VCardArray[1].([]interface{}); ok {
						for _, item := range vcard {
							if arr, ok := item.([]interface{}); ok && len(arr) >= 4 {
								if arr[0] == "fn" {
									if name, ok := arr[3].(string); ok {
										registrarName = name
									}
								}
							}
						}
					}
				}
				// Get IANA ID
				for _, pid := range entity.PublicIds {
					if pid.Type == "IANA Registrar ID" {
						registrarID = pid.Identifier
					}
				}
			}
		}
	}

	dnssec := ""
	if rdapResp.SecureDNS.ZoneSigned {
		dnssec = "signed"
	}

	return &domain.WHOISData{
		DomainName: rdapResp.LdhName,
		Status:     rdapResp.Status,
		DNSSEC:     dnssec,
		Dates: domain.WHOISDates{
			ExpiryDate:   expiryDate,
			CreationDate: creationDate,
			UpdatedDate:  updatedDate,
		},
		Registrar: domain.WHOISRegistrar{
			Name:             registrarName,
			ID:               registrarID,
			URL:              "",
			RegistryDomainID: rdapResp.Handle,
		},
	}, nil
}

// tryNativeWHOIS tries the native whois command
func (s *LookupService) tryNativeWHOIS(ctx context.Context, domainName string) (*domain.WHOISData, error) {
	// Check if whois command exists
	_, err := exec.LookPath("whois")
	if err != nil {
		return nil, fmt.Errorf("whois command not found")
	}

	// Execute whois with timeout
	cmdCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(cmdCtx, "whois", domainName)
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	return s.parseWHOISOutput(string(output), domainName)
}

// whoisServers maps common TLDs to their WHOIS servers
var whoisServers = map[string]string{
	"com":    "whois.verisign-grs.com",
	"net":    "whois.verisign-grs.com",
	"org":    "whois.pir.org",
	"io":     "whois.nic.io",
	"co":     "whois.nic.co",
	"dev":    "whois.nic.google",
	"app":    "whois.nic.google",
	"xyz":    "whois.nic.xyz",
	"info":   "whois.afilias.net",
	"biz":    "whois.biz",
	"us":     "whois.nic.us",
	"uk":     "whois.nic.uk",
	"de":     "whois.denic.de",
	"fr":     "whois.nic.fr",
	"eu":     "whois.eu",
	"nl":     "whois.domain-registry.nl",
	"ca":     "whois.cira.ca",
	"au":     "whois.auda.org.au",
	"me":     "whois.nic.me",
	"tv":     "whois.nic.tv",
	"cc":     "whois.nic.cc",
	"ws":     "whois.website.ws",
	"name":   "whois.nic.name",
	"mobi":   "whois.dotmobiregistry.net",
	"asia":   "whois.nic.asia",
	"pro":    "whois.nic.pro",
	"jobs":   "whois.nic.jobs",
	"travel": "whois.nic.travel",
}

// tryTCPWHOIS performs WHOIS lookup via direct TCP connection (port 43)
func (s *LookupService) tryTCPWHOIS(ctx context.Context, domainName string) (*domain.WHOISData, error) {
	parts := strings.Split(domainName, ".")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid domain format")
	}
	tld := strings.ToLower(parts[len(parts)-1])

	server, ok := whoisServers[tld]
	if !ok {
		// Fallback to IANA for unknown TLDs
		server = "whois.iana.org"
	}

	addr := net.JoinHostPort(server, "43")

	dialer := &net.Dialer{Timeout: 10 * time.Second}
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("tcp whois dial failed: %w", err)
	}
	defer conn.Close()

	// Some servers require the domain followed by \r\n
	query := domainName + "\r\n"
	if _, err := conn.Write([]byte(query)); err != nil {
		return nil, fmt.Errorf("tcp whois write failed: %w", err)
	}

	// Read response with deadline
	if err := conn.SetReadDeadline(time.Now().Add(10 * time.Second)); err != nil {
		return nil, err
	}

	var output strings.Builder
	buf := make([]byte, 4096)
	for {
		n, err := conn.Read(buf)
		if n > 0 {
			output.Write(buf[:n])
		}
		if err != nil {
			break
		}
	}

	return s.parseWHOISOutput(output.String(), domainName)
}

// tryWhoisXML tries the WhoisXML API
func (s *LookupService) tryWhoisXML(ctx context.Context, domainName string) (*domain.WHOISData, error) {
	if s.whoisXMLAPIKey == "" {
		return nil, fmt.Errorf("no API key configured")
	}

	url := fmt.Sprintf(
		"https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=%s&outputFormat=json&domainName=%s",
		s.whoisXMLAPIKey, domainName,
	)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("WhoisXML API returned %d", resp.StatusCode)
	}

	var result struct {
		WhoisRecord struct {
			DomainName      string `json:"domainName"`
			RegistrarName   string `json:"registrarName"`
			RegistrarIANAID string `json:"registrarIANAID"`
			RegistryData    struct {
				Status                string `json:"status"`
				CreatedDateNormalized string `json:"createdDateNormalized"`
				ExpiresDateNormalized string `json:"expiresDateNormalized"`
				UpdatedDateNormalized string `json:"updatedDateNormalized"`
				WhoisServer           string `json:"whoisServer"`
			} `json:"registryData"`
		} `json:"WhoisRecord"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	record := result.WhoisRecord
	registry := record.RegistryData

	creationDate, _ := time.Parse("2006-01-02", registry.CreatedDateNormalized)
	expiryDate, _ := time.Parse("2006-01-02", registry.ExpiresDateNormalized)
	updatedDate, _ := time.Parse("2006-01-02", registry.UpdatedDateNormalized)

	return &domain.WHOISData{
		DomainName: record.DomainName,
		Status:     strings.Split(registry.Status, ", "),
		Dates: domain.WHOISDates{
			ExpiryDate:   &expiryDate,
			CreationDate: &creationDate,
			UpdatedDate:  &updatedDate,
		},
		Registrar: domain.WHOISRegistrar{
			Name: record.RegistrarName,
			ID:   record.RegistrarIANAID,
			URL:  fmt.Sprintf("https://%s", registry.WhoisServer),
		},
	}, nil
}

// parseWHOISOutput parses the raw WHOIS text output
func (s *LookupService) parseWHOISOutput(output, domainName string) (*domain.WHOISData, error) {
	lines := strings.Split(output, "\n")
	data := make(map[string]string)

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "%") {
			continue
		}

		// Parse "Key: Value" format
		if idx := strings.Index(line, ":"); idx > 0 {
			key := strings.ToLower(strings.TrimSpace(line[:idx]))
			value := strings.TrimSpace(line[idx+1:])
			// Normalize key
			key = strings.ReplaceAll(key, " ", "_")
			key = strings.ReplaceAll(key, "/", "_")
			if value != "" && !strings.HasPrefix(value, "REDACTED") {
				data[key] = value
			}
		}
	}

	// Extract dates
	expiryDate := s.parseDate(data["registry_expiry_date"], data["registrar_registration_expiration_date"],
		data["expiry_date"], data["expiration_time"], data["expire"], data["paid_until"])
	creationDate := s.parseDate(data["creation_date"], data["created_date"], data["registration_time"])
	updatedDate := s.parseDate(data["updated_date"], data["last_updated"])

	// Extract registrar - try multiple field names used by different WHOIS servers
	registrarName := data["registrar"]
	if registrarName == "" {
		registrarName = data["registrar_name"]
	}
	if registrarName == "" {
		registrarName = data["sponsoring_registrar"]
	}
	if registrarName == "" {
		registrarName = data["registrar_organization"]
	}
	if registrarName == "" {
		registrarName = "Unknown"
	}

	// Parse status
	statusStr := data["domain_status"]
	var statuses []string
	if statusStr != "" {
		statuses = s.parseStatus(statusStr)
	}

	// Extract registrant contact info
	registrant := domain.WHOISContact{
		Name:         data["registrant_name"],
		Organization: data["registrant_organization"],
		Street:       data["registrant_street"],
		City:         data["registrant_city"],
		State:        data["registrant_state_province"],
		Country:      data["registrant_country"],
		PostalCode:   data["registrant_postal_code"],
	}

	// Try alternate field names for registrant
	if registrant.Name == "" {
		registrant.Name = data["registrant"]
	}
	if registrant.Organization == "" {
		registrant.Organization = data["org"]
	}
	if registrant.Country == "" {
		registrant.Country = data["country"]
	}

	// Parse DNSSEC more thoroughly
	dnssec := data["dnssec"]
	if dnssec == "" {
		// Try alternate field names
		dnssec = data["dnssec_signed"]
	}
	if dnssec == "" {
		dnssec = data["signed_dnssec"]
	}
	// Normalize DNSSEC value
	dnssec = strings.ToLower(strings.TrimSpace(dnssec))
	if dnssec == "signed" || dnssec == "yes" || dnssec == "true" {
		dnssec = "signed"
	} else if dnssec == "unsigned" || dnssec == "no" || dnssec == "false" {
		dnssec = "unsigned"
	}

	return &domain.WHOISData{
		DomainName: domainName,
		Status:     statuses,
		DNSSEC:     dnssec,
		Dates: domain.WHOISDates{
			ExpiryDate:   expiryDate,
			CreationDate: creationDate,
			UpdatedDate:  updatedDate,
		},
		Registrar: domain.WHOISRegistrar{
			Name:             registrarName,
			ID:               data["registrar_iana_id"],
			URL:              data["registrar_url"],
			RegistryDomainID: data["registry_domain_id"],
		},
		Registrant: registrant,
		Abuse: domain.WHOISAbuse{
			Email: data["registrar_abuse_contact_email"],
			Phone: data["registrar_abuse_contact_phone"],
		},
	}, nil
}

// parseDate attempts to parse a date from multiple possible formats
func (s *LookupService) parseDate(dates ...string) *time.Time {
	formats := []string{
		// Standard ISO formats
		"2006-01-02",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05-07:00",
		"2006-01-02 15:04:05",
		"2006-01-02 15:04:05.0",
		// US formats
		"01/02/2006",
		"01/02/2006 15:04:05",
		// European formats
		"02/01/2006",
		"02.01.2006",
		// Verbal formats
		"Jan 2 2006",
		"January 2 2006",
		"2 Jan 2006",
		"2 January 2006",
		"Jan 02 2006",
		"02-Jan-2006",
		"2-Jan-2006",
		// With timezone names
		"2006-01-02 15:04:05 MST",
		"2006-01-02 15:04:05 UTC",
		// Common registrar formats
		"Monday, January 2, 2006",
		"Mon, 02 Jan 2006 15:04:05 MST",
		"Mon, 2 Jan 2006 15:04:05 MST",
		// Additional formats
		"20060102",
		"20060102150405",
	}

	for _, dateStr := range dates {
		if dateStr == "" || dateStr == "REDACTED" || strings.Contains(dateStr, "REDACTED") {
			continue
		}
		dateStr = strings.TrimSpace(dateStr)
		// Remove common prefixes/suffixes that don't help
		dateStr = strings.TrimPrefix(dateStr, "before ")
		dateStr = strings.TrimPrefix(dateStr, "after ")

		for _, format := range formats {
			if t, err := time.Parse(format, dateStr); err == nil {
				return &t
			}
		}
	}
	return nil
}

// parseStatus parses domain status from WHOIS output
func (s *LookupService) parseStatus(statusStr string) []string {
	knownStatuses := []string{
		"clientDeleteProhibited", "clientHold", "clientRenewProhibited",
		"clientTransferProhibited", "clientUpdateProhibited",
		"serverDeleteProhibited", "serverHold", "serverRenewProhibited",
		"serverTransferProhibited", "serverUpdateProhibited",
		"inactive", "ok", "pendingCreate", "pendingDelete", "pendingRenew",
		"pendingRestore", "pendingTransfer", "pendingUpdate",
		"addPeriod", "autoRenewPeriod", "renewPeriod", "transferPeriod",
	}

	statusStr = strings.ToLower(statusStr)
	var matches []string
	for _, status := range knownStatuses {
		if strings.Contains(statusStr, strings.ToLower(status)) {
			matches = append(matches, status)
		}
	}
	return matches
}

// getRDAPBaseURL gets the RDAP base URL for a TLD
func (s *LookupService) getRDAPBaseURL(ctx context.Context, tld string) (string, error) {
	// Check cache
	if url, ok := s.rdapCache[tld]; ok {
		return url, nil
	}

	// Fetch IANA RDAP bootstrap
	url := "https://data.iana.org/rdap/dns.json"
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var bootstrap struct {
		Services [][]interface{} `json:"services"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&bootstrap); err != nil {
		return "", err
	}

	// Populate cache and find URL for this TLD
	for _, service := range bootstrap.Services {
		if len(service) >= 2 {
			tlds, ok1 := service[0].([]interface{})
			urls, ok2 := service[1].([]interface{})
			if ok1 && ok2 && len(urls) > 0 {
				if urlStr, ok := urls[0].(string); ok {
					for _, t := range tlds {
						if tldStr, ok := t.(string); ok {
							s.rdapCache[tldStr] = strings.TrimSuffix(urlStr, "/")
						}
					}
				}
			}
		}
	}

	if url, ok := s.rdapCache[tld]; ok {
		return url, nil
	}
	return "", fmt.Errorf("no RDAP server found for TLD .%s", tld)
}

// lookupDNS performs DNS lookups
func (s *LookupService) lookupDNS(ctx context.Context, domainName string, d *domain.Domain) {
	// NS records
	nsRecords, _ := net.LookupNS(domainName)
	for _, ns := range nsRecords {
		d.NameServers = append(d.NameServers, ns.Host)
	}

	// MX records
	mxRecords, _ := net.LookupMX(domainName)
	for _, mx := range mxRecords {
		d.MXRecords = append(d.MXRecords, fmt.Sprintf("%s (priority: %d)", mx.Host, mx.Pref))
	}

	// TXT records
	txtRecords, _ := net.LookupTXT(domainName)
	d.TXTRecords = txtRecords

	// IPv4
	ipv4Addrs, _ := net.LookupHost(domainName)
	for _, ip := range ipv4Addrs {
		if strings.Contains(ip, ".") {
			d.IPv4Addresses = append(d.IPv4Addresses, ip)
		}
	}

	// IPv6
	ipv6Addrs, _ := net.LookupIP(domainName)
	for _, ip := range ipv6Addrs {
		if ip.To4() == nil {
			d.IPv6Addresses = append(d.IPv6Addresses, ip.String())
		}
	}
}

// lookupSSL fetches SSL certificate info
func (s *LookupService) lookupSSL(ctx context.Context, domainName string, d *domain.Domain) {
	conn, err := tls.DialWithDialer(&net.Dialer{Timeout: 5 * time.Second}, "tcp", domainName+":443", &tls.Config{
		ServerName:         domainName,
		InsecureSkipVerify: true,
	})
	if err != nil {
		return
	}
	defer conn.Close()

	cert := conn.ConnectionState().PeerCertificates[0]
	if cert != nil {
		if len(cert.Issuer.Organization) > 0 {
			d.SSLIssuer = cert.Issuer.Organization[0]
		}
		if len(cert.Issuer.Country) > 0 {
			d.SSLIssuerCountry = cert.Issuer.Country[0]
		}
		d.SSLValidFrom = &cert.NotBefore
		d.SSLValidTo = &cert.NotAfter
		d.SSLSubject = cert.Subject.CommonName

		// Format fingerprint as colon-separated hex
		if len(cert.Signature) > 0 {
			fingerprint := fmt.Sprintf("%X", cert.Signature)
			// Add colons every 2 characters for standard format
			if len(fingerprint) > 2 {
				var formatted []string
				for i := 0; i < len(fingerprint); i += 2 {
					if i+2 <= len(fingerprint) {
						formatted = append(formatted, fingerprint[i:i+2])
					}
				}
				d.SSLFingerprint = strings.Join(formatted, ":")
			} else {
				d.SSLFingerprint = fingerprint
			}
		}

		// Extract signature algorithm
		d.SSLSignatureAlgo = cert.SignatureAlgorithm.String()

		// Safely extract key size for different key types
		switch key := cert.PublicKey.(type) {
		case *rsa.PublicKey:
			d.SSLKeySize = key.N.BitLen()
		default:
			// For ECC keys, try to determine from curve
			d.SSLKeySize = 256 // Default for ECC
		}
	}
}

// lookupHost fetches host/geolocation info
func (s *LookupService) lookupHost(ip string, d *domain.Domain) {
	// Use ip-api.com (free, no auth required for non-commercial use)
	url := fmt.Sprintf("http://ip-api.com/json/%s?fields=status,message,country,regionName,city,lat,lon,isp,org,as", ip)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return
	}
	defer resp.Body.Close()

	var result struct {
		Status  string  `json:"status"`
		Message string  `json:"message"`
		Country string  `json:"country"`
		Region  string  `json:"regionName"`
		City    string  `json:"city"`
		Lat     float64 `json:"lat"`
		Lon     float64 `json:"lon"`
		ISP     string  `json:"isp"`
		Org     string  `json:"org"`
		AS      string  `json:"as"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return
	}

	if result.Status == "success" {
		d.HostCountry = result.Country
		d.HostRegion = result.Region
		d.HostCity = result.City
		d.HostLat = result.Lat
		d.HostLon = result.Lon
		d.HostISP = result.ISP
		d.HostOrg = result.Org
		d.HostAS = result.AS
	}
}

// applyWHOISData applies WHOIS data to domain struct
func (s *LookupService) applyWHOISData(d *domain.Domain, whois *domain.WHOISData) {
	d.DomainName = whois.DomainName
	d.Status = strings.Join(whois.Status, ", ")
	d.DNSSEC = whois.DNSSEC
	d.ExpiryDate = whois.Dates.ExpiryDate
	d.CreationDate = whois.Dates.CreationDate
	d.UpdatedDate = whois.Dates.UpdatedDate
	d.RegistrarName = whois.Registrar.Name
	d.RegistrarID = whois.Registrar.ID
	d.RegistrarURL = whois.Registrar.URL
	d.RegistryDomainID = whois.Registrar.RegistryDomainID

	// Apply registrant contact info if available
	if whois.Registrant.Name != "" || whois.Registrant.Organization != "" {
		d.RegistrantName = whois.Registrant.Name
		d.RegistrantOrg = whois.Registrant.Organization
		d.RegistrantStreet = whois.Registrant.Street
		d.RegistrantCity = whois.Registrant.City
		d.RegistrantState = whois.Registrant.State
		d.RegistrantCountry = whois.Registrant.Country
		d.RegistrantPostal = whois.Registrant.PostalCode
	}

	// Apply abuse contact info
	if whois.Abuse.Email != "" || whois.Abuse.Phone != "" {
		d.AbuseEmail = whois.Abuse.Email
		d.AbusePhone = whois.Abuse.Phone
	}
}

// cleanDomain cleans and normalizes a domain name
func cleanDomain(domain string) string {
	// Remove protocol
	domain = regexp.MustCompile(`^https?://`).ReplaceAllString(domain, "")
	// Remove www prefix
	domain = regexp.MustCompile(`^www\.`).ReplaceAllString(domain, "")
	// Remove path and query
	if idx := strings.IndexAny(domain, "/?#"); idx != -1 {
		domain = domain[:idx]
	}
	// Remove port
	if idx := strings.Index(domain, ":"); idx != -1 {
		domain = domain[:idx]
	}
	return strings.ToLower(strings.TrimSpace(domain))
}

// hasValidData checks if WHOIS data has useful parsed fields
func hasValidData(data *domain.WHOISData) bool {
	if data == nil {
		return false
	}
	// Accept if we got any meaningful data
	if data.Dates.ExpiryDate != nil || data.Dates.CreationDate != nil {
		return true
	}
	if data.Registrar.Name != "" && data.Registrar.Name != "Unknown" {
		return true
	}
	if len(data.Status) > 0 {
		return true
	}
	return false
}

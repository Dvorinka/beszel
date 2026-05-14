package detect

import (
	"net/http"
	"strings"
)

// ProviderInfo holds detected provider name
type ProviderInfo struct {
	Name string
}

// DetectDNSProvider detects the DNS provider from NS records
func DetectDNSProvider(nsRecords []string) string {
	for _, ns := range nsRecords {
		nsLower := strings.ToLower(ns)
		switch {
		case strings.Contains(nsLower, "cloudflare"):
			return "Cloudflare"
		case strings.Contains(nsLower, "awsdns"):
			return "Amazon Route 53"
		case strings.Contains(nsLower, "googledomains") || strings.Contains(nsLower, "google.com"):
			return "Google Domains"
		case strings.Contains(nsLower, "namecheap") || strings.Contains(nsLower, "namecheaphosting"):
			return "Namecheap"
		case strings.Contains(nsLower, "godaddy"):
			return "GoDaddy"
		case strings.Contains(nsLower, "domaincontrol"):
			return "GoDaddy"
		case strings.Contains(nsLower, "nsone.net"):
			return "NS1"
		case strings.Contains(nsLower, "digitalocean"):
			return "DigitalOcean"
		case strings.Contains(nsLower, "linode"):
			return "Linode"
		case strings.Contains(nsLower, "vultr"):
			return "Vultr"
		case strings.Contains(nsLower, "he.net"):
			return "Hurricane Electric"
		case strings.Contains(nsLower, "dyn.com") || strings.Contains(nsLower, "dynect"):
			return "Dyn (Oracle)"
		case strings.Contains(nsLower, "ultradns"):
			return "UltraDNS"
		case strings.Contains(nsLower, "dnsimple"):
			return "DNSimple"
		case strings.Contains(nsLower, "hover"):
			return "Hover"
		case strings.Contains(nsLower, "register.com"):
			return "Register.com"
		case strings.Contains(nsLower, "enom"):
			return "eNom"
		case strings.Contains(nsLower, "worldnic"):
			return "Network Solutions"
		case strings.Contains(nsLower, "zoneedit"):
			return "ZoneEdit"
		case strings.Contains(nsLower, "easydns"):
			return "EasyDNS"
		case strings.Contains(nsLower, "gandi"):
			return "Gandi"
		case strings.Contains(nsLower, "ovh"):
			return "OVH"
		case strings.Contains(nsLower, "hetzner"):
			return "Hetzner"
		case strings.Contains(nsLower, "azure-dns"):
			return "Microsoft Azure"
		}
	}
	return ""
}

// DetectEmailProvider detects the email provider from MX records
func DetectEmailProvider(mxRecords []string) string {
	for _, mx := range mxRecords {
		mxLower := strings.ToLower(mx)
		// Extract just the hostname part if it has priority prefix
		host := mxLower
		if idx := strings.Index(mxLower, " "); idx > 0 {
			host = strings.TrimSpace(mxLower[idx+1:])
		}
		host = strings.TrimSuffix(host, ".")

		switch {
		case strings.Contains(host, "google") || strings.Contains(host, "gmail"):
			return "Google Workspace"
		case strings.Contains(host, "outlook") || strings.Contains(host, "microsoft") || strings.Contains(host, "protection.outlook"):
			return "Microsoft 365"
		case strings.Contains(host, "purelymail"):
			return "Purelymail"
		case strings.Contains(host, "zoho"):
			return "Zoho Mail"
		case strings.Contains(host, "protonmail") || strings.Contains(host, "pm.me"):
			return "ProtonMail"
		case strings.Contains(host, "fastmail"):
			return "Fastmail"
		case strings.Contains(host, "tutanota"):
			return "Tutanota"
		case strings.Contains(host, "mxroute"):
			return "MXroute"
		case strings.Contains(host, "namecheap"):
			return "Namecheap"
		case strings.Contains(host, "icloud") || strings.Contains(host, "me.com"):
			return "iCloud Mail"
		case strings.Contains(host, "yahoo"):
			return "Yahoo"
		case strings.Contains(host, "qq.com"):
			return "QQ Mail"
		case strings.Contains(host, "mail.ru"):
			return "Mail.ru"
		case strings.Contains(host, "yandex"):
			return "Yandex"
		case strings.Contains(host, "hover"):
			return "Hover"
		case strings.Contains(host, "godaddy") || strings.Contains(host, "domaincontrol"):
			return "GoDaddy"
		case strings.Contains(host, "pobox"):
			return "Pobox"
		case strings.Contains(host, "runbox"):
			return "Runbox"
		case strings.Contains(host, "posteo"):
			return "Posteo"
		case strings.Contains(host, "mailbox.org"):
			return "Mailbox.org"
		case strings.Contains(host, "forwardemail"):
			return "Forward Email"
		case strings.Contains(host, "improvmx"):
			return "ImprovMX"
		case strings.Contains(host, "cloudflare"):
			return "Cloudflare Email Routing"
		case strings.Contains(host, "amazonaws") || strings.Contains(host, "aws"):
			return "Amazon SES"
		case strings.Contains(host, "sendgrid") || strings.Contains(host, "twilio"):
			return "SendGrid"
		case strings.Contains(host, "mailgun"):
			return "Mailgun"
		case strings.Contains(host, "postmark"):
			return "Postmark"
		}
	}
	return ""
}

// DetectHostingProvider detects the hosting provider from HTTP headers
func DetectHostingProvider(headers http.Header) string {
	server := strings.ToLower(headers.Get("Server"))
	poweredBy := strings.ToLower(headers.Get("X-Powered-By"))
	cfRay := headers.Get("CF-Ray")
	vercelCache := headers.Get("X-Vercel-Cache")
	vercelID := headers.Get("X-Vercel-Id")
	netlifyID := headers.Get("X-NF-Request-Id")
	githubRequest := headers.Get("X-GitHub-Request-Id")

	switch {
	case vercelCache != "" || vercelID != "":
		return "Vercel"
	case netlifyID != "":
		return "Netlify"
	case githubRequest != "":
		return "GitHub Pages"
	case cfRay != "":
		return "Cloudflare"
	case strings.Contains(server, "cloudflare"):
		return "Cloudflare"
	case strings.Contains(server, "nginx") && vercelCache != "":
		return "Vercel"
	case strings.Contains(server, "awselb") || strings.Contains(server, "elb"):
		return "AWS"
	case strings.Contains(server, "amazon"):
		return "AWS"
	case strings.Contains(server, "microsoft-iis"):
		return "Microsoft Azure"
	case strings.Contains(server, "google") || strings.Contains(server, "gws"):
		return "Google Cloud"
	case strings.Contains(server, "heroku"):
		return "Heroku"
	case strings.Contains(server, "digitalocean"):
		return "DigitalOcean"
	case strings.Contains(server, "linode"):
		return "Linode"
	case strings.Contains(server, "ovh"):
		return "OVH"
	case strings.Contains(server, "hetzner"):
		return "Hetzner"
	case strings.Contains(server, "fastly"):
		return "Fastly"
	case strings.Contains(server, "bunnycdn"):
		return "BunnyCDN"
	case strings.Contains(server, "keycdn"):
		return "KeyCDN"
	case strings.Contains(server, "stackpath"):
		return "StackPath"
	case strings.Contains(server, "sucuri"):
		return "Sucuri"
	case strings.Contains(poweredBy, "next.js") || strings.Contains(poweredBy, "nextjs"):
		return "Vercel"
	case strings.Contains(poweredBy, "php"):
		return "PHP"
	case strings.Contains(server, "apache"):
		return "Apache"
	case strings.Contains(server, "nginx"):
		return "nginx"
	case strings.Contains(server, "caddy"):
		return "Caddy"
	case strings.Contains(server, "lighttpd"):
		return "Lighttpd"
	case strings.Contains(server, "litespeed"):
		return "LiteSpeed"
	case strings.Contains(server, "openresty"):
		return "OpenResty"
	case strings.Contains(server, "jetty"):
		return "Jetty"
	case strings.Contains(server, "tomcat"):
		return "Tomcat"
	case strings.Contains(server, "iis"):
		return "IIS"
	}
	return ""
}

// DetectCertificateAuthority detects the CA from an issuer string
func DetectCertificateAuthority(issuer string) string {
	issuerLower := strings.ToLower(issuer)
	switch {
	case strings.Contains(issuerLower, "let's encrypt"):
		return "Let's Encrypt"
	case strings.Contains(issuerLower, "digicert"):
		return "DigiCert"
	case strings.Contains(issuerLower, "sectigo") || strings.Contains(issuerLower, "comodoca"):
		return "Sectigo"
	case strings.Contains(issuerLower, "globalsign"):
		return "GlobalSign"
	case strings.Contains(issuerLower, "geotrust"):
		return "GeoTrust"
	case strings.Contains(issuerLower, "thawte"):
		return "Thawte"
	case strings.Contains(issuerLower, "rapidssl"):
		return "RapidSSL"
	case strings.Contains(issuerLower, "symantec"):
		return "Symantec"
	case strings.Contains(issuerLower, "entrust"):
		return "Entrust"
	case strings.Contains(issuerLower, "certum"):
		return "Certum"
	case strings.Contains(issuerLower, "go daddy") || strings.Contains(issuerLower, "godaddy"):
		return "GoDaddy"
	case strings.Contains(issuerLower, "amazon"):
		return "Amazon"
	case strings.Contains(issuerLower, "google") && strings.Contains(issuerLower, "trust"):
		return "Google Trust Services"
	case strings.Contains(issuerLower, "cloudflare"):
		return "Cloudflare"
	case strings.Contains(issuerLower, "zero ssl") || strings.Contains(issuerLower, "zerossl"):
		return "ZeroSSL"
	case strings.Contains(issuerLower, "ssl.com"):
		return "SSL.com"
	case strings.Contains(issuerLower, "buypass"):
		return "Buypass"
	case strings.Contains(issuerLower, "harica"):
		return "HARICA"
	case strings.Contains(issuerLower, " Actalis "):
		return "Actalis"
	case strings.Contains(issuerLower, "swisssign"):
		return "SwissSign"
	case strings.Contains(issuerLower, "telekom"):
		return "Telekom"
	case strings.Contains(issuerLower, "trustwave"):
		return "Trustwave"
	case strings.Contains(issuerLower, "identrust"):
		return "IdenTrust"
	case strings.Contains(issuerLower, "usertrust"):
		return "UserTrust"
	case strings.Contains(issuerLower, "isrg") || strings.Contains(issuerLower, "internet security research"):
		return "Let's Encrypt"
	}
	return issuer
}

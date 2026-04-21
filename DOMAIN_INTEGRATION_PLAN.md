# Domain Locker + Beszel Integration Plan

## Overview
Integrate Domain Locker's domain expiry monitoring as a third dashboard section in Beszel:
1. Device Monitoring (Systems)
2. Website Monitoring (Monitors) 
3. Domain Monitoring (Domains)

## Features to Port
- WHOIS lookup (registrar, dates, status)
- SSL certificate monitoring
- DNS records (NS, MX, TXT)
- IP addresses (IPv4/IPv6)
- Host info (location, ISP)
- Domain valuation
- Tags
- Change history
- Auto-recognition when adding website monitors

## Implementation Steps

### 1. Backend (Go)
- Domain entity types
- WHOIS service with multiple fallback methods
- Domain collections (domains, domain_history)
- Domain scheduler for expiry checks
- Domain API handlers

### 2. Frontend (React/TypeScript)
- Domain API client
- Domain table component
- Domain dialog (add/edit with WHOIS auto-fill)
- Dashboard integration (third section)
- Link to website monitors

### 3. Integration
- Optional domain tracking when creating website monitors
- Registrar recognition fixes
- Favicon fetching

## File Structure
```
beszel/internal/
├── entities/domain/domain.go
├── hub/domains/
│   ├── whois/
│   │   └── lookup.go
│   ├── scheduler.go
│   └── api.go
└── site/src/
    ├── lib/domains.ts
    └── components/
        └── domains-table/
            ├── domains-table.tsx
            └── domain-dialog.tsx
```

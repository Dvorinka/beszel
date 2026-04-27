# Beszel Enhanced - Codebase Analysis

## Executive Summary

Backend compiles and frontend builds. Multiple critical gaps prevent "release ready" status. Domain WHOIS lookup is unreliable. Docker setup is broken. Frontend lacks routes for major features. Documentation is outdated.

---

## Build Status

| Component | Status | Notes |
|-----------|--------|-------|
| Go Backend | Compiles | `go build ./...` exits 0 |
| Frontend (npm) | Builds | `npm run build` exits 0 with Lingui warnings |
| Docker Hub | Broken | Dockerfile in `internal/` references `../go.mod` |
| Docker Agent | Broken | Same path issue as hub |
| Tests | Partial | `go test` not fully validated |

---

## Critical Issues

### 1. Domain WHOIS Lookup Unreliable
**Impact: HIGH** - Core feature from prompt.md fails.

- `hasValidData()` returns false when RDAP returns partial data
- Native `whois` binary unavailable in scratch containers
- `.dev` TLD RDAP via IANA bootstrap may fail parsing
- `applyWHOISData()` sets `d.Status = strings.Join(whois.Status, ", ")` but scheduler then overwrites it with computed status - mismatch
- No DNS-based fallback for domains without public WHOIS (common with privacy protection)

**Files:** `internal/hub/domains/whois/lookup.go`, `internal/hub/domains/scheduler.go`

### 2. Docker Build Broken
**Impact: HIGH** - Cannot containerize.

- `internal/dockerfile_hub` and `internal/dockerfile_agent` use `COPY ../go.mod ../go.sum ./`
- Docker build context from `internal/` cannot access parent `../go.mod`
- No root-level `Dockerfile` or `docker-compose.yml`
- Makefile has no `docker-build` targets

### 3. Frontend Missing Routes
**Impact: HIGH** - Users cannot access implemented features.

`main.tsx` only renders: `home`, `system`, `domain`, `monitor`, `containers`, `smart`, `settings`.

Missing routes:
- `forgot_password` / `request_otp` (router defines, App ignores)
- Status pages management (component exists: `status-pages-table`)
- Incident management (component exists but no route)
- Calendar view (component exists but no route)
- Badge management (backend only)
- Bulk import/export UI (backend only)

### 4. Navbar Missing Navigation
**Impact: MEDIUM**

No links to:
- Status Pages
- Incidents
- Calendar
- Domain/Monitor management from nav (only in dashboard sections)

### 5. Documentation Outdated
**Impact: MEDIUM**

- README references "fork of Beszel" - should be standalone product
- No Docker build instructions
- No feature list matching implemented capabilities
- Missing architecture diagram or API docs

### 6. gitignore Incomplete
**Impact: LOW**

- Missing `reference/` (1256 items, 250MB+)
- Missing `beszel-server`, `beszel-test` binaries
- Missing `test_output/`

### 7. Source Code TODOs
**Impact: LOW**

- `internal/hub/hub.go:184` - "move to users package"
- `internal/hub/settings/api.go:223` - test notification stub
- `internal/entities/system/system.go` - 3 TODOs about field cleanup
- `internal/hub/systems/systems_test.go` - 3 TODOs about test relocation

### 8. Empty File
**Impact: LOW**

- `internal/site/src/lib/time.ts` is 0 bytes. Build succeeds (not imported).

---

## Feature Completeness vs Prompt.md

| Prompt Feature | Status | Gap |
|----------------|--------|-----|
| Domain expiry monitoring | Implemented | WHOIS lookup unreliable |
| SSL certificate monitoring | Implemented | Works |
| Registrar info | Implemented | Recognition sometimes fails |
| DNS records | Implemented | Works |
| IP addresses | Implemented | Works |
| Host info | Implemented | Works |
| Domain valuation | Partial | Fields exist, no auto-valuation |
| Tags / change history | Implemented | Works |
| Auto-recognition on add | Implemented | Auto-lookup in dialog |
| Website monitoring | Implemented | HTTP/TCP/Ping/DNS/Keyword/JSON |
| Response time graphs | Implemented | Recharts in monitor detail |
| Maintenance windows | Backend only | No frontend UI |
| Status pages | Backend + partial frontend | No route/page |
| Incident management | Backend + partial frontend | No route/page |
| Calendar view | Component only | No route/page |
| CSV export | Backend only | No frontend UI |
| Bulk import | Backend only | No frontend UI |
| Push notifications | Backend + SW | Works |
| PWA | Manifest + SW | Works |
| Prometheus metrics | Implemented | `/metrics` endpoint |
| Badge generator | Implemented | SVG badges |
| PageSpeed insights | Backend only | No frontend display |

---

## File Inventory

### Backend (Go)
- `internal/cmd/hub/hub.go` - Entry point
- `internal/hub/hub.go` - Hub orchestration
- `internal/hub/domains/` - Domain API + scheduler + WHOIS
- `internal/hub/monitors/` - Monitor API + scheduler + checks
- `internal/hub/statuspages/` - Status page API
- `internal/hub/incidents/` - Incident API
- `internal/hub/maintenance/` - Maintenance API
- `internal/hub/badges/` - Badge API
- `internal/hub/bulk/` - Bulk import/export API
- `internal/hub/settings/` - Settings API
- `internal/hub/export/` - CSV/Prometheus export
- `internal/hub/notifications/` - Notification providers (7 types)
- `internal/hub/pagespeed/` - PageSpeed checker
- `internal/migrations/1_add_monitor_collections.go` - DB schema
- `internal/entities/domain/domain.go` - Domain types
- `internal/entities/monitor/monitor.go` - Monitor types
- `internal/entities/incident/incident.go` - Incident types
- `internal/entities/statuspage/statuspage.go` - Status page types

### Frontend (React/TypeScript)
- `internal/site/src/main.tsx` - App entry + routing
- `internal/site/src/components/router.tsx` - Route definitions
- `internal/site/src/components/routes/home.tsx` - Dashboard (3 sections)
- `internal/site/src/components/routes/domain.tsx` - Domain detail
- `internal/site/src/components/routes/monitor.tsx` - Monitor detail
- `internal/site/src/components/domains-table/` - Domain list + dialog
- `internal/site/src/components/monitors-table/` - Monitor list + dialog
- `internal/site/src/components/status-pages/` - Status page components (orphaned)
- `internal/site/src/components/calendar/calendar-view.tsx` - Calendar (orphaned)
- `internal/site/src/components/notifications/` - Notification settings
- `internal/site/src/lib/domains.ts` - Domain API client
- `internal/site/src/lib/monitors.ts` - Monitor API client
- `internal/site/src/lib/statuspages.ts` - Status page API client
- `internal/site/src/lib/incidents.ts` - Incident API client
- `internal/site/public/manifest.json` - PWA manifest
- `internal/site/public/sw.js` - Service worker

---

## Recommendations

1. **Fix WHOIS lookup** - Add robust fallback using certificate expiry + DNS SOA as proxy for domain age. Improve RDAP parsing for .dev and newer TLDs. Bundle `whois` binary or use pure-Go WHOIS library.

2. **Fix Docker** - Move Dockerfiles to repo root. Add `docker-compose.yml` with hub + agent services. Add `docker-build` targets to Makefile.

3. **Wire frontend routes** - Add status pages, incidents, calendar to `main.tsx` routing. Add nav links.

4. **Rewrite README** - Product-focused, feature matrix, quick start with Docker, API overview.

5. **Clean gitignore** - Exclude `reference/`, build artifacts, data dirs.

6. **Resolve TODOs** - Either implement or remove before release.

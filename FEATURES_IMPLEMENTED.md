# Features Implementation Summary

## Completed Features

### 1. Status Pages (HIGH PRIORITY) ✅
**Files:**
- `internal/hub/statuspages/api.go` - Full CRUD API for status pages
- `internal/migrations/1_add_monitor_collections.go` - Added collections:
  - `status_pages` - Store status page configuration
  - `status_page_monitors` - Link monitors to status pages

**Features:**
- Create/update/delete status pages with custom slug
- Add/remove monitors from status pages
- Public status page endpoint at `/status/:slug`
- Configurable themes (light/dark/auto)
- Custom CSS support
- Logo/favicon upload
- Show/hide uptime percentages
- Group monitors by category

**API Endpoints:**
- `GET /status/:slug` - Public status page (no auth)
- `GET /api/beszel/status-pages` - List status pages
- `POST /api/beszel/status-pages` - Create status page
- `GET/PATCH/DELETE /api/beszel/status-pages/:id`
- `POST /api/beszel/status-pages/:id/monitors` - Add monitor
- `DELETE /api/beszel/status-pages/:id/monitors/:monitorId`

---

### 2. Maintenance Windows (HIGH PRIORITY) ✅
**Files:**
- `internal/hub/maintenance/api.go` - Full maintenance window API
- `internal/migrations/1_add_monitor_collections.go` - Added collection:
  - `maintenance_windows` - Store maintenance schedules
- `internal/alerts/alerts.go` - Integrated maintenance check

**Features:**
- Schedule maintenance windows for monitors/domains
- Recurring maintenance support (with pattern storage)
- Suppress alerts during maintenance
- Status tracking (scheduled/in_progress/completed/cancelled)
- Cancel maintenance windows
- API to check if in maintenance window

**API Endpoints:**
- `GET /api/beszel/maintenance` - List maintenance windows
- `POST /api/beszel/maintenance` - Create maintenance window
- `GET/PATCH/DELETE /api/beszel/maintenance/:id`
- `POST /api/beszel/maintenance/:id/cancel` - Cancel maintenance

**Alert Suppression:**
Alerts are automatically suppressed when a monitor or domain is in an active maintenance window with `suppress_alerts=true`.

---

### 3. Prometheus Export (MEDIUM PRIORITY) ✅
**Files:**
- `internal/hub/export/csv.go` - Added Prometheus endpoint

**Features:**
- Public `/metrics` endpoint (no auth required)
- System metrics (status, CPU, memory, disk usage)
- Monitor metrics (status, response time)
- Domain metrics (status, days until expiry, SSL days)
- Incident metrics (active count)

**Metrics Format:**
```
beszel_system_status{name="server1"} 0
beszel_system_cpu_usage{name="server1"} 45.2
beszel_monitor_status{name="api",user="xxx"} 0
beszel_monitor_response_time_ms{name="api",user="xxx"} 123
beszel_domain_status{domain="example.com",user="xxx"} 0
beszel_domain_days_until_expiry{domain="example.com",user="xxx"} 365
beszel_incidents_active 0
```

---

### 4. Subdomain Tracking (MEDIUM PRIORITY) ✅
**Files:**
- `internal/hub/domains/scheduler.go` - Added `discoverSubdomains()`
- `internal/migrations/1_add_monitor_collections.go` - Added collection:
  - `subdomains` - Store discovered subdomains

**Features:**
- Automatic subdomain discovery during domain check
- Checks 50 common subdomains (www, mail, api, blog, etc.)
- DNS resolution to verify existence
- Stores IP addresses for each subdomain
- Tracks status and last checked time
- Prevents duplicate entries

**Discovery List Includes:**
www, mail, ftp, api, blog, shop, admin, app, cdn, static, dev, staging, test, demo, docs, support, help, status, monitor, grafana, prometheus, db, cache, redis, queue, worker, backup, media, assets, download, upload, git, gitlab, github, jenkins, ci, cd, vpn, ssh, smtp, imap, mx, webmail, email, analytics, stats, search, login, auth, sso, oauth, account, user

---

### 5. Bulk Import/Export (MEDIUM PRIORITY) ✅
**Files:**
- `internal/hub/bulk/api.go` - Full bulk import/export API
- `internal/hub/hub.go` - Wired up bulk API

**Features:**
- CSV import for domains (name, tags, notes, auto_renew)
- CSV import for monitors (name, URL, type, interval, retries)
- JSON export for domains (full data including WHOIS, SSL, DNS)
- JSON export for monitors (full data including stats)
- Duplicate detection
- Import result summary (success/failed counts with errors)

**API Endpoints:**
- `POST /api/beszel/bulk/import/domains` - CSV upload
- `POST /api/beszel/bulk/import/monitors` - CSV upload
- `GET /api/beszel/bulk/export/domains` - JSON download
- `GET /api/beszel/bulk/export/monitors` - JSON download

**CSV Format (Domains):**
```csv
domain_name,tags,notes,auto_renew
example.com,"tag1,tag2",My notes,true
```

**CSV Format (Monitors):**
```csv
name,url,type,interval,retries
API,https://api.example.com,http,60,3
```

---

## Remaining Features (Not Implemented)

### HIGH PRIORITY (Pending)
1. **Incident Management** - Full incident tracking with updates (collections exist, need API/frontend)
2. **Real Browser Monitoring** - Headless browser checks (Puppeteer/Playwright)
3. **API Access** - REST API key management (partial - needs auth keys)

### MEDIUM PRIORITY (Pending)
1. **Multi-user Roles** - Better RBAC (collections have role checks, need UI)
2. **2FA/Passkey** - Authentication improvements (PocketBase supports this, needs configuration)

### Database Collections Already Created
- `incidents` - For incident tracking
- `incident_updates` - For incident updates
- `subdomains` - For subdomain tracking
- `status_pages` - For status pages
- `status_page_monitors` - For status page monitor links
- `maintenance_windows` - For maintenance scheduling

---

## API Summary

### New Endpoints Added:

**Status Pages:**
```
GET  /status/:slug                    # Public status page
GET  /api/beszel/status-pages         # List
POST /api/beszel/status-pages         # Create
GET  /api/beszel/status-pages/:id    # Get
PATCH /api/beszel/status-pages/:id   # Update
DELETE /api/beszel/status-pages/:id   # Delete
POST /api/beszel/status-pages/:id/monitors      # Add monitor
DELETE /api/beszel/status-pages/:id/monitors/:monitorId  # Remove
GET  /api/beszel/status-pages/:id/monitors  # List monitors
```

**Maintenance Windows:**
```
GET  /api/beszel/maintenance          # List
POST /api/beszel/maintenance          # Create
GET  /api/beszel/maintenance/:id     # Get
PATCH /api/beszel/maintenance/:id    # Update
DELETE /api/beszel/maintenance/:id   # Delete
POST /api/beszel/maintenance/:id/cancel  # Cancel
```

**Bulk Import/Export:**
```
POST /api/beszel/bulk/import/domains    # CSV upload
POST /api/beszel/bulk/import/monitors   # CSV upload
GET  /api/beszel/bulk/export/domains    # JSON download
GET  /api/beszel/bulk/export/monitors   # JSON download
```

**Prometheus:**
```
GET /metrics  # Public metrics endpoint
```

---

## Build Status
✅ All backend code compiles successfully
✅ All database migrations added
✅ All APIs registered and wired up

## Frontend Needed
The following frontend components would complete these features:
1. Status pages management UI
2. Public status page viewer
3. Maintenance windows UI
4. Bulk import/export UI
5. Subdomains display in domain detail
6. Incident management UI

## Testing Checklist
- [ ] Create status page via API
- [ ] View public status page
- [ ] Add/remove monitors from status page
- [ ] Create maintenance window
- [ ] Verify alerts suppressed during maintenance
- [ ] Test Prometheus metrics endpoint
- [ ] Import domains via CSV
- [ ] Export domains to JSON
- [ ] Verify subdomain discovery
- [ ] Test bulk import with duplicate detection

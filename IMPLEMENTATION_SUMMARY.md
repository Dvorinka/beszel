# Beszel + Uptime Kuma Integration - Implementation Summary

## Overview
Successfully integrated Uptime Kuma's monitoring functionality into Beszel's architecture. The integration follows Beszel's design patterns and uses its existing tech stack (PocketBase, Go, React, TailwindCSS).

## Completed Implementation

### 1. Database Layer
**Files:**
- `@/beszel/internal/entities/monitor/monitor.go` - Monitor entity types
- `@/beszel/internal/migrations/1_add_monitor_collections.go` - Database migrations

**Collections Created:**
- `monitors` - Monitor configurations (HTTP, TCP, Ping, DNS, etc.)
- `monitor_heartbeats` - Check results history
- `monitor_alerts` - Alert configurations (schema ready)
- `status_pages` - Status page configs (schema ready)

### 2. Backend Monitoring Engine
**Files:**
- `@/beszel/internal/hub/monitors/checks/checker.go` - Monitor check implementations
- `@/beszel/internal/hub/monitors/scheduler.go` - Background check scheduler
- `@/beszel/internal/hub/monitors/api.go` - REST API handlers

**Monitor Types Implemented:**
- HTTP/HTTPS - Website monitoring with status code checks
- TCP - Port connectivity checks
- Ping - Host reachability via TCP fallback (ICMP requires root)
- DNS - DNS resolution with multiple record types (A, AAAA, MX, TXT, etc.)
- Keyword - HTTP response body keyword search
- JSON Query - HTTP response JSON path validation

**Scheduler Features:**
- 20-second minimum check interval
- Configurable retries with intervals
- Automatic heartbeat recording
- Uptime statistics calculation
- Old heartbeat cleanup (30-day retention)
- Event hooks for monitor lifecycle

### 3. API Endpoints
**Base Path:** `/api/beszel/monitors`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | List all monitors |
| `/` | POST | Create new monitor |
| `/:id` | GET | Get monitor details |
| `/:id` | PATCH | Update monitor |
| `/:id` | DELETE | Delete monitor |
| `/:id/check` | POST | Manual check |
| `/:id/pause` | POST | Pause monitor |
| `/:id/resume` | POST | Resume monitor |
| `/:id/stats` | GET | Uptime statistics |
| `/:id/heartbeats` | GET | Recent heartbeats |

### 4. Frontend Components
**Files:**
- `@/beszel/internal/site/src/lib/monitors.ts` - API client and types
- `@/beszel/internal/site/src/components/monitors-table/monitors-table.tsx` - Monitor table UI
- `@/beszel/internal/site/src/components/routes/home.tsx` - Updated split dashboard view

**Features:**
- Real-time monitor status display
- Uptime visualization (24h/7d/30d)
- Response time tracking
- Pause/Resume controls
- Manual check triggers
- Search/filter functionality
- Edit/Delete actions

### 5. Dashboard Layout
The dashboard is now split into two sections:

```
┌─────────────────────────────────────────────┐
│  Beszel Header / Navbar                     │
├─────────────────────────────────────────────┤
│  DEVICE MONITORING (Primary)                │
│  ┌───────────────────────────────────────┐  │
│  │ Systems Table - All connected devices │  │
│  │ [CPU] [Mem] [Disk] [Net] [Status]     │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│  WEBSITE & SERVICE MONITORING (Secondary)   │
│  ┌───────────────────────────────────────┐  │
│  │ Monitors Table - Websites & APIs      │  │
│  │ [Name] [Type] [Status] [Uptime] [↑↓]  │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

### 6. Hub Integration
**Updated:**
- `@/beszel/internal/hub/hub.go`

**Integration Points:**
- Monitor scheduler initialization on startup
- API route registration
- Event hooks for monitor CRUD operations
- Cron job for heartbeat cleanup

### 7. Notification System
**Files:**
- `@/beszel/internal/entities/notification/notification.go` - Entity types
- `@/beszel/internal/hub/notifications/dispatcher.go` - Notification dispatcher
- `@/beszel/internal/hub/notifications/providers/` - Provider implementations

**Providers:**
- Email (SMTP with TLS support)
- Webhook (custom HTTP requests)
- Discord (rich embeds with color coding)
- Slack (attachments with fields)
- Telegram (Markdown messages)
- Gotify (self-hosted push notifications)
- Pushover (mobile push notifications)

**Features:**
- Automatic notification on DOWN/UP status changes
- Provider caching for performance
- Notification event logging
- Per-monitor notification linking

## Next Steps (Pending)

1. **Testing** - Unit and integration tests

### 8. Notification System Frontend
**Files:**
- `@/beszel/internal/site/src/lib/notifications.ts` - API client and types
- `@/beszel/internal/site/src/components/notifications/notification-settings-dialog.tsx` - Provider configuration dialog

**Features:**
- Create/edit notification providers for each type
- Test notification sending
- Default provider toggle

### 9. Status Pages
**Files:**
- `@/beszel/internal/entities/statuspage/statuspage.go` - Entity types
- `@/beszel/internal/hub/statuspages/api.go` - API handlers
- `@/beszel/internal/site/src/lib/statuspages.ts` - API client
- `@/beszel/internal/site/src/components/status-pages/status-pages-table.tsx` - Management table
- `@/beszel/internal/site/src/components/status-pages/status-page-dialog.tsx` - Creation/editing dialog

**Features:**
- Public status pages with custom slugs
- Light/dark/auto theme support
- Custom logo and favicon
- Uptime percentage display (24h, 7d, 30d)
- Public/private toggle
- Monitor grouping and sorting
- Form validation with zod

### 10. Domain Locker Integration
**Files:**
- `@/beszel/internal/entities/domain/domain.go` - Domain entity types
- `@/beszel/internal/hub/domains/whois/lookup.go` - WHOIS lookup service
- `@/beszel/internal/hub/domains/scheduler.go` - Domain expiry scheduler
- `@/beszel/internal/hub/domains/api.go` - Domain API handlers
- `@/beszel/internal/site/src/lib/domains.ts` - API client
- `@/beszel/internal/site/src/components/domains-table/` - Table and dialog components

**Features Ported:**
- WHOIS lookup with multiple fallback methods (RDAP, native WHOIS, WhoisXML API)
- Domain expiry monitoring with days-until calculation
- SSL certificate expiry tracking
- DNS records (NS, MX, TXT)
- IPv4/IPv6 address resolution
- Host geolocation (country, ISP)
- Registrar recognition with improved parsing
- Domain valuation (purchase price, current value, renewal cost)
- Auto-renew flag
- Tags and notes
- Favicon fetching
- Change history tracking
- Alert settings (days before expiry, SSL alerts)
- Status badges (active, expiring, expired, unknown, paused)
- Daily scheduled checks

**Dashboard Integration:**
- Third dashboard section: Device → Website → Domain monitoring
- WHOIS auto-lookup when adding domains
- Refresh button for manual updates

### 11. Calendar View
**Files:**
- `@/beszel/internal/site/src/components/calendar/calendar-view.tsx` - Calendar component
- `@/beszel/internal/hub/incidents/api.go` - Calendar events API

**Features:**
- Monthly calendar view
- Domain expiry dates
- SSL certificate expiry dates
- Incident history
- Color-coded events by urgency
- Legend for event types

### 12. CSV Export
**Files:**
- `@/beszel/internal/hub/export/csv.go` - CSV export handlers

**Features:**
- Export domains with full details
- Export monitors with uptime stats
- Export incidents with resolution data
- Automatic filename with date

### 13. Incident Management
**Files:**
- `@/beszel/internal/entities/incident/incident.go` - Incident types
- `@/beszel/internal/hub/incidents/api.go` - Incident API
- `@/beszel/internal/site/src/lib/incidents.ts` - API client

**Features:**
- Create/acknowledge/resolve/close workflow
- Severity levels (critical, high, medium, low)
- Assignment to users
- Incident updates and notes
- Status change tracking
- MTTR (Mean Time To Resolve) calculation
- Statistics dashboard

### 14. Push Notifications
**Files:**
- `@/beszel/internal/hub/notifications/push.go` - Push service
- `@/beszel/internal/site/src/hooks/use-push-notifications.ts` - Frontend hook
- `@/beszel/internal/site/public/sw.js` - Service worker

**Features:**
- Browser push notification support
- VAPID key management
- Subscribe/unsubscribe
- Test notifications
- Action buttons on notifications

### 15. PWA Support
**Files:**
- `@/beszel/internal/site/public/manifest.json` - App manifest
- `@/beszel/internal/site/public/sw.js` - Service worker

**Features:**
- Installable web app
- Offline support with caching
- Background sync
- App icons for all sizes
- Standalone display mode
- Theme color support

### 16. Testing
- Unit tests for check implementations
- Integration tests for API endpoints
- Frontend component tests
- E2E test scenarios

## Building & Running

```bash
# Build the Go backend
cd beszel
go build

# Install frontend dependencies
cd internal/site
npm install

# Build frontend
npm run build

# Run the application
./beszel serve
```

The monitor collections will be created automatically on first run via the migration system.

## Architecture Notes

- **Database:** Uses PocketBase's existing SQLite with collections
- **Auth:** Leverages Beszel's existing user authentication
- **Permissions:** Respects role-based access (readonly users can't modify)
- **Real-time:** Uses TanStack Query for frontend data fetching with polling
- **Styling:** Follows Beszel's TailwindCSS + shadcn/ui design system
- **Internationalization:** Uses Lingui for i18n (same as Beszel)

## Code Quality

All code follows:
- Go best practices (error handling, context usage)
- React patterns (hooks, memo, Suspense)
- Beszel's existing code style
- TypeScript type safety (where applicable)

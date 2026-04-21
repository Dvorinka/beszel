# Beszel + Uptime Kuma Integration Plan

## Architecture Analysis

### Beszel (Target Platform)
- **Backend**: Go with PocketBase framework
- **Frontend**: React + TypeScript + nanostores
- **Database**: SQLite via PocketBase collections
- **Auth**: PocketBase built-in auth
- **Real-time**: PocketBase subscriptions
- **Styling**: TailwindCSS + shadcn/ui

### Uptime Kuma (Source Features)
- **Backend**: Node.js with Express
- **Frontend**: Vue.js
- **Database**: SQLite with redbean-node ORM
- **Monitors**: HTTP(s), TCP, Ping, DNS, MQTT, etc.
- **Notifications**: 90+ providers
- **Status Pages**: Public-facing status pages

## Integration Strategy

### Phase 1: Core Data Layer
1. Create PocketBase collections for:
   - `monitors` - Monitor definitions
   - `monitor_heartbeats` - Check results history
   - `monitor_alerts` - Alert configurations
   - `status_pages` - Public status page configs
   - `notifications` - Notification provider settings

### Phase 2: Backend Monitoring Engine
1. Port monitor check logic from Uptime Kuma to Go
2. Implement background scheduler for monitor checks
3. Add notification dispatcher
4. Create API endpoints for monitor management

### Phase 3: Frontend Components
1. Dashboard split view: Systems (top) + Monitors (bottom)
2. Monitor management UI (CRUD)
3. Status page builder
4. Notification settings

### Phase 4: Testing & Polish
1. Unit tests for monitor checks
2. Integration tests for notifications
3. UI/UX polish following Beszel design

## Detailed Implementation

### 1. Database Schema (PocketBase Collections)

#### monitors collection
```go
type Monitor struct {
    ID          string
    Name        string
    Type        string // http, tcp, ping, dns, etc.
    URL         string
    Method      string // GET, POST, etc.
    Interval    int    // seconds
    Timeout     int    // seconds
    Retries     int
    Headers     string // JSON
    Body        string
    Status      string // up, down, pending
    LastCheck   time.Time
    UptimeStats map[string]float64
    Tags        []string
    Active      bool
    UserID      string
}
```

#### monitor_heartbeats collection
```go
type Heartbeat struct {
    ID        string
    MonitorID string
    Status    string // up, down
    Ping      int    // response time ms
    Msg       string // error message or details
    Time      time.Time
}
```

### 2. Monitor Types to Implement

Priority order:
1. **HTTP/HTTPS** - Basic website monitoring
2. **TCP** - Port monitoring
3. **Ping** - ICMP ping
4. **DNS** - DNS resolution check
5. **Keyword** - HTTP with keyword search
6. **JSON Query** - HTTP with JSON path validation
7. **Docker Container** - Container health

### 3. Notification Providers

Core providers (most used):
- Email (SMTP)
- Discord
- Telegram
- Slack
- Webhook
- Gotify
- Pushover

### 4. Frontend Layout

```
┌─────────────────────────────────────────────┐
│  Beszel Header / Navbar                     │
├─────────────────────────────────────────────┤
│  DEVICE MONITORING (Primary)                │
│  ┌───────────────────────────────────────┐  │
│  │ Systems Table / Grid                  │  │
│  │ [CPU] [Mem] [Disk] [Net] [Status]     │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│  WEBSITE & SERVICE MONITORING (Secondary)   │
│  ┌───────────────────────────────────────┐  │
│  │ Monitors Table                        │  │
│  │ [Name] [Type] [URL] [Status] [Uptime] │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

### 5. API Endpoints

```
/api/beszel/monitors              GET/POST
/api/beszel/monitors/:id          GET/PUT/DELETE
/api/beszel/monitors/:id/check    POST (manual check)
/api/beszel/monitors/:id/pause    POST
/api/beszel/monitors/:id/resume   POST
/api/beszel/monitors/:id/stats    GET (uptime stats)
/api/beszel/heartbeats            GET (recent heartbeats)
/api/beszel/status-pages          GET/POST
/api/beszel/notifications         GET/POST/DELETE
/api/beszel/notifications/test    POST
```

## File Structure

```
beszel/
├── internal/
│   ├── hub/
│   │   ├── monitors/           # NEW: Monitor management
│   │   │   ├── monitor.go      # Monitor struct and logic
│   │   │   ├── scheduler.go    # Check scheduler
│   │   │   └── checks/         # Check implementations
│   │   │       ├── http.go
│   │   │       ├── tcp.go
│   │   │       ├── ping.go
│   │   │       └── dns.go
│   │   ├── notifications/      # NEW: Notification system
│   │   │   ├── dispatcher.go
│   │   │   └── providers/
│   │   │       ├── email.go
│   │   │       ├── discord.go
│   │   │       └── webhook.go
│   │   └── statuspages/        # NEW: Status page system
│   │       └── statuspage.go
│   └── entities/
│       └── monitor/            # NEW: Monitor entities
│           └── monitor.go
├── internal/site/src/
│   ├── components/
│   │   ├── routes/
│   │   │   └── home.tsx        # MODIFIED: Split view
│   │   ├── monitors-table/     # NEW
│   │   │   └── monitors-table.tsx
│   │   ├── monitor-detail/   # NEW
│   │   │   └── monitor-detail.tsx
│   │   └── status-pages/     # NEW
│   │       └── status-page-builder.tsx
│   └── lib/
│       └── monitors.ts       # NEW: Monitor API client
```

## Testing Strategy

1. **Unit Tests**: Each monitor check type
2. **Integration Tests**: Notification providers
3. **E2E Tests**: Full monitor lifecycle
4. **Load Tests**: Many concurrent monitors

## Implementation Order

1. Database collections and entities
2. HTTP monitor check implementation
3. Basic API endpoints
4. Frontend monitor table
5. Dashboard split view
6. TCP/Ping/DNS monitors
7. Notification system
8. Status pages
9. Polish and optimization

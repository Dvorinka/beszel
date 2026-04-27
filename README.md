# Beszel - Unified Monitoring Platform

> Lightweight server monitoring, website monitoring, and domain expiry tracking in a single dashboard.

Beszel is a unified monitoring platform that combines system metrics, service uptime monitoring, and domain/SSL expiry tracking. Built on [PocketBase](https://pocketbase.io/) with a modern React frontend, it is designed to be lightweight, self-hosted, and production-ready.

## Quick Start

### Docker Compose

```bash
# Clone the repository
git clone https://github.com/henrygd/beszel.git
cd beszel

# Copy and edit environment variables (optional)
cp .env.example .env

# Start the hub
make start
# or: docker compose up -d

# View logs
make logs

# Stop everything
make stop
```

The hub will be available at `http://localhost:8090`. Create your admin account on first visit.

Agents run on separate hosts and connect to the hub. See [Adding Agents](#adding-agents) below.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_URL` | `http://localhost:8090` | Public URL for links |
| `INSTANCE_NAME` | `Beszel Monitoring` | Instance display name |
| `REGISTRATION_ENABLED` | `true` | Allow new user registration |
| `MAX_MONITORS_PER_USER` | `50` | Monitor limit per user |
| `MAX_DOMAINS_PER_USER` | `50` | Domain limit per user |
| `MAX_STATUS_PAGES` | `10` | Status page limit |
| `TWO_FACTOR_ENABLED` | `true` | Enable 2FA |
| `PASSKEY_ENABLED` | `true` | Enable passkey auth |
| `STATUS_PAGES_ENABLED` | `true` | Enable public status pages |
| `BADGES_ENABLED` | `true` | Enable SVG badge generation |
| `PAGESPEED_ENABLED` | `true` | Enable PageSpeed checks |
| `SUBDOMAIN_DISCOVERY` | `true` | Auto-discover subdomains |

## Features

### System Monitoring
- CPU, memory, disk, network metrics with historical charts
- Docker / Podman container stats
- GPU monitoring (Nvidia, AMD, Intel)
- Temperature sensors and battery status
- S.M.A.R.T. disk health tracking

### Website & Service Monitoring
- HTTP/HTTPS, TCP, Ping, DNS checks
- Keyword and JSON query validation
- Response time tracking with Recharts visualizations
- Uptime statistics (24h / 7d / 30d)
- Maintenance windows with alert suppression

### Domain Monitoring
- WHOIS lookup with RDAP + TCP fallback (works in scratch containers)
- SSL certificate expiry tracking
- DNS records (NS, MX, TXT)
- Subdomain auto-discovery (50 common subdomains)
- Registrar, host geolocation, and IP info
- Bulk CSV import / JSON export

### Platform
- Multi-user with role-based access
- OAuth 2.0 / OIDC support
- Public status pages with custom CSS
- Incident management with acknowledge/resolve workflow
- Calendar view for expiry dates and incidents
- Prometheus metrics export (`/metrics`)
- SVG status badges for embedding
- Browser push notifications + PWA support
- PageSpeed Insights / Lighthouse integration
- Automatic backups to disk or S3

## Architecture

```
Hub (Go + PocketBase + React)
- Web UI (port 8090)
- REST API + WebSocket
- SQLite database with migrations
- Scheduled jobs (domain checks, heartbeat cleanup)

Agent (Go)
- Runs on monitored hosts
- Collects system + Docker metrics
- Connects to hub via SSH tunnel
```

## Adding Agents

Agents run on the hosts you want to monitor and connect back to the hub via SSH.

### On a remote host

```bash
# Build the agent binary
make build-agent

# Copy the binary to the remote host
# Set KEY to the public key from the hub UI (Settings > Add System)
KEY="ssh-ed25519 ..." ./beszel-agent
```

### With Docker on a remote host

```bash
# Build the agent image
make docker-agent

# Run the agent container
docker run -d \
  --name beszel-agent \
  --pid host \
  -e KEY="ssh-ed25519 ..." \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -p 45876:45876 \
  beszel-agent:latest
```

## Building

```bash
# Build hub + agent binaries
make build

# Build with Docker
make docker-hub
make docker-agent

# Development mode
make dev
```

## API

Protected endpoints require Bearer token authentication.

| Endpoint | Description |
|----------|-------------|
| `GET /api/beszel/monitors` | List monitors |
| `GET /api/beszel/domains` | List domains |
| `GET /api/beszel/status-pages` | List status pages |
| `GET /api/beszel/incidents` | List incidents |
| `GET /api/beszel/maintenance` | List maintenance windows |
| `GET /metrics` | Prometheus metrics (public) |
| `GET /status/:slug` | Public status page |
| `GET /badge/:type/:id.svg` | Status badge (public) |

## Credits

Based on **[Beszel](https://github.com/henrygd/beszel)** by [henrygd](https://github.com/henrygd).

## License

MIT License. See [LICENSE](LICENSE).

# Beszel - Unified Monitoring Platform

> Lightweight server monitoring, website monitoring, and domain expiry tracking in a single dashboard.

Beszel is a unified monitoring platform that combines system metrics, service uptime monitoring, and domain/SSL expiry tracking. Built on [PocketBase](https://pocketbase.io/) with a modern React frontend, it is designed to be lightweight, self-hosted, and production-ready.

## Quick Start

### Docker Compose

Paste this into Dokploy, CasaOS, or a local `docker-compose.yml`.

```yaml
services:
  beszel:
    image: ghcr.io/dvorinka/beszel:latest
    container_name: beszel
    restart: unless-stopped
    ports:
      - "${BESZEL_PORT:-8090}:8090"
    volumes:
      - beszel_data:/beszel_data
      # Enables native in-app updates from ghcr.io/dvorinka/beszel:latest.
      # Any registered Beszel user can trigger this update action.
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      APP_URL: "${APP_URL:-http://localhost:8090}"
      PUBLIC_URL: "${PUBLIC_URL:-}"
      INSTANCE_NAME: "${INSTANCE_NAME:-Beszel Monitoring}"
      INSTANCE_DESCRIPTION: "${INSTANCE_DESCRIPTION:-System, website, and domain monitoring}"

      # Optional first admin/user bootstrap. Set these in Dokploy/CasaOS variables.
      BESZEL_HUB_USER_EMAIL: "${BESZEL_HUB_USER_EMAIL:-}"
      BESZEL_HUB_USER_PASSWORD: "${BESZEL_HUB_USER_PASSWORD:-}"

      # Optional stable Web Push key. Leave empty unless you already have one.
      BESZEL_VAPID_PRIVATE_KEY: "${BESZEL_VAPID_PRIVATE_KEY:-}"

      # Auth and feature flags
      REGISTRATION_ENABLED: "${REGISTRATION_ENABLED:-true}"
      TWO_FACTOR_ENABLED: "${TWO_FACTOR_ENABLED:-true}"
      PASSKEY_ENABLED: "${PASSKEY_ENABLED:-true}"
      STATUS_PAGES_ENABLED: "${STATUS_PAGES_ENABLED:-true}"
      BADGES_ENABLED: "${BADGES_ENABLED:-true}"
      PAGESPEED_ENABLED: "${PAGESPEED_ENABLED:-true}"
      SUBDOMAIN_DISCOVERY: "${SUBDOMAIN_DISCOVERY:-true}"

      # Limits
      MAX_MONITORS_PER_USER: "${MAX_MONITORS_PER_USER:-50}"
      MAX_DOMAINS_PER_USER: "${MAX_DOMAINS_PER_USER:-50}"
      MAX_STATUS_PAGES: "${MAX_STATUS_PAGES:-10}"

volumes:
  beszel_data:
```

Docker Compose pulls the image automatically, or you can pull it manually first:

```bash
docker pull ghcr.io/dvorinka/beszel:latest
docker compose up -d
```

The hub will be available at `http://localhost:8090` by default. For Dokploy or CasaOS, set `APP_URL` to the public URL of your deployment, for example `https://beszel.example.com`.

Agents run on separate hosts and connect to the hub. See [Adding Agents](#adding-agents) below.

### Native App Updates

Beszel checks `ghcr.io/dvorinka/beszel:latest` from inside the app and shows update status in Settings > General. When the Docker socket is mounted, any registered user can start an in-app update. Beszel pulls the latest image, recreates the running container with the same Docker configuration, and restarts itself automatically.

The Docker socket gives Beszel control over Docker on the host. Keep registration limited to trusted users.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BESZEL_PORT` | `8090` | Host port mapped to container port `8090` |
| `APP_URL` | `http://localhost:8090` | Public URL for links |
| `PUBLIC_URL` | empty | Public URL shown in instance settings |
| `INSTANCE_NAME` | `Beszel Monitoring` | Instance display name |
| `INSTANCE_DESCRIPTION` | `System, website, and domain monitoring` | Instance description |
| `BESZEL_HUB_USER_EMAIL` | empty | Optional first admin/user email for automated setup |
| `BESZEL_HUB_USER_PASSWORD` | empty | Optional first admin/user password for automated setup |
| `BESZEL_VAPID_PRIVATE_KEY` | empty | Optional stable private key for browser push notifications |
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

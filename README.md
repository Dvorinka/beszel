# Beszel (Domain-Enhanced Fork)

> **A fork of [Beszel](https://github.com/henrygd/beszel)** with added domain and SSL certificate monitoring capabilities.

Beszel is a lightweight server monitoring platform that includes Docker statistics, historical data, and alert functions. **This fork extends Beszel with domain and SSL certificate monitoring**, combining the best of server metrics with domain expiration tracking in a single dashboard.

It has a friendly web interface, simple configuration, and is ready to use out of the box. It supports automatic backup, multi-user, OAuth authentication, and API access.

[![agent Docker Image Size](https://img.shields.io/docker/image-size/henrygd/beszel-agent/latest?logo=docker&label=agent%20image%20size)](https://hub.docker.com/r/henrygd/beszel-agent)
[![hub Docker Image Size](https://img.shields.io/docker/image-size/henrygd/beszel/latest?logo=docker&label=hub%20image%20size)](https://hub.docker.com/r/henrygd/beszel)
[![MIT license](https://img.shields.io/github/license/henrygd/beszel?color=%239944ee)](https://github.com/henrygd/beszel/blob/main/LICENSE)
[![Crowdin](https://badges.crowdin.net/beszel/localized.svg)](https://crowdin.com/project/beszel)

![Screenshot of Beszel dashboard and system page, side by side. The dashboard shows metrics from multiple connected systems, while the system page shows detailed metrics for a single system.](https://henrygd-assets.b-cdn.net/beszel/screenshot-new.png)

## Features

### Server Monitoring (from Beszel)
- **Lightweight**: Smaller and less resource-intensive than leading solutions.
- **Simple**: Easy setup with little manual configuration required.
- **Docker stats**: Tracks CPU, memory, and network usage history for each container.
- **System metrics**: CPU, memory, disk usage, disk I/O, network, load average, temperature, GPU usage, battery status.
- **S.M.A.R.T. monitoring**: Disk health tracking including eMMC wear/EOL and Linux mdraid array health.
- **Alerts**: Configurable alerts for CPU, memory, disk, bandwidth, temperature, load average, and status.

### Domain & SSL Monitoring (added)
- **Domain expiration tracking**: Monitor domain expiration dates across multiple registrars.
- **SSL certificate monitoring**: Track SSL certificate validity and expiration dates.
- **Expiration alerts**: Get notified before domains or certificates expire.
- **Registrar integration**: Support for multiple domain registrars.

### Platform Features
- **Multi-user**: Users manage their own systems. Admins can share systems across users.
- **OAuth / OIDC**: Supports many OAuth2 providers. Password auth can be disabled.
- **Automatic backups**: Save to and restore from disk or S3-compatible storage.
<!-- - **REST API**: Use or update your data in your own scripts and applications. -->

## Architecture

Beszel consists of two main components: the **hub** and the **agent**. This fork adds a **domain monitor** component.

- **Hub**: A web application built on [PocketBase](https://pocketbase.io/) that provides a dashboard for viewing and managing connected systems and domains.
- **Agent**: Runs on each system you want to monitor and communicates system metrics to the hub.
- **Domain Monitor**: Tracks domain and SSL certificate expiration data from configured registrars.

## Getting started

The [quick start guide](https://beszel.dev/guide/getting-started) and other documentation is available on the original Beszel website, [beszel.dev](https://beszel.dev). You'll be up and running in a few minutes.

### Domain Monitoring Setup

1. Go to Settings > Domain Monitor in the dashboard
2. Add your domain registrar API credentials
3. Configure domains to monitor
4. Set alert thresholds for expiration warnings

## Screenshots

![Dashboard](https://beszel.dev/image/dashboard.png)
![System page](https://beszel.dev/image/system-full.png)
![Notification Settings](https://beszel.dev/image/settings-notifications.png)

## Supported metrics

- **CPU usage** - Host system and Docker / Podman containers.
- **Memory usage** - Host system and containers. Includes swap and ZFS ARC.
- **Disk usage** - Host system. Supports multiple partitions and devices.
- **Disk I/O** - Host system. Supports multiple partitions and devices.
- **Network usage** - Host system and containers.
- **Load average** - Host system.
- **Temperature** - Host system sensors.
- **GPU usage / power draw** - Nvidia, AMD, and Intel.
- **Battery** - Host system battery charge.
- **Containers** - Status and metrics of all running Docker / Podman containers.
- **S.M.A.R.T.** - Host system disk health (includes eMMC wear/EOL and Linux mdraid array health via sysfs when available).
- **Domain expiration** - Track domain expiration dates from configured registrars.
- **SSL certificate** - Monitor SSL certificate validity and expiration dates.

## Help and discussion

For Beszel-specific issues and discussions, please refer to the original project:

#### Bug reports and feature requests

Bug reports for the original Beszel can be posted on [GitHub issues](https://github.com/henrygd/beszel/issues).

#### Support and general discussion

Support requests and general discussion can be posted on [GitHub discussions](https://github.com/henrygd/beszel/discussions) or the community-run [Matrix room](https://matrix.to/#/#beszel:matrix.org): `#beszel:matrix.org`.

## Credits

This fork is built upon:

- **[Beszel](https://github.com/henrygd/beszel)** - Original lightweight server monitoring platform by [henrygd](https://github.com/henrygd)
- **[Domain Locker](https://github.com/Domain-Lockers/domain-locker)** - Domain and SSL monitoring integration
- **[Uptime Kuma](https://github.com/louislam/uptime-kuma)** - Self-hosted monitoring tool that inspired monitoring approaches

## License

Beszel is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

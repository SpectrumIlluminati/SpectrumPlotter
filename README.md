# SpectrumPlotter

> A spectrum management platform for DoD frequency coordination, built to replace SXXI with a visual-first approach to planning, deconfliction, and assignment tracking.

SpectrumPlotter combines an interactive map, full SFAF record management, and a role-gated frequency coordination workflow into a single self-hosted Go application backed by PostgreSQL. The goal is cohesive spectrum planning across all functions — with the visual context that has been absent from legacy tools.

---

## Features

### 🗺️ Map Viewer
- Interactive Leaflet map with real-time coordinate tooltips (decimal, DMS, military compact)
- Place draggable manual markers or import fixed-position markers directly from SFAF files
- Draw and persist geometry overlays — circles, polygons, and rectangles — linked to the database
- Field 530 polygon visualization renders MCEB authorization radius boundaries on the map
- Viewport-based marker loading keeps performance smooth with large datasets

### 📁 SFAF Management
- Import raw SFAF files — records are parsed, validated, and stored automatically
- Supports **SXXI DOTS horizontal** (tab-delimited spreadsheet exports), **dot-delimited** (`NNN. value`), and **vertical tab-delimited** formats — auto-detected, no configuration required
- Full CRUD on all SFAF records with 900+ field definitions
- Field validation enforces MC4EB Publication 7, Change 1 standards
- Export individual records, a selected subset, or the entire dataset to CSV or text

### 📡 Frequency Management
- Track frequency assignments per unit with automatic serial number generation
- Submit, review, and approve frequency requests through a built-in multi-step workflow
- Conflict detection identifies overlapping assignments across units before approval
- Expiring frequency alerts surface assignments approaching their end date

### 🔐 Role-Based Access Control
Seven distinct roles from `operator` through `ntia` and `admin` control which modules, workflow steps, and data each user can see and act on. The ISM Workbox, serial allocation tools, and Admin Console are progressively unlocked by role.

---

## Screenshots

| Map Viewer | Database |
|---|---|
| Interactive map with markers, geometry overlays, and coordinate tooltips | Scrollable SFAF record table with filtering, sorting, and inline import |

| Frequencies | ISM Workbox |
|---|---|
| Assignment tracking with serial numbers and expiration alerts | Review queue for pending frequency coordination requests |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go 1.21+, [Gin](https://github.com/gin-gonic/gin) |
| Database | PostgreSQL 14+ via [sqlx](https://github.com/jmoiron/sqlx) |
| Frontend | Vanilla JS, [Leaflet.js](https://leafletjs.com/) |
| Logging | [Uber Zap](https://github.com/uber-go/zap) |
| Auth | Session tokens, bcrypt password hashing |
| Tooling | Python 3.10+ management scripts |

---

## Prerequisites

- Linux (Debian/Ubuntu recommended)
- Go 1.21+
- PostgreSQL 14+
- Python 3.10+
- `psql` client

---

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/your-org/SpectrumPlotter.git
cd SpectrumPlotter/Plotter
cp .env.example .env
nano .env
```

Minimum `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=sfaf_user
DB_PASSWORD=your_password
DB_NAME=sfaf_plotter
DB_SSLMODE=disable
SERVER_PORT=8080
GIN_MODE=release
```

### 2. Install and initialize

```bash
python3 install.py
```

The installer handles Go, PostgreSQL setup, schema migrations, and first-admin-user creation interactively.

### 3. Start the server

```bash
python3 SpectrumPlotter.py
```

Navigate to `http://localhost:8080`.

---

## User Management

All user operations use `users.py` from the `Plotter/` directory.

```bash
# List all users
python3 users.py list

# Create a user
python3 users.py create --username jsmith --email jsmith@unit.mil \
  --full-name "John Smith" --role ism

# Change a role
python3 users.py set-role --username jsmith --role command

# Reset a password
python3 users.py reset-password --username jsmith

# Deactivate
python3 users.py deactivate --username jsmith
```

---

## Role Reference

| Role | Workbox | Frequency Workflow | Notes |
|------|---------|-------------------|-------|
| `operator` | ✗ | Submit requests | Default for new accounts |
| `ism` | ✓ | Submit + review | Installation Spectrum Manager |
| `command` | ✓ | Submit + review + proposals | Brigade/Division |
| `combatant_command` | ✓ | Review proposals | EUCOM/CENTCOM/etc. |
| `agency` | ✓ | Review all + serial allocation | AFSMO, JTSC |
| `ntia` | ✓ | National-level review | |
| `admin` | ✓ | Full access + Admin Console | |

---

## SFAF Import Formats

| Format | Detection | Description |
|--------|-----------|-------------|
| SXXI DOTS horizontal | Auto | Tab-delimited spreadsheet: row 1 = `NNN. (LABEL)` headers, rows 2+ = one record per line |
| Dot-delimited | Auto | Traditional SFAF: `NNN. value` per line, Field 005 separates records |
| Vertical tab-delimited | Auto | `NNN\tvalue` per line, Field 005 separates records |

**Coordinate formats supported in Field 303:**

| Format | Example | Notes |
|--------|---------|-------|
| 15-char standard | `302521N0864150W` | DDMMSSNDDDMMSSW |
| 13-char SXXI/European | `492627E073541` | DDMMSS + lon-dir + DDMMSS, lat=North assumed |
| 13-char N/S first | `492627N073541` | DDMMSS + N/S + DDMMSS, lon=East assumed |

Placeholder coordinates (`???????????????`) are handled gracefully — the record imports without a map marker.

---

## Project Structure

```
Plotter/
├── cmd/                    # CLI tools (create_user, list_users, init_database, …)
├── config/                 # Environment and database config
├── handlers/               # HTTP request handlers (Gin)
├── middleware/             # Logging, session auth, recovery
├── migrations/             # PostgreSQL migration files (001 → current)
├── models/                 # Go structs for all domain objects
├── repositories/           # Database access layer
├── services/               # Business logic
├── web/
│   ├── static/
│   │   ├── css/            # Stylesheets (shared-nav.css, navBar.css, …)
│   │   └── js/             # Frontend JS (map.js, db_viewer.js, modules/)
│   └── templates/          # HTML templates (8 pages)
├── install.py              # First-time installer
├── users.py                # User management CLI
├── SpectrumPlotter.py      # Server launcher with pre-flight checks
└── main.go                 # Application entry point
```

---

## Development

### Running in debug mode

Set `GIN_MODE=debug` in `.env` for verbose request logging.

### Forced rebuild

```bash
python3 SpectrumPlotter.py --build
```

### Pre-flight checks only

```bash
python3 SpectrumPlotter.py --check
```

### Adding a migration

Create the next numbered file in `migrations/`:

```bash
nano migrations/056_your_change.sql
```

Apply it:

```bash
psql -h localhost -U sfaf_user -d sfaf_plotter -f migrations/056_your_change.sql
```

---

## Roadmap

- [ ] View on Map — jump from database records directly to the map marker
- [ ] Scrollbar size improvements in the database table view
- [ ] JS module refactor completion (map.js target ~200 lines)
- [ ] Integration test suite
- [ ] PKI / CAC authentication support

---

## Contributing

This is a spectrum-community project. Issues, pull requests, and feature requests are welcome. Please open an issue before starting significant new work so we can coordinate direction.

---

## License

See [LICENSE](LICENSE) for details.

---

## Compliance

SFAF field validation targets **MC4EB Publication 7, Change 1 (08 May 2025)** standards. Field definitions, required fields, and validation rules are maintained in `services/sfaf_service.go`.

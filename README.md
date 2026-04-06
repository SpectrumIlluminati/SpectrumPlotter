# SpectrumPlotter

A spectrum management platform for DoD frequency coordination, planning, and visualization. Built on Go + PostgreSQL with an interactive Leaflet map, full SFAF record management, and a role-based frequency workflow that covers the full lifecycle from operator request through ISM/agency review to assignment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [First-Time Installation](#first-time-installation)
3. [Applying Updates](#applying-updates)
4. [Starting the Server](#starting-the-server)
5. [User Management](#user-management)
6. [Role Reference](#role-reference)
7. [Module Guide](#module-guide)
   - [Map Viewer](#map-viewer)
   - [Database](#database)
   - [Frequencies](#frequencies)
   - [ISM Workbox](#ism-workbox)
   - [Frequency Tool](#frequency-tool)
   - [Table Manager](#table-manager)
   - [Admin Console](#admin-console)
   - [Profile](#profile)
8. [SFAF Import Formats](#sfaf-import-formats)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Linux | Ubuntu 22.04+ recommended | amd64 or arm64 |
| Go | 1.21+ | Installed automatically by `install.py` |
| PostgreSQL | 14+ | Must be running before startup |
| Python | 3.10+ | For management scripts only |
| psql client | any | Included with PostgreSQL |

---

## First-Time Installation

Run the interactive installer once. It handles Go, PostgreSQL setup, database creation, schema migrations, and optionally creates your first admin user.

```bash
cd Plotter/
python3 install.py
```

The installer will:

1. Install Go 1.25 from `golang.org` (auto-detects amd64/arm64)
2. Install `postgresql` and `postgresql-contrib` via `apt`
3. Create the database role and database from your `.env` file
4. Run all migrations (001 → current)
5. Prompt to create the first admin user

> **Note:** If the username you choose already exists (e.g. a migration-seeded `admin` row with no password), the installer detects this and resets the password + promotes the account to admin automatically.

### Environment File

Before running the installer, ensure `Plotter/.env` exists with your values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=sfaf_plotter
DB_SSLMODE=disable
SERVER_PORT=8080
GIN_MODE=release
```

---

## Applying Updates

When you receive a zip of updated files (e.g. `SpectrumPlotter_updates.zip`), extract it directly into the `Plotter/` directory and allow overwrites:

```bash
cd SpectrumPlotter-Config-new/
unzip -o SpectrumPlotter_updates.zip -d Plotter/
```

If the update includes new migration files in `Plotter/migrations/`, apply them before restarting:

```bash
cd Plotter/
python3 SpectrumPlotter.py --check   # verify schema count
```

No new migrations are applied automatically on startup — they must be run via install.py or manually with `psql`.

Rebuild after applying updates:

```bash
cd Plotter/
python3 SpectrumPlotter.py --build
```

---

## Starting the Server

```bash
cd Plotter/
python3 SpectrumPlotter.py
```

The script performs pre-flight checks before launching:

- `.env` loaded and all required keys present
- PostgreSQL is accepting connections
- Database schema verified (migration count matches)

Then it builds and starts the binary. The server runs in the foreground. Press `Ctrl+C` to stop.

**Flags:**

| Flag | Effect |
|------|--------|
| *(none)* | Pre-flight check → build if needed → start |
| `--build` | Force a full rebuild before starting |
| `--check` | Run pre-flight checks only, do not start |

The web UI is available at `http://localhost:8080` (or the port set in `.env`).

---

## User Management

All user operations are done with `users.py`. Run from the `Plotter/` directory.

### List all users

```bash
python3 users.py list
```

### Create a user

```bash
python3 users.py create \
  --username jsmith \
  --email jsmith@unit.mil \
  --full-name "John Smith" \
  --role ism
```

Omit `--role` to default to `operator`. You will be prompted for a password.

### Reset a password

```bash
python3 users.py reset-password --username jsmith
```

### Change a user's role

```bash
python3 users.py set-role --username jsmith --role command
```

### Deactivate a user

```bash
python3 users.py deactivate --username jsmith
```

### Delete a user

```bash
python3 users.py delete --username jsmith
```

---

## Role Reference

Roles control which modules and actions are visible in the UI.

| Role | Nav Access | Frequency Workflow | Notes |
|------|-----------|-------------------|-------|
| `operator` | Map Viewer, Frequencies | Submit requests only | Default for new accounts |
| `ism` | All modules + Workbox | Submit + review requests | Installation Spectrum Manager |
| `command` | All modules + Workbox | Submit + review + view proposals | Brigade/Division level |
| `combatant_command` | All modules + Workbox | Review proposals | EUCOM/CENTCOM/etc. |
| `agency` | All modules + Workbox | Review all + serial allocation | AFSMO, JTSC, etc. |
| `ntia` | All modules + Workbox | National-level review | |
| `admin` | All modules + Admin Console | Full access | System administration |

---

## Module Guide

### Map Viewer

**URL:** `/map-viewer`  
**Access:** All roles

The primary workspace. All markers, geometries, and SFAF records are visualized here.

**Placing markers**
- Click anywhere on the map to place a draggable marker
- Click a marker to open the sidebar with Overview and SFAF data tabs
- Drag markers to reposition; coordinates update automatically

**SFAF data entry**
- With a marker selected, switch to the **SFAF** tab in the sidebar
- Fill in fields and click **Save SFAF** — the record is linked to the marker
- Click **Validate SFAF** to check fields against MC4EB Publication 7 requirements
- Click **Export SFAF** to download the record as a text file

**Import from file**
- Use the import button in the sidebar to load a `.txt` or `.sfaf` file
- Records with valid Field 303 coordinates are placed as map markers automatically
- Records without coordinates are stored in the database without a map pin

**Geometry overlays**
- Draw circles, polygons, and rectangles using the toolbar
- Geometries persist in the database and reload on next session
- Field 530 authorization radius polygons render automatically when SFAF data includes Field 530

**Map settings**
- Click **Settings** in the nav bar to adjust base layer, default zoom, and display options

**Coordinate display**
- Hover over any marker to see decimal, DMS, and military compact coordinate formats
- Coordinates auto-convert on the fly

---

### Database

**URL:** `/database`  
**Access:** All roles except operator (operator-hidden)

Tabular view of all SFAF records in the system.

**Browsing records**
- Records are paginated (25 / 50 / 100 per page)
- Scroll vertically within the table to see all rows
- Scroll horizontally to see all columns
- Column headers are sticky — they stay visible while scrolling
- Click any column header to sort

**Filtering**
- Use the filter row below column headers to filter by any field value
- Quick-filter buttons filter by type: all, manual, imported

**Importing SFAF records**

| Scenario | What to do |
|----------|-----------|
| No records yet | Click **Select Files** in the empty-state screen |
| Records exist | Click **Import** in the toolbar |

Both buttons accept the same file formats. Multiple files can be selected at once.

**Supported import formats:**

| Format | Description |
|--------|-------------|
| SXXI DOTS horizontal `.txt` | Tab-delimited spreadsheet export from SXXI — row 1 is column headers (`NNN. (LABEL)`), each subsequent row is one SFAF record |
| Vertical dot-delimited `.txt` / `.sfaf` | Traditional SFAF text: one field per line (`NNN. value`), Field 005 separates records |
| Vertical tab-delimited `.txt` | One field per line with tab separator (`NNN\tvalue`), Field 005 separates records |

The importer auto-detects the format — no configuration needed.

**Exporting records**
- Select rows using the checkboxes, then click **Export Selected**
- Click **Export All** to download the complete dataset as CSV or JSON

**Query Builder**
- Switch to the **Query Builder** tab to run custom filters across multiple fields simultaneously

**Analytics**
- The **Analytics** tab shows frequency band distribution, agency breakdown, and record counts over time

---

### Frequencies

**URL:** `/frequency`  
**Access:** All roles

Manages frequency assignments and requests for your unit(s).

**My Frequencies tab**
- Shows all frequency assignments for units you belong to
- Filter by status, band, or serial number
- Click any row to view full details
- Assignments show expiration dates — expired entries are highlighted

**Frequency Requests tab**
- Click **New Request** to submit a frequency coordination request
- Fill in the SFAF fields for the requested frequency; required fields are marked
- Track status: Draft → Pending → Approved / Returned

**Conflict detection**
- Before a request is approved, the system checks for overlapping assignments across units
- Conflicts are shown inline on the request detail view

---

### ISM Workbox

**URL:** `/workbox`  
**Access:** ISM and above

The review queue for frequency coordination requests routed to your installation or workbox.

**Pending Review tab**
- Shows all requests awaiting action from your workbox
- Click a request to review full SFAF data, requester info, and any notes
- Actions: **Approve**, **Return** (with comments), or **Elevate** to the next level

**Proposals tab** *(command and above)*
- Shows P/S proposals routed up from ISMs
- Approve or return proposals with coordination remarks

**Serial Management** *(agency / AFSMO)*
- Allocate serial number blocks to MAJCOM/command units
- Track serial pool usage and remaining capacity

---

### Frequency Tool

**URL:** `/frequency-nomination`  
**Access:** All roles

Deconfliction tool for generating and validating frequency nominations.

- Input a frequency range and emission parameters
- The tool checks existing assignments and pool allocations for conflicts
- Returns a list of available frequencies within the requested band
- Use the output to populate a frequency request

---

### Table Manager

**URL:** `/view-manager`  
**Access:** ISM and above

Manage reference data used throughout the system.

| Tab | Contents |
|-----|----------|
| Units | Create/edit unit records; assign to installations |
| IRAC Notes | Manage standard IRAC note codes and text |
| Manufacturers | Equipment manufacturer records |
| Installations | Installation (base/post) records and ISM office assignments |
| System Config | Default map center, zoom level, and other system-wide settings |
| SFAF Codes | Reference tables for SFAF field code values |

---

### Admin Console

**URL:** `/admin`  
**Access:** Admin only

**Users tab**
- View all user accounts with role, status, and last-activity info
- Create new users, edit roles, reset passwords, deactivate accounts
- Review and approve/deny account requests submitted from the login page

**Account Requests tab**
- Users who self-register via the login page appear here
- Approve (sets role + sends temporary password) or deny

**Bases & Units tab**
- Manage installation and unit data directly from the UI
- Equivalent to Table Manager but with admin-level edit access

---

### Profile

**URL:** `/profile`  
**Access:** All roles (own account only)

- Update display name and email address
- Change password
- View active sessions and session history
- Manage notification preferences

---

## SFAF Import Formats

### SXXI DOTS Horizontal (most common for batch imports)

Row 1 is a tab-delimited header row where each column is an SFAF field:

```
005. (SECURITY CLASSIFICATION)	014. (DERIVATIVE CLASSIFICATION AUTHORITY)[01]	010. (TYPE OF ACTION)	...
UB		N		...
UB		N		...
```

- Each column header: `NNN. (LABEL)` or `NNN. (LABEL)[NN]` for multiple occurrences
- RX fields use `[R01]` or `[R01/01]` bracket notation
- Quoted fields (values containing commas) are handled automatically
- Each data row = one SFAF record

### Traditional Dot-Delimited

```
005.     UB
010.     N
102.     AF  014589
110.     M343.000
303.     302521N0864150W
```

- One field per line: `NNN. value`
- Field 005 marks the start of each new record
- Occurrence syntax: `340/02. G,AN/PRC-150(C)`

### Coordinate Formats (Field 303)

| Format | Example | Notes |
|--------|---------|-------|
| 15-char standard | `302521N0864150W` | DDMMSS + N/S + DDDMMSS + E/W |
| 13-char European | `492627E073541` | DDMMSS + E/W + DDMMSS (2-digit lon degrees), lat=North assumed |
| 13-char N/S first | `492627N073541` | DDMMSS + N/S + DDMMSS (2-digit lon degrees), lon=East assumed |

Records with invalid or placeholder coordinates (`?????`) import successfully without a map marker.

---

## Troubleshooting

### Server won't start

```bash
python3 SpectrumPlotter.py --check
```

Review the pre-flight output. Common causes:
- PostgreSQL not running → `sudo systemctl start postgresql`
- Wrong credentials in `.env`
- Missing migrations → re-run `python3 install.py`

### Build errors after applying updates

Compile errors after dropping in new files usually mean a dependency was missed. Check:
- All files from the update zip are in place
- `go mod download` has been run: `cd Plotter && go mod download`

### Import shows 0 records / Internal Server Error

- **0 records**: The file format was not detected correctly. Check that the first row is a valid SFAF header or that fields start with `NNN.` pattern.
- **Internal Server Error**: Usually a coordinate parse failure. Check Field 303 values in your file — placeholder values like `????????????` are fine, but unexpected formats may need review.

### User can't see certain modules

Check the user's role with `python3 users.py list`. Operators only see Map Viewer and Frequencies. ISM-level and above get Workbox and other modules. Assign the correct role with:

```bash
python3 users.py set-role --username <user> --role ism
```

The user must log out and back in for role changes to take effect.

### Forgot admin password

```bash
cd Plotter/
python3 users.py reset-password --username admin
```

Or directly via psql if the scripts are unavailable:

```bash
# Generate a bcrypt hash first, then:
psql -U your_db_user -d sfaf_plotter \
  -c "UPDATE users SET password_hash='<hash>' WHERE username='admin';"
```

### Sessions not persisting after restart

Sessions are stored in the database and survive restarts. If users are being logged out on restart, check that the database is accessible and that `DB_SSLMODE` in `.env` is set correctly for your PostgreSQL configuration.

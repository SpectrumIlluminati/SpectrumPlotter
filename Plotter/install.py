#!/usr/bin/env python3
"""
SFAF Plotter — Debian 13 Installer
====================================
Installs all system dependencies, configures PostgreSQL, installs Go 1.25.3,
initialises the database schema, and optionally creates the first admin user.

Must be run as root or via sudo.
The .env file must exist in this directory before running.

Usage:
    sudo python3 install.py
"""

import os
import sys
import subprocess
import platform
import shutil
import getpass
import urllib.request
import tarfile
import tempfile
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
GO_VERSION  = "1.25.3"
GO_INST_DIR = "/usr/local"
GOROOT      = f"{GO_INST_DIR}/go"
SCRIPT_DIR  = Path(__file__).parent.resolve()

ARCH_MAP = {"x86_64": "amd64", "aarch64": "arm64"}

APT_PACKAGES = [
    "postgresql",
    "postgresql-contrib",
    "curl",
    "git",
    "build-essential",
    "ca-certificates",
]

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
RED, GREEN, YELLOW, BLUE, CYAN, NC = (
    "\033[0;31m", "\033[0;32m", "\033[1;33m",
    "\033[0;34m", "\033[0;36m", "\033[0m",
)

def _c(text, colour): return f"{colour}{text}{NC}"

def banner():
    print(f"""
{CYAN}╔══════════════════════════════════════════╗
║     SFAF Plotter — Debian 13 Installer   ║
╚══════════════════════════════════════════╝{NC}
""")

def step(msg):   print(f"\n{_c('▶', BLUE)} {msg}")
def ok(msg):     print(f"  {_c('✓', GREEN)} {msg}")
def warn(msg):   print(f"  {_c('⚠', YELLOW)} {msg}")
def info(msg):   print(f"  {_c('·', CYAN)} {msg}")
def die(msg):
    print(f"\n{_c('✗ FATAL:', RED)} {msg}")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def run(cmd, *, check=True, capture=False, env=None, cwd=None):
    """Run a shell command.  Dies on non-zero exit unless check=False."""
    result = subprocess.run(
        cmd, shell=isinstance(cmd, str),
        capture_output=capture, text=True,
        env=env or os.environ.copy(), cwd=cwd,
    )
    if check and result.returncode != 0:
        die(f"Command failed ({result.returncode}):\n  {cmd}\n{result.stderr or ''}")
    return result

def run_as_postgres(sql):
    """Execute a SQL statement via the local postgres superuser."""
    run(["sudo", "-u", "postgres", "psql", "-c", sql])

def query_postgres(sql):
    """Return stdout of a psql query."""
    return run(
        ["sudo", "-u", "postgres", "psql", "-tAc", sql],
        capture=True,
    ).stdout.strip()

def load_env(path: Path) -> dict:
    env = {}
    if not path.exists():
        die(f".env not found at {path}\n  Create it from the template before running this installer.")
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip()
    return env

def go_bin() -> str:
    """Return the path to the Go binary, preferring our installed version."""
    candidate = f"{GOROOT}/bin/go"
    if os.path.isfile(candidate):
        return candidate
    found = shutil.which("go")
    if found:
        return found
    die("Go binary not found. Install may be incomplete — re-run this script.")

# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------
def check_root():
    step("Checking privileges")
    if os.geteuid() != 0:
        die("This script must be run as root or with sudo.")
    ok("Running as root")

def apt_install():
    step("Installing system packages")
    info("Running apt-get update …")
    run("apt-get update -qq")
    pkgs = " ".join(APT_PACKAGES)
    info(f"Installing: {pkgs}")
    run(f"apt-get install -y -qq {pkgs}")
    ok("System packages installed")

def install_go():
    step(f"Checking Go {GO_VERSION}")

    # Check existing version
    existing = shutil.which("go") or f"{GOROOT}/bin/go"
    if os.path.isfile(existing):
        result = run([existing, "version"], capture=True, check=False)
        if f"go{GO_VERSION}" in result.stdout:
            ok(f"Go {GO_VERSION} already installed")
            _add_go_to_path()
            return

    arch = ARCH_MAP.get(platform.machine(), "amd64")
    archive  = f"go{GO_VERSION}.linux-{arch}.tar.gz"
    url      = f"https://go.dev/dl/{archive}"
    tmp_path = Path(tempfile.mkdtemp()) / archive

    info(f"Downloading {url} …")
    try:
        urllib.request.urlretrieve(url, tmp_path)
    except Exception as e:
        die(f"Download failed: {e}\n  Check your internet connection and try again.")

    info(f"Extracting to {GO_INST_DIR} …")
    if Path(GOROOT).exists():
        shutil.rmtree(GOROOT)
    with tarfile.open(tmp_path, "r:gz") as tf:
        tf.extractall(GO_INST_DIR)
    tmp_path.unlink(missing_ok=True)

    _add_go_to_path()
    result = run([go_bin(), "version"], capture=True)
    ok(result.stdout.strip())

def _add_go_to_path():
    """Add Go to PATH for this process and persistently via /etc/profile.d."""
    go_bin_dir = f"{GOROOT}/bin"
    if go_bin_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = f"{go_bin_dir}:{os.environ['PATH']}"

    profile = Path("/etc/profile.d/go.sh")
    profile.write_text(
        f'export PATH="$PATH:{go_bin_dir}"\n'
        f'export GOROOT="{GOROOT}"\n'
    )
    ok(f"Go PATH written to {profile}")

def setup_postgresql(env: dict):
    step("Configuring PostgreSQL")

    # Ensure service is running
    result = run("systemctl is-active postgresql", capture=True, check=False)
    if result.stdout.strip() != "active":
        info("Starting PostgreSQL service …")
        run("systemctl start postgresql")
        run("systemctl enable postgresql --quiet")
    ok("PostgreSQL service is running")

    db_user = env.get("DB_USER", "")
    db_pass = env.get("DB_PASSWORD", "")
    db_name = env.get("DB_NAME", "")

    if not all([db_user, db_pass, db_name]):
        die("DB_USER, DB_PASSWORD, and DB_NAME must all be set in .env")

    # Create role if absent
    role_exists = query_postgres(
        f"SELECT 1 FROM pg_roles WHERE rolname='{db_user}'"
    )
    if role_exists == "1":
        info(f"Role '{db_user}' already exists — skipping create")
    else:
        run_as_postgres(
            f"CREATE ROLE \"{db_user}\" WITH LOGIN PASSWORD '{db_pass}';"
        )
        ok(f"Created PostgreSQL role: {db_user}")

    # Create database if absent
    db_exists = query_postgres(
        f"SELECT 1 FROM pg_database WHERE datname='{db_name}'"
    )
    if db_exists == "1":
        info(f"Database '{db_name}' already exists — skipping create")
    else:
        run_as_postgres(
            f"CREATE DATABASE \"{db_name}\" OWNER \"{db_user}\";"
        )
        ok(f"Created database: {db_name}")

    # Grant privileges (idempotent)
    run_as_postgres(
        f"GRANT ALL PRIVILEGES ON DATABASE \"{db_name}\" TO \"{db_user}\";"
    )
    ok("Privileges granted")

def go_mod_download():
    step("Downloading Go module dependencies")
    info("Running go mod download …")
    run([go_bin(), "mod", "download"], cwd=str(SCRIPT_DIR))
    ok("Go modules ready")

def init_database():
    step("Initialising database schema")
    info("Running migrations …")
    run(
        [go_bin(), "run", "cmd/init_database/main.go"],
        cwd=str(SCRIPT_DIR),
    )
    ok("Database schema initialised")

def _user_exists(username: str) -> bool:
    """Return True if a user row with this username already exists."""
    result = subprocess.run(
        [go_bin(), "run", "cmd/list_users/main.go"],
        capture_output=True, text=True, cwd=str(SCRIPT_DIR),
    )
    return username in result.stdout


def create_first_user():
    step("Create first admin user")
    print(f"  {YELLOW}Skip this step if you already have users.{NC}")
    answer = input("  Create an admin user now? [y/N] ").strip().lower()
    if answer != "y":
        info("Skipped — run users.py later to add users")
        return

    username = input("  Username: ").strip()
    if not username:
        warn("No username entered — skipping")
        return

    password = getpass.getpass("  Password: ")
    confirm  = getpass.getpass("  Confirm password: ")
    if password != confirm:
        warn("Passwords do not match — skipping")
        return

    # Migration 007 seeds a demo 'admin' row with no password.
    # If the username already exists, reset their password and promote to admin
    # rather than crashing on a unique-constraint violation.
    if _user_exists(username):
        warn(f"User '{username}' already exists (seeded by migration).")
        info("Resetting password and promoting to admin …")
        result = subprocess.run(
            [go_bin(), "run", "cmd/reset_password/main.go", username, password],
            cwd=str(SCRIPT_DIR),
        )
        if result.returncode != 0:
            warn("Password reset failed — run: python3 users.py reset-password")
            return
        env = load_env(SCRIPT_DIR / ".env")
        pgenv = os.environ.copy()
        pgenv["PGPASSWORD"] = env.get("DB_PASSWORD", "")
        subprocess.run([
            "psql",
            "-h", env.get("DB_HOST", "localhost"),
            "-p", env.get("DB_PORT", "5432"),
            "-U", env.get("DB_USER", "postgres"),
            "-d", env.get("DB_NAME", "sfaf_plotter"),
            "-c", (
                f"UPDATE users SET role='admin', is_active=true "
                f"WHERE username='{username}';"
            ),
        ], env=pgenv, check=False)
        ok(f"User '{username}' password set and promoted to admin")
        return

    email     = input("  Email: ").strip()
    full_name = input("  Full name: ").strip()
    org       = input("  Organization (optional): ").strip()

    cmd = [go_bin(), "run", "cmd/create_user/main.go",
           username, password, email, full_name, "admin"]
    if org:
        cmd.append(org)

    result = subprocess.run(cmd, cwd=str(SCRIPT_DIR))
    if result.returncode != 0:
        warn("User creation failed — run: python3 users.py create --role admin")
        return
    ok(f"Admin user '{username}' created")


def print_summary(env: dict):
    port = env.get("SERVER_PORT", "8080")
    host = env.get("SERVER_HOST", "0.0.0.0")
    print(f"""
{GREEN}══════════════════════════════════════════════
  Installation complete!

  Start the server:
    python3 SpectrumPlotter.py

  Manage users:
    python3 users.py list
    python3 users.py create

  Server will be available at:
    http://{host}:{port}
══════════════════════════════════════════════{NC}
""")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    banner()
    check_root()

    env_path = SCRIPT_DIR / ".env"
    env = load_env(env_path)

    apt_install()
    install_go()
    setup_postgresql(env)
    go_mod_download()
    init_database()
    create_first_user()
    print_summary(env)

if __name__ == "__main__":
    main()

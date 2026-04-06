#!/usr/bin/env python3
"""
SFAF Plotter — Application Launcher
=====================================
Verifies the environment, ensures PostgreSQL is running, builds the Go binary
if needed, and starts the web server in the foreground.

Press Ctrl+C to stop.

Usage:
    python3 SpectrumPlotter.py           # normal start
    python3 SpectrumPlotter.py --build   # force rebuild before starting
    python3 SpectrumPlotter.py --check   # environment check only, no start
"""

import os
import sys
import subprocess
import signal
import shutil
import time
import argparse
from pathlib import Path

SCRIPT_DIR  = Path(__file__).parent.resolve()
BINARY_PATH = SCRIPT_DIR / "bin" / "sfaf-plotter"

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
RED, GREEN, YELLOW, BLUE, CYAN, NC = (
    "\033[0;31m", "\033[0;32m", "\033[1;33m",
    "\033[0;34m", "\033[0;36m", "\033[0m",
)

def _c(text, colour): return f"{colour}{text}{NC}"
def ok(msg):   print(f"  {_c('✓', GREEN)} {msg}")
def warn(msg): print(f"  {_c('⚠', YELLOW)} {msg}")
def info(msg): print(f"  {_c('·', CYAN)} {msg}")
def die(msg):
    print(f"\n{_c('✗ FATAL:', RED)} {msg}")
    sys.exit(1)

def banner(env: dict):
    port    = env.get("SERVER_PORT", "8080")
    host    = env.get("SERVER_HOST", "0.0.0.0")
    mode    = env.get("GIN_MODE", "debug")
    db_name = env.get("DB_NAME", "?")
    db_host = env.get("DB_HOST", "?")

    display_host = "localhost" if host in ("0.0.0.0", "") else host

    print(f"""
{CYAN}╔══════════════════════════════════════════════╗
║          SFAF Plotter  ·  MC4EB Pub 7 C1     ║
╚══════════════════════════════════════════════╝{NC}

  {_c('URL', BLUE)}       http://{display_host}:{port}
  {_c('Mode', BLUE)}      {mode}
  {_c('Database', BLUE)}  {db_name} @ {db_host}

  Press {_c('Ctrl+C', YELLOW)} to stop.
""")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def load_env(path: Path) -> dict:
    env = {}
    if not path.exists():
        die(f".env not found at {path}\n  Run install.py first.")
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip()
    return env

def apply_env(env: dict):
    """Push .env values into the current process environment."""
    for k, v in env.items():
        os.environ.setdefault(k, v)

def go_bin() -> str:
    for candidate in ["/usr/local/go/bin/go", shutil.which("go") or ""]:
        if candidate and os.path.isfile(candidate):
            return candidate
    die(
        "Go binary not found.\n"
        "  Run install.py first, then open a new shell so /usr/local/go/bin is on PATH."
    )

def run(cmd, *, check=True, capture=False, cwd=None):
    result = subprocess.run(
        cmd, shell=isinstance(cmd, str),
        capture_output=capture, text=True, cwd=cwd,
    )
    if check and result.returncode != 0:
        die(f"Command failed:\n  {cmd}\n{result.stderr or ''}")
    return result

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
def check_env(env: dict):
    """Validate that required .env keys are present and non-empty."""
    required = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD",
                "DB_NAME", "SERVER_PORT"]
    missing = [k for k in required if not env.get(k)]
    if missing:
        die(f"Missing required .env keys: {', '.join(missing)}\n"
            "  Edit .env and fill in the missing values.")
    ok(".env loaded and validated")

def check_postgresql(env: dict) -> bool:
    """Return True if PostgreSQL is accepting connections on the configured host/port."""
    result = subprocess.run(
        ["pg_isready",
         "-h", env.get("DB_HOST", "localhost"),
         "-p", env.get("DB_PORT", "5432"),
         "-U", env.get("DB_USER", "postgres")],
        capture_output=True, text=True,
    )
    return result.returncode == 0

def ensure_postgresql(env: dict):
    """Check PostgreSQL is up; attempt to start the local service if not."""
    if check_postgresql(env):
        ok("PostgreSQL is accepting connections")
        return

    warn("PostgreSQL is not responding — attempting to start service …")
    if shutil.which("systemctl"):
        result = subprocess.run(
            ["systemctl", "start", "postgresql"],
            capture_output=True, text=True,
        )
        if result.returncode == 0:
            time.sleep(2)
            if check_postgresql(env):
                ok("PostgreSQL started successfully")
                return
    die(
        "Cannot reach PostgreSQL.\n"
        "  • If running locally:  sudo systemctl start postgresql\n"
        "  • If using a remote DB:  verify DB_HOST and DB_PORT in .env\n"
        "  • Check logs:  sudo journalctl -u postgresql -n 50"
    )

def check_database_initialised(env: dict):
    """Verify the schema_migrations table exists — confirms init_database was run."""
    pgpass = os.environ.copy()
    pgpass["PGPASSWORD"] = env.get("DB_PASSWORD", "")
    result = subprocess.run(
        [
            "psql",
            "-h", env.get("DB_HOST", "localhost"),
            "-p", env.get("DB_PORT", "5432"),
            "-U", env.get("DB_USER", "postgres"),
            "-d", env.get("DB_NAME", "sfaf_plotter"),
            "-tAc",
            "SELECT COUNT(*) FROM schema_migrations;",
        ],
        capture_output=True, text=True, env=pgpass,
    )
    if result.returncode != 0:
        err_msg = result.stderr.strip()
        if "does not exist" in err_msg:
            die(
                f"Database '{env.get('DB_NAME')}' does not exist or has not been initialised.\n"
                "  Run:  sudo python3 install.py"
            )
        die(f"Database connectivity error:\n  {err_msg}")

    migration_count = result.stdout.strip()
    ok(f"Database schema verified ({migration_count} migrations applied)")

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
def needs_rebuild() -> bool:
    """Return True if the binary is missing or any Go source file is newer than it."""
    if not BINARY_PATH.exists():
        return True
    binary_mtime = BINARY_PATH.stat().st_mtime
    for src in SCRIPT_DIR.rglob("*.go"):
        # Skip the test data generator — it's a cmd tool, not the server
        if "generate_test_data" in str(src):
            continue
        if src.stat().st_mtime > binary_mtime:
            return True
    return False

def build_binary(force: bool = False):
    if not force and not needs_rebuild():
        ok("Binary is up to date — skipping build")
        return

    info("Building binary …")
    BINARY_PATH.parent.mkdir(exist_ok=True)

    start = time.monotonic()
    run(
        [go_bin(), "build", "-o", str(BINARY_PATH), "."],
        cwd=str(SCRIPT_DIR),
    )
    elapsed = time.monotonic() - start
    ok(f"Binary built in {elapsed:.1f}s  →  {BINARY_PATH}")

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
def run_server(env: dict):
    """Start the server binary in the foreground and handle Ctrl+C gracefully."""
    proc = None

    def _shutdown(signum, frame):
        print(f"\n\n{_c('Shutting down …', YELLOW)}")
        if proc and proc.poll() is None:
            proc.send_signal(signal.SIGINT)
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()
        print(_c("Server stopped.", GREEN))
        sys.exit(0)

    signal.signal(signal.SIGINT,  _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    banner(env)

    server_env = os.environ.copy()
    for k, v in env.items():
        server_env[k] = v

    proc = subprocess.Popen(
        [str(BINARY_PATH)],
        cwd=str(SCRIPT_DIR),
        env=server_env,
    )

    # Wait for the process; re-raise if it crashes
    exit_code = proc.wait()
    if exit_code not in (0, -2):   # -2 = SIGINT (normal Ctrl+C)
        die(f"Server exited unexpectedly with code {exit_code}.\n"
            "  Check the output above for error details.")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        prog="SpectrumPlotter.py",
        description="SFAF Plotter launcher",
    )
    parser.add_argument(
        "--build", action="store_true",
        help="Force a rebuild of the Go binary before starting",
    )
    parser.add_argument(
        "--check", action="store_true",
        help="Run pre-flight checks only — do not start the server",
    )
    args = parser.parse_args()

    # ── Load and validate environment ──────────────────────────────────────
    env_path = SCRIPT_DIR / ".env"
    env = load_env(env_path)
    apply_env(env)

    print(f"\n{_c('Pre-flight checks', BLUE)}")
    print("─" * 40)

    check_env(env)
    ensure_postgresql(env)
    check_database_initialised(env)

    if args.check:
        print(f"\n{_c('All checks passed.', GREEN)}  (--check mode — not starting server)\n")
        return

    # ── Build ───────────────────────────────────────────────────────────────
    print(f"\n{_c('Build', BLUE)}")
    print("─" * 40)
    build_binary(force=args.build)

    # ── Start ───────────────────────────────────────────────────────────────
    run_server(env)

if __name__ == "__main__":
    main()

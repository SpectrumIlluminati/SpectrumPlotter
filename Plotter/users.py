#!/usr/bin/env python3
"""
SFAF Plotter — User Management
================================
Create, delete, list, and reset passwords for SFAF Plotter users.
Wraps the Go CLI tools in cmd/ with a friendly interface.

Does NOT require root.  Requires Go and a running database.

Usage:
    python3 users.py list
    python3 users.py create
    python3 users.py create --username alice --email alice@unit.mil \\
                            --full-name "Alice Smith" --role admin
    python3 users.py delete --username alice
    python3 users.py reset-password --username alice
    python3 users.py deactivate --username alice
"""

import os
import sys
import subprocess
import getpass
import argparse
import shutil
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()

VALID_ROLES = ["admin", "operator", "viewer", "ism", "command",
               "combatant_command", "agency", "ntia"]

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
RED, GREEN, YELLOW, BLUE, CYAN, NC = (
    "\033[0;31m", "\033[0;32m", "\033[1;33m",
    "\033[0;34m", "\033[0;36m", "\033[0m",
)

def _c(text, colour): return f"{colour}{text}{NC}"
def ok(msg):   print(f"{_c('✓', GREEN)} {msg}")
def warn(msg): print(f"{_c('⚠', YELLOW)} {msg}")
def err(msg):  print(f"{_c('✗', RED)} {msg}", file=sys.stderr)
def die(msg):
    err(msg)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def go_bin() -> str:
    for candidate in ["/usr/local/go/bin/go", shutil.which("go") or ""]:
        if candidate and os.path.isfile(candidate):
            return candidate
    die(
        "Go not found.  Run install.py first, then open a new shell "
        "so /usr/local/go/bin is on PATH."
    )

def load_env(path: Path) -> dict:
    env = {}
    if not path.exists():
        die(f".env not found at {path}  —  is this the right directory?")
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip()
    return env

def go_run(cmd_path: str, *args):
    """Run a Go cmd tool from SCRIPT_DIR, streaming output to the terminal."""
    full_cmd = [go_bin(), "run", cmd_path, *args]
    result = subprocess.run(full_cmd, cwd=str(SCRIPT_DIR))
    return result.returncode

def prompt(label: str, default: str = "", hidden: bool = False) -> str:
    """Prompt for input, optionally hidden.  Strips whitespace."""
    display = f"{label} [{default}]: " if default else f"{label}: "
    try:
        if hidden:
            value = getpass.getpass(display)
        else:
            value = input(display).strip()
    except (KeyboardInterrupt, EOFError):
        print()
        die("Aborted.")
    return value if value else default

def confirm(question: str) -> bool:
    answer = prompt(f"{question} [y/N]").lower()
    return answer == "y"

# ---------------------------------------------------------------------------
# Sub-commands
# ---------------------------------------------------------------------------
def cmd_list(args):
    """List all users."""
    print(f"\n{_c('Users', CYAN)}")
    print("─" * 52)
    rc = go_run("cmd/list_users/main.go")
    if rc != 0:
        die(f"list_users exited with code {rc}")
    print()

def cmd_create(args):
    """Create a new user, prompting for any missing fields."""
    print(f"\n{_c('Create User', CYAN)}")
    print("─" * 30)

    username  = args.username  or prompt("Username")
    email     = args.email     or prompt("Email")
    full_name = args.full_name or prompt("Full name")
    role      = args.role      or prompt("Role", default="operator")
    org       = args.org       or prompt("Organization (optional)")

    if not username:
        die("Username is required.")
    if not email:
        die("Email is required.")
    if not full_name:
        die("Full name is required.")
    if role not in VALID_ROLES:
        die(f"Invalid role '{role}'.  Valid roles: {', '.join(VALID_ROLES)}")

    password = prompt("Password", hidden=True)
    if not password:
        die("Password cannot be empty.")
    confirm_pw = prompt("Confirm password", hidden=True)
    if password != confirm_pw:
        die("Passwords do not match.")

    print()
    rc = go_run("cmd/create_user/main.go",
                username, password, email, full_name, role, org)
    if rc != 0:
        sys.exit(rc)

def cmd_delete(args):
    """Delete a user (permanent — removes the row)."""
    username = args.username or prompt("Username to delete")
    if not username:
        die("Username is required.")

    print()
    warn(f"This will permanently delete user '{username}' and all their sessions.")
    if not confirm("Continue?"):
        print("Aborted.")
        return

    print()
    rc = go_run("cmd/delete_user/main.go", username)
    if rc != 0:
        sys.exit(rc)

def cmd_reset_password(args):
    """Reset a user's password."""
    username = args.username or prompt("Username")
    if not username:
        die("Username is required.")

    print()
    password = prompt("New password", hidden=True)
    if not password:
        die("Password cannot be empty.")
    confirm_pw = prompt("Confirm new password", hidden=True)
    if password != confirm_pw:
        die("Passwords do not match.")

    print()
    rc = go_run("cmd/reset_password/main.go", username, password)
    if rc != 0:
        sys.exit(rc)

def cmd_set_role(args):
    """Change a user's role."""
    username = args.username or prompt("Username")
    if not username:
        die("Username is required.")
    role = args.role or prompt("New role", default="operator")
    if role not in VALID_ROLES:
        die(f"Invalid role '{role}'.  Valid roles: {', '.join(VALID_ROLES)}")
    env = load_env(SCRIPT_DIR / ".env")
    pgenv = os.environ.copy()
    pgenv["PGPASSWORD"] = env.get("DB_PASSWORD", "")
    result = subprocess.run([
        "psql",
        "-h", env.get("DB_HOST", "localhost"),
        "-p", env.get("DB_PORT", "5432"),
        "-U", env.get("DB_USER", "postgres"),
        "-d", env.get("DB_NAME", "sfaf_plotter"),
        "-c", (
            f"UPDATE users SET role='{role}', updated_at=NOW() "
            f"WHERE username='{username}' RETURNING username, role;"
        ),
    ], capture_output=True, text=True, env=pgenv)
    if result.returncode != 0:
        die(f"psql error: {result.stderr.strip()}")
    if "(0 rows)" in result.stdout:
        warn(f"User '{username}' not found.")
    else:
        ok(f"User '{username}' role set to '{role}'.")
        if role == "admin":
            info("Log out and back in for the change to take effect.")


def cmd_deactivate(args):
    """Set a user's is_active flag to false (non-destructive alternative to delete)."""
    username = args.username or prompt("Username to deactivate")
    if not username:
        die("Username is required.")

    # No dedicated Go tool for deactivation — use psql via the DB connection
    # from .env.  Fall back to a warning if psycopg2 isn't available.
    env = load_env(SCRIPT_DIR / ".env")
    try:
        import subprocess as sp
        psql_env = os.environ.copy()
        psql_env["PGPASSWORD"] = env.get("DB_PASSWORD", "")
        cmd = [
            "psql",
            "-h", env.get("DB_HOST", "localhost"),
            "-p", env.get("DB_PORT", "5432"),
            "-U", env.get("DB_USER", "postgres"),
            "-d", env.get("DB_NAME", "sfaf_plotter"),
            "-c", f"UPDATE users SET is_active = false, updated_at = NOW() "
                  f"WHERE username = '{username}' RETURNING username;",
        ]
        result = sp.run(cmd, capture_output=True, text=True, env=psql_env)
        if result.returncode != 0:
            die(f"psql error: {result.stderr.strip()}")
        if "(0 rows)" in result.stdout:
            warn(f"User '{username}' not found.")
        else:
            ok(f"User '{username}' deactivated (is_active = false).")
            info = ("They can no longer log in but their data is preserved.  "
                    "Re-enable via the Admin panel or reset to active with:\n"
                    f"  psql ... -c \"UPDATE users SET is_active=true WHERE username='{username}';\"")
            print(f"  {_c('ℹ', CYAN)} {info}")
    except FileNotFoundError:
        die("psql not found.  Install postgresql-client or use the Admin panel in the web UI.")

# ---------------------------------------------------------------------------
# Argument parser
# ---------------------------------------------------------------------------
def build_parser():
    parser = argparse.ArgumentParser(
        prog="users.py",
        description="SFAF Plotter — user management",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", metavar="<command>")
    sub.required = True

    # list
    sub.add_parser("list", help="List all users")

    # create
    p_create = sub.add_parser("create", help="Create a new user")
    p_create.add_argument("--username",  metavar="NAME")
    p_create.add_argument("--email",     metavar="EMAIL")
    p_create.add_argument("--full-name", metavar="NAME", dest="full_name")
    p_create.add_argument("--role",      metavar="ROLE",
                          help=f"One of: {', '.join(VALID_ROLES)}")
    p_create.add_argument("--org", metavar="ORG", default="",
                          help="Organization (optional)")

    # delete
    p_del = sub.add_parser("delete", help="Permanently delete a user")
    p_del.add_argument("--username", metavar="NAME")

    # reset-password
    p_rp = sub.add_parser("reset-password", help="Reset a user's password")
    p_rp.add_argument("--username", metavar="NAME")

    # deactivate
    p_sr = sub.add_parser("set-role", help="Change a user\'s role")
    p_sr.add_argument("--username", metavar="NAME")
    p_sr.add_argument("--role",     metavar="ROLE",
                      help=f"One of: {', '.join(VALID_ROLES)}")

    p_da = sub.add_parser("deactivate",
                          help="Disable a user without deleting them")
    p_da.add_argument("--username", metavar="NAME")

    return parser

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = build_parser()
    args = parser.parse_args()

    dispatch = {
        "list":           cmd_list,
        "create":         cmd_create,
        "delete":         cmd_delete,
        "reset-password": cmd_reset_password,
        "set-role":       cmd_set_role,
        "deactivate":     cmd_deactivate,
    }
    dispatch[args.command](args)

if __name__ == "__main__":
    main()

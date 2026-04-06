// auth-guard.js — Role-based page access control
// Usage: requireRole(['admin']) or requireRole(['admin', 'operator'])

// Roles that can see the ISM Workbox nav link
const _ISM_NAV_ROLES = ['ism', 'command', 'combatant_command', 'agency', 'ntia', 'admin'];

// Auto-run: show .ism-nav-link elements for qualifying roles
document.addEventListener('DOMContentLoaded', async function () {
    // Hide the nav until role is resolved to prevent flash
    const navCenter = document.querySelector('.nav-links-center');
    if (navCenter) navCenter.style.visibility = 'hidden';
    const topbarNav = document.querySelector('.topbar-nav');
    if (topbarNav) topbarNav.style.visibility = 'hidden';

    try {
        const token = localStorage.getItem('sfaf_token') || getCookieValue('session_token');
        const headers = token ? { 'Authorization': token } : {};
        const res = await fetch('/api/auth/session', { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.valid || !data.user) return;
        const role = data.user.role || 'operator';
        if (_ISM_NAV_ROLES.includes(role)) {
            document.querySelectorAll('.ism-nav-link').forEach(el => {
                el.style.display = '';
            });
        }
        if (role === 'admin') {
            document.querySelectorAll('.admin-console-link').forEach(el => {
                el.style.display = '';
            });
        }
        if (role === 'operator') {
            // Allowed hrefs for operators — everything else is hidden.
            const operatorAllowed = ['/map-viewer', '/', '/frequency', '/frequency/request'];
            // Hide nav-links that are anchor tags with disallowed hrefs,
            // or elements explicitly marked data-operator-hide.
            // Buttons without href (logout, refresh, etc.) are left alone.
            document.querySelectorAll('.nav-link, [data-operator-hide]').forEach(el => {
                if (el.hasAttribute('data-operator-hide')) {
                    el.style.display = 'none';
                    return;
                }
                const href = el.getAttribute('href');
                // Only hide anchor elements with hrefs — never hide buttons without hrefs
                if (href !== null && !operatorAllowed.includes(href)) {
                    el.style.display = 'none';
                }
            });
        }
    } catch { /* non-critical — nav link stays hidden */ }
    finally {
        if (navCenter) navCenter.style.visibility = '';
        if (topbarNav) topbarNav.style.visibility = '';
    }
});

async function requireRole(allowedRoles) {
    try {
        const token = localStorage.getItem('sfaf_token') || getCookieValue('session_token');
        const headers = token ? { 'Authorization': token } : {};

        const res = await fetch('/api/auth/session', { headers });
        if (!res.ok) {
            window.location.href = '/';
            return;
        }

        const data = await res.json();
        if (!data.valid || !allowedRoles.includes(data.user?.role)) {
            window.location.href = '/?access=denied';
        }
    } catch {
        window.location.href = '/';
    }
}

async function handleLogout() {
    try {
        const token = localStorage.getItem('sfaf_token') || getCookieValue('session_token');
        const headers = token ? { 'Authorization': token } : {};
        await fetch('/api/auth/logout', { method: 'POST', headers });
    } finally {
        localStorage.clear();
        window.location.href = '/';
    }
}

// Format a 10-digit number as (xxx) xxx-xxxx
function formatCommercialPhone(raw) {
    const d = raw.replace(/\D/g, '').slice(0, 10);
    if (d.length <= 3)  return d.length ? `(${d}` : '';
    if (d.length <= 6)  return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
}

// Format a 10-digit number as xxx-xxx-xxxx
function formatDSNPhone(raw) {
    const d = raw.replace(/\D/g, '').slice(0, 10);
    if (d.length <= 3)  return d;
    if (d.length <= 6)  return `${d.slice(0,3)}-${d.slice(3)}`;
    return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
}

function attachPhoneFormatters(commercialId, dsnId) {
    const comm = document.getElementById(commercialId);
    const dsn  = document.getElementById(dsnId);
    if (comm && !comm.dataset.phoneFmt) {
        comm.dataset.phoneFmt = '1';
        comm.addEventListener('input', () => { comm.value = formatCommercialPhone(comm.value); });
        comm.addEventListener('blur',  () => { comm.value = formatCommercialPhone(comm.value); });
    }
    if (dsn && !dsn.dataset.phoneFmt) {
        dsn.dataset.phoneFmt = '1';
        dsn.addEventListener('input', () => { dsn.value = formatDSNPhone(dsn.value); });
        dsn.addEventListener('blur',  () => { dsn.value = formatDSNPhone(dsn.value); });
    }
}

function getCookieValue(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : '';
}

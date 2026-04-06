// admin.js — User Management Admin Panel

// ─── Pay Grade & ISM Options ─────────────────────────────────────────────────

const PAY_GRADE_OPTIONS = {
    'Air Force':   ['E-1 — Airman Basic','E-2 — Airman','E-3 — Airman First Class','E-4 — Senior Airman','E-5 — Staff Sergeant','E-6 — Technical Sergeant','E-7 — Master Sergeant','E-8 — Senior Master Sergeant','E-9 — Chief Master Sergeant','O-1 — Second Lieutenant','O-2 — First Lieutenant','O-3 — Captain','O-4 — Major','O-5 — Lieutenant Colonel','O-6 — Colonel','O-7 — Brigadier General','O-8 — Major General','O-9 — Lieutenant General','O-10 — General'],
    'Space Force': ['E-1 — Specialist 1','E-2 — Specialist 2','E-3 — Specialist 3','E-4 — Specialist 4','E-5 — Sergeant','E-6 — Technical Sergeant','E-7 — Master Sergeant','E-8 — Senior Master Sergeant','E-9 — Chief Master Sergeant','O-1 — Second Lieutenant','O-2 — First Lieutenant','O-3 — Captain','O-4 — Major','O-5 — Lieutenant Colonel','O-6 — Colonel','O-7 — Brigadier General','O-8 — Major General','O-9 — Lieutenant General','O-10 — General of the Space Force'],
    'Army':        ['E-1 — Private','E-2 — Private Second Class','E-3 — Private First Class','E-4 — Specialist / Corporal','E-5 — Sergeant','E-6 — Staff Sergeant','E-7 — Sergeant First Class','E-8 — Master Sergeant / First Sergeant','E-9 — Sergeant Major','W-1 — Warrant Officer 1','W-2 — Chief Warrant Officer 2','W-3 — Chief Warrant Officer 3','W-4 — Chief Warrant Officer 4','W-5 — Chief Warrant Officer 5','O-1 — Second Lieutenant','O-2 — First Lieutenant','O-3 — Captain','O-4 — Major','O-5 — Lieutenant Colonel','O-6 — Colonel','O-7 — Brigadier General','O-8 — Major General','O-9 — Lieutenant General','O-10 — General'],
    'Navy':        ['E-1 — Seaman Recruit','E-2 — Seaman Apprentice','E-3 — Seaman','E-4 — Petty Officer Third Class','E-5 — Petty Officer Second Class','E-6 — Petty Officer First Class','E-7 — Chief Petty Officer','E-8 — Senior Chief Petty Officer','E-9 — Master Chief Petty Officer','W-1 — Warrant Officer','W-2 — Chief Warrant Officer 2','W-3 — Chief Warrant Officer 3','W-4 — Chief Warrant Officer 4','W-5 — Chief Warrant Officer 5','O-1 — Ensign','O-2 — Lieutenant Junior Grade','O-3 — Lieutenant','O-4 — Lieutenant Commander','O-5 — Commander','O-6 — Captain','O-7 — Rear Admiral (Lower Half)','O-8 — Rear Admiral (Upper Half)','O-9 — Vice Admiral','O-10 — Admiral'],
    'Marines':     ['E-1 — Private','E-2 — Private First Class','E-3 — Lance Corporal','E-4 — Corporal','E-5 — Sergeant','E-6 — Staff Sergeant','E-7 — Gunnery Sergeant','E-8 — Master Sergeant / First Sergeant','E-9 — Master Gunnery Sergeant / Sergeant Major','W-1 — Warrant Officer 1','W-2 — Chief Warrant Officer 2','W-3 — Chief Warrant Officer 3','W-4 — Chief Warrant Officer 4','W-5 — Chief Warrant Officer 5','O-1 — Second Lieutenant','O-2 — First Lieutenant','O-3 — Captain','O-4 — Major','O-5 — Lieutenant Colonel','O-6 — Colonel','O-7 — Brigadier General','O-8 — Major General','O-9 — Lieutenant General','O-10 — General'],
    'Coast Guard': ['E-1 — Seaman Recruit','E-2 — Seaman Apprentice','E-3 — Seaman','E-4 — Petty Officer Third Class','E-5 — Petty Officer Second Class','E-6 — Petty Officer First Class','E-7 — Chief Petty Officer','E-8 — Senior Chief Petty Officer','E-9 — Master Chief Petty Officer','O-1 — Ensign','O-2 — Lieutenant Junior Grade','O-3 — Lieutenant','O-4 — Lieutenant Commander','O-5 — Commander','O-6 — Captain','O-7 — Rear Admiral (Lower Half)','O-8 — Rear Admiral (Upper Half)','O-9 — Vice Admiral','O-10 — Admiral'],
    'Civilian':    ['GS-1','GS-2','GS-3','GS-4','GS-5','GS-6','GS-7','GS-8','GS-9','GS-10','GS-11','GS-12','GS-13','GS-14','GS-15','SES — Senior Executive Service'],
    'Contractor':  ['CTR — Contractor'],
};

let allAdminInstallations = [];
let allAdminWorkboxes = [];

function updateAdminPayGradeDropdown(branch, savedValue) {
    const sel = document.getElementById('fieldPayGrade');
    if (!sel) return;
    const opts = PAY_GRADE_OPTIONS[branch];
    if (!opts) {
        sel.innerHTML = '<option value="">— Select Branch First —</option>';
        return;
    }
    sel.innerHTML = '<option value="">— Select Pay Grade —</option>' +
        opts.map(label => {
            const value = label.split(' — ')[0];
            return `<option value="${value}"${value === savedValue ? ' selected' : ''}>${label}</option>`;
        }).join('');
    if (savedValue) sel.value = savedValue;
}

function updateAdminISMDropdown(savedValue) {
    const sel = document.getElementById('fieldDefaultISM');
    if (!sel) return;
    const wbOpts = allAdminWorkboxes.map(w =>
        `<option value="${w}">${w}</option>`
    ).join('');
    const installOpts = allAdminInstallations.map(i =>
        `<option value="${i.id}">${i.name}${i.code ? ' (' + i.code + ')' : ''}</option>`
    ).join('');
    sel.innerHTML = '<option value="">— None —</option>' +
        (wbOpts      ? `<optgroup label="Workboxes / ISM Offices">${wbOpts}</optgroup>` : '') +
        (installOpts ? `<optgroup label="Installations">${installOpts}</optgroup>` : '');
    if (savedValue) {
        sel.value = savedValue;
        if (sel.value !== savedValue) {
            const opt = document.createElement('option');
            opt.value = savedValue; opt.textContent = savedValue;
            sel.appendChild(opt); sel.value = savedValue;
        }
    }
}

function onAdminBranchChange() {
    const branch = document.getElementById('fieldServiceBranch').value;
    updateAdminPayGradeDropdown(branch, null);
}

let allUsers = [];
let allRequests = {};
let editingUserId = null;
let pendingRequestId = null;
let selectedExistingUnitId = null;
let unitReviewDebounceTimer = null;

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    await requireRole(['admin']);
    loadUsers();
    loadAccountRequests();
    loadAdminInstallations();
});

async function loadAdminInstallations() {
    try {
        const [instRes, wbRes] = await Promise.all([
            fetch('/api/auth/public-installations'),
            fetch('/api/frequency/reviewers'),
        ]);
        allAdminInstallations = instRes.ok ? (await instRes.json()).installations || [] : [];
        allAdminWorkboxes     = wbRes.ok  ? (await wbRes.json()).workboxes || []  : [];
    } catch (_) { /* ISM dropdown will just be empty */ }
}

// ─── API ─────────────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('sfaf_token') || getCookie('session_token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = token;

    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : '';
}

// ─── Load & Render ────────────────────────────────────────────────────────────

async function loadUsers() {
    try {
        const data = await apiFetch('/api/admin/users');
        allUsers = data.users || [];
        updateStats();
        renderTable(allUsers);
    } catch (err) {
        showToast('Failed to load users: ' + err.message, 'error');
        document.getElementById('usersTableBody').innerHTML =
            `<tr class="loading-row"><td colspan="9"><i class="fas fa-exclamation-triangle"></i> ${err.message}</td></tr>`;
    }
}

const ROLE_LEVEL = { operator: 1, ism: 2, command: 3, combatant_command: 4, agency: 5, ntia: 6, admin: 7 };

const ROLE_LABELS = {
    admin:             'Admin',
    ntia:              'NTIA',
    agency:            'Agency',
    combatant_command: 'Combatant Cmd',
    command:           'Command',
    ism:               'ISM',
    operator:          'Operator',
};

function roleLabel(role) {
    return ROLE_LABELS[role] || role;
}

function updateStats() {
    const active = allUsers.filter(u => u.is_active);
    document.getElementById('statTotal').textContent = allUsers.length;
    document.getElementById('statActive').textContent = active.length;
    document.getElementById('statAdmins').textContent = allUsers.filter(u => u.role === 'admin').length;
    // "ISM+" = ISM level and above, excluding admin
    document.getElementById('statOperators').textContent =
        allUsers.filter(u => (ROLE_LEVEL[u.role] || 0) >= ROLE_LEVEL.ism && u.role !== 'admin').length;
}

function renderTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!users.length) {
        tbody.innerHTML = `<tr class="loading-row"><td colspan="9"><i class="fas fa-users-slash"></i> No users found</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr class="${u.is_active ? '' : 'row-inactive'}">
            <td>
                <div class="user-cell">
                    <div class="user-avatar"><i class="fas fa-user"></i></div>
                    <div>
                        <strong>${escHtml(u.username)}</strong>
                        <small>${escHtml(u.full_name)}</small>
                    </div>
                </div>
            </td>
            <td>${escHtml(u.email)}</td>
            <td>${escHtml(u.organization || '—')}</td>
            <td>${u.installation_name ? `<span title="${escHtml(u.installation_name)}"><i class="fas fa-map-marker-alt" style="color:#60a5fa;margin-right:4px"></i>${escHtml(u.installation_name)}</span>` : '<span class="muted">—</span>'}</td>
            <td>${u.primary_unit_name ? `<span title="${escHtml(u.primary_unit_code || '')}"><i class="fas fa-flag" style="color:#34d399;margin-right:4px"></i>${escHtml(u.primary_unit_name)}</span>` : '<span class="muted">—</span>'}</td>
            <td><span class="role-badge role-${u.role}">${roleLabel(u.role)}</span></td>
            <td><span class="status-badge ${u.is_active ? 'status-active' : 'status-inactive'}">
                ${u.is_active ? 'Active' : 'Inactive'}
            </span></td>
            <td>${u.last_login ? formatDate(u.last_login) : '<span class="muted">Never</span>'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-edit" title="Edit" onclick="openEditModal(${JSON.stringify(u).replace(/"/g, '&quot;')})">
                    <i class="fas fa-pen"></i>
                </button>
                ${u.is_active
                    ? `<button class="btn-icon btn-deactivate" title="Deactivate" onclick="deactivateUser('${u.id}', '${escHtml(u.username)}')">
                            <i class="fas fa-user-slash"></i>
                       </button>`
                    : `<button class="btn-icon btn-activate" title="Reactivate" onclick="reactivateUser('${u.id}', '${escHtml(u.username)}')">
                            <i class="fas fa-user-check"></i>
                       </button>`
                }
            </td>
        </tr>
    `).join('');
}

// ─── Filters ─────────────────────────────────────────────────────────────────

function filterUsers() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const role = document.getElementById('roleFilter').value;
    const status = document.getElementById('statusFilter').value;

    const filtered = allUsers.filter(u => {
        const matchSearch = !search ||
            u.username.toLowerCase().includes(search) ||
            u.full_name.toLowerCase().includes(search) ||
            u.email.toLowerCase().includes(search);
        const matchRole = !role || u.role === role;
        const matchStatus = !status ||
            (status === 'active' && u.is_active) ||
            (status === 'inactive' && !u.is_active);
        return matchSearch && matchRole && matchStatus;
    });

    renderTable(filtered);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openCreateModal() {
    editingUserId = null;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-plus"></i> New User';
    document.getElementById('userForm').reset();
    document.getElementById('fieldUsername').disabled = false;
    document.getElementById('passwordGroup').style.display = '';
    document.getElementById('fieldPassword').required = true;
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> Create User';
    updateAdminPayGradeDropdown('', null);
    updateAdminISMDropdown(null);
    attachPhoneFormatters('fieldPhone', 'fieldPhoneDSN');
    document.getElementById('userModal').style.display = 'flex';
}

function openEditModal(user) {
    editingUserId = user.id;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Edit User';
    document.getElementById('fieldUsername').value = user.username;
    document.getElementById('fieldUsername').disabled = true;
    // Split full_name → First / MI / Last
    (function(full) {
        const parts = (full || '').trim().split(/\s+/);
        if (parts.length >= 3) {
            document.getElementById('fieldFirstName').value = parts[0];
            document.getElementById('fieldMiddleInitial').value = parts[1].replace(/\.$/, '');
            document.getElementById('fieldLastName').value = parts.slice(2).join(' ');
        } else if (parts.length === 2) {
            document.getElementById('fieldFirstName').value = parts[0];
            document.getElementById('fieldMiddleInitial').value = '';
            document.getElementById('fieldLastName').value = parts[1];
        } else {
            document.getElementById('fieldFirstName').value = full || '';
            document.getElementById('fieldMiddleInitial').value = '';
            document.getElementById('fieldLastName').value = '';
        }
    })(user.full_name);
    document.getElementById('fieldEmail').value = user.email;
    document.getElementById('fieldPhone').value = formatCommercialPhone(user.phone || '');
    document.getElementById('fieldPhoneDSN').value = formatDSNPhone(user.phone_dsn || '');
    document.getElementById('fieldOrganization').value = user.organization || '';
    document.getElementById('fieldRole').value = user.role;
    document.getElementById('fieldServiceBranch').value = user.service_branch || '';
    updateAdminPayGradeDropdown(user.service_branch || '', user.pay_grade || '');
    updateAdminISMDropdown(user.default_ism_office || '');
    document.getElementById('passwordGroup').style.display = '';
    document.getElementById('fieldPassword').required = false;
    document.getElementById('fieldPassword').placeholder = 'Leave blank to keep current password';
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> Save Changes';
    attachPhoneFormatters('fieldPhone', 'fieldPhoneDSN');
    document.getElementById('userModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('userModal').style.display = 'none';
    editingUserId = null;
}

function _buildFullName() {
    const first = (document.getElementById('fieldFirstName')?.value || '').trim();
    const mi    = (document.getElementById('fieldMiddleInitial')?.value || '').trim().toUpperCase();
    const last  = (document.getElementById('fieldLastName')?.value || '').trim();
    return [first, mi, last].filter(Boolean).join(' ');
}

async function submitUserForm(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;

    try {
        if (editingUserId) {
            const pw = document.getElementById('fieldPassword').value;
            const payload = {
                email: document.getElementById('fieldEmail').value,
                full_name: _buildFullName(),
                phone: document.getElementById('fieldPhone').value.replace(/\D/g,'') || null,
                phone_dsn: document.getElementById('fieldPhoneDSN').value.replace(/\D/g,'') || null,
                organization: document.getElementById('fieldOrganization').value,
                role: document.getElementById('fieldRole').value,
                service_branch: document.getElementById('fieldServiceBranch').value || null,
                pay_grade: document.getElementById('fieldPayGrade').value || null,
                default_ism_office: document.getElementById('fieldDefaultISM').value || null,
            };
            if (pw) payload.password = pw;
            await apiFetch(`/api/admin/users/${editingUserId}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            showToast('User updated successfully', 'success');
        } else {
            await apiFetch('/api/admin/users', {
                method: 'POST',
                body: JSON.stringify({
                    username: document.getElementById('fieldUsername').value,
                    password: document.getElementById('fieldPassword').value,
                    email: document.getElementById('fieldEmail').value,
                    full_name: _buildFullName(),
                    phone: document.getElementById('fieldPhone').value.replace(/\D/g,'') || null,
                    phone_dsn: document.getElementById('fieldPhoneDSN').value.replace(/\D/g,'') || null,
                    organization: document.getElementById('fieldOrganization').value,
                    role: document.getElementById('fieldRole').value,
                    service_branch: document.getElementById('fieldServiceBranch').value || null,
                    pay_grade: document.getElementById('fieldPayGrade').value || null,
                    default_ism_office: document.getElementById('fieldDefaultISM').value || null,
                }),
            });
            showToast('User created successfully', 'success');
        }
        closeModal();
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

async function deactivateUser(id, username) {
    if (!confirm(`Deactivate user "${username}"? They will no longer be able to log in.`)) return;
    try {
        await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        showToast(`${username} deactivated`, 'success');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function reactivateUser(id, username) {
    try {
        await apiFetch(`/api/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: true }),
        });
        showToast(`${username} reactivated`, 'success');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleLogout() {
    try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
        localStorage.clear();
        window.location.href = '/';
    }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast toast-${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// Close modal on overlay click
document.getElementById('userModal').addEventListener('click', e => {
    if (e.target === document.getElementById('userModal')) closeModal();
});

// ─── Tab Switching ────────────────────────────────────────────────────────────

function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
    if (name === 'bases') loadBasesTab();
}

// ─── Account Requests ─────────────────────────────────────────────────────────

async function loadAccountRequests() {
    const status = document.getElementById('reqStatusFilter')?.value ?? 'pending';
    const tbody = document.getElementById('requestsTableBody');
    tbody.innerHTML = `<tr class="loading-row"><td colspan="7"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>`;
    try {
        const data = await apiFetch(`/api/admin/account-requests?status=${status}`);
        const reqs = data.requests || [];

        // Update pending badge
        const pending = status === '' ? reqs.filter(r => r.status === 'pending').length : (status === 'pending' ? reqs.length : null);
        const badge = document.getElementById('pendingBadge');
        if (pending !== null && pending > 0) {
            badge.textContent = pending;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }

        if (!reqs.length) {
            tbody.innerHTML = `<tr class="loading-row"><td colspan="7"><i class="fas fa-inbox"></i> No requests found</td></tr>`;
            return;
        }

        allRequests = {};
        tbody.innerHTML = reqs.map(r => {
            allRequests[r.id] = r;
            const approveBtn = r.requested_unit_name
                ? `<button class="btn-icon btn-review" title="Review Unit & Approve" onclick="openUnitReviewModal('${r.id}')">
                       <i class="fas fa-search-plus"></i>
                   </button>`
                : `<button class="btn-icon btn-activate" title="Approve" onclick="openApproveModal('${r.id}', '${escHtml(r.username)}', '${escHtml(r.full_name)}')">
                       <i class="fas fa-check"></i>
                   </button>`;
            return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar"><i class="fas fa-user-clock"></i></div>
                        <div>
                            <strong>${escHtml(r.username)}</strong>
                            <small>${escHtml(r.full_name)}</small>
                            <small style="color:var(--text-muted)">${escHtml(r.email)}${r.phone ? ' · ' + escHtml(r.phone) : ''}</small>
                        </div>
                    </div>
                </td>
                <td>
                    ${escHtml(r.organization || '—')}
                    ${r.unified_command ? `<br><small style="color:var(--text-muted)"><i class="fas fa-globe"></i> ${escHtml(r.unified_command)}</small>` : ''}
                    ${r.unit_id ? `<br><small style="color:var(--accent)"><i class="fas fa-flag"></i> ${escHtml(r.unit || 'Unit selected')}</small>` : ''}
                    ${r.requested_unit_name ? `<br><small style="color:#ffa726"><i class="fas fa-plus-circle"></i> New: ${escHtml(r.requested_unit_name)}</small>` : ''}
                    ${r.installation_id ? `<br><small style="color:#80cbc4"><i class="fas fa-map-marker-alt"></i> Installation assigned</small>` : ''}
                </td>
                <td><span class="role-badge role-${r.requested_role}">${roleLabel(r.requested_role)}</span></td>
                <td class="justification-cell">${escHtml(r.justification || '—')}</td>
                <td>${formatDate(r.created_at)}</td>
                <td><span class="status-badge status-req-${r.status}">${r.status}</span></td>
                <td class="actions-cell">
                    ${r.status === 'pending' ? `
                        ${approveBtn}
                        <button class="btn-icon btn-deactivate" title="Deny" onclick="openDenyModal('${r.id}', '${escHtml(r.username)}')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : `<span style="color:var(--text-muted);font-size:0.8rem">${r.status}</span>`}
                </td>
            </tr>`;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr class="loading-row"><td colspan="7"><i class="fas fa-exclamation-triangle"></i> ${escHtml(err.message)}</td></tr>`;
    }
}

// ─── Approve Modal ────────────────────────────────────────────────────────────

function openApproveModal(id, username, fullName) {
    pendingRequestId = id;
    document.getElementById('approveInfo').textContent = `Approving request for ${fullName} (${username}). This will create their account immediately.`;
    document.getElementById('approveTempPassword').value = '';
    document.getElementById('approveNotes').value = '';
    document.getElementById('approveResult').style.display = 'none';
    document.getElementById('approveSubmitBtn').disabled = false;
    document.getElementById('approveModal').style.display = 'flex';
}

function closeApproveModal() {
    document.getElementById('approveModal').style.display = 'none';
    pendingRequestId = null;
}

async function submitApproval() {
    const btn = document.getElementById('approveSubmitBtn');
    const result = document.getElementById('approveResult');
    btn.disabled = true;
    try {
        const data = await apiFetch(`/api/admin/account-requests/${pendingRequestId}/approve`, {
            method: 'POST',
            body: JSON.stringify({
                temp_password: document.getElementById('approveTempPassword').value,
                notes: document.getElementById('approveNotes').value,
            }),
        });
        result.className = 'approve-result approve-success';
        result.innerHTML = `<i class="fas fa-check-circle"></i> Account created for <strong>${escHtml(data.user?.username)}</strong>.
            Temporary password: <code style="background:rgba(0,0,0,0.3);padding:2px 6px;border-radius:4px">${escHtml(data.temp_password)}</code>
            ${data.unit_note ? `<br><br><i class="fas fa-exclamation-triangle" style="color:#ffa726"></i> <strong style="color:#ffa726">Unit action required:</strong> ${escHtml(data.unit_note)}` : ''}`;
        result.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-check"></i> Done';
        loadAccountRequests();
        loadUsers();
    } catch (err) {
        result.className = 'approve-result approve-error';
        result.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + escHtml(err.message);
        result.style.display = 'block';
        btn.disabled = false;
    }
}

// ─── Deny Modal ───────────────────────────────────────────────────────────────

function openDenyModal(id, username) {
    pendingRequestId = id;
    document.getElementById('denyInfo').textContent = `Deny the account request from "${username}"?`;
    document.getElementById('denyNotes').value = '';
    document.getElementById('denySubmitBtn').disabled = false;
    document.getElementById('denyModal').style.display = 'flex';
}

function closeDenyModal() {
    document.getElementById('denyModal').style.display = 'none';
    pendingRequestId = null;
}

async function submitDenial() {
    const btn = document.getElementById('denySubmitBtn');
    btn.disabled = true;
    try {
        await apiFetch(`/api/admin/account-requests/${pendingRequestId}/deny`, {
            method: 'POST',
            body: JSON.stringify({ notes: document.getElementById('denyNotes').value }),
        });
        showToast('Request denied', 'success');
        closeDenyModal();
        loadAccountRequests();
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
    }
}

// ─── Unit Review Modal ────────────────────────────────────────────────────────

function openUnitReviewModal(requestId) {
    const req = allRequests[requestId];
    if (!req) return;
    pendingRequestId = requestId;
    selectedExistingUnitId = null;

    document.getElementById('unitReviewApplicantInfo').innerHTML = `
        <strong>${escHtml(req.full_name)}</strong> (${escHtml(req.username)})
        &nbsp;·&nbsp; ${escHtml(req.email)}
        ${req.organization ? `&nbsp;·&nbsp; <strong>${escHtml(req.organization)}</strong>` : ''}
        ${req.unified_command ? `&nbsp;·&nbsp; ${escHtml(req.unified_command)}` : ''}
        <br><small style="color:#ffa726"><i class="fas fa-plus-circle"></i> Requesting new unit: <strong>${escHtml(req.requested_unit_name)}</strong></small>
        ${req.justification ? `<br><small style="color:var(--text-muted)"><i class="fas fa-comment-alt"></i> ${escHtml(req.justification)}</small>` : ''}
    `;

    document.getElementById('reviewUnitName').value = req.requested_unit_name || '';
    document.getElementById('reviewUnitCode').value = req.unit || '';
    document.getElementById('reviewTempPassword').value = '';
    document.getElementById('reviewNotes').value = '';
    document.getElementById('unitReviewResult').style.display = 'none';
    document.getElementById('unitReviewSubmitBtn').disabled = false;
    document.getElementById('unitReviewSubmitBtn').innerHTML = '<i class="fas fa-check"></i> <span id="unitReviewSubmitLabel">Create Unit &amp; Approve</span>';
    document.getElementById('selectedExistingUnitRow').style.display = 'none';

    document.getElementById('unitReviewModal').style.display = 'flex';
    searchSimilarUnits(req.requested_unit_name);
}

function closeUnitReviewModal() {
    document.getElementById('unitReviewModal').style.display = 'none';
    pendingRequestId = null;
    selectedExistingUnitId = null;
}

async function searchSimilarUnits(query) {
    const list = document.getElementById('similarUnitsList');
    if (!query || query.trim().length < 2) {
        list.innerHTML = '<div class="similar-units-empty">Enter at least 2 characters to search</div>';
        return;
    }
    list.innerHTML = '<div class="similar-units-empty"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
    try {
        const data = await apiFetch(`/api/admin/units/search?q=${encodeURIComponent(query.trim())}`);
        const units = data.units || [];
        if (!units.length) {
            list.innerHTML = '<div class="similar-units-empty"><i class="fas fa-check-circle" style="color:#4ade80"></i> No similar units found — safe to create</div>';
            return;
        }
        list.innerHTML = units.map(u => `
            <div class="similar-unit-row">
                <div>
                    <strong>${escHtml(u.name)}</strong>
                    ${u.unit_code ? `<span class="muted"> · ${escHtml(u.unit_code)}</span>` : ''}
                    ${u.organization ? `<br><small class="muted">${escHtml(u.organization)}</small>` : ''}
                </div>
                <button class="btn-icon btn-activate" title="Assign user to this unit instead" onclick="selectExistingUnit('${u.id}', '${escHtml(u.name)}')">
                    <i class="fas fa-link"></i>
                </button>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = `<div class="similar-units-empty">Search failed: ${escHtml(err.message)}</div>`;
    }
}

function debouncedSearchSimilar() {
    clearTimeout(unitReviewDebounceTimer);
    unitReviewDebounceTimer = setTimeout(() => {
        searchSimilarUnits(document.getElementById('reviewUnitName').value);
    }, 400);
}

function selectExistingUnit(unitId, unitName) {
    selectedExistingUnitId = unitId;
    document.getElementById('selectedExistingUnitName').textContent = unitName;
    document.getElementById('selectedExistingUnitRow').style.display = 'block';
    document.getElementById('unitReviewSubmitBtn').innerHTML = '<i class="fas fa-link"></i> <span>Assign to Existing Unit &amp; Approve</span>';
}

function clearExistingUnitSelection() {
    selectedExistingUnitId = null;
    document.getElementById('selectedExistingUnitRow').style.display = 'none';
    document.getElementById('unitReviewSubmitBtn').innerHTML = '<i class="fas fa-check"></i> <span>Create Unit &amp; Approve</span>';
}

function openDenyFromReview() {
    const id = pendingRequestId;
    const req = allRequests[id] || {};
    closeUnitReviewModal();
    openDenyModal(id, req.username || '');
}

async function submitUnitReview() {
    const btn = document.getElementById('unitReviewSubmitBtn');
    const result = document.getElementById('unitReviewResult');
    btn.disabled = true;

    const payload = {
        temp_password: document.getElementById('reviewTempPassword').value,
        notes: document.getElementById('reviewNotes').value,
    };

    if (selectedExistingUnitId) {
        payload.override_unit_id = selectedExistingUnitId;
    } else {
        const unitName = document.getElementById('reviewUnitName').value.trim();
        if (!unitName) {
            result.className = 'approve-result approve-error';
            result.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please enter a unit name.';
            result.style.display = 'block';
            btn.disabled = false;
            return;
        }
        payload.create_new_unit = true;
        payload.new_unit_name = unitName;
        payload.new_unit_code = document.getElementById('reviewUnitCode').value.trim();
    }

    try {
        const data = await apiFetch(`/api/admin/account-requests/${pendingRequestId}/approve`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        result.className = 'approve-result approve-success';
        result.innerHTML = `<i class="fas fa-check-circle"></i> Account created for <strong>${escHtml(data.user?.username)}</strong>.
            Temporary password: <code style="background:rgba(0,0,0,0.3);padding:2px 6px;border-radius:4px">${escHtml(data.temp_password)}</code>`;
        result.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-check"></i> Done';
        loadAccountRequests();
        loadUsers();
    } catch (err) {
        result.className = 'approve-result approve-error';
        result.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + escHtml(err.message);
        result.style.display = 'block';
        btn.disabled = false;
    }
}

// ─── Bases & Units Tab ────────────────────────────────────────────────────────

let _basesInstallations = [];   // full list from /api/installations
let _basesUnits = [];           // units for selected installation
let _selectedInstallationID = null;

async function loadBasesTab() {
    const list = document.getElementById('installationList');
    list.innerHTML = '<li class="bases-list-loading"><i class="fas fa-spinner fa-spin"></i> Loading…</li>';
    try {
        const data = await apiFetch('/api/installations');
        _basesInstallations = data.installations || [];
        renderInstallationList();
    } catch (err) {
        list.innerHTML = `<li class="bases-list-loading">Error: ${escHtml(err.message)}</li>`;
    }
}

function renderInstallationList() {
    const filter = (document.getElementById('installationSearch')?.value || '').toLowerCase();
    const list = document.getElementById('installationList');
    const filtered = _basesInstallations.filter(i =>
        !filter ||
        i.name.toLowerCase().includes(filter) ||
        (i.code && i.code.toLowerCase().includes(filter)) ||
        (i.state && i.state.toLowerCase().includes(filter))
    );
    if (!filtered.length) {
        list.innerHTML = '<li class="bases-list-loading">No installations found</li>';
        return;
    }
    list.innerHTML = filtered.map(i => `
        <li class="bases-list-item${i.id === _selectedInstallationID ? ' active' : ''}"
            onclick="selectInstallation('${escHtml(i.id)}')">
            <div class="item-main">
                <div class="item-name">${escHtml(i.name)}${i.code ? ` <small style="opacity:.6">(${escHtml(i.code)})</small>` : ''}${!i.is_active ? '<span class="unit-badge-inactive">INACTIVE</span>' : ''}</div>
                <div class="item-sub">${[i.state, i.country].filter(Boolean).join(', ') || '—'}</div>
            </div>
            <div class="item-actions">
                <button class="bases-item-btn" title="Edit" onclick="event.stopPropagation();editInstallation('${escHtml(i.id)}')"><i class="fas fa-pencil-alt"></i></button>
                <button class="bases-item-btn danger" title="Delete" onclick="event.stopPropagation();deleteInstallation('${escHtml(i.id)}','${escHtml(i.name)}')"><i class="fas fa-trash"></i></button>
            </div>
        </li>`).join('');
}

function filterInstallationList() { renderInstallationList(); }

async function selectInstallation(id) {
    _selectedInstallationID = id;
    renderInstallationList();
    const inst = _basesInstallations.find(i => i.id === id);
    const titleEl = document.getElementById('unitsPanelTitle');
    if (titleEl) titleEl.innerHTML = `<i class="fas fa-flag"></i> Units — ${escHtml(inst?.name || '')}`;
    const unitList = document.getElementById('unitList');
    unitList.innerHTML = '<li class="bases-list-loading"><i class="fas fa-spinner fa-spin"></i> Loading…</li>';
    try {
        const data = await apiFetch(`/api/frequency/units`);
        const all = data.units || [];
        _basesUnits = all.filter(u => {
            const uid = u.unit?.installation_id || u.installation_id;
            return uid === id;
        });
        renderUnitList();
    } catch (err) {
        unitList.innerHTML = `<li class="bases-list-loading">Error: ${escHtml(err.message)}</li>`;
    }
}

function renderUnitList() {
    const filter = (document.getElementById('unitSearch')?.value || '').toLowerCase();
    const list = document.getElementById('unitList');
    const items = _basesUnits.filter(u => {
        const name = (u.unit?.name || u.name || '').toLowerCase();
        const code = (u.unit?.unit_code || u.unit_code || '').toLowerCase();
        return !filter || name.includes(filter) || code.includes(filter);
    });
    if (!items.length) {
        list.innerHTML = '<li class="bases-list-loading">No units at this installation</li>';
        return;
    }
    list.innerHTML = items.map(u => {
        const unit = u.unit || u;
        return `
        <li class="bases-list-item">
            <div class="item-main">
                <div class="item-name">${escHtml(unit.name)}${!unit.is_active ? '<span class="unit-badge-inactive">INACTIVE</span>' : ''}</div>
                <div class="item-sub">${escHtml(unit.unit_code || '')}${unit.unit_type ? ' · ' + escHtml(unit.unit_type) : ''}</div>
            </div>
            <div class="item-actions">
                <button class="bases-item-btn" title="Edit" onclick="editUnit('${escHtml(unit.id)}')"><i class="fas fa-pencil-alt"></i></button>
                <button class="bases-item-btn danger" title="Delete" onclick="deleteUnit('${escHtml(unit.id)}','${escHtml(unit.name)}')"><i class="fas fa-trash"></i></button>
            </div>
        </li>`;
    }).join('');
}

function filterUnitList() { renderUnitList(); }

// ── Installation Modal ────────────────────────────────────────────────────────

function openInstallationModal(inst) {
    document.getElementById('installationModalTitle').innerHTML =
        inst ? '<i class="fas fa-building"></i> Edit Installation' : '<i class="fas fa-building"></i> New Installation';
    document.getElementById('instFieldID').value    = inst?.id || '';
    document.getElementById('instFieldName').value  = inst?.name || '';
    document.getElementById('instFieldCode').value  = inst?.code || '';
    document.getElementById('instFieldOrg').value   = inst?.organization || '';
    document.getElementById('instFieldState').value = inst?.state || '';
    document.getElementById('instFieldCountry').value = inst?.country || 'USA';
    document.getElementById('instActiveGroup').style.display = inst ? '' : 'none';
    document.getElementById('instFieldActive').value = inst ? String(inst.is_active) : 'true';
    document.getElementById('installationModal').style.display = 'flex';
}

function closeInstallationModal() {
    document.getElementById('installationModal').style.display = 'none';
}

function editInstallation(id) {
    const inst = _basesInstallations.find(i => i.id === id);
    if (inst) openInstallationModal(inst);
}

async function saveInstallation() {
    const id      = document.getElementById('instFieldID').value;
    const name    = document.getElementById('instFieldName').value.trim();
    const codeVal = document.getElementById('instFieldCode').value.trim();
    const org     = document.getElementById('instFieldOrg').value.trim();
    const state   = document.getElementById('instFieldState').value.trim();
    const country = document.getElementById('instFieldCountry').value.trim() || 'USA';
    const active  = document.getElementById('instFieldActive').value === 'true';

    if (!name) { showAdminNotification('Name is required', 'error'); return; }

    const payload = {
        name,
        code:         codeVal || null,
        organization: org || null,
        state:        state || null,
        country,
        is_active:    active,
    };

    try {
        if (id) {
            await apiFetch(`/api/installations/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            await apiFetch('/api/installations', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeInstallationModal();
        showAdminNotification(id ? 'Installation updated' : 'Installation created', 'success');
        await loadBasesTab();
        // Re-populate ISM and installation dropdowns used elsewhere
        loadAdminInstallations();
    } catch (err) {
        showAdminNotification(err.message, 'error');
    }
}

async function deleteInstallation(id, name) {
    if (!confirm(`Delete installation "${name}"? This cannot be undone.`)) return;
    try {
        await apiFetch(`/api/installations/${id}`, { method: 'DELETE' });
        showAdminNotification('Installation deleted', 'success');
        if (_selectedInstallationID === id) {
            _selectedInstallationID = null;
            document.getElementById('unitList').innerHTML = '<li class="bases-list-placeholder">Select an installation to view its units</li>';
            document.getElementById('unitsPanelTitle').innerHTML = '<i class="fas fa-flag"></i> Units';
        }
        await loadBasesTab();
        loadAdminInstallations();
    } catch (err) {
        showAdminNotification(err.message, 'error');
    }
}

// ── Unit Modal ────────────────────────────────────────────────────────────────

function _populateUnitInstallationDropdown(selectedID) {
    const sel = document.getElementById('unitFieldInstallation');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Unassigned —</option>' +
        _basesInstallations.map(i =>
            `<option value="${escHtml(i.id)}"${i.id === selectedID ? ' selected' : ''}>${escHtml(i.name)}${i.code ? ' (' + escHtml(i.code) + ')' : ''}</option>`
        ).join('');
}

function openUnitModal(unit) {
    document.getElementById('unitModalTitle').innerHTML =
        unit ? '<i class="fas fa-flag"></i> Edit Unit' : '<i class="fas fa-flag"></i> New Unit';
    document.getElementById('unitFieldID').value            = unit?.id || '';
    document.getElementById('unitFieldName').value          = unit?.name || '';
    document.getElementById('unitFieldCode').value          = unit?.unit_code || '';
    document.getElementById('unitFieldType').value          = unit?.unit_type || '';
    document.getElementById('unitFieldOrg').value           = unit?.organization || '';
    document.getElementById('unitFieldCdrName').value       = unit?.commander_name || '';
    document.getElementById('unitFieldCdrEmail').value      = unit?.commander_email || '';
    document.getElementById('unitFieldPocName').value       = unit?.comm_poc_name || '';
    document.getElementById('unitFieldPocEmail').value      = unit?.comm_poc_email || '';
    document.getElementById('unitFieldPocPhone').value      = unit?.comm_poc_phone || '';
    _populateUnitInstallationDropdown(unit?.installation_id || _selectedInstallationID || '');
    document.getElementById('unitModal').style.display = 'flex';
}

function closeUnitModal() {
    document.getElementById('unitModal').style.display = 'none';
}

async function editUnit(id) {
    try {
        // Fetch full unit details (units list has UnitWithAssignments, walk to find it)
        const data = await apiFetch('/api/frequency/units');
        const all  = data.units || [];
        const found = all.find(u => (u.unit?.id || u.id) === id);
        const unit  = found?.unit || found;
        if (unit) openUnitModal(unit);
    } catch (err) {
        showAdminNotification(err.message, 'error');
    }
}

async function saveUnit() {
    const id           = document.getElementById('unitFieldID').value;
    const name         = document.getElementById('unitFieldName').value.trim();
    const unit_code    = document.getElementById('unitFieldCode').value.trim();
    const installID    = document.getElementById('unitFieldInstallation').value || null;
    const unit_type    = document.getElementById('unitFieldType').value.trim() || null;
    const organization = document.getElementById('unitFieldOrg').value.trim() || null;
    const commander_name  = document.getElementById('unitFieldCdrName').value.trim() || null;
    const commander_email = document.getElementById('unitFieldCdrEmail').value.trim() || null;
    const comm_poc_name   = document.getElementById('unitFieldPocName').value.trim() || null;
    const comm_poc_email  = document.getElementById('unitFieldPocEmail').value.trim() || null;
    const comm_poc_phone  = document.getElementById('unitFieldPocPhone').value.trim() || null;

    if (!name)      { showAdminNotification('Unit name is required', 'error'); return; }
    if (!unit_code) { showAdminNotification('Unit code is required', 'error'); return; }

    const payload = {
        name, unit_code,
        installation_id: installID,
        unit_type, organization,
        commander_name, commander_email,
        comm_poc_name, comm_poc_email, comm_poc_phone,
        is_active: true,
    };

    try {
        if (id) {
            payload.id = id;
            await apiFetch(`/api/frequency/units/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            await apiFetch('/api/frequency/units', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeUnitModal();
        showAdminNotification(id ? 'Unit updated' : 'Unit created', 'success');
        if (_selectedInstallationID) await selectInstallation(_selectedInstallationID);
    } catch (err) {
        showAdminNotification(err.message, 'error');
    }
}

async function deleteUnit(id, name) {
    if (!confirm(`Delete unit "${name}"? This cannot be undone.`)) return;
    try {
        await apiFetch(`/api/frequency/units/${id}`, { method: 'DELETE' });
        showAdminNotification('Unit deleted', 'success');
        if (_selectedInstallationID) await selectInstallation(_selectedInstallationID);
    } catch (err) {
        showAdminNotification(err.message, 'error');
    }
}

function showAdminNotification(msg, type = 'info') {
    const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6' };
    const n = document.createElement('div');
    n.style.cssText = `position:fixed;top:80px;right:20px;z-index:10001;padding:14px 20px;
        border-radius:8px;font-size:13px;font-weight:600;color:#fff;
        background:${colors[type]||colors.info};box-shadow:0 4px 16px rgba(0,0,0,.4);`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}

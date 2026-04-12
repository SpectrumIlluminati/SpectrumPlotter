// unit_frequencies.js — Unified operator frequency dashboard
// Tabs: Permanent | Temporary | Requests | Drafts | Pending Reviews | Templates

if (typeof requireRole === 'undefined') {
    window.requireRole = async function(allowedRoles) {
        try {
            const res = await fetch('/api/auth/session');
            if (!res.ok) { window.location.href = '/'; return; }
            const data = await res.json();
            if (!data.valid || !allowedRoles.includes(data.user?.role)) {
                window.location.href = '/?access=denied';
            }
        } catch { window.location.href = '/'; }
    };
}

const UF_REVIEWER_ROLES = ['ism', 'command', 'combatant_command', 'agency', 'ntia', 'admin'];

let unitsData        = [];
let myRequests       = [];
let uf_pendingRequests  = [];
let uf_userRole         = null;
let uf_unitID           = null;
let uf_currentRequestId = null;
let editingTemplateId = null;

let permFilters = { search: '', unit: '', type: '' };
let tempFilters = { search: '', unit: '', type: '', expiry: '' };

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
    try {
        const res  = await fetch('/api/auth/session');
        const data = res.ok ? await res.json() : {};
        if (!data.valid) { window.location.href = '/'; return; }
        uf_userRole = data.user?.role || 'operator';
        uf_unitID   = data.user?.unit_id || null;
    } catch {
        window.location.href = '/';
        return;
    }

    ufSetupTabs();
    ufSetupEventListeners();
    loadAssignments();
    updateTemplatesBadge();
    updateDraftsBadge();
    loadMyRequestsBadge();
});

// ── Tab system ────────────────────────────────────────────────────────────────

function ufSetupTabs() {
    document.querySelectorAll('.page-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            const name = this.dataset.tab;
            document.querySelectorAll('.page-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.uf-tab-panel').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(`uf-${name}-tab`).classList.add('active');

            if      (name === 'permanent')     { /* already rendered from loadAssignments */ }
            else if (name === 'temporary')     { /* already rendered from loadAssignments */ }
            else if (name === 'requests')      loadMyRequests();
            else if (name === 'drafts')        ufLoadDrafts();
            else if (name === 'pending-review') ufLoadPendingRequests();
            else if (name === 'templates')     renderTemplates();
        });
    });
}

// ── Event listeners ───────────────────────────────────────────────────────────

function ufSetupEventListeners() {
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        const active = document.querySelector('.page-tab.active')?.dataset.tab;
        if      (active === 'permanent' || active === 'temporary') loadAssignments();
        else if (active === 'requests')      { myRequests = []; loadMyRequests(); }
        else if (active === 'drafts')        ufLoadDrafts();
        else if (active === 'pending-review') ufLoadPendingRequests();
        else if (active === 'templates')     renderTemplates();
    });

    document.getElementById('exportBtn')?.addEventListener('click', exportAssignments);

    // Permanent tab filters
    document.getElementById('permSearch')?.addEventListener('input', e => {
        permFilters.search = e.target.value.toLowerCase();
        renderAssignmentTab('permanent');
    });
    document.getElementById('permUnitFilter')?.addEventListener('change', e => {
        permFilters.unit = e.target.value;
        renderAssignmentTab('permanent');
    });
    document.getElementById('permTypeFilter')?.addEventListener('change', e => {
        permFilters.type = e.target.value;
        renderAssignmentTab('permanent');
    });

    // Temporary tab filters
    document.getElementById('tempSearch')?.addEventListener('input', e => {
        tempFilters.search = e.target.value.toLowerCase();
        renderAssignmentTab('temporary');
    });
    document.getElementById('tempUnitFilter')?.addEventListener('change', e => {
        tempFilters.unit = e.target.value;
        renderAssignmentTab('temporary');
    });
    document.getElementById('tempTypeFilter')?.addEventListener('change', e => {
        tempFilters.type = e.target.value;
        renderAssignmentTab('temporary');
    });
    document.getElementById('tempExpiryFilter')?.addEventListener('change', e => {
        tempFilters.expiry = e.target.value;
        renderAssignmentTab('temporary');
    });

    // Requests tab filters
    document.getElementById('requestSearch')?.addEventListener('input', e => {
        ufRenderRequests(filterRequests(myRequests, e.target.value, document.getElementById('requestStatusFilter')?.value));
    });
    document.getElementById('requestStatusFilter')?.addEventListener('change', e => {
        ufRenderRequests(filterRequests(myRequests, document.getElementById('requestSearch')?.value || '', e.target.value));
    });

    // Pending tab filters
    document.getElementById('ufPendingSearch')?.addEventListener('input', e => {
        const purpose = document.getElementById('pendingPurposeFilter')?.value || '';
        renderPendingRequests(filterPendingRequests(uf_pendingRequests, e.target.value, purpose));
    });
    document.getElementById('pendingPurposeFilter')?.addEventListener('change', e => {
        const search = document.getElementById('ufPendingSearch')?.value || '';
        renderPendingRequests(filterPendingRequests(uf_pendingRequests, search, e.target.value));
    });

    // Template search
    document.getElementById('templateSearch')?.addEventListener('input', e => {
        renderTemplates(e.target.value);
    });
}

// ── Assignments ───────────────────────────────────────────────────────────────

async function loadAssignments() {
    showContainerLoading('ufPermanentContainer', 'Loading permanent assignments...');
    showContainerLoading('ufTemporaryContainer', 'Loading temporary assignments...');
    try {
        const res  = await fetch('/api/frequency/units');
        const data = await res.json();
        if (data.units) {
            // Operators see only their primary unit; higher roles see all assigned units
            unitsData = (uf_userRole === 'operator' && uf_unitID)
                ? data.units.filter(ud => ud.unit?.id === uf_unitID)
                : data.units;
            populateUnitFilters(unitsData);
            updateStats(unitsData);
            renderAssignmentTab('permanent');
            renderAssignmentTab('temporary');
        } else {
            showContainerError('ufPermanentContainer', 'Failed to load assignments');
            showContainerError('ufTemporaryContainer', 'Failed to load assignments');
        }
    } catch (err) {
        showContainerError('ufPermanentContainer', 'Error: ' + err.message);
        showContainerError('ufTemporaryContainer', 'Error: ' + err.message);
    }
}

function populateUnitFilters(units) {
    ['permUnitFilter', 'tempUnitFilter'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        sel.innerHTML = '<option value="">All Units</option>';
        units.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.unit.id;
            opt.textContent = `${u.unit.name} (${u.unit.unit_code})`;
            sel.appendChild(opt);
        });
    });
}

function renderAssignmentTab(bucket) {
    // bucket = 'permanent' | 'temporary'
    const isPerm   = bucket === 'permanent';
    const filters  = isPerm ? permFilters : tempFilters;
    const containerId = isPerm ? 'ufPermanentContainer' : 'ufTemporaryContainer';
    const now      = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const filtered = unitsData.map(ud => {
        let assignments = (ud.frequency_assignments || []).filter(a =>
            isPerm ? !a.expiration_date : !!a.expiration_date
        );

        if (filters.type) {
            assignments = assignments.filter(a => a.assignment_type === filters.type);
        }

        if (!isPerm && filters.expiry) {
            assignments = assignments.filter(a => {
                const exp = new Date(a.expiration_date);
                if (filters.expiry === 'expired')  return exp < now;
                if (filters.expiry === 'expiring') return exp >= now && exp <= thirtyDays;
                if (filters.expiry === 'valid')    return exp > thirtyDays;
                return true;
            });
        }

        if (filters.search) {
            const s = filters.search;
            const unitMatch = ud.unit.name.toLowerCase().includes(s) ||
                              ud.unit.unit_code.toLowerCase().includes(s);
            if (!unitMatch) {
                assignments = assignments.filter(a =>
                    a.frequency?.toLowerCase().includes(s) ||
                    a.net_name?.toLowerCase().includes(s) ||
                    a.callsign?.toLowerCase().includes(s) ||
                    a.purpose?.toLowerCase().includes(s)
                );
            }
        }

        if (filters.unit && ud.unit.id !== filters.unit) return null;

        return { ...ud, frequency_assignments: assignments };
    }).filter(ud => ud !== null);

    renderUnits(containerId, filtered);
}

function renderUnits(containerId, units) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const hasAny = units.some(u => (u.frequency_assignments?.length || 0) > 0);
    if (!hasAny) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-broadcast-tower"></i>
                <h3>No Assignments Found</h3>
                <p>No frequency assignments match your current filters.</p>
            </div>`;
        return;
    }

    container.innerHTML = units.map(ud => {
        const assignments = ud.frequency_assignments || [];
        if (assignments.length === 0) return '';
        return `
        <div class="unit-card" data-unit-id="${ud.unit.id}">
            <div class="unit-header" onclick="toggleUnit('${ud.unit.id}', '${containerId}')">
                <div class="unit-info">
                    <h3>${ud.unit.name}</h3>
                    <span class="unit-code">${ud.unit.unit_code}${ud.unit.organization ? ' • ' + ud.unit.organization : ''}</span>
                </div>
                <div class="unit-stats">
                    <div class="unit-stat">
                        <span class="unit-stat-value">${assignments.length}</span>
                        <span class="unit-stat-label">Assignments</span>
                    </div>
                    <div class="unit-stat">
                        <span class="unit-stat-value">${ud.pending_requests?.length || 0}</span>
                        <span class="unit-stat-label">Pending</span>
                    </div>
                </div>
            </div>
            <div class="unit-frequencies" id="${containerId}-freq-${ud.unit.id}" style="display: none;">
                ${renderFrequencyTable(assignments)}
            </div>
        </div>`;
    }).join('');
}

function renderFrequencyTable(assignments) {
    if (!assignments.length) return '<div class="empty-state"><p>No assignments</p></div>';
    return `
    <table class="frequency-table">
        <thead>
            <tr>
                <th>Frequency</th>
                <th>Type</th>
                <th>Net Name</th>
                <th>Callsign</th>
                <th>Purpose</th>
                <th>Expiration</th>
                <th>Class</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            ${assignments.map(a => `
            <tr>
                <td>
                    <span class="frequency-value">${a.frequency}</span>
                    ${a.is_encrypted ? '<i class="fas fa-lock encrypted-indicator" title="Encrypted"></i>' : ''}
                </td>
                <td><span class="frequency-badge badge-${a.assignment_type}">${fmtType(a.assignment_type)}</span></td>
                <td>${a.net_name || '—'}</td>
                <td>${a.callsign || '—'}</td>
                <td>${a.purpose || '—'}</td>
                <td>${fmtExpiration(a.expiration_date)}</td>
                <td>${fmtClassification(a.classification)}</td>
                <td>
                    <button class="btn btn-sm btn-icon" onclick="viewAssignment('${a.id}')" title="Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function toggleUnit(unitId, containerId) {
    const el = document.getElementById(`${containerId}-freq-${unitId}`);
    if (el) el.style.display = el.style.display !== 'none' ? 'none' : 'block';
}

// ── Subtabs (Assigned / Pending) ──────────────────────────────────────────────

window.switchSubtab = function (tab, sub, btn) {
    const prefix = tab === 'permanent' ? 'perm' : 'temp';
    // Toggle subtab button states within this tab only
    const bar = btn.closest('.subtab-bar');
    bar.querySelectorAll('.subtab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Toggle subpanels
    [`${prefix}-assigned-subpanel`, `${prefix}-pending-subpanel`].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    document.getElementById(`${prefix}-${sub}-subpanel`)?.classList.add('active');
    // Lazy-render pending on first open
    if (sub === 'pending') renderPendingSubtab(tab);
};

function renderPendingSubtab(tab) {
    const containerId = tab === 'permanent' ? 'permPendingContainer' : 'tempPendingContainer';
    const container   = document.getElementById(containerId);
    if (!container) return;

    // Collect pending_requests from all units; filter by duration bucket
    const reqs = [];
    unitsData.forEach(ud => {
        (ud.pending_requests || []).forEach(r => {
            const isPerm = !r.end_date;
            if ((tab === 'permanent' && isPerm) || (tab === 'temporary' && !isPerm)) {
                reqs.push({ request: r, unit: ud.unit });
            }
        });
    });

    if (!reqs.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-hourglass-half"></i>
                <h3>No Pending Requests</h3>
                <p>No ${tab} frequency requests are currently pending.</p>
                <a href="/frequency/request" class="btn btn-primary"><i class="fas fa-plus"></i> Submit a Request</a>
            </div>`;
        return;
    }

    container.innerHTML = reqs.map(({ request: req, unit }) => `
        <div class="request-card" onclick="ufViewRequest('${req.id}')">
            <div class="request-header">
                <div class="request-title">
                    <h4>${unit?.name || 'Unknown Unit'} — ${fmtRequestType(req.request_type)}</h4>
                    <div class="request-meta">Submitted ${fmtDate(req.created_at)}</div>
                </div>
                <div class="request-badges">
                    <span class="frequency-badge badge-${req.priority}">${fmtPurpose(req.priority)}</span>
                    <span class="frequency-badge badge-${(req.status || '').replace('_', '-')}">${fmtStatus(req.status)}</span>
                </div>
            </div>
            <div class="request-body">
                <div class="request-field">
                    <span class="request-field-label">Frequency</span>
                    <span class="request-field-value frequency-value">${req.requested_frequency || (req.frequency_range_min ? req.frequency_range_min + '–' + req.frequency_range_max + ' MHz' : '—')}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Purpose</span>
                    <span class="request-field-value">${req.purpose || '—'}</span>
                </div>
            </div>
        </div>`).join('');
}

function updateStats(units) {
    let totalAsgn = 0, permCount = 0, tempCount = 0, expiring = 0, pending = 0;
    const now  = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    units.forEach(ud => {
        const asgns = ud.frequency_assignments || [];
        totalAsgn += asgns.length;
        pending   += ud.pending_requests?.length || 0;
        asgns.forEach(a => {
            if (!a.expiration_date) { permCount++; }
            else {
                tempCount++;
                const exp = new Date(a.expiration_date);
                if (exp >= now && exp <= soon) expiring++;
            }
        });
    });

    document.getElementById('totalUnits').textContent       = units.length;
    document.getElementById('totalAssignments').textContent = totalAsgn;
    document.getElementById('statPermCount').textContent    = permCount;
    document.getElementById('statTempCount').textContent    = tempCount;
    document.getElementById('expiringCount').textContent    = expiring;
    document.getElementById('uf_pendingRequests').textContent  = pending;
    document.getElementById('tabBadgePermanent').textContent = permCount;
    document.getElementById('tabBadgeTemporary').textContent = tempCount;

    // Subtab badges
    let permPending = 0, tempPending = 0;
    units.forEach(ud => {
        (ud.pending_requests || []).forEach(r => {
            if (!r.end_date) permPending++; else tempPending++;
        });
    });
    document.getElementById('subtabBadgePermAssigned').textContent = permCount;
    document.getElementById('subtabBadgePermPending').textContent  = permPending;
    document.getElementById('subtabBadgeTempAssigned').textContent = tempCount;
    document.getElementById('subtabBadgeTempPending').textContent  = tempPending;
}

async function viewAssignment(id) {
    let a = null;
    for (const ud of unitsData) {
        a = (ud.frequency_assignments || []).find(x => x.id === id);
        if (a) break;
    }
    if (!a) return;

    document.getElementById('assignmentDetails').innerHTML = `
        <div class="review-summary">
            <div class="review-section">
                <h3><i class="fas fa-wave-square"></i> Frequency</h3>
                ${field('Frequency', `<span class="frequency-value">${a.frequency}</span>`)}
                ${field('Type', `<span class="frequency-badge badge-${a.assignment_type}">${fmtType(a.assignment_type)}</span>`)}
                ${field('Duration', a.expiration_date
                    ? '<span style="color:#ffa726"><i class="fas fa-clock"></i> Temporary</span>'
                    : '<span style="color:#81c784"><i class="fas fa-infinity"></i> Permanent</span>')}
                ${field('Net Name', a.net_name || '—')}
                ${field('Callsign', a.callsign || '—')}
                ${field('Purpose', a.purpose || '—')}
            </div>
            <div class="review-section">
                <h3><i class="fas fa-cogs"></i> Technical</h3>
                ${field('Emission Designator', a.emission_designator || '—')}
                ${field('Bandwidth', a.bandwidth || '—')}
                ${field('Power', a.power_watts ? a.power_watts + ' W' : '—')}
                ${field('Auth. Radius', a.authorized_radius_km ? a.authorized_radius_km + ' km' : '—')}
                ${field('Encrypted', a.is_encrypted ? 'Yes' + (a.encryption_type ? ' (' + a.encryption_type + ')' : '') : 'No')}
            </div>
            <div class="review-section">
                <h3><i class="fas fa-calendar"></i> Dates &amp; Authority</h3>
                ${field('Assignment Date', a.assignment_date ? new Date(a.assignment_date).toLocaleDateString() : '—')}
                ${field('Expiration', a.expiration_date ? fmtExpiration(a.expiration_date) : '<span style="color:#81c784">No expiration (Permanent)</span>')}
                ${field('Authority', a.assignment_authority || '—')}
                ${field('Auth. Number', a.authorization_number || '—')}
            </div>
            <div class="review-section">
                <h3><i class="fas fa-shield-alt"></i> Security</h3>
                ${field('Classification', fmtClassification(a.classification))}
                ${field('Purpose', fmtPurpose(a.priority))}
            </div>
            ${a.notes ? `<div class="review-section"><h3><i class="fas fa-sticky-note"></i> Notes</h3><p>${a.notes}</p></div>` : ''}
        </div>`;
    document.getElementById('assignmentModal').style.display = 'block';
}

// ── My Requests ───────────────────────────────────────────────────────────────

async function loadMyRequestsBadge() {
    try {
        const res  = await fetch('/api/frequency/requests');
        const data = res.ok ? await res.json() : {};
        myRequests = data.requests || [];
        const badge = document.getElementById('tabBadgeRequests');
        if (badge) badge.textContent = myRequests.length;
    } catch (_) { /* badge stays 0 */ }
}

async function loadMyRequests() {
    // If already fetched by badge loader, just render
    if (myRequests.length > 0) {
        ufRenderRequests(myRequests);
        return;
    }
    showContainerLoading('requestsContainer', 'Loading requests...');
    try {
        const res  = await fetch('/api/frequency/requests');
        const data = await res.json();
        myRequests = data.requests || [];
        const badge = document.getElementById('tabBadgeRequests');
        if (badge) badge.textContent = myRequests.length;
        ufRenderRequests(myRequests);
    } catch (err) {
        showContainerError('requestsContainer', 'Error loading requests: ' + err.message);
    }
}

function filterRequests(reqs, search, status) {
    return reqs.filter(r => {
        if (status && r.request?.status !== status) return false;
        if (search) {
            const s = search.toLowerCase();
            return r.request?.requested_frequency?.toLowerCase().includes(s) ||
                   r.request?.purpose?.toLowerCase().includes(s) ||
                   r.unit?.name?.toLowerCase().includes(s) ||
                   r.request?.net_name?.toLowerCase().includes(s);
        }
        return true;
    });
}

function ufRenderRequests(reqs) {
    const container = document.getElementById('requestsContainer');
    if (!container) return;

    if (!reqs.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No Requests Found</h3>
                <p>You have not submitted any frequency requests yet.</p>
                <a href="/frequency/request" class="btn btn-primary"><i class="fas fa-plus"></i> Submit a Request</a>
            </div>`;
        return;
    }

    container.innerHTML = reqs.map(r => {
        const req = r.request;
        const unit = r.unit;
        return `
        <div class="request-card" onclick="ufViewRequest('${req.id}')">
            <div class="request-header">
                <div class="request-title">
                    <h4>${unit?.name || 'Unknown Unit'} — ${fmtRequestType(req.request_type)}</h4>
                    <div class="request-meta">
                        Submitted ${fmtDate(req.created_at)}
                        ${req.reviewed_at ? ' · Reviewed ' + fmtDate(req.reviewed_at) : ''}
                    </div>
                </div>
                <div class="request-badges">
                    <span class="frequency-badge badge-${req.priority}">${fmtPurpose(req.priority)}</span>
                    <span class="frequency-badge badge-${req.status.replace('_', '-')}">${fmtStatus(req.status)}</span>
                    ${req.status === 'denied' ? `<button class="btn-xs btn-xs-primary" onclick="event.stopPropagation();openResubmitModal('${req.id}')"><i class="fas fa-edit"></i> Edit &amp; Resubmit</button>` : ''}
                    ${(req.status === 'pending' || req.status === 'under_review') ? `<button class="btn-xs btn-xs-danger" onclick="event.stopPropagation();ufRetractRequest('${req.id}')"><i class="fas fa-ban"></i> Retract</button>` : ''}
                    ${(req.status === 'cancelled' || req.status === 'denied') ? `<button class="btn-xs btn-xs-danger" onclick="event.stopPropagation();ufDeleteRequest('${req.id}')"><i class="fas fa-trash"></i> Delete</button>` : ''}
                </div>
            </div>
            <div class="request-body">
                <div class="request-field">
                    <span class="request-field-label">Frequency</span>
                    <span class="request-field-value frequency-value">${req.requested_frequency || (req.frequency_range_min ? req.frequency_range_min + '–' + req.frequency_range_max + ' MHz' : '—')}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Purpose</span>
                    <span class="request-field-value">${req.purpose || '—'}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Assignment Type</span>
                    <span class="request-field-value">${fmtValue(req.assignment_type)}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Duration</span>
                    <span class="request-field-value">${req.end_date ? 'Temporary (ends ' + fmtDate(req.end_date) + ')' : 'Permanent'}</span>
                </div>
            </div>
            ${req.status === 'denied' && req.denied_reason ? `
            <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:6px;padding:8px 12px;margin:8px 0 4px;font-size:0.82rem;color:#fca5a5;">
                <i class="fas fa-times-circle" style="margin-right:5px;"></i><strong>Rejection reason:</strong> ${req.denied_reason}
            </div>` : ''}
        </div>`;
    }).join('');
}

async function ufRetractRequest(id) {
    if (!confirm('Retract this request? It will be marked as cancelled.')) return;
    try {
        const res = await fetch(`/api/frequency/requests/${id}/retract`, { method: 'PUT' });
        const data = await res.json();
        if (!res.ok) { alert(data.error || 'Failed to retract request.'); return; }
        myRequests = myRequests.map(r => r.request?.id === id
            ? { ...r, request: { ...r.request, status: 'cancelled' } }
            : r);
        const badge = document.getElementById('myRequestsBadge');
        if (badge) badge.textContent = myRequests.length;
        ufRenderRequests(myRequests);
    } catch (e) {
        alert('Error retracting request.');
    }
}

async function ufDeleteRequest(id) {
    if (!confirm('Permanently delete this request? This cannot be undone.')) return;
    try {
        const res = await fetch(`/api/frequency/requests/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) { alert(data.error || 'Failed to delete request.'); return; }
        myRequests = myRequests.filter(r => r.request?.id !== id);
        const badge = document.getElementById('myRequestsBadge');
        if (badge) badge.textContent = myRequests.length;
        ufRenderRequests(myRequests);
    } catch (e) {
        alert('Error deleting request.');
    }
}

function ufViewRequest(id) {
    uf_currentRequestId = id;
    // Also search pending_requests embedded in unitsData (shown in subtab panels)
    let r = myRequests.find(x => x.request?.id === id) ||
            uf_pendingRequests.find(x => x.request?.id === id);
    if (!r) {
        for (const ud of unitsData) {
            const req = (ud.pending_requests || []).find(x => x.id === id);
            if (req) { r = { request: req, unit: ud.unit }; break; }
        }
    }
    if (!r) return;
    const req  = r.request;
    const unit = r.unit;

    document.getElementById('ufRequestDetails').innerHTML = `
        <div class="review-summary">
            <div class="alert alert-${req.status === 'approved' ? 'success' : req.status === 'denied' ? 'danger' : 'info'}">
                <i class="fas fa-info-circle"></i>
                <strong>${fmtStatus(req.status)}</strong> — Purpose: ${fmtPurpose(req.priority)}
            </div>
            <div class="review-section">
                <h3><i class="fas fa-building"></i> Unit</h3>
                ${field('Unit', unit?.name || '—')}
                ${field('Unit Code', unit?.unit_code || '—')}
            </div>
            <div class="review-section">
                <h3><i class="fas fa-clipboard-list"></i> Request</h3>
                ${field('Request Type', fmtRequestType(req.request_type))}
                ${field('Frequency', req.requested_frequency || (req.frequency_range_min ? req.frequency_range_min + '–' + req.frequency_range_max + ' MHz' : '—'))}
                ${field('Assignment Type', fmtValue(req.assignment_type))}
                ${field('Net Name', req.net_name || '—')}
                ${field('Callsign', req.callsign || '—')}
                ${field('Purpose', req.purpose)}
            </div>
            <div class="review-section">
                <h3><i class="fas fa-calendar"></i> Schedule</h3>
                ${field('Start Date', fmtDate(req.start_date))}
                ${field('End Date', req.end_date ? fmtDate(req.end_date) : 'Permanent')}
            </div>
            <div class="review-section">
                <h3><i class="fas fa-cogs"></i> Technical</h3>
                ${field('Emission Designator', req.emission_designator || '—')}
                ${field('Bandwidth', req.bandwidth || '—')}
                ${field('Power', req.power_watts ? req.power_watts + ' W' : '—')}
                ${field('Encrypted', req.is_encrypted ? 'Yes' : 'No')}
                ${field('Classification', req.classification)}
            </div>
            <div class="review-section">
                <h3><i class="fas fa-clipboard-check"></i> Justification</h3>
                <p style="color:#e0e0e0">${req.justification}</p>
                ${req.mission_impact ? `<p style="color:#9e9e9e;font-size:0.9em"><strong>Mission Impact:</strong> ${req.mission_impact}</p>` : ''}
            </div>
            ${req.review_notes  ? `<div class="review-section"><h3><i class="fas fa-comment"></i> Review Notes</h3><p>${req.review_notes}</p></div>` : ''}
            ${req.denied_reason ? `<div class="review-section"><h3 style="color:#ef5350"><i class="fas fa-times-circle"></i> Denial Reason</h3><p>${req.denied_reason}</p></div>` : ''}
        </div>`;

    // Actions for reviewer/admin
    let actions = '<button class="btn" onclick="document.getElementById(\'ufRequestModal\').style.display=\'none\'">Close</button>';
    if (UF_REVIEWER_ROLES.includes(uf_userRole) && req.status === 'pending') {
        actions += '<button class="btn btn-primary" onclick="ufOpenReviewModal()">Review</button>';
    }
    if (uf_userRole === 'admin' && req.status === 'under_review') {
        actions += '<button class="btn btn-success" onclick="ufOpenApprovalModal()">Approve</button>';
        actions += '<button class="btn btn-danger" onclick="denyRequest()">Deny</button>';
    }
    document.getElementById('ufRequestActions').innerHTML = actions;

    document.getElementById('ufRequestModal').style.display = 'block';
}

// ── Pending Reviews ───────────────────────────────────────────────────────────

async function ufLoadPendingRequests() {
    showContainerLoading('pendingContainer', 'Loading pending requests...');
    try {
        const res  = await fetch('/api/frequency/requests/pending');
        const data = await res.json();
        uf_pendingRequests = data.requests || [];
        document.getElementById('tabBadgePending').textContent = uf_pendingRequests.length;
        renderPendingRequests(uf_pendingRequests);
    } catch (err) {
        showContainerError('pendingContainer', 'Error loading pending requests: ' + err.message);
    }
}

function filterPendingRequests(reqs, search, purpose) {
    return reqs.filter(r => {
        if (purpose && r.request?.priority !== purpose && r.request?.request_type !== purpose) return false;
        if (search) {
            const s = search.toLowerCase();
            return r.unit?.name?.toLowerCase().includes(s) ||
                   r.request?.requested_frequency?.toLowerCase().includes(s) ||
                   r.request?.purpose?.toLowerCase().includes(s);
        }
        return true;
    });
}

function renderPendingRequests(reqs) {
    const container = document.getElementById('pendingContainer');
    if (!container) return;

    if (!reqs.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-check"></i>
                <h3>No Pending Requests</h3>
                <p>There are no frequency requests awaiting review.</p>
            </div>`;
        return;
    }

    container.innerHTML = reqs.map(r => {
        const req  = r.request;
        const unit = r.unit;
        return `
        <div class="request-card" onclick="ufViewRequest('${req.id}')">
            <div class="request-header">
                <div class="request-title">
                    <h4>${unit?.name || 'Unknown Unit'} — ${fmtRequestType(req.request_type)}</h4>
                    <div class="request-meta">Submitted ${fmtDate(req.created_at)}</div>
                </div>
                <div class="request-badges">
                    <span class="frequency-badge badge-${req.priority}">${fmtPurpose(req.priority)}</span>
                    <span class="frequency-badge badge-${req.status.replace('_', '-')}">${fmtStatus(req.status)}</span>
                </div>
            </div>
            <div class="request-body">
                <div class="request-field">
                    <span class="request-field-label">Frequency</span>
                    <span class="request-field-value frequency-value">${req.requested_frequency || (req.frequency_range_min ? req.frequency_range_min + '–' + req.frequency_range_max + ' MHz' : '—')}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Unit</span>
                    <span class="request-field-value">${unit?.name || '—'}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Duration</span>
                    <span class="request-field-value">${req.end_date ? 'Temporary' : 'Permanent'}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Justification</span>
                    <span class="request-field-value">${(req.justification || '').substring(0, 80)}${req.justification?.length > 80 ? '…' : ''}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── Review / Approval modals ──────────────────────────────────────────────────

function ufOpenReviewModal() {
    document.getElementById('ufRequestModal').style.display = 'none';
    document.getElementById('ufReviewModal').style.display  = 'block';
}

async function ufSubmitReview() {
    const status = document.getElementById('ufReviewStatus').value;
    const notes  = document.getElementById('ufReviewNotes').value;
    if (!status) { showAlert('Please select a status', 'warning'); return; }

    try {
        const res = await fetch(`/api/frequency/requests/${uf_currentRequestId}/review`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, notes })
        });
        const data = await res.json();
        if (res.ok) {
            showAlert('Review submitted', 'success');
            document.getElementById('ufReviewModal').style.display = 'none';
            uf_pendingRequests = [];
            ufLoadPendingRequests();
        } else {
            showAlert('Error: ' + (data.error || 'Failed to submit review'), 'danger');
        }
    } catch (err) {
        showAlert('Error: ' + err.message, 'danger');
    }
}

function ufOpenApprovalModal() {
    document.getElementById('ufRequestModal').style.display = 'none';
    const r = uf_pendingRequests.find(x => x.request?.id === uf_currentRequestId) ||
              myRequests.find(x => x.request?.id === uf_currentRequestId);
    if (r) {
        const req = r.request;
        document.getElementById('ufApprovalRequestId').value    = uf_currentRequestId;
        document.getElementById('ufApprovalFrequency').value    = req.requested_frequency || '';
        document.getElementById('ufApprovalFrequencyMhz').value = req.requested_frequency ? parseFloat(req.requested_frequency) : '';
        document.getElementById('ufApprovalAssignmentDate').value = new Date().toISOString().split('T')[0];
    }
    document.getElementById('ufApprovalModal').style.display = 'block';
}

async function ufSubmitApproval() {
    const reqId = document.getElementById('ufApprovalRequestId').value;
    const body  = {
        frequency:            document.getElementById('ufApprovalFrequency').value,
        frequency_mhz:        parseFloat(document.getElementById('ufApprovalFrequencyMhz').value),
        assignment_type:      'primary',
        assignment_date:      document.getElementById('ufApprovalAssignmentDate').value,
        expiration_date:      document.getElementById('ufApprovalExpirationDate').value || null,
        assignment_authority: document.getElementById('ufApprovalAuthority').value || null,
        authorization_number: document.getElementById('ufApprovalAuthNumber').value || null,
        notes:                document.getElementById('ufApprovalNotes').value || null
    };

    try {
        const res  = await fetch(`/api/frequency/requests/${reqId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            showAlert('Request approved and assignment created!', 'success');
            document.getElementById('ufApprovalModal').style.display = 'none';
            uf_pendingRequests = [];
            ufLoadPendingRequests();
            loadAssignments();
        } else {
            showAlert('Error: ' + (data.error || 'Failed to approve'), 'danger');
        }
    } catch (err) {
        showAlert('Error: ' + err.message, 'danger');
    }
}

async function denyRequest() {
    const reason = prompt('Reason for denial:');
    if (!reason) return;

    try {
        const res = await fetch(`/api/frequency/requests/${uf_currentRequestId}/review`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'denied', notes: reason })
        });
        if (res.ok) {
            showAlert('Request denied', 'success');
            document.getElementById('ufRequestModal').style.display = 'none';
            uf_pendingRequests = [];
            ufLoadPendingRequests();
        } else {
            const data = await res.json();
            showAlert('Error: ' + (data.error || 'Failed to deny'), 'danger');
        }
    } catch (err) {
        showAlert('Error: ' + err.message, 'danger');
    }
}

// ── Drafts ────────────────────────────────────────────────────────────────────

function updateDraftsBadge() {
    const count = localStorage.getItem('freqReqDraft') ? 1 : 0;
    document.getElementById('tabBadgeDrafts').textContent = count;
}

function ufLoadDrafts() {
    const container = document.getElementById('ufDraftsContainer');
    const raw = localStorage.getItem('freqReqDraft');

    if (!raw) {
        updateDraftsBadge();
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <h3>No Saved Drafts</h3>
                <p>Save a draft while filling out a frequency request to continue it later.</p>
                <a href="/frequency/request" class="btn btn-primary" style="margin-top:1rem">
                    <i class="fas fa-plus"></i> New Request
                </a>
            </div>`;
        return;
    }

    let draft;
    try { draft = JSON.parse(raw); } catch { draft = null; }

    updateDraftsBadge();

    if (!draft) {
        container.innerHTML = `<div class="alert alert-warning" style="margin:20px">Draft data is corrupted. <button class="btn btn-sm" onclick="ufDiscardDraft()">Discard</button></div>`;
        return;
    }

    const p       = draft.payload || {};
    const dg      = draft.gd      || {};
    const mode    = draft.mode === 'manual' ? 'Manual' : 'Guided';
    const freqStr = p.requested_frequency
        ? `${p.requested_frequency} MHz`
        : (p.frequency_range_min && p.frequency_range_max
            ? `${p.frequency_range_min}–${p.frequency_range_max} MHz`
            : 'Frequency not set');
    const typeStr  = fmtRequestType(dg.requestType || dg.duration || p.request_type || '');
    const unitStr  = p._unitLabel || '';
    const savedAt  = draft.savedAt ? new Date(draft.savedAt).toLocaleString() : 'Unknown time';

    container.innerHTML = `
        <div class="request-card" style="max-width:600px;margin:20px auto">
            <div class="request-header">
                <div class="request-title">
                    <h4><i class="fas fa-file-alt"></i> ${mode} Draft${unitStr ? ' — ' + unitStr : ''}</h4>
                    <div class="request-meta">Saved ${savedAt}</div>
                </div>
                <div class="request-badges">
                    <span class="frequency-badge" style="background:#6b7280;color:#fff">Draft</span>
                </div>
            </div>
            <div class="request-body">
                <div class="request-field">
                    <span class="request-field-label">Type</span>
                    <span class="request-field-value">${typeStr || '—'}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Frequency</span>
                    <span class="request-field-value frequency-value">${freqStr}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Mode</span>
                    <span class="request-field-value">${mode}</span>
                </div>
            </div>
            <div style="display:flex;gap:0.5rem;padding:0.75rem 1rem;border-top:1px solid rgba(100,150,255,0.15)">
                <a href="/frequency/request?resume=${encodeURIComponent(draft.id || '1')}" class="btn btn-primary btn-sm">
                    <i class="fas fa-edit"></i> Resume Draft
                </a>
                <button class="btn btn-sm" onclick="ufDiscardDraft()" style="color:#dc2626">
                    <i class="fas fa-trash"></i> Discard
                </button>
            </div>
        </div>`;
}

window.ufDiscardDraft = function () {
    if (!confirm('Discard this draft? This cannot be undone.')) return;
    localStorage.removeItem('freqReqDraft');
    ufLoadDrafts();
};

// ── Templates ─────────────────────────────────────────────────────────────────

function loadTemplatesFromStorage() {
    try { return JSON.parse(localStorage.getItem('freq_templates') || '[]'); } catch { return []; }
}
function saveTemplatesToStorage(templates) {
    localStorage.setItem('freq_templates', JSON.stringify(templates));
}
function updateTemplatesBadge() {
    document.getElementById('tabBadgeTemplates').textContent = loadTemplatesFromStorage().length;
}

function openTemplateModal(id) {
    editingTemplateId = id || null;
    document.getElementById('templateModalTitle').textContent = id ? 'Edit Template' : 'New Template';
    const tpl = id ? loadTemplatesFromStorage().find(t => t.id === id) : null;
    document.getElementById('tplName').value           = tpl?.name || '';
    document.getElementById('tplFrequency').value      = tpl?.frequency || '';
    document.getElementById('tplAssignmentType').value = tpl?.assignment_type || '';
    document.getElementById('tplNetName').value        = tpl?.net_name || '';
    document.getElementById('tplCallsign').value       = tpl?.callsign || '';
    document.getElementById('tplEmission').value       = tpl?.emission_designator || '';
    document.getElementById('tplBandwidth').value      = tpl?.bandwidth || '';
    document.getElementById('tplPurpose').value        = tpl?.purpose || '';
    document.getElementById('templateModal').style.display = 'block';
}

function saveTemplate() {
    const name = document.getElementById('tplName').value.trim();
    if (!name) { showAlert('Template name is required', 'warning'); return; }

    const templates = loadTemplatesFromStorage();
    const tpl = {
        id:                  editingTemplateId || Date.now().toString(36),
        name,
        frequency:           document.getElementById('tplFrequency').value.trim(),
        assignment_type:     document.getElementById('tplAssignmentType').value,
        net_name:            document.getElementById('tplNetName').value.trim(),
        callsign:            document.getElementById('tplCallsign').value.trim(),
        emission_designator: document.getElementById('tplEmission').value.trim(),
        bandwidth:           document.getElementById('tplBandwidth').value.trim(),
        purpose:             document.getElementById('tplPurpose').value.trim(),
    };

    if (editingTemplateId) {
        const idx = templates.findIndex(t => t.id === editingTemplateId);
        if (idx >= 0) templates[idx] = tpl;
    } else {
        templates.push(tpl);
    }

    saveTemplatesToStorage(templates);
    document.getElementById('templateModal').style.display = 'none';
    updateTemplatesBadge();
    renderTemplates();
    showAlert(`Template "${name}" saved`, 'success');
}

function deleteTemplate(id) {
    saveTemplatesToStorage(loadTemplatesFromStorage().filter(t => t.id !== id));
    updateTemplatesBadge();
    renderTemplates();
}

function useTemplate(id) {
    const tpl = loadTemplatesFromStorage().find(t => t.id === id);
    if (!tpl) return;
    const params = new URLSearchParams();
    if (tpl.frequency)           params.set('frequency', tpl.frequency);
    if (tpl.assignment_type)     params.set('assignment_type', tpl.assignment_type);
    if (tpl.net_name)            params.set('net_name', tpl.net_name);
    if (tpl.callsign)            params.set('callsign', tpl.callsign);
    if (tpl.emission_designator) params.set('emission_designator', tpl.emission_designator);
    if (tpl.bandwidth)           params.set('bandwidth', tpl.bandwidth);
    if (tpl.purpose)             params.set('purpose', tpl.purpose);
    window.location.href = '/frequency/request?' + params.toString();
}

function renderTemplates(search) {
    let templates = loadTemplatesFromStorage();
    if (search) {
        const s = search.toLowerCase();
        templates = templates.filter(t =>
            t.name.toLowerCase().includes(s) ||
            t.frequency?.toLowerCase().includes(s) ||
            t.net_name?.toLowerCase().includes(s) ||
            t.purpose?.toLowerCase().includes(s)
        );
    }

    const grid = document.getElementById('templatesGrid');
    if (!grid) return;

    grid.innerHTML = templates.map(t => `
        <div class="template-card">
            <div class="template-card-header">
                <div class="template-card-name">${t.name}</div>
                <div class="template-card-actions">
                    <button class="btn btn-sm btn-icon" onclick="openTemplateModal('${t.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-icon" onclick="deleteTemplate('${t.id}')" title="Delete" style="color:#ef5350"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="template-fields">
                ${t.frequency        ? `<div class="template-field"><span class="template-field-label">Frequency</span><span class="template-field-value">${t.frequency}</span></div>` : ''}
                ${t.assignment_type  ? `<div class="template-field"><span class="template-field-label">Type</span><span class="template-field-value">${fmtType(t.assignment_type)}</span></div>` : ''}
                ${t.net_name         ? `<div class="template-field"><span class="template-field-label">Net Name</span><span class="template-field-value">${t.net_name}</span></div>` : ''}
                ${t.callsign         ? `<div class="template-field"><span class="template-field-label">Callsign</span><span class="template-field-value">${t.callsign}</span></div>` : ''}
                ${t.emission_designator ? `<div class="template-field"><span class="template-field-label">Emission</span><span class="template-field-value">${t.emission_designator}</span></div>` : ''}
                ${t.purpose          ? `<div class="template-field"><span class="template-field-label">Purpose</span><span class="template-field-value" style="font-family:inherit">${t.purpose}</span></div>` : ''}
            </div>
            <div style="margin-top:16px">
                <button class="btn btn-primary" style="width:100%" onclick="useTemplate('${t.id}')">
                    <i class="fas fa-play"></i> Use Template
                </button>
            </div>
        </div>`).join('') + `
        <div class="template-card template-add-card" onclick="openTemplateModal()">
            <i class="fas fa-plus-circle"></i>
            <span>New Template</span>
        </div>`;
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportAssignments() {
    const headers = ['Unit', 'Unit Code', 'Frequency', 'Type', 'Duration', 'Net Name', 'Callsign', 'Purpose', 'Expiration', 'Classification'];
    const rows = [headers];
    unitsData.forEach(ud => {
        (ud.frequency_assignments || []).forEach(a => {
            rows.push([
                ud.unit.name, ud.unit.unit_code,
                a.frequency, fmtType(a.assignment_type),
                a.expiration_date ? 'Temporary' : 'Permanent',
                a.net_name || '', a.callsign || '', a.purpose || '',
                a.expiration_date || '', a.classification || ''
            ]);
        });
    });
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'frequency_assignments.csv'; a.click();
    URL.revokeObjectURL(url);
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmtType(t) {
    return { primary: 'Primary', alternate: 'Alternate', emergency: 'Emergency', tactical: 'Tactical' }[t] || t || '—';
}
function fmtExpiration(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const days = Math.floor((date - new Date()) / 86400000);
    let html = date.toLocaleDateString();
    if (days < 0)    html += ' <span class="expired-indicator"><i class="fas fa-exclamation-circle"></i> Expired</span>';
    else if (days <= 30) html += ` <span class="expiring-indicator"><i class="fas fa-exclamation-triangle"></i> ${days}d</span>`;
    return html;
}
function fmtClassification(c) {
    return { 'UNCLASS': '<span style="color:#81c784">UNCLASS</span>', 'FOUO': '<span style="color:#ffa726">FOUO</span>' }[c] || c || '—';
}
function fmtRequestType(t) {
    return { permanent: 'Permanent', exercise: 'Exercise', real_world: 'Real World',
             new_assignment: 'New Assignment', modification: 'Modification',
             renewal: 'Renewal', cancellation: 'Cancellation' }[t] || t || '—';
}
function fmtPurpose(p) {
    return { routine: 'Routine', real_world: 'Real World', emergency: 'Emergency',
             urgent: 'Urgent', priority: 'Priority', exercise: 'Exercise' }[p]
        || (p ? p.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase()) : '—');
}
function fmtStatus(s) {
    return { pending: 'Pending', under_review: 'Under Review', approved: 'Approved',
             denied: 'Denied', cancelled: 'Cancelled' }[s] || s;
}
function fmtValue(v) {
    if (!v) return '—';
    return v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString();
}
function field(label, value) {
    return `<div class="review-field"><span class="review-field-label">${label}:</span><span class="review-field-value">${value}</span></div>`;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function showContainerLoading(id, msg) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>${msg}</p></div>`;
}
function showContainerError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div class="alert alert-danger" style="margin:20px"><i class="fas fa-exclamation-circle"></i> ${msg}</div>`;
}
function showAlert(message, type = 'info') {
    const div = document.createElement('div');
    div.className = `alert alert-${type}`;
    Object.assign(div.style, { position: 'fixed', top: '20px', right: '20px', zIndex: '10000', minWidth: '280px' });
    div.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

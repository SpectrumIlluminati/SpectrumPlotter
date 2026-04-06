/**
 * User Profile Page JavaScript
 */

(function() {
    'use strict';

    let profileData = null;
    let allInstallations = [];
    let allWorkboxes = [];

    // Pay grade options keyed by service branch
    const PAY_GRADE_OPTIONS = {
        'Air Force': [
            { value: '',    label: '── Enlisted ──', disabled: true },
            { value: 'E-1', label: 'E-1 — Airman Basic' },
            { value: 'E-2', label: 'E-2 — Airman' },
            { value: 'E-3', label: 'E-3 — Airman First Class' },
            { value: 'E-4', label: 'E-4 — Senior Airman' },
            { value: 'E-5', label: 'E-5 — Staff Sergeant' },
            { value: 'E-6', label: 'E-6 — Technical Sergeant' },
            { value: 'E-7', label: 'E-7 — Master Sergeant' },
            { value: 'E-8', label: 'E-8 — Senior Master Sergeant' },
            { value: 'E-9', label: 'E-9 — Chief Master Sergeant' },
            { value: '',    label: '── Officer ──', disabled: true },
            { value: 'O-1', label: 'O-1 — Second Lieutenant' },
            { value: 'O-2', label: 'O-2 — First Lieutenant' },
            { value: 'O-3', label: 'O-3 — Captain' },
            { value: 'O-4', label: 'O-4 — Major' },
            { value: 'O-5', label: 'O-5 — Lieutenant Colonel' },
            { value: 'O-6', label: 'O-6 — Colonel' },
            { value: 'O-7', label: 'O-7 — Brigadier General' },
            { value: 'O-8', label: 'O-8 — Major General' },
            { value: 'O-9', label: 'O-9 — Lieutenant General' },
            { value: 'O-10',label: 'O-10 — General' },
        ],
        'Space Force': [
            { value: '',    label: '── Enlisted ──', disabled: true },
            { value: 'E-1', label: 'E-1 — Specialist 1' },
            { value: 'E-2', label: 'E-2 — Specialist 2' },
            { value: 'E-3', label: 'E-3 — Specialist 3' },
            { value: 'E-4', label: 'E-4 — Specialist 4' },
            { value: 'E-5', label: 'E-5 — Sergeant' },
            { value: 'E-6', label: 'E-6 — Technical Sergeant' },
            { value: 'E-7', label: 'E-7 — Master Sergeant' },
            { value: 'E-8', label: 'E-8 — Senior Master Sergeant' },
            { value: 'E-9', label: 'E-9 — Chief Master Sergeant' },
            { value: '',    label: '── Officer ──', disabled: true },
            { value: 'O-1', label: 'O-1 — Second Lieutenant' },
            { value: 'O-2', label: 'O-2 — First Lieutenant' },
            { value: 'O-3', label: 'O-3 — Captain' },
            { value: 'O-4', label: 'O-4 — Major' },
            { value: 'O-5', label: 'O-5 — Lieutenant Colonel' },
            { value: 'O-6', label: 'O-6 — Colonel' },
            { value: 'O-7', label: 'O-7 — Brigadier General' },
            { value: 'O-8', label: 'O-8 — Major General' },
            { value: 'O-9', label: 'O-9 — Lieutenant General' },
            { value: 'O-10',label: 'O-10 — General of the Space Force' },
        ],
        'Army': [
            { value: '',    label: '── Enlisted ──', disabled: true },
            { value: 'E-1', label: 'E-1 — Private' },
            { value: 'E-2', label: 'E-2 — Private Second Class' },
            { value: 'E-3', label: 'E-3 — Private First Class' },
            { value: 'E-4', label: 'E-4 — Specialist / Corporal' },
            { value: 'E-5', label: 'E-5 — Sergeant' },
            { value: 'E-6', label: 'E-6 — Staff Sergeant' },
            { value: 'E-7', label: 'E-7 — Sergeant First Class' },
            { value: 'E-8', label: 'E-8 — Master Sergeant / First Sergeant' },
            { value: 'E-9', label: 'E-9 — Sergeant Major' },
            { value: '',    label: '── Warrant Officer ──', disabled: true },
            { value: 'W-1', label: 'W-1 — Warrant Officer 1' },
            { value: 'W-2', label: 'W-2 — Chief Warrant Officer 2' },
            { value: 'W-3', label: 'W-3 — Chief Warrant Officer 3' },
            { value: 'W-4', label: 'W-4 — Chief Warrant Officer 4' },
            { value: 'W-5', label: 'W-5 — Chief Warrant Officer 5' },
            { value: '',    label: '── Officer ──', disabled: true },
            { value: 'O-1', label: 'O-1 — Second Lieutenant' },
            { value: 'O-2', label: 'O-2 — First Lieutenant' },
            { value: 'O-3', label: 'O-3 — Captain' },
            { value: 'O-4', label: 'O-4 — Major' },
            { value: 'O-5', label: 'O-5 — Lieutenant Colonel' },
            { value: 'O-6', label: 'O-6 — Colonel' },
            { value: 'O-7', label: 'O-7 — Brigadier General' },
            { value: 'O-8', label: 'O-8 — Major General' },
            { value: 'O-9', label: 'O-9 — Lieutenant General' },
            { value: 'O-10',label: 'O-10 — General' },
        ],
        'Navy': [
            { value: '',    label: '── Enlisted ──', disabled: true },
            { value: 'E-1', label: 'E-1 — Seaman Recruit' },
            { value: 'E-2', label: 'E-2 — Seaman Apprentice' },
            { value: 'E-3', label: 'E-3 — Seaman' },
            { value: 'E-4', label: 'E-4 — Petty Officer Third Class' },
            { value: 'E-5', label: 'E-5 — Petty Officer Second Class' },
            { value: 'E-6', label: 'E-6 — Petty Officer First Class' },
            { value: 'E-7', label: 'E-7 — Chief Petty Officer' },
            { value: 'E-8', label: 'E-8 — Senior Chief Petty Officer' },
            { value: 'E-9', label: 'E-9 — Master Chief Petty Officer' },
            { value: '',    label: '── Warrant Officer ──', disabled: true },
            { value: 'W-1', label: 'W-1 — Warrant Officer' },
            { value: 'W-2', label: 'W-2 — Chief Warrant Officer 2' },
            { value: 'W-3', label: 'W-3 — Chief Warrant Officer 3' },
            { value: 'W-4', label: 'W-4 — Chief Warrant Officer 4' },
            { value: 'W-5', label: 'W-5 — Chief Warrant Officer 5' },
            { value: '',    label: '── Officer ──', disabled: true },
            { value: 'O-1', label: 'O-1 — Ensign' },
            { value: 'O-2', label: 'O-2 — Lieutenant Junior Grade' },
            { value: 'O-3', label: 'O-3 — Lieutenant' },
            { value: 'O-4', label: 'O-4 — Lieutenant Commander' },
            { value: 'O-5', label: 'O-5 — Commander' },
            { value: 'O-6', label: 'O-6 — Captain' },
            { value: 'O-7', label: 'O-7 — Rear Admiral (Lower Half)' },
            { value: 'O-8', label: 'O-8 — Rear Admiral (Upper Half)' },
            { value: 'O-9', label: 'O-9 — Vice Admiral' },
            { value: 'O-10',label: 'O-10 — Admiral' },
        ],
        'Marines': [
            { value: '',    label: '── Enlisted ──', disabled: true },
            { value: 'E-1', label: 'E-1 — Private' },
            { value: 'E-2', label: 'E-2 — Private First Class' },
            { value: 'E-3', label: 'E-3 — Lance Corporal' },
            { value: 'E-4', label: 'E-4 — Corporal' },
            { value: 'E-5', label: 'E-5 — Sergeant' },
            { value: 'E-6', label: 'E-6 — Staff Sergeant' },
            { value: 'E-7', label: 'E-7 — Gunnery Sergeant' },
            { value: 'E-8', label: 'E-8 — Master Sergeant / First Sergeant' },
            { value: 'E-9', label: 'E-9 — Master Gunnery Sergeant / Sergeant Major' },
            { value: '',    label: '── Warrant Officer ──', disabled: true },
            { value: 'W-1', label: 'W-1 — Warrant Officer 1' },
            { value: 'W-2', label: 'W-2 — Chief Warrant Officer 2' },
            { value: 'W-3', label: 'W-3 — Chief Warrant Officer 3' },
            { value: 'W-4', label: 'W-4 — Chief Warrant Officer 4' },
            { value: 'W-5', label: 'W-5 — Chief Warrant Officer 5' },
            { value: '',    label: '── Officer ──', disabled: true },
            { value: 'O-1', label: 'O-1 — Second Lieutenant' },
            { value: 'O-2', label: 'O-2 — First Lieutenant' },
            { value: 'O-3', label: 'O-3 — Captain' },
            { value: 'O-4', label: 'O-4 — Major' },
            { value: 'O-5', label: 'O-5 — Lieutenant Colonel' },
            { value: 'O-6', label: 'O-6 — Colonel' },
            { value: 'O-7', label: 'O-7 — Brigadier General' },
            { value: 'O-8', label: 'O-8 — Major General' },
            { value: 'O-9', label: 'O-9 — Lieutenant General' },
            { value: 'O-10',label: 'O-10 — General' },
        ],
        'Coast Guard': [
            { value: '',    label: '── Enlisted ──', disabled: true },
            { value: 'E-1', label: 'E-1 — Seaman Recruit' },
            { value: 'E-2', label: 'E-2 — Seaman Apprentice' },
            { value: 'E-3', label: 'E-3 — Seaman' },
            { value: 'E-4', label: 'E-4 — Petty Officer Third Class' },
            { value: 'E-5', label: 'E-5 — Petty Officer Second Class' },
            { value: 'E-6', label: 'E-6 — Petty Officer First Class' },
            { value: 'E-7', label: 'E-7 — Chief Petty Officer' },
            { value: 'E-8', label: 'E-8 — Senior Chief Petty Officer' },
            { value: 'E-9', label: 'E-9 — Master Chief Petty Officer' },
            { value: '',    label: '── Officer ──', disabled: true },
            { value: 'O-1', label: 'O-1 — Ensign' },
            { value: 'O-2', label: 'O-2 — Lieutenant Junior Grade' },
            { value: 'O-3', label: 'O-3 — Lieutenant' },
            { value: 'O-4', label: 'O-4 — Lieutenant Commander' },
            { value: 'O-5', label: 'O-5 — Commander' },
            { value: 'O-6', label: 'O-6 — Captain' },
            { value: 'O-7', label: 'O-7 — Rear Admiral (Lower Half)' },
            { value: 'O-8', label: 'O-8 — Rear Admiral (Upper Half)' },
            { value: 'O-9', label: 'O-9 — Vice Admiral' },
            { value: 'O-10',label: 'O-10 — Admiral' },
        ],
        'Civilian': [
            { value: '',      label: '── General Schedule ──', disabled: true },
            { value: 'GS-1',  label: 'GS-1' },
            { value: 'GS-2',  label: 'GS-2' },
            { value: 'GS-3',  label: 'GS-3' },
            { value: 'GS-4',  label: 'GS-4' },
            { value: 'GS-5',  label: 'GS-5' },
            { value: 'GS-6',  label: 'GS-6' },
            { value: 'GS-7',  label: 'GS-7' },
            { value: 'GS-8',  label: 'GS-8' },
            { value: 'GS-9',  label: 'GS-9' },
            { value: 'GS-10', label: 'GS-10' },
            { value: 'GS-11', label: 'GS-11' },
            { value: 'GS-12', label: 'GS-12' },
            { value: 'GS-13', label: 'GS-13' },
            { value: 'GS-14', label: 'GS-14' },
            { value: 'GS-15', label: 'GS-15' },
            { value: '',      label: '── Senior Executive Service ──', disabled: true },
            { value: 'SES',   label: 'SES — Senior Executive Service' },
        ],
        'Contractor': [
            { value: 'CTR', label: 'CTR — Contractor' },
        ],
    };

    function updatePayGradeDropdown(selectEl, branch, savedValue) {
        if (!selectEl) return;
        const opts = PAY_GRADE_OPTIONS[branch];
        if (!opts) {
            selectEl.innerHTML = '<option value="">— Select Branch First —</option>';
            return;
        }
        selectEl.innerHTML = '<option value="">— Select Pay Grade —</option>' +
            opts.map(o => o.disabled
                ? `<option value="" disabled>${o.label}</option>`
                : `<option value="${o.value}">${o.label}</option>`
            ).join('');
        if (savedValue) {
            selectEl.value = savedValue;
            if (selectEl.value !== savedValue) {
                const opt = document.createElement('option');
                opt.value = savedValue;
                opt.textContent = savedValue;
                selectEl.appendChild(opt);
                selectEl.value = savedValue;
            }
        }
    }

    // Populate ISM office dropdown from the installations list
    function updateISMDropdown(selectEl, _branch, savedValue) {
        if (!selectEl) return;
        const wbOpts = allWorkboxes.map(w =>
            `<option value="${w}">${w}</option>`
        ).join('');
        const installOpts = allInstallations.map(i =>
            `<option value="${i.id}">${i.name}${i.code ? ' (' + i.code + ')' : ''}</option>`
        ).join('');
        selectEl.innerHTML = '<option value="">— None / Ask each time —</option>' +
            (wbOpts      ? `<optgroup label="Workboxes / ISM Offices">${wbOpts}</optgroup>` : '') +
            (installOpts ? `<optgroup label="Installations">${installOpts}</optgroup>` : '');
        if (savedValue) {
            selectEl.value = savedValue;
            if (selectEl.value !== savedValue) {
                const opt = document.createElement('option');
                opt.value = savedValue; opt.textContent = savedValue;
                selectEl.appendChild(opt); selectEl.value = savedValue;
            }
        }
    }

    // ── Filterable Select Widget ──────────────────────────────────────────────
    class FilterableSelect {
        constructor(selectId) {
            this.select = document.getElementById(selectId);
            if (!this.select) return;
            this._build();
            this._observe();
        }

        _build() {
            const wrapper = document.createElement('div');
            wrapper.className = 'fs-wrapper';

            this.input = document.createElement('input');
            this.input.type = 'text';
            this.input.className = 'fs-input form-input';
            this.input.placeholder = 'Type to filter…';
            this.input.autocomplete = 'off';

            this.dropdown = document.createElement('ul');
            this.dropdown.className = 'fs-dropdown';

            this.select.parentNode.insertBefore(wrapper, this.select);
            wrapper.appendChild(this.input);
            wrapper.appendChild(this.dropdown);
            wrapper.appendChild(this.select);
            this.select.style.display = 'none';

            this._attachEvents();
            this._refreshInput();
        }

        _options() {
            return Array.from(this.select.options).filter(o => !o.disabled);
        }

        _renderDropdown(filter) {
            const term = (filter || '').toLowerCase();
            this.dropdown.innerHTML = '';
            const matched = this._options().filter(o =>
                !term || o.textContent.toLowerCase().includes(term)
            );
            if (!matched.length) {
                const li = document.createElement('li');
                li.className = 'fs-no-match';
                li.textContent = 'No matches';
                this.dropdown.appendChild(li);
                return;
            }
            matched.forEach(o => {
                const li = document.createElement('li');
                li.className = 'fs-option' + (o.value === this.select.value ? ' selected' : '');
                li.textContent = o.textContent;
                li.dataset.value = o.value;
                li.addEventListener('mousedown', e => {
                    e.preventDefault();
                    this.select.value = o.value;
                    this.select.dispatchEvent(new Event('change', { bubbles: true }));
                    this._refreshInput();
                    this._close();
                });
                this.dropdown.appendChild(li);
            });
        }

        _open() {
            this._renderDropdown(this.input.value);
            this.dropdown.style.display = 'block';
        }

        _close() {
            this.dropdown.style.display = 'none';
            this._refreshInput();
        }

        _refreshInput() {
            const sel = this.select.options[this.select.selectedIndex];
            this.input.value = (sel && sel.value) ? sel.textContent : '';
        }

        _attachEvents() {
            this.input.addEventListener('focus', () => this._open());
            this.input.addEventListener('blur', () => setTimeout(() => this._close(), 150));
            this.input.addEventListener('input', () => this._renderDropdown(this.input.value));
        }

        _observe() {
            new MutationObserver(() => {
                // Defer so select.value = x (set after innerHTML change) is honoured
                setTimeout(() => this._refreshInput(), 0);
            }).observe(this.select, { childList: true, subtree: true });
        }
    }

    function initFilterableSelects() {
        [
            'accountUnifiedCommand',
            'accountInstallation',
            'accountUnit',
            'accountServiceBranch',
            'accountPayGrade',
            'accountDefaultISM',
        ].forEach(id => new FilterableSelect(id));
    }

    function init() {
        loadProfileData();
        setupEventListeners();
        attachPhoneFormatters('accountPhone', 'accountPhoneDSN');
        initFilterableSelects();
    }

    function setupEventListeners() {
        document.querySelectorAll('.profile-nav-item').forEach(btn => {
            btn.addEventListener('click', () => switchSection(btn.getAttribute('data-section')));
        });
    }

    window.switchSection = function(sectionName) {
        document.querySelectorAll('.profile-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-section') === sectionName);
        });
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(`${sectionName}-section`);
        if (target) target.classList.add('active');
    };

    async function loadProfileData() {
        try {
            const [profileRes, installRes, wbRes] = await Promise.all([
                fetch('/api/user/profile'),
                fetch('/api/auth/public-installations'),
                fetch('/api/frequency/reviewers'),
            ]);

            if (!profileRes.ok) {
                // Fall back to session for basic info
                const sessionRes = await fetch('/api/auth/session');
                const sessionData = await sessionRes.json();
                if (sessionData.valid) {
                    profileData = { user: sessionData.user };
                    updateProfileUI();
                }
                return;
            }

            const data = await profileRes.json();
            profileData = data;

            const installData = await installRes.json();
            allInstallations = installData.installations || [];
            allWorkboxes     = wbRes.ok ? (await wbRes.json()).workboxes || [] : [];

            updateProfileUI();
        } catch (error) {
            console.error('Failed to load profile data:', error);
            showNotification('Failed to load profile data', 'error');
        }
    }

    function updateProfileUI() {
        const user = profileData?.user || profileData || {};

        // Sidebar
        const elUsername = document.getElementById('profileUsername');
        const elRole = document.getElementById('profileRole');
        const elAuth = document.getElementById('authMethod');

        if (elUsername) elUsername.textContent = user.username || '';
        if (elRole) {
            const roleLabels = {
                admin: 'Admin', ntia: 'NTIA', agency: 'Agency',
                combatant_command: 'Combatant Command', command: 'Command',
                ism: 'ISM', operator: 'Operator'
            };
            elRole.textContent = roleLabels[user.role] || user.role || 'User';
        }
        if (elAuth) {
            const method = user.auth_method || localStorage.getItem('sfaf_auth_method') || 'password';
            if (method === 'pki') {
                elAuth.innerHTML = '<i class="fas fa-certificate"></i> PKI Certificate';
                elAuth.style.cssText = 'background:rgba(16,185,129,0.1);color:#10b981;border-color:rgba(16,185,129,0.3)';
            } else {
                elAuth.innerHTML = '<i class="fas fa-key"></i> Password Auth';
                elAuth.style.cssText = '';
            }
        }

        // Account fields
        setValue('accountUsername', user.username);
        setValue('accountEmail', user.email);
        // Split full_name into First / MI / Last
        (function(full) {
            const parts = (full || '').trim().split(/\s+/);
            if (parts.length >= 3) {
                setValue('accountFirstName', parts[0]);
                setValue('accountMiddleInitial', parts[1].replace(/\.$/, ''));
                setValue('accountLastName', parts.slice(2).join(' '));
            } else if (parts.length === 2) {
                setValue('accountFirstName', parts[0]);
                setValue('accountMiddleInitial', '');
                setValue('accountLastName', parts[1]);
            } else {
                setValue('accountFirstName', full || '');
                setValue('accountMiddleInitial', '');
                setValue('accountLastName', '');
            }
        })(user.full_name);
        setValue('accountPhone', formatCommercialPhone(user.phone || ''));
        setValue('accountPhoneDSN', formatDSNPhone(user.phone_dsn || ''));
        setSelectValue('accountOrganization', user.organization);
        setSelectValue('accountUnifiedCommand', user.unified_command);
        setSelectValue('accountRole', user.role);

        // Service branch + pay grade
        if (user.service_branch) {
            setSelectValue('accountServiceBranch', user.service_branch);
            updatePayGradeDropdown(
                document.getElementById('accountPayGrade'),
                user.service_branch,
                user.pay_grade
            );
            // ISM dropdown populated in populateInstallationDropdown (uses allInstallations)
        }

        const createdDate = user.created_at ? new Date(user.created_at) : null;
        setValue('accountCreatedAt', createdDate
            ? createdDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : '');

        // Populate installation dropdown, then unit dropdown
        // ISM options will also be refreshed here if no service_branch set
        populateInstallationDropdown(user.installation_id, user.unit_id);
    }

    function setValue(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    }

    function setSelectValue(id, val) {
        const el = document.getElementById(id);
        if (!el || !val) return;
        // Try to set; if no matching option, add one
        el.value = val;
        if (el.value !== val) {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            el.appendChild(opt);
            el.value = val;
        }
    }

    function populateInstallationDropdown(currentInstallationID, currentUnitID) {
        const select = document.getElementById('accountInstallation');
        if (!select) return;

        select.innerHTML = '<option value="">— No Installation —</option>' +
            allInstallations.map(i =>
                `<option value="${i.id}">${i.name}${i.code ? ' (' + i.code + ')' : ''}</option>`
            ).join('');

        if (currentInstallationID) {
            select.value = currentInstallationID;
        }

        // ISM dropdown is always the full installations list
        const user = profileData?.user || profileData || {};
        updateISMDropdown(document.getElementById('accountDefaultISM'), '', user.default_ism_office);

        // Always load ALL units on page load so the pre-selected unit always appears,
        // regardless of whether it matches the installation filter.
        loadUnitsForInstallation(null, currentUnitID);
    }

    async function loadUnitsForInstallation(installationID, selectedUnitID) {
        const unitSelect = document.getElementById('accountUnit');
        if (!unitSelect) return;

        // Only restore a unit that was explicitly passed in (e.g. on initial page load).
        // Do NOT fall back to unitSelect.value — that would re-inject a unit from a
        // different installation into the freshly-filtered list.
        const previousValue = selectedUnitID || null;

        unitSelect.innerHTML = '<option value="">Loading...</option>';

        try {
            const url = installationID
                ? `/api/auth/public-units?installation_id=${encodeURIComponent(installationID)}`
                : '/api/auth/public-units';
            const res = await fetch(url);
            const data = await res.json();
            const units = data.units || [];

            unitSelect.innerHTML = '<option value="">— No Unit —</option>' +
                units.map(u => `<option value="${u.id}">${u.name}${u.unit_code ? ' (' + u.unit_code + ')' : ''}</option>`).join('');

            if (previousValue) {
                unitSelect.value = previousValue;

                // If the unit isn't in the filtered list, fetch it by name and add it
                if (unitSelect.value !== previousValue) {
                    await appendMissingUnit(unitSelect, previousValue);
                }
            }

            unitSelect.disabled = false;
        } catch {
            unitSelect.innerHTML = '<option value="">Error loading units</option>';
            unitSelect.disabled = false;
        }
    }

    // If the currently-assigned unit isn't in the filtered list, look it up and add it.
    async function appendMissingUnit(unitSelect, unitID) {
        try {
            const res = await fetch('/api/auth/public-units');
            const data = await res.json();
            const unit = (data.units || []).find(u => u.id === unitID);
            if (unit) {
                const opt = document.createElement('option');
                opt.value = unit.id;
                opt.textContent = `${unit.name}${unit.unit_code ? ' (' + unit.unit_code + ')' : ''} ✦`;
                opt.title = 'From a different installation';
                unitSelect.appendChild(opt);
                unitSelect.value = unitID;
            }
        } catch { /* ignore */ }
    }

    window.onProfileInstallationChange = function() {
        loadUnitsForInstallation(null, null);
    };

    window.onProfileBranchChange = function() {
        const branch = document.getElementById('accountServiceBranch').value;
        updatePayGradeDropdown(document.getElementById('accountPayGrade'), branch, null);
    };

    window.saveAccountInfo = async function() {
        const email = document.getElementById('accountEmail').value.trim();
        const firstName = document.getElementById('accountFirstName').value.trim();
        const mi        = document.getElementById('accountMiddleInitial').value.trim().toUpperCase();
        const lastName  = document.getElementById('accountLastName').value.trim();
        const fullName  = [firstName, mi, lastName].filter(Boolean).join(' ');

        if (!email || !firstName || !lastName) {
            showNotification('Email, first name, and last name are required', 'error');
            return;
        }

        const installationID = document.getElementById('accountInstallation').value || null;
        const unitID = document.getElementById('accountUnit').value || null;

        const phone = document.getElementById('accountPhone').value.replace(/\D/g, '');
        if (!phone) {
            showNotification('Commercial phone is required', 'error');
            return;
        }

        const payload = {
            email,
            full_name: fullName,
            organization: document.getElementById('accountOrganization').value,
            phone,
            phone_dsn: document.getElementById('accountPhoneDSN').value.replace(/\D/g, '') || null,
            unified_command: document.getElementById('accountUnifiedCommand').value,
            installation_id: installationID,
            unit_id: unitID,
            default_ism_office: document.getElementById('accountDefaultISM').value || '',
            service_branch: document.getElementById('accountServiceBranch').value || '',
            pay_grade: document.getElementById('accountPayGrade').value || '',
        };

        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                showNotification(data.error || 'Failed to save', 'error');
                return;
            }

            if (profileData) profileData.user = data.user;
            showNotification('Account information updated successfully', 'success');
        } catch (error) {
            console.error('Failed to save account info:', error);
            showNotification('Failed to save account information', 'error');
        }
    };

    window.changePassword = async function(event) {
        event.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            showNotification('All password fields are required', 'error');
            return;
        }
        if (newPassword.length < 8) {
            showNotification('New password must be at least 8 characters', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showNotification('New passwords do not match', 'error');
            return;
        }

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
            });

            if (res.ok) {
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
                showNotification('Password changed successfully', 'success');
            } else {
                const data = await res.json();
                showNotification(data.error || 'Failed to change password', 'error');
            }
        } catch (error) {
            console.error('Failed to change password:', error);
            showNotification('Failed to change password', 'error');
        }
    };

    window.revokeAllSessions = async function() {
        if (!confirm('Are you sure you want to revoke all other sessions? This will log you out from all other devices.')) return;

        try {
            await fetch('/api/auth/revoke-sessions', { method: 'POST' });
            showNotification('All other sessions have been revoked', 'success');
        } catch (error) {
            showNotification('Failed to revoke sessions', 'error');
        }
    };

    window.enableTwoFactor = function() {
        showNotification('Two-factor authentication is not yet available', 'info');
    };

    window.savePreferences = function() {
        const preferences = {
            darkMode: document.getElementById('prefDarkMode').checked,
            compactView: document.getElementById('prefCompactView').checked,
            emailNotif: document.getElementById('prefEmailNotif').checked,
            soundNotif: document.getElementById('prefSoundNotif').checked,
            defaultRegion: document.getElementById('prefDefaultRegion').value,
            markerClustering: document.getElementById('prefMarkerClustering').checked
        };
        localStorage.setItem('user_preferences', JSON.stringify(preferences));
        showNotification('Preferences saved', 'success');
    };

    window.uploadCertificate = function() {
        showNotification('Certificate upload coming soon', 'info');
    };

    window.handleLogout = async function() {
        if (!confirm('Are you sure you want to logout?')) return;
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch {}
        localStorage.removeItem('sfaf_logged_in');
        localStorage.removeItem('sfaf_username');
        localStorage.removeItem('sfaf_auth_method');
        localStorage.removeItem('sfaf_token');
        window.location.href = '/';
    };

    window.loadProfileData = loadProfileData;

    function showNotification(message, type = 'info') {
        const colors = {
            success: 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
            error:   'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)',
            info:    'linear-gradient(135deg,#3b82f6 0%,#2563eb 100%)'
        };
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };

        const n = document.createElement('div');
        n.style.cssText = `position:fixed;top:80px;right:20px;z-index:10001;padding:16px 24px;
            border-radius:8px;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.4);
            animation:slideInRight .3s ease-out;max-width:400px;color:white;
            background:${colors[type] || colors.info}`;
        n.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
        document.body.appendChild(n);
        setTimeout(() => {
            n.style.animation = 'slideOutRight .3s ease-out';
            setTimeout(() => n.remove(), 300);
        }, 4000);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight { from { transform:translateX(400px); opacity:0 } to { transform:translateX(0); opacity:1 } }
        @keyframes slideOutRight { from { transform:translateX(0); opacity:1 } to { transform:translateX(400px); opacity:0 } }
    `;
    document.head.appendChild(style);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

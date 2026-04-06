/**
 * Landing Page JavaScript
 * Handles login modal and module navigation
 */

(function() {
    'use strict';

    // CRITICAL: Only run on landing page (root path only)
    if (!window.location.pathname.match(/^\/?$/)) {
        console.log('⏭️  Skipping landing.js - not on landing page (path: ' + window.location.pathname + ')');
        return;
    }

    // Check if user is already logged in
    let isLoggedIn = false;

    /**
     * Initialize landing page
     */
    async function init() {
        await checkLoginStatus();
        setupEventListeners();
        console.log('🚀 Landing page initialized');
    }

    /**
     * Check if user is logged in by verifying session with the server
     */
    async function checkLoginStatus() {
        try {
            const res = await fetch('/api/auth/session');
            if (!res.ok) {
                clearLocalAuth();
                return;
            }
            const data = await res.json();
            if (data.valid && data.user) {
                isLoggedIn = true;
                localStorage.setItem('sfaf_logged_in', 'true');
                localStorage.setItem('sfaf_username', data.user.username);
                localStorage.setItem('sfaf_role', data.user.role);
                updateUIForLoggedInUser(data.user.username, data.user.role);
            } else {
                clearLocalAuth();
            }
        } catch {
            // Server unreachable — fall back to cached state
            const loggedIn = localStorage.getItem('sfaf_logged_in');
            const username = localStorage.getItem('sfaf_username');
            const role = localStorage.getItem('sfaf_role');
            if (loggedIn === 'true' && username) {
                isLoggedIn = true;
                updateUIForLoggedInUser(username, role);
            }
        }
    }

    function clearLocalAuth() {
        localStorage.removeItem('sfaf_logged_in');
        localStorage.removeItem('sfaf_username');
        localStorage.removeItem('sfaf_role');
        localStorage.removeItem('sfaf_token');
        isLoggedIn = false;
    }

    /**
     * Update UI for logged in user
     */
    function updateUIForLoggedInUser(username, role) {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${username}`;
            loginBtn.onclick = () => { window.location.href = '/profile'; };
        }

        const requestAccountBtn = document.getElementById('requestAccountBtn');
        if (requestAccountBtn) requestAccountBtn.style.display = 'none';

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';

        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.style.display = role === 'admin' ? 'inline-flex' : 'none';
        }
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn && !isLoggedIn) {
            loginBtn.addEventListener('click', openLoginModal);
        }

        // Close modal on background click
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeLoginModal();
                }
            });
        }

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeLoginModal();
            }
        });
    }

    /**
     * Open login modal
     */
    window.openLoginModal = function() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.add('active');
            // Focus on username input
            setTimeout(() => {
                const usernameInput = document.getElementById('username');
                if (usernameInput) {
                    usernameInput.focus();
                }
            }, 100);
        }
    };

    /**
     * Close login modal
     */
    window.closeLoginModal = function() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.remove('active');
        }
    };

    /**
     * Handle login form submission
     */
    window.handleLogin = function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!username || !password) {
            showNotification('Please enter both username and password', 'error');
            return;
        }

        performLogin(username, password, rememberMe);
    };

    /**
     * Perform login via API
     */
    async function performLogin(username, password, rememberMe) {
        const submitBtn = document.querySelector('#passwordLoginForm .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                showNotification(data.message || 'Login failed', 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }

            const role = data.user?.role || '';
            localStorage.setItem('sfaf_logged_in', 'true');
            localStorage.setItem('sfaf_username', username);
            localStorage.setItem('sfaf_role', role);
            if (data.token) localStorage.setItem('sfaf_token', data.token);
            if (rememberMe) {
                localStorage.setItem('sfaf_remember_me', 'true');
            }

            isLoggedIn = true;
            showNotification(`Welcome, ${username}!`, 'success');
            updateUIForLoggedInUser(username, role);
            closeLoginModal();
            document.getElementById('passwordLoginForm').reset();
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

            setTimeout(() => {
                window.location.href = role === 'admin' ? '/admin' : '/frequency';
            }, 500);
        } catch (err) {
            showNotification('Login error: ' + err.message, 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    /**
     * Logout user
     */
    async function logout() {
        if (!confirm('Are you sure you want to logout?')) return;

        try {
            // Send token in Authorization header as fallback for browsers that
            // don't attach the cookie (e.g., strict SameSite contexts).
            const token = localStorage.getItem('sfaf_token') || '';
            const headers = token ? { 'Authorization': token } : {};
            await fetch('/api/auth/logout', { method: 'POST', headers });
        } catch { /* ignore network errors — cookie is cleared server-side */ }

        clearLocalAuth();

        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            loginBtn.onclick = openLoginModal;
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'none';

        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.style.display = 'none';

        showNotification('Logged out successfully', 'success');
    }

    // Export logout so the landing.html onclick="logout()" can reach it.
    // All other exported functions use the same window.X pattern.
    window.logout = logout;

    /**
     * Navigate to module
     */
    window.navigateToModule = function(path) {
        if (!isLoggedIn) {
            showNotification('Please login to access modules', 'error');
            openLoginModal();
            return;
        }

        // Navigate to module
        window.location.href = path;
    };

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10001;
            padding: 16px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
            animation: slideInRight 0.3s ease-out;
            max-width: 400px;
        `;

        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            notification.style.color = 'white';
            notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            notification.style.color = 'white';
            notification.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        } else {
            notification.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
            notification.style.color = 'white';
            notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
        }

        document.body.appendChild(notification);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    /**
     * Switch between login tabs
     */
    window.switchLoginTab = function(tab) {
        // Update tab buttons
        document.querySelectorAll('.login-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.login-tab[data-tab="${tab}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.login-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        if (tab === 'pki') {
            document.getElementById('pkiLoginTab').classList.add('active');
        } else {
            document.getElementById('passwordLoginTab').classList.add('active');
        }
    };

    /**
     * Handle certificate file upload
     */
    window.handleCertificateUpload = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const certPEM = e.target.result;
            parseCertificate(certPEM);
        };
        reader.readAsText(file);
    };

    /**
     * Parse certificate and extract information
     */
    function parseCertificate(certPEM) {
        try {
            // Basic PEM validation
            if (!certPEM.includes('BEGIN CERTIFICATE')) {
                showNotification('Invalid certificate format', 'error');
                return;
            }

            // Extract certificate information (simplified for demo)
            const certInfo = extractCertInfo(certPEM);

            // Display certificate information
            document.getElementById('certCN').textContent = certInfo.commonName;
            document.getElementById('certOrg').textContent = certInfo.organization;
            document.getElementById('certEmail').textContent = certInfo.email;
            document.getElementById('certExpiry').textContent = certInfo.validUntil;

            document.getElementById('certInfo').style.display = 'block';
            document.getElementById('pkiLoginBtn').disabled = false;

            // Store certificate PEM for login
            window._certificatePEM = certPEM;

            showNotification('Certificate loaded successfully', 'success');
        } catch (error) {
            showNotification('Failed to parse certificate: ' + error.message, 'error');
        }
    }

    /**
     * Extract certificate information (simplified demo version)
     */
    function extractCertInfo(certPEM) {
        // This is a simplified extraction for demo purposes
        // In production, use proper X.509 parsing library or backend API
        return {
            commonName: 'DOE.JOHN.1234567890',
            organization: 'U.S. Department of Defense',
            email: 'john.doe@mail.mil',
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()
        };
    }

    /**
     * Handle PKI login
     */
    window.handlePKILogin = async function(event) {
        event.preventDefault();

        if (!window._certificatePEM) {
            showNotification('Please upload a certificate first', 'error');
            return;
        }

        const submitBtn = document.getElementById('pkiLoginBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        submitBtn.disabled = true;

        try {
            // In production, send certificate to backend for validation
            // const response = await fetch('/api/auth/pki-login', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ certificate_pem: window._certificatePEM })
            // });

            // Demo: Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Extract username from certificate CN
            const username = document.getElementById('certCN').textContent;

            // Save login state
            localStorage.setItem('sfaf_logged_in', 'true');
            localStorage.setItem('sfaf_username', username);
            localStorage.setItem('sfaf_auth_method', 'pki');

            isLoggedIn = true;

            // Show success notification
            showNotification(`PKI Authentication successful! Welcome, ${username}`, 'success');

            // Update UI
            updateUIForLoggedInUser(username);

            // Close modal
            closeLoginModal();

            // Reset form
            document.getElementById('pkiLoginForm').reset();
            document.getElementById('certInfo').style.display = 'none';
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = true;
            window._certificatePEM = null;

            setTimeout(() => {
                window.location.href = '/frequency';
            }, 500);
        } catch (error) {
            showNotification('PKI authentication failed: ' + error.message, 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    };

    /**
     * Handle password login form submission
     */
    window.togglePasswordVisibility = function() {
        const input = document.getElementById('password');
        const icon = document.getElementById('passwordToggleIcon');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    };

    window.handlePasswordLogin = function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!username || !password) {
            showNotification('Please enter both username and password', 'error');
            return;
        }

        performLogin(username, password, rememberMe);
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

// ─── Request Account Modal (global scope for onclick handlers) ────────────────

async function openRequestModal() {
    document.getElementById('requestModal').style.display = 'flex';
    document.getElementById('requestAccountForm').reset();
    document.getElementById('requestResult').style.display = 'none';
    document.getElementById('newUnitSection').style.display = 'none';
    await loadInstallationsForDropdown();
    loadUnitsForDropdown(null); // reset units — user must pick installation first
}

async function loadUnitsForDropdown(installationId) {
    const sel = document.getElementById('reqUnitSelect');
    if (!sel) return;

    if (!installationId) {
        sel.innerHTML = '<option value="">— Select an installation first —</option>';
        sel.disabled = true;
        return;
    }

    sel.innerHTML = '<option value="" disabled selected>Loading units...</option>';
    sel.disabled = true;

    try {
        const res = await fetch('/api/auth/public-units?installation_id=' + encodeURIComponent(installationId));
        if (!res.ok) throw new Error('Server returned ' + res.status);
        const data = await res.json();
        const units = data.units || [];

        sel.innerHTML = '<option value="">— Select your unit —</option>';
        units.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.unit_code + (u.organization ? ' — ' + u.organization : '');
            sel.appendChild(opt);
        });

        if (units.length === 0) {
            const noneOpt = document.createElement('option');
            noneOpt.value = '';
            noneOpt.disabled = true;
            noneOpt.textContent = '— No units at this installation yet —';
            sel.appendChild(noneOpt);
        }

        const requestOpt = document.createElement('option');
        requestOpt.value = '__new__';
        requestOpt.textContent = '+ Request New Unit (not listed above)';
        sel.appendChild(requestOpt);

        sel.disabled = false;
    } catch (err) {
        console.error('Failed to load units:', err);
        sel.innerHTML = '<option value="__new__">⚠ Could not load units — enter unit name below</option>';
        sel.disabled = false;
        document.getElementById('newUnitSection').style.display = 'block';
        document.getElementById('reqNewUnitName').required = true;
    }
}

function handleInstallationSelectChange() {
    const instId = document.getElementById('reqInstallationSelect').value;
    // Reset unit when installation changes
    document.getElementById('reqUnitSelect').value = '';
    document.getElementById('newUnitSection').style.display = 'none';
    document.getElementById('reqNewUnitName').required = false;
    loadUnitsForDropdown(instId);
}

async function loadInstallationsForDropdown() {
    const sel = document.getElementById('reqInstallationSelect');
    if (!sel) return;

    sel.innerHTML = '<option value="" disabled selected>Loading installations...</option>';
    sel.disabled = true;

    try {
        const res = await fetch('/api/auth/public-installations');
        if (!res.ok) throw new Error('Server returned ' + res.status);
        const data = await res.json();
        const list = data.installations || [];

        sel.innerHTML = '<option value="">— Select your installation —</option>';
        list.forEach(inst => {
            const opt = document.createElement('option');
            opt.value = inst.id;
            opt.textContent = inst.name + (inst.code ? ' (' + inst.code + ')' : '');
            sel.appendChild(opt);
        });

        if (list.length === 0) {
            const noneOpt = document.createElement('option');
            noneOpt.value = '';
            noneOpt.disabled = true;
            noneOpt.textContent = '— No installations configured yet —';
            sel.appendChild(noneOpt);
        }

        sel.disabled = false;
    } catch (err) {
        console.error('Failed to load installations:', err);
        sel.innerHTML = '<option value="">⚠ Could not load installations</option>';
        sel.disabled = false;
    }
}

function handleUnitSelectChange() {
    const val = document.getElementById('reqUnitSelect').value;
    const newUnitSection = document.getElementById('newUnitSection');
    const newUnitNameInput = document.getElementById('reqNewUnitName');
    if (val === '__new__') {
        newUnitSection.style.display = 'block';
        newUnitNameInput.required = true;
    } else {
        newUnitSection.style.display = 'none';
        newUnitNameInput.required = false;
    }
}

function closeRequestModal() {
    document.getElementById('requestModal').style.display = 'none';
}

async function handleRequestAccount(e) {
    e.preventDefault();
    const btn = document.getElementById('requestSubmitBtn');
    const result = document.getElementById('requestResult');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    const unitSelectVal = document.getElementById('reqUnitSelect').value;
    const isNewUnit = unitSelectVal === '__new__';

    if (isNewUnit) {
        const newUnitName = document.getElementById('reqNewUnitName').value.trim();
        if (!newUnitName) {
            const result = document.getElementById('requestResult');
            result.className = 'request-result request-error';
            result.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please enter the name of the unit you are requesting.';
            result.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
            return;
        }
    } else if (!unitSelectVal) {
        const result = document.getElementById('requestResult');
        result.className = 'request-result request-error';
        result.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please select a unit.';
        result.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
        return;
    }

    const newUnitName = isNewUnit ? document.getElementById('reqNewUnitName').value.trim() : '';
    const newUnitCode = isNewUnit ? document.getElementById('reqNewUnitCode').value.trim() : '';

    const firstName = document.getElementById('reqFirstName').value.trim();
    const mi        = document.getElementById('reqMiddleInitial').value.trim().toUpperCase();
    const lastName  = document.getElementById('reqLastName').value.trim();
    const fullName  = [firstName, mi ? mi + '.' : '', lastName].filter(Boolean).join(' ');

    const dsnPhone  = document.getElementById('reqPhoneDSN').value.trim();
    const commPhone = document.getElementById('reqPhoneComm').value.trim();
    const phone     = [dsnPhone ? 'DSN: ' + dsnPhone : '', commPhone ? 'Comm: ' + commPhone : ''].filter(Boolean).join(' | ');

    const payload = {
        username:         document.getElementById('reqUsername').value.trim(),
        full_name:        fullName,
        email:            document.getElementById('reqEmail').value.trim(),
        phone:            phone,
        organization:     document.getElementById('reqOrganization').value,
        unified_command:  document.getElementById('reqUnifiedCommand').value,
        unit:             isNewUnit ? (newUnitCode || newUnitName) : '',
        requested_role:   document.getElementById('reqRole').value,
        justification:    document.getElementById('reqJustification').value.trim(),
    };

    if (isNewUnit) {
        const fullNewUnitName = newUnitCode ? `${newUnitName} (${newUnitCode})` : newUnitName;
        payload.requested_unit_name = fullNewUnitName;
    } else {
        payload.unit_id = unitSelectVal;
    }

    const installationId = document.getElementById('reqInstallationSelect').value;
    if (installationId) {
        payload.installation_id = installationId;
    }

    try {
        const res = await fetch('/api/auth/request-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (res.ok) {
            result.className = 'request-result request-success';
            result.innerHTML = '<i class="fas fa-check-circle"></i> ' + data.message;
            result.style.display = 'block';
            document.getElementById('requestAccountForm').reset();
            btn.innerHTML = '<i class="fas fa-check"></i> Submitted';
        } else {
            throw new Error(data.error || 'Submission failed');
        }
    } catch (err) {
        result.className = 'request-result request-error';
        result.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + err.message;
        result.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
    }
}

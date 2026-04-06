// request_frequency.js — Frequency Request Form (Guided + Manual)
(function () {
    'use strict';

    // ── State ────────────────────────────────────────────────────────────────
    let currentMode = 'guided';
    let guidedStep  = 1;
    const GUIDED_TOTAL = 7;   // 6 question steps + review
    let manualStep  = 1;
    const MANUAL_TOTAL = 6;   // 5 sections + review

    // Hidden carrier for guided data that doesn't have a real input
    const gd = {};   // guided data store for card-option selections etc.

    // ── Band presets ─────────────────────────────────────────────────────────
    const BANDS = {
        hf:          { min: 2,      max: 29.890 },
        vhf_fm:      { min: 30,     max: 88     },
        atc:         { min: 118,    max: 137    },
        vhf:         { min: 138,    max: 151    },
        uhf:         { min: 225,    max: 400    },
        manet:       { min: null,   max: null   },
        manet_uhf:   { min: 225,    max: 400    },
        manet_low_l: { min: 1370,   max: 1390   },
        manet_high_l:{ min: 1785,   max: 1850   },
        manet_s:     { min: 2200,   max: 2390   },
        manet_c:     { min: 4400,   max: 4940   },
    };

    // ── Guided progress labels ────────────────────────────────────────────────
    const GUIDED_LABELS = ['Purpose', 'Who', 'Frequency', 'Equipment', 'Where/When', 'Why', 'Review'];
    const MANUAL_LABELS = ['Request', 'Frequency', 'Technical', 'Security', 'Justification', 'Review'];

    // ── Antenna types (SFAF Field 354) ───────────────────────────────────────
    const ANTENNA_TYPES = [
        { name: 'Alford Loop',                code: 'ALFORDLOOP' },
        { name: 'Annular Slot',               code: 'ANULARSLOT' },
        { name: 'Batwing',                    code: 'BATWING'    },
        { name: 'Biconical',                  code: 'BICONICAL'  },
        { name: 'Biconical Dipole',           code: 'BICONCLDPL' },
        { name: 'Blade',                      code: 'BLADE'      },
        { name: 'Bowtie',                     code: 'BOWTIE'     },
        { name: 'Cassegrain',                 code: 'CASSEGRAIN' },
        { name: 'Cavity Array',               code: 'CAVITYARRY' },
        { name: 'Coaxial Collinear',          code: 'COAXCOLLNR' },
        { name: 'Coaxial Dipole',             code: 'COAXDIPOLE' },
        { name: 'Collinear',                  code: 'COLLINEAR'  },
        { name: 'Collinear Array',            code: 'COLLNRARRY' },
        { name: 'Conformal Array',            code: 'CNFRMLARRY' },
        { name: 'Conical',                    code: 'CONICAL'    },
        { name: 'Conical Horn',               code: 'CONICALHRN' },
        { name: 'Corner Reflector',           code: 'CORNREFLTR' },
        { name: 'Cross Dipole',               code: 'CROSSDIPOL' },
        { name: 'Cross Dipole Reflector',     code: 'CRDIPOLERF' },
        { name: 'Dielectric Lens',            code: 'DLCTLENSES' },
        { name: 'Dipole',                     code: 'DIPOLE'     },
        { name: 'Dipole Array',               code: 'DIPOLEARRY' },
        { name: 'Discone',                    code: 'DISCONE'    },
        { name: 'Dual Log Periodic',          code: 'DUALLGPRDC' },
        { name: 'Dual Yagi',                  code: 'DUALYAGI'   },
        { name: 'Folded Coax',               code: 'FOLDEDCOAX' },
        { name: 'Folded Dipole',              code: 'FOLDDIPOLE' },
        { name: 'Folded Monopole',            code: 'FOLDMONOPL' },
        { name: 'Ground Plane',               code: 'GROUNDPLAN' },
        { name: 'Half Parabolic',             code: 'HALFPARBOL' },
        { name: 'Helical',                    code: 'HELICAL'    },
        { name: 'Helical Array',              code: 'HELICALARY' },
        { name: 'Helicone',                   code: 'HELICONE'   },
        { name: 'Helix',                      code: 'HELIX'      },
        { name: 'Helix Array',                code: 'HELIXARRY'  },
        { name: 'Horn',                       code: 'HORN'       },
        { name: 'Leaky Coax',                 code: 'LEAKYCOAX'  },
        { name: 'Linear Array',               code: 'LINEARARRY' },
        { name: 'Log Periodic',               code: 'LOGPERIODC' },
        { name: 'Longwire',                   code: 'LONGWIRE'   },
        { name: 'Loop',                       code: 'LOOP'       },
        { name: 'Loop Array',                 code: 'LOOPARRAY'  },
        { name: 'Microstrip',                 code: 'MICROSTRIP' },
        { name: 'Microstrip Array',           code: 'MCRSTRPARY' },
        { name: 'Monopole',                   code: 'MONOPOLE'   },
        { name: 'Monopole Array',             code: 'MONOPLARRY' },
        { name: 'Panel',                      code: 'PANEL'      },
        { name: 'Parabolic',                  code: 'PARABOLIC'  },
        { name: 'Parabolic Cylinder',         code: 'PARABLCCYL' },
        { name: 'Patch',                      code: 'PATCH'      },
        { name: 'Patch Array',                code: 'PATCHARRAY' },
        { name: 'Phased Array',               code: 'PHASEDARRY' },
        { name: 'Phased Array Waveguide',     code: 'PHSDARYWVG' },
        { name: 'Pillbox',                    code: 'PILLBOX'    },
        { name: 'Planar',                     code: 'PLANAR'     },
        { name: 'Planar Array',               code: 'PLANARARRY' },
        { name: 'Radiax Cable',               code: 'RADIAX'     },
        { name: 'Reflector',                  code: 'REFLECTOR'  },
        { name: 'Rhombic',                    code: 'RHOMBIC'    },
        { name: 'Skeleton Slot',              code: 'SKELTNSLOT' },
        { name: 'Slot',                       code: 'SLOT'       },
        { name: 'Slot Array',                 code: 'SLOTARRAY'  },
        { name: 'Slotted Waveguide',          code: 'SLOTTDWVGD' },
        { name: 'Slotted Waveguide Planar Array', code: 'SLTWGPLNRA' },
        { name: 'Spherical Reflector',        code: 'SPHRCLFLCT' },
        { name: 'Spiral',                     code: 'SPIRAL'     },
        { name: 'Stacked Array',              code: 'STACKDARRY' },
        { name: 'Stacked Cross Dipole',       code: 'STKCRSDPL'  },
        { name: 'Stacked Dipole',             code: 'STCKDIPOLE' },
        { name: 'Stacked Yagi',               code: 'STACKDYAGI' },
        { name: 'Strip Line',                 code: 'STRIPLINE'  },
        { name: 'Stub',                       code: 'STUB'       },
        { name: 'Swastika',                   code: 'SWASTIKA'   },
        { name: 'Symmetrical Tee',            code: 'SYMMETRCTE' },
        { name: 'Tophat',                     code: 'TOPHAT'     },
        { name: 'Tower',                      code: 'TOWER'      },
        { name: 'Turnstile',                  code: 'TURNSTILE'  },
        { name: 'V Ring',                     code: 'VRING'      },
        { name: 'Waveguide',                  code: 'WAVEGUIDE'  },
        { name: 'Waveguide Array',            code: 'WAVEGDARRY' },
        { name: 'Whip',                       code: 'WHIP'       },
        { name: 'Yagi',                       code: 'YAGI'       },
        { name: 'Yagi Array',                 code: 'YAGIARRAY'  },
    ];

    function initAntennaCombobox(textId, hiddenId, listId) {
        const textEl   = document.getElementById(textId);
        const hiddenEl = document.getElementById(hiddenId);
        const listEl   = document.getElementById(listId);
        if (!textEl || !hiddenEl || !listEl) return;

        function render(filter) {
            const q = (filter || '').toLowerCase().trim();
            const matches = q
                ? ANTENNA_TYPES.filter(a => a.name.toLowerCase().includes(q))
                : ANTENNA_TYPES;

            if (matches.length === 0) {
                listEl.innerHTML = '<div class="ant-combo-empty">No matches</div>';
            } else {
                listEl.innerHTML = matches.map(a =>
                    `<div class="ant-combo-item" data-code="${a.code}" data-name="${a.name}">${a.name}</div>`
                ).join('');
                listEl.querySelectorAll('.ant-combo-item').forEach(item => {
                    item.addEventListener('mousedown', e => {
                        e.preventDefault();
                        textEl.value   = item.dataset.name;
                        hiddenEl.value = item.dataset.code;
                        listEl.style.display = 'none';
                    });
                });
            }
            listEl.style.display = 'block';
        }

        textEl.addEventListener('input',  () => render(textEl.value));
        textEl.addEventListener('focus',  () => render(textEl.value));
        textEl.addEventListener('blur',   () => { setTimeout(() => { listEl.style.display = 'none'; }, 150); });

        // If a draft restored a code, show the name
        const observer = new MutationObserver(() => {
            if (hiddenEl.value && !textEl.value) {
                const entry = ANTENNA_TYPES.find(a => a.code === hiddenEl.value);
                if (entry) textEl.value = entry.name;
            }
        });
        observer.observe(hiddenEl, { attributes: true, attributeFilter: ['value'] });
    }

    // ── Init ─────────────────────────────────────────────────────────────────
    let allInstallations = [];
    let guidedMaxStep = 1;
    let manualMaxStep = 1;

    document.addEventListener('DOMContentLoaded', async function () {
        buildProgress('guidedProgress',  GUIDED_LABELS, GUIDED_TOTAL);
        buildProgress('manualProgress',  MANUAL_LABELS, MANUAL_TOTAL);
        setMode('guided');
        initAntennaCombobox('g_antennaTypeText', 'g_antennaType', 'g_antennaTypeList');
        initAntennaCombobox('m_antennaTypeText', 'm_antennaType', 'm_antennaTypeList');

        // Debounced live preview on any input/change/select inside the form columns
        const formCol = document.querySelector('.req-form-col');
        if (formCol) {
            formCol.addEventListener('input',  schedulePreview);
            formCol.addEventListener('change', schedulePreview);
        }

        const isResuming = !!new URLSearchParams(window.location.search).get('resume');

        // Await all async loaders so dropdowns are fully populated before defaults
        // or draft restoration runs — otherwise setVal() on <select> elements silently fails.
        await Promise.all([
            loadUnits(),
            loadInstallations(),
            loadEquipmentLibrary(),
            loadEquipmentLibraryManual(),
        ]);

        // Set defaults only when NOT resuming a draft; the draft restoration will
        // supply its own values and setTime130 toggles, so applying defaults first
        // would cause the draft's matching value to toggle back off.
        if (!isResuming) {
            const todayISO = new Date().toISOString().slice(0, 10);
            const startDateEl = document.getElementById('g_startDate');
            if (startDateEl && !startDateEl.value) startDateEl.value = todayISO;
            setTime130('usage', '3');
            setEncrypted(true);
        }

        tryLoadDraft();
    });

    // Format a "YYYY-MM-DD" date string to RFC3339 for Go's time.Time JSON binding
    function toRFC3339Date(dateStr) {
        if (!dateStr) return null;
        return dateStr.length === 10 ? dateStr + 'T00:00:00Z' : dateStr;
    }

    async function loadInstallations() {
        try {
            const [instRes, wbRes] = await Promise.all([
                fetch('/api/auth/public-installations'),
                fetch('/api/frequency/reviewers'),
            ]);
            const instData = await instRes.json();
            allInstallations = instData.installations || [];
            const workboxes = wbRes.ok ? (await wbRes.json()).workboxes || [] : [];

            const wbOpts = workboxes.map(w =>
                `<option value="${w}">${w}</option>`
            ).join('');
            const installOpts = allInstallations.map(i =>
                `<option value="${i.id}">${i.name}${i.code ? ' (' + i.code + ')' : ''}</option>`
            ).join('');
            const opts = '<option value="">— Select ISM Office —</option>' +
                (wbOpts      ? `<optgroup label="Workboxes / ISM Offices">${wbOpts}</optgroup>` : '') +
                (installOpts ? `<optgroup label="Installations">${installOpts}</optgroup>` : '');

            const el = document.getElementById('g_ismOffice');
            if (el) el.innerHTML = opts;

            // Await so prefill is fully settled before Promise.all resolves and
            // draft restoration runs (otherwise profile values could race with the draft).
            await prefillFromProfile();
        } catch (err) {
            console.error('Failed to load installations:', err);
            const el = document.getElementById('g_ismOffice');
            if (el) el.innerHTML = '<option value="">— Unable to load —</option>';
            await prefillFromProfile();
        }
    }

    async function prefillFromProfile() {
        try {
            const res = await fetch('/api/user/profile');
            if (!res.ok) return;
            const data = await res.json();
            const user = data.user || data;

            const pocNameEl  = document.getElementById('g_requestingPoc');
            const pocPhoneEl = document.getElementById('g_pocPhone');
            const ismEl      = document.getElementById('g_ismOffice');

            if (pocNameEl  && !pocNameEl.value)  pocNameEl.value  = user.full_name || user.username || '';
            if (pocPhoneEl && !pocPhoneEl.value)  pocPhoneEl.value = user.phone || '';

            if (!ismEl || ismEl.value) return;

            // Find best matching installation in priority order:
            // 1. default_ism_office matched by UUID (set via admin/profile dropdown)
            // 2. default_ism_office matched by installation code (handles legacy text values)
            // 3. installation_id (user's home installation UUID)
            const findInstall = (val) => {
                if (!val) return null;
                return allInstallations.find(i => i.id === val) ||
                       allInstallations.find(i => i.code && i.code.toLowerCase() === val.toLowerCase());
            };

            const install = findInstall(user.default_ism_office) ||
                            allInstallations.find(i => i.id === user.installation_id);

            if (install) ismEl.value = install.id;
        } catch { /* silently ignore — user just fills it manually */ }
    }

    // ── Mode switching ────────────────────────────────────────────────────────
    window.setMode = function (m) {
        currentMode = m;
        document.getElementById('guidedMode').style.display = m === 'guided' ? '' : 'none';
        document.getElementById('manualMode').style.display  = m === 'manual' ? '' : 'none';
        document.getElementById('modeGuidedCard').classList.toggle('active', m === 'guided');
        document.getElementById('modeManualCard').classList.toggle('active',  m === 'manual');
        if (m === 'guided') showGuidedStep(guidedStep);
        else                showManualStep(manualStep);
    };

    // ── Progress builder ──────────────────────────────────────────────────────
    function buildProgress(containerId, labels, total) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = labels.slice(0, total).map((lbl, i) => `
            <div class="wp-step" id="${containerId}_step${i + 1}">
                <div class="wp-bubble" onclick="jumpToStep('${containerId}', ${i + 1})">${i + 1}</div>
                <div class="wp-label">${lbl}</div>
            </div>`).join('');
    }

    function updateProgress(containerId, current, total) {
        const maxStep = containerId === 'guidedProgress' ? guidedMaxStep : manualMaxStep;
        for (let i = 1; i <= total; i++) {
            const s = document.getElementById(`${containerId}_step${i}`);
            if (!s) continue;
            s.classList.remove('active', 'done');
            if (i < current)        s.classList.add('done');
            else if (i === current) s.classList.add('active');
            // Clickable for any step up to the furthest step ever reached
            s.querySelector('.wp-bubble').classList.toggle('clickable', i <= maxStep);
        }
    }

    window.jumpToStep = function (containerId, step) {
        const maxStep = containerId === 'guidedProgress' ? guidedMaxStep : manualMaxStep;
        if (step > maxStep) return;
        if (containerId === 'guidedProgress') showGuidedStep(step);
        else showManualStep(step);
    };

    // ── Operating area map (lazy-init on step 5) ──────────────────────────────
    let _areaMap    = null;
    let _areaMarker = null; // draggable center marker
    let _areaCircle = null; // radius circle
    let _areaTile   = null;

    const _AREA_TILE_LAYERS = {
        dark:    { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',                                        opts: { maxZoom: 19 } },
        streets: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',      opts: { maxZoom: 19 } },
        sat:     { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',         opts: { maxZoom: 19 } },
        topo:    { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                     opts: { maxZoom: 17 } },
    };

    window.setAreaMapLayer = function (key, btn) {
        if (!_areaMap || !_AREA_TILE_LAYERS[key]) return;
        if (_areaTile) { _areaMap.removeLayer(_areaTile); _areaTile = null; }
        const def = _AREA_TILE_LAYERS[key];
        _areaTile = L.tileLayer(def.url, def.opts).addTo(_areaMap);
        document.querySelectorAll('[data-area-layer]').forEach(b => b.classList.toggle('active', b === btn));
        localStorage.setItem('areaMapLayer', key);
    };

    // Parse a single DMS component: accepts "35°40'58\"N", "35 40 58 N", "35.6829", "-78.4677"
    function parseDMSComponent(str) {
        str = str.trim();
        // Determine hemisphere sign from trailing/leading letter
        let sign = 1;
        const hemi = str.match(/[NSEWnsew]/);
        if (hemi) {
            if (/[Ss]/.test(hemi[0]) || /[Ww]/.test(hemi[0])) sign = -1;
            str = str.replace(/[NSEWnsew]/g, '').trim();
        }
        // Extract numbers (handles °, ', ", spaces as separators)
        const parts = str.split(/[°'":\s]+/).filter(Boolean).map(Number);
        if (parts.some(isNaN)) return null;
        const deg = parts[0] || 0;
        const min = parts[1] || 0;
        const sec = parts[2] || 0;
        return sign * (Math.abs(deg) + min / 60 + sec / 3600);
    }

    // Parse coordinate string → { lat, lng } or null
    function parseCoordInput(raw) {
        raw = raw.trim().replace(/\s+/g, ' ');

        // 1. Pure decimal: "35.6829, -78.4677" or "35.6829 -78.4677"
        const decMatch = raw.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
        if (decMatch) {
            const lat = parseFloat(decMatch[1]);
            const lng = parseFloat(decMatch[2]);
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
        }

        // 2. DMS with hemisphere letters — split on comma or on the hemisphere boundary
        // Handles: "35°40'58\"N, 78°28'3\"W"  or  "35 40 58 N 78 28 3 W"
        // Split strategy: find where lat ends (N or S letter) and lon begins
        const hemiSplit = raw.match(/^([^,]+[NSns])[,\s]+([^,]+[EWew])$/);
        if (hemiSplit) {
            const lat = parseDMSComponent(hemiSplit[1]);
            const lng = parseDMSComponent(hemiSplit[2]);
            if (lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)
                return { lat, lng };
        }

        // 3. DMS with leading hemisphere: "N35°40'58\" W78°28'3\""
        const leadHemi = raw.match(/^([NSns][^,\s]+[^NSnsEWew])[,\s]+([EWew][^,\s]+)$/);
        if (leadHemi) {
            const lat = parseDMSComponent(leadHemi[1]);
            const lng = parseDMSComponent(leadHemi[2]);
            if (lat !== null && lng !== null) return { lat, lng };
        }

        // 4. Space-separated DMS without explicit split: "35 40 58 N 78 28 3 W"
        const spaceDMS = raw.match(/^(\d+)\s+(\d+)\s+([\d.]+)\s*([NSns])[,\s]+(\d+)\s+(\d+)\s+([\d.]+)\s*([EWew])$/);
        if (spaceDMS) {
            const latSign = /[Ss]/.test(spaceDMS[4]) ? -1 : 1;
            const lngSign = /[Ww]/.test(spaceDMS[8]) ? -1 : 1;
            const lat = latSign * (parseFloat(spaceDMS[1]) + parseFloat(spaceDMS[2]) / 60 + parseFloat(spaceDMS[3]) / 3600);
            const lng = lngSign * (parseFloat(spaceDMS[5]) + parseFloat(spaceDMS[6]) / 60 + parseFloat(spaceDMS[7]) / 3600);
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
        }

        return null;
    }

    window.applyCoordInput = function () {
        const el = document.getElementById('g_coordInput');
        if (!el) return;
        const coords = parseCoordInput(el.value);
        if (!coords) {
            el.classList.add('coord-error');
            el.title = 'Unrecognized format — try "35.6829, -78.4677" or "35°40′58″N 78°28′3″W"';
            return;
        }
        el.classList.remove('coord-error');
        el.title = '';
        if (!_areaMap) return;
        placeAreaMarker(L.latLng(coords.lat, coords.lng));
        _areaMap.setView([coords.lat, coords.lng], 10);
    };

    // Allow pressing Enter in the coord input to trigger Go
    // Also wire frequency inputs to update HF row visibility live
    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('g_coordInput')?.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); applyCoordInput(); }
        });
        document.getElementById('g_specificFreq')?.addEventListener('input', updateHFRowVisibility);
        document.getElementById('g_freqMin')?.addEventListener('input', updateHFRowVisibility);
    });

    const RADIUS_TO_M = { km: 1000, mi: 1609.344, nm: 1852, m: 1 };

    function getRadiusMeters() {
        const val  = parseFloat(document.getElementById('g_radiusValue')?.value) || 0;
        const unit = document.getElementById('g_radiusUnit')?.value || 'km';
        return val * (RADIUS_TO_M[unit] || 1000);
    }

    function serializeAreaGeoJSON() {
        if (!_areaMarker) { document.getElementById('g_operatingAreaGeoJSON').value = ''; return; }
        const latlng   = _areaMarker.getLatLng();
        const radius_m = Math.round(getRadiusMeters());
        const geojson  = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [latlng.lng, latlng.lat] },
            properties: { shape: 'circle', radius_m }
        };
        document.getElementById('g_operatingAreaGeoJSON').value = JSON.stringify(geojson);
    }

    function updateAreaCircle() {
        if (!_areaMap || !_areaMarker) return;
        const latlng  = _areaMarker.getLatLng();
        const radiusM = getRadiusMeters();
        if (_areaCircle) {
            _areaCircle.setLatLng(latlng);
            if (radiusM > 0) _areaCircle.setRadius(radiusM);
        } else if (radiusM > 0) {
            _areaCircle = L.circle(latlng, { radius: radiusM, color: '#4fc3f7', fillColor: '#4fc3f7', fillOpacity: 0.12, weight: 2 }).addTo(_areaMap);
        }
        serializeAreaGeoJSON();
        updateMapStatus();
    }

    function updateMapStatus() {
        const el = document.getElementById('g_mapStatus');
        if (!el) return;
        if (!_areaMarker) {
            el.className = 'map-status';
            el.innerHTML = '<i class="fas fa-map-marker-alt"></i> <span>Click the map to set the center of operations</span>';
            return;
        }
        const ll = _areaMarker.getLatLng();
        const radiusM = getRadiusMeters();
        const radiusStr = radiusM >= 1852
            ? (radiusM / 1000).toFixed(1) + ' km'
            : radiusM > 0 ? Math.round(radiusM) + ' m' : 'no radius';
        el.className = 'map-status has-shape';
        el.innerHTML = `<i class="fas fa-check-circle"></i> Center: ${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)} — radius ${radiusStr}`;
    }

    function placeAreaMarker(latlng) {
        if (_areaMarker) {
            _areaMarker.setLatLng(latlng);
        } else {
            _areaMarker = L.marker(latlng, { draggable: true }).addTo(_areaMap);
            _areaMarker.on('drag dragend', updateAreaCircle);
        }
        updateAreaCircle();
    }

    function getMapDefaultView() {
        try {
            const s = JSON.parse(localStorage.getItem('sfaf_plotter_settings') || '{}');
            const c = s.map?.defaultCenter;
            const z = s.map?.defaultZoom;
            if (c?.lat != null && c?.lng != null) return { center: [c.lat, c.lng], zoom: z || 10 };
        } catch (_) {}
        return { center: [37.5, -96], zoom: 4 };
    }

    function initAreaMap() {
        if (_areaMap) { _areaMap.invalidateSize(); return; }

        const { center, zoom } = getMapDefaultView();
        _areaMap = L.map('g_operatingAreaMap', { center, zoom, attributionControl: false });

        const savedLayer = localStorage.getItem('areaMapLayer') || 'dark';
        const layerKey   = _AREA_TILE_LAYERS[savedLayer] ? savedLayer : 'dark';
        const def = _AREA_TILE_LAYERS[layerKey];
        _areaTile = L.tileLayer(def.url, def.opts).addTo(_areaMap);
        document.querySelectorAll('[data-area-layer]').forEach(b => {
            b.classList.toggle('active', b.dataset.areaLayer === layerKey);
        });

        _areaMap.on('click', function (e) { placeAreaMarker(e.latlng); });

        // Wire up radius inputs
        const radiusVal  = document.getElementById('g_radiusValue');
        const radiusUnit = document.getElementById('g_radiusUnit');
        if (radiusVal)  radiusVal.addEventListener('input', updateAreaCircle);
        if (radiusUnit) radiusUnit.addEventListener('change', updateAreaCircle);

        // Restore from draft if already stored
        const existing = val('g_operatingAreaGeoJSON');
        if (existing) { try { restoreAreaMapLayer(JSON.parse(existing)); } catch (_) {} }
    }

    window.clearAreaMap = function () {
        if (_areaMarker) { _areaMap.removeLayer(_areaMarker); _areaMarker = null; }
        if (_areaCircle) { _areaMap.removeLayer(_areaCircle); _areaCircle = null; }
        document.getElementById('g_operatingAreaGeoJSON').value = '';
        const radiusVal = document.getElementById('g_radiusValue');
        if (radiusVal) radiusVal.value = '';
        updateMapStatus();
    };

    function restoreAreaMapLayer(geojson) {
        if (!_areaMap || !geojson) return;
        try {
            const props = geojson?.properties || {};
            if (geojson.geometry?.type === 'Point') {
                const [lng, lat] = geojson.geometry.coordinates;
                const radiusM = props.radius_m || 0;
                // Pre-fill radius input (convert to km for display)
                const radiusVal  = document.getElementById('g_radiusValue');
                const radiusUnit = document.getElementById('g_radiusUnit');
                if (radiusVal && radiusUnit && radiusM > 0) {
                    radiusUnit.value = 'km';
                    radiusVal.value  = (radiusM / 1000).toFixed(2);
                }
                placeAreaMarker(L.latLng(lat, lng));
                if (radiusM > 0) _areaMap.setView([lat, lng], 10);
            }
        } catch (_) { /* malformed stored geojson — ignore */ }
    }

    // ── HF visibility helpers ──────────────────────────────────────────────────
    function isHFRequest() {
        const mode = gd.freqMode || 'specific';
        if (mode === 'specific') {
            const f = parseFloat(val('g_specificFreq'));
            return !isNaN(f) && f < 30;
        }
        // band mode: check min freq
        const minF = parseFloat(val('g_freqMin'));
        return !isNaN(minF) && minF < 30;
    }

    function updateHFRowVisibility() {
        const hfRow = document.getElementById('g_time130H');
        if (!hfRow) return;
        const isHF = isHFRequest();
        hfRow.style.display = isHF ? '' : 'none';
        if (!isHF && gd.time130H) {
            gd.time130H = null;
            hfRow.querySelectorAll('.f130-btn').forEach(b => b.classList.remove('selected'));
            // Recompute hidden input
            const combined = (gd.time130Usage || '');
            document.getElementById('g_time130').value = combined;
            const disp = document.getElementById('g_time130Display');
            if (disp) disp.textContent = combined ? 'Field 130: ' + combined : '';
        }
    }

    // ── Guided wizard ─────────────────────────────────────────────────────────
    function showGuidedStep(step) {
        guidedStep = step;
        if (step > guidedMaxStep) guidedMaxStep = step;
        document.querySelectorAll('.guided-step').forEach(s => s.classList.remove('active'));
        const target = document.querySelector(`.guided-step[data-gstep="${step}"]`);
        if (target) target.classList.add('active');

        document.getElementById('g_prevBtn').style.display  = step === 1 ? 'none' : '';
        document.getElementById('g_nextBtn').style.display  = step === GUIDED_TOTAL ? 'none' : '';
        document.getElementById('g_submitBtn').style.display = step === GUIDED_TOTAL ? '' : 'none';

        updateProgress('guidedProgress', step, GUIDED_TOTAL);

        if (step === 5) { initAreaMap(); updateHFRowVisibility(); }
        if (step === GUIDED_TOTAL) generateReview('guidedReview', buildGuidedPayload());
        document.querySelector('.req-layout')?.classList.toggle('review-active', step === GUIDED_TOTAL);
        updatePreview();
    }

    window.guidedNext = function () {
        if (!validateGuidedStep(guidedStep)) return;
        if (guidedStep < GUIDED_TOTAL) showGuidedStep(guidedStep + 1);
        saveDraft(true);
    };
    window.guidedPrev = function () {
        if (guidedStep > 1) showGuidedStep(guidedStep - 1);
        saveDraft(true);
    };

    function validateGuidedStep(step) {
        let ok = true;
        const fail = msg => { showToast(msg, 'warning'); ok = false; };

        if (step === 1) {
            if (!gd.duration) return fail('Please select Permanent or Temporary.');
            if (gd.duration === 'temporary' && !gd.requestType) return fail('Please select Training/Exercise or Real World.');
            const cls = val('g_classification');
            if (cls && cls !== 'UNCLASS' && cls !== 'FOUO') return fail('Classified requests must be submitted on SIPR.');
        }
        if (step === 2) {
            if (!val('g_unitId'))   return fail('Please select an operating unit (Field 207).');
            if (!val('g_ismOffice')) return fail('Please select an ISM office (Field 206).');
        }
        if (step === 3) {
            const mode = gd.freqMode || 'specific';
            if (mode === 'specific' && !val('g_specificFreq').trim()) {
                return fail('Please enter a specific frequency, or switch to "I need one assigned from a band".');
            }
            if (mode === 'band' && !gd.selectedBand && !val('g_freqMin') && !val('g_freqMax')) {
                return fail('Please select a frequency band or enter a custom range.');
            }
        }
        if (step === 5) {
            if (!val('g_startDate')) return fail('Please enter a start date.');
            if (gd.duration !== 'permanent' && !val('g_endDate')) return fail('Please enter an end date.');

            const today = new Date(); today.setHours(0, 0, 0, 0);
            const start = new Date(val('g_startDate'));

            if (isNaN(start.getTime())) return fail('Start date is not a valid date.');
            if (start < today)          return fail('Start date cannot be in the past.');

            if (val('g_endDate')) {
                const end = new Date(val('g_endDate'));
                if (isNaN(end.getTime())) return fail('End date is not a valid date.');
                if (end < start)          return fail('End date must be on or after the start date.');
            }
        }
        if (step === 6) {
            if (!val('g_purpose').trim())       return fail('Please enter a purpose for this request.');
            if (!val('g_justification').trim()) return fail('Please provide a justification for this request.');
        }
        return ok;
    }

    // ── Manual wizard ─────────────────────────────────────────────────────────
    function showManualStep(step) {
        manualStep = step;
        if (step > manualMaxStep) manualMaxStep = step;
        document.querySelectorAll('.manual-step').forEach(s => s.classList.remove('active'));
        const target = document.querySelector(`.manual-step[data-mstep="${step}"]`);
        if (target) target.classList.add('active');

        document.getElementById('m_prevBtn').style.display  = step === 1 ? 'none' : '';
        document.getElementById('m_nextBtn').style.display  = step === MANUAL_TOTAL ? 'none' : '';
        document.getElementById('m_submitBtn').style.display = step === MANUAL_TOTAL ? '' : 'none';

        updateProgress('manualProgress', step, MANUAL_TOTAL);

        if (step === MANUAL_TOTAL) generateReview('manualReview', buildManualPayload());
        document.querySelector('.req-layout')?.classList.toggle('review-active', step === MANUAL_TOTAL);
        updatePreview();
    }

    window.manualNext = function () {
        if (!validateManualStep(manualStep)) return;
        if (manualStep < MANUAL_TOTAL) showManualStep(manualStep + 1);
        saveDraft(true);
    };
    window.manualPrev = function () {
        if (manualStep > 1) showManualStep(manualStep - 1);
        saveDraft(true);
    };

    function validateManualStep(step) {
        const required = document.querySelectorAll(`.manual-step[data-mstep="${step}"] [required]`);
        let ok = true;
        const fail = msg => { showToast(msg, 'warning'); ok = false; };

        required.forEach(el => {
            el.classList.remove('invalid');
            if (!el.value.trim()) { el.classList.add('invalid'); ok = false; }
        });
        if (!ok) { showToast('Please fill in all required fields.', 'warning'); return false; }

        if (step === 1) {
            const cls = val('m_classification');
            if (cls && cls !== 'UNCLASS' && cls !== 'FOUO') return fail('Classified requests must be submitted on SIPR.');
        }

        if (step === 5) {
            const startVal = val('m_startDate');
            const endVal   = val('m_endDate');

            if (!startVal) return fail('Please enter a start date.');

            const today = new Date(); today.setHours(0, 0, 0, 0);
            const start = new Date(startVal);
            if (isNaN(start.getTime())) return fail('Start date is not a valid date.');
            if (start < today)          return fail('Start date cannot be in the past.');

            if (endVal) {
                const end = new Date(endVal);
                if (isNaN(end.getTime())) return fail('End date is not a valid date.');
                if (end < start)          return fail('End date must be on or after the start date.');
            }
        }

        return ok;
    }

    // ── Guided: card-option selector (generic) ────────────────────────────────
    window.selectCardOption = function (groupId, value, hiddenId) {
        document.querySelectorAll(`#${groupId} .card-option`).forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.val === value);
        });
        if (hiddenId) {
            const el = document.getElementById(hiddenId);
            if (el) el.value = value;
        }
    };

    // ── Step 1: two-question duration / nature cascade ────────────────────────
    window.calcHAMSL = function (elevId, feedpointId, hamslId) {
        const elev      = parseFloat(document.getElementById(elevId)?.value) || 0;
        const feedpoint = parseFloat(document.getElementById(feedpointId)?.value) || 0;
        const hamslEl   = document.getElementById(hamslId);
        if (!hamslEl) return;
        hamslEl.value = (elev || feedpoint) ? (elev + feedpoint).toFixed(1) : '';
    };

    window.onClassificationChange = function (selectId, bannerId, nextBtnId) {
        const val    = document.getElementById(selectId)?.value;
        const banner = document.getElementById(bannerId);
        const btn    = document.getElementById(nextBtnId);
        const classified = val && val !== 'UNCLASS' && val !== 'FOUO';
        if (banner) banner.style.display = classified ? '' : 'none';
        if (btn)    btn.disabled = classified;
    };

    window.selectDuration = function (val) {
        document.querySelectorAll('#g_durationOptions .card-option').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.val === val);
        });
        gd.duration = val;

        const natureGroup = document.getElementById('g_natureGroup');
        if (val === 'permanent') {
            natureGroup.style.display = 'none';
            gd.requestType = 'permanent';
            document.getElementById('g_requestType').value = 'permanent';
            document.querySelectorAll('#g_natureOptions .card-option').forEach(b => b.classList.remove('selected'));
            gd.nature = null;
        } else {
            natureGroup.style.display = '';
            // Keep requestType null until nature is chosen
            gd.requestType = gd.nature || null;
            document.getElementById('g_requestType').value = gd.nature || '';
            if (gd.nature) {
                document.querySelectorAll('#g_natureOptions .card-option').forEach(b => {
                    b.classList.toggle('selected', b.dataset.val === gd.nature);
                });
            }
        }

        // Show/hide the required marker on end date based on duration
        const endDateReq = document.getElementById('g_endDateRequired');
        if (endDateReq) endDateReq.style.display = val === 'permanent' ? 'none' : '';
        updatePreview();
    };

    window.selectNature = function (val) {
        document.querySelectorAll('#g_natureOptions .card-option').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.val === val);
        });
        gd.nature = val;
        gd.requestType = val;
        document.getElementById('g_requestType').value = val;
        updatePreview();
    };

    // ── Guided: equipment grid ────────────────────────────────────────────────

    // ── Guided: frequency mode toggle ─────────────────────────────────────────
    window.setFreqMode = function (mode) {
        gd.freqMode = mode;
        gd.selectedBand = null;
        document.getElementById('ftb_specific').classList.toggle('active', mode === 'specific');
        document.getElementById('ftb_band').classList.toggle('active',     mode === 'band');
        document.getElementById('freqSpecificSection').classList.toggle('visible', mode === 'specific');
        document.getElementById('freqBandSection').classList.toggle('visible',     mode === 'band');
        if (mode === 'specific') {
            if (libEquipment) populateGuidedTxDropdown();
        }
    };

    // ── Guided: band selector ─────────────────────────────────────────────────
    const MANET_SUB_BANDS = new Set(['manet_uhf', 'manet_low_l', 'manet_high_l', 'manet_s', 'manet_c']);

    // Returns the currently selected band range {min, max}, or null if none.
    function getBandRange() {
        if (gd.freqMode !== 'band') return null;
        const key = gd.selectedBand;
        if (!key) return null;
        const band = BANDS[key];
        return (band && band.min !== null) ? band : null;
    }

    // True if at least one of the mode's freq_ranges overlaps band (or no data to filter on).
    function modeOverlapsBand(mode, band) {
        if (!band) return true;
        const ranges = mode.freq_ranges || [];
        if (!ranges.length) return true;
        return ranges.some(r => r.min <= band.max && r.max >= band.min);
    }

    // True if at least one mode of the transmitter overlaps band.
    function txOverlapsBand(tx, band) {
        if (!band) return true;
        return (tx.modes || []).some(m => modeOverlapsBand(m, band));
    }

    window.selectBand = function (key) {
        gd.selectedBand = key;

        const isSubBand = MANET_SUB_BANDS.has(key);
        const subBandContainer = document.getElementById('g_manetSubBands');

        // Highlight top-level band buttons — MANET stays active when a sub-band is chosen
        document.querySelectorAll('#g_bandOptions .card-option').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.band === key || (isSubBand && btn.dataset.band === 'manet'));
        });

        // Highlight sub-band buttons
        document.querySelectorAll('#g_bandOptions2 .card-option').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.band === key);
        });

        // Show sub-band row only when MANET (or a sub-band) is active
        if (subBandContainer) {
            subBandContainer.style.display = (key === 'manet' || isSubBand) ? '' : 'none';
        }

        // Pre-fill frequency range — skip bare MANET, wait for sub-band selection
        const band = BANDS[key];
        if (band && key !== 'manet') {
            setVal('g_freqMin', band.min);
            setVal('g_freqMax', band.max);
        } else if (key === 'manet') {
            setVal('g_freqMin', '');
            setVal('g_freqMax', '');
        }

        if (libEquipment) populateGuidedTxDropdown();
        updatePreview();
    };

    // ── Guided: tech detail toggles ───────────────────────────────────────────
    window.setKnowsBW = function (knows) {
        gd.knowsBW = knows; // kept for draft compatibility; bandwidth UI merged into emission designator
    };

    window.setEncrypted = function (enc) {
        gd.isEncrypted = enc;
        document.getElementById('enc_no').classList.toggle('active',  !enc);
        document.getElementById('enc_yes').classList.toggle('active',  enc);
    };

    window.setKnowsAntenna = function (knows) {
        gd.knowsAntenna = knows;
        document.getElementById('ant_no').classList.toggle('active',  !knows);
        document.getElementById('ant_yes').classList.toggle('active',  knows);
        document.getElementById('g_antennaFields').style.display = knows ? 'block' : 'none';
    };

    // ── Station mobility (Fixed / Mobile) for Tx and Rx ──────────────────────
    window.setStationMobility = function (prefix, side, mode) {
        const isFixed = mode === 'fixed';
        const mobileBtn = document.getElementById(prefix + '_' + side + 'MobileBtn');
        const fixedBtn  = document.getElementById(prefix + '_' + side + 'FixedBtn');
        const fixedBox  = document.getElementById(prefix + '_' + side + 'FixedFields');
        if (mobileBtn) mobileBtn.classList.toggle('active', !isFixed);
        if (fixedBtn)  fixedBtn.classList.toggle('active',  isFixed);
        if (fixedBox)  fixedBox.style.display = isFixed ? 'block' : 'none';
    };

    // ── Toggle Rx section visibility ─────────────────────────────────────────
    window.toggleRxSection = function (prefix) {
        const cb  = document.getElementById(prefix + '_rxSameAsTx');
        const sec = document.getElementById(prefix + '_rxSection');
        if (!cb || !sec) return;
        sec.style.display = cb.checked ? 'none' : 'block';
    };

    // ── Guided: Field 130 time selector ──────────────────────────────────────
    window.setTime130 = function (part, val) {
        if (part === 'usage') {
            // Toggle off if already selected
            gd.time130Usage = (gd.time130Usage === val) ? null : val;
        } else {
            gd.time130H = (gd.time130H === val) ? null : val;
        }
        // Update button states
        document.querySelectorAll('#g_time130Usage .f130-btn').forEach(b => {
            b.classList.toggle('selected', b.dataset.val === gd.time130Usage);
        });
        document.querySelectorAll('#g_time130H .f130-btn').forEach(b => {
            b.classList.toggle('selected', b.dataset.val === gd.time130H);
        });
        // Build combined code and update hidden input + display
        const combined = (gd.time130Usage || '') + (gd.time130H || '');
        const hiddenEl = document.getElementById('g_time130');
        if (hiddenEl) hiddenEl.value = combined;
        const displayEl = document.getElementById('g_time130Display');
        if (displayEl) {
            displayEl.textContent = combined
                ? `Field 130 value: ${combined}`
                : '';
        }
    };

    // Expose a sync helper so inline review handlers (which run outside the closure) can
    // trigger the live preview update without needing access to schedulePreview directly.
    window._rpSync = function () { schedulePreview(); };

    // ── Review generator ──────────────────────────────────────────────────────
    function generateReview(containerId, payload) {
        const el = document.getElementById(containerId);
        if (!el) return;

        const isGuided = containerId === 'guidedReview';

        // Static read-only row
        const row = (lbl, v) => !v && v !== 0 ? '' : `
            <div class="review-row">
                <div class="review-lbl">${lbl}</div>
                <div class="review-val">${v}</div>
            </div>`;

        // Editable row wrapper
        const erow = (lbl, ctrl) => `
            <div class="review-row">
                <div class="review-lbl">${lbl}</div>
                <div class="review-val">${ctrl}</div>
            </div>`;

        // Inline text input — syncs to underlying form field on input
        const inp = (id, ph) =>
            `<input type="text" class="review-input" value="${esc(val(id))}"
                oninput="document.getElementById('${id}').value=this.value;_rpSync()"
                placeholder="${ph || ''}">`;

        // Inline textarea — syncs to underlying form field
        const area = (id, ph) =>
            `<textarea class="review-input review-textarea"
                oninput="document.getElementById('${id}').value=this.value;_rpSync()"
                placeholder="${ph || ''}">${esc(val(id))}</textarea>`;

        // Inline select with explicit option list — syncs to underlying form field
        const sel = (id, opts) => {
            const cur = val(id);
            const optsHtml = opts.map(([v, l]) =>
                `<option value="${v}"${cur === v ? ' selected' : ''}>${l}</option>`
            ).join('');
            return `<select class="review-select"
                onchange="document.getElementById('${id}').value=this.value;_rpSync()">
                ${optsHtml}</select>`;
        };

        // Inline select that mirrors an existing DOM <select> element's options
        const mirrorSel = (id) => {
            const srcEl = document.getElementById(id);
            if (!srcEl) return esc(val(id)) || '—';
            const optsHtml = Array.from(srcEl.options).map(o =>
                `<option value="${esc(o.value)}"${o.selected ? ' selected' : ''}>${esc(o.text)}</option>`
            ).join('');
            return `<select class="review-select"
                onchange="document.getElementById('${id}').value=this.value;_rpSync()">
                ${optsHtml}</select>`;
        };

        const PRIORITIES = [['routine','Routine'],['urgent','Urgent'],['immediate','Immediate']];
        const CLASSIFICATIONS = [['UNCLASS','Unclassified (UNCLASS)'],['CUI','CUI'],['SECRET','Secret'],['TS','Top Secret']];

        const freqDisplay = payload.requested_frequency
            ? `${payload.requested_frequency} MHz`
            : (payload.frequency_range_min && payload.frequency_range_max)
                ? `${payload.frequency_range_min} – ${payload.frequency_range_max} MHz`
                : null;

        // TX/RX station type label helper
        const stationType = (isFixed) => isFixed === true ? 'Fixed' : isFixed === false ? 'Mobile' : null;

        if (isGuided) {
            const txSection = `
                <div class="review-subsection">
                    <h4><i class="fas fa-broadcast-tower"></i> Transmitter (TX)</h4>
                    ${row('Station type',        stationType(payload._txFixed))}
                    ${row('Elevation AMSL',      payload._txElevation != null ? payload._txElevation + ' m' : null)}
                    ${row('Feedpoint height AGL',payload._txFeedpointHeight != null ? payload._txFeedpointHeight + ' m' : null)}
                </div>`;
            const rxSection = payload._rxSameAsTx
                ? `<div class="review-subsection"><h4><i class="fas fa-satellite-dish"></i> Receiver (RX)</h4><div class="review-row"><div class="review-val review-note">Same as transmitter</div></div></div>`
                : `<div class="review-subsection">
                    <h4><i class="fas fa-satellite-dish"></i> Receiver (RX)</h4>
                    ${row('Station type',        stationType(payload._rxFixed))}
                    ${row('Make / model',        payload._rxMakeModel)}
                    ${row('Antenna type',        payload._rxAntennaType)}
                    ${row('Elevation AMSL',      payload._rxElevation != null ? payload._rxElevation + ' m' : null)}
                    ${row('Feedpoint height AGL',payload._rxFeedpointHeight != null ? payload._rxFeedpointHeight + ' m' : null)}
                </div>`;

            el.innerHTML = `
                <div class="review-section">
                    <h3><i class="fas fa-clipboard-list"></i> Request</h3>
                    ${erow('Priority',               sel('g_priority', PRIORITIES))}
                    ${erow('Requesting POC (803)',   inp('g_requestingPoc', 'Name'))}
                    ${erow('POC Phone (803)',         inp('g_pocPhone', 'Phone number'))}
                    ${erow('Operating Unit (207)',    mirrorSel('g_unitId'))}
                    ${erow('ISM Office (206)',        mirrorSel('g_ismOffice'))}
                    ${row ('STOP BUZZER (520)',       payload.stop_buzzer)}
                    ${row ('Request type',            fmt(payload.request_type))}
                    ${erow('Purpose',                inp('g_purpose', 'Purpose for this request…'))}
                    ${erow('Net name',               inp('g_netName', 'Net name'))}
                    ${erow('Callsign',               inp('g_callsign', 'Callsign'))}
                </div>
                <div class="review-section">
                    <h3><i class="fas fa-wave-square"></i> Frequency</h3>
                    ${row('Frequency / Band', freqDisplay)}
                </div>
                <div class="review-section">
                    <h3><i class="fas fa-cogs"></i> Technical</h3>
                    ${row('Emission designator',   payload.emission_designator)}
                    ${row('Power',                 payload.power_watts ? payload.power_watts + ' W' : null)}
                    ${row('Antenna type',          payload.antenna_type)}
                    ${row('Antenna make/model',    payload.antenna_make_model)}
                    ${row('Antenna gain',          payload.antenna_gain_dbi != null ? payload.antenna_gain_dbi + ' dBi' : null)}
                    ${row('Polarization',          payload.antenna_polarization)}
                    ${row('Orientation',           payload.antenna_orientation)}
                    ${row('Coverage area',         payload.coverage_area)}
                    ${payload.operating_area_geojson ? row('Operating area', (() => {
                        const g = payload.operating_area_geojson;
                        const c = g?.geometry?.coordinates;
                        const r = g?.properties?.radius_m;
                        const coord = c ? `${(+c[1]).toFixed(4)}, ${(+c[0]).toFixed(4)}` : '';
                        const rad = r ? ` — radius ${r >= 1000 ? (r/1000).toFixed(1)+' km' : r+' m'}` : '';
                        return `Center ${coord}${rad}`;
                    })()) : ''}
                    ${row('Frequencies requested', payload.num_transmitters)}
                    ${row('Receivers',             payload.num_receivers)}
                    ${row('Hours of operation',    payload.hours_of_operation)}
                    ${txSection}
                    ${rxSection}
                </div>
                <div class="review-section">
                    <h3><i class="fas fa-shield-alt"></i> Security</h3>
                    ${erow('Classification', sel('g_classification', CLASSIFICATIONS))}
                    ${row ('Encrypted',      payload.is_encrypted ? ('Yes' + (payload.encryption_type ? ' — ' + payload.encryption_type : '')) : 'No')}
                    ${row ('Coordination',   payload.requires_coordination ? ('Required' + (payload.coordination_notes ? ': ' + payload.coordination_notes : '')) : 'Not required')}
                </div>
                <div class="review-section">
                    <h3><i class="fas fa-clipboard-check"></i> Justification</h3>
                    ${erow('Start date',      inp('g_startDate', 'YYYY-MM-DD'))}
                    ${gd.duration !== 'permanent'
                        ? erow('End date',   inp('g_endDate', 'YYYY-MM-DD'))
                        : row ('End date',   'N/A — Permanent')}
                    ${erow('Justification',   area('g_justification', 'Justification…'))}
                    ${erow('Mission impact',  area('g_missionImpact', 'Mission impact if denied…'))}
                </div>`;
        } else {
            el.innerHTML = `
                <div class="review-section">
                    <h3><i class="fas fa-clipboard-list"></i> Request</h3>
                    ${erow('Operating Unit (207)', mirrorSel('m_unitId'))}
                    ${erow('Request type',         sel('m_requestType', [['permanent','Permanent'],['exercise','Training / Exercise'],['real_world','Real World']]))}
                    ${erow('Priority',             sel('m_priority', PRIORITIES))}
                    ${erow('Purpose',              inp('m_purpose', 'Purpose…'))}
                    ${erow('Net name',             inp('m_netName', 'Net name'))}
                    ${erow('Callsign',             inp('m_callsign', 'Callsign'))}
                </div>
                <div class="review-section">
                    <h3><i class="fas fa-wave-square"></i> Frequency</h3>
                    ${row('Frequency / Band',      freqDisplay)}
                    ${row('Emission designator',   payload.emission_designator)}
                    ${row('Power',                 payload.power_watts ? payload.power_watts + ' W' : null)}
                </div>
                <div class="review-section">
                    <h3><i class="fas fa-cogs"></i> Technical</h3>
                    ${row('Antenna type',        payload.antenna_type)}
                    ${row('Antenna make/model',  payload.antenna_make_model)}
                    ${row('Antenna gain',        payload.antenna_gain_dbi != null ? payload.antenna_gain_dbi + ' dBi' : null)}
                    ${row('Polarization',        payload.antenna_polarization)}
                    ${row('Orientation',         payload.antenna_orientation)}
                    ${row('Coverage area',       payload.coverage_area)}
                    ${row('Authorized radius',   payload.authorized_radius_km ? payload.authorized_radius_km + ' km' : null)}
                    ${row('Transmitters',        payload.num_transmitters)}
                    ${row('Receivers',           payload.num_receivers)}
                    ${row('Hours of operation',  payload.hours_of_operation)}
                </div>
                <div class="review-section">
                    <h3><i class="fas fa-shield-alt"></i> Security</h3>
                    ${erow('Classification', sel('m_classification', CLASSIFICATIONS))}
                    ${row ('Encrypted',      payload.is_encrypted ? ('Yes' + (payload.encryption_type ? ' — ' + payload.encryption_type : '')) : 'No')}
                    ${row ('Coordination',   payload.requires_coordination ? ('Required' + (payload.coordination_notes ? ': ' + payload.coordination_notes : '')) : 'Not required')}
                </div>
                <div class="review-section">
                    <h3><i class="fas fa-clipboard-check"></i> Justification</h3>
                    ${erow('Start date',     inp('m_startDate', 'YYYY-MM-DD'))}
                    ${erow('End date',       inp('m_endDate', 'YYYY-MM-DD'))}
                    ${erow('Justification',  area('m_justification', 'Justification…'))}
                    ${erow('Mission impact', area('m_missionImpact', 'Mission impact if denied…'))}
                </div>`;
        }
    }

    function fmt(s) {
        if (!s) return null;
        return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    // ── Payload builders ──────────────────────────────────────────────────────
    function buildGuidedPayload() {
        const fMode  = gd.freqMode || 'specific';
        const unitSel = document.getElementById('g_unitId');
        const unitLabel = unitSel ? unitSel.options[unitSel.selectedIndex]?.text : '';

        const emission  = val('g_emissionDesignator') || null;
        const bandwidth = null;
        const power     = intVal('g_powerWatts') ?? null;

        return {
            unit_id:               val('g_unitId'),
            _unitLabel:            unitLabel,
            requesting_poc:        val('g_requestingPoc') || null,
            requesting_poc_phone:  val('g_pocPhone') || null,
            stop_buzzer:           val('g_stopBuzzer') || null,
            ism_office:            val('g_ismOffice') || null,
            request_type:          gd.requestType || null,
            priority:              val('g_priority') || 'routine',
            purpose:               val('g_purpose'),
            net_name:              val('g_netName') || null,
            callsign:              val('g_callsign') || null,
            requested_frequency:   fMode === 'specific' ? (val('g_specificFreq') || null) : null,
            frequency_range_min:   fMode === 'band'     ? (numVal('g_freqMin') || null)  : null,
            frequency_range_max:   fMode === 'band'     ? (numVal('g_freqMax') || null)  : null,
            emission_designator:   emission,
            bandwidth:             bandwidth,
            power_watts:           power,
            antenna_make_model:    gd.knowsAntenna ? (val('g_antennaMakeModel') || null) : null,
            antenna_type:          gd.knowsAntenna ? (val('g_antennaType') || null) : null,
            antenna_gain_dbi:      gd.knowsAntenna ? (numVal('g_antennaGain') || null)   : null,
            antenna_polarization:  gd.knowsAntenna ? (val('g_antennaPolarization') || null) : null,
            antenna_orientation:   gd.knowsAntenna ? (val('g_antennaOrientation') || null)  : null,
            tx_horiz_beamwidth_deg: gd.knowsAntenna ? (numVal('g_txHorizBeamwidth') || null) : null,
            tx_vert_beamwidth_deg:  gd.knowsAntenna ? (numVal('g_txVertBeamwidth') || null)  : null,
            rx_horiz_beamwidth_deg: numVal('g_rxHorizBeamwidth') || null,
            rx_vert_beamwidth_deg:  numVal('g_rxVertBeamwidth') || null,
            // TX station fields
            _txFixed:              document.getElementById('g_txFixedBtn')?.classList.contains('active'),
            _txElevation:          numVal('g_txElevation'),
            _txFeedpointHeight:    numVal('g_txFeedpointHeight'),
            // RX fields
            _rxSameAsTx:           document.getElementById('g_rxSameAsTx')?.checked ?? true,
            _rxMakeModel:          val('g_rxMakeModel') || null,
            _rxAntennaType:        val('g_rxAntennaType') || null,
            _rxFixed:              document.getElementById('g_rxFixedBtn')?.classList.contains('active'),
            _rxElevation:          numVal('g_rxElevation'),
            _rxFeedpointHeight:    numVal('g_rxFeedpointHeight'),
            coverage_area:         val('g_coverageArea') || null,
            operating_area_geojson: (() => { try { const v = val('g_operatingAreaGeoJSON'); return v ? JSON.parse(v) : null; } catch { return null; } })(),
            authorized_radius_km: (() => { try { const v = val('g_operatingAreaGeoJSON'); if (!v) return null; const g = JSON.parse(v); const rm = g?.properties?.radius_m; return rm ? Math.round(rm / 10) / 100 : null; } catch { return null; } })(),
            operating_area_applies_to: (document.querySelector('input[name="g_areaAppliesTo"]:checked')?.value || 'B'),
            num_transmitters:      intVal('g_numFrequencies') || 1,
            num_receivers:         1,
            hours_of_operation:    val('g_time130') || null,
            start_date:            toRFC3339Date(val('g_startDate')),
            end_date:              toRFC3339Date(val('g_endDate')),
            justification:         val('g_justification'),
            mission_impact:        val('g_missionImpact') || null,
            classification:        val('g_classification') || 'UNCLASS',
            is_encrypted:          gd.isEncrypted || false,
            encryption_type:       null,
            requires_coordination: false,
            coordination_notes:    null
        };
    }

    function buildManualPayload() {
        const unitSel = document.getElementById('m_unitId');
        const unitLabel = unitSel ? unitSel.options[unitSel.selectedIndex]?.text : '';

        const reqFreq = val('m_requestedFreq');
        return {
            unit_id:              val('m_unitId'),
            _unitLabel:           unitLabel,
            request_type:         val('m_requestType') || null,
            priority:             val('m_priority') || 'routine',
            purpose:              val('m_purpose'),
            net_name:             val('m_netName') || null,
            callsign:             val('m_callsign') || null,
            requested_frequency:  reqFreq || null,
            frequency_range_min:  numVal('m_freqMin') || null,
            frequency_range_max:  numVal('m_freqMax') || null,
            classification:       val('m_classification') || 'UNCLASS',
            emission_designator:  val('m_emissionDesignator') || null,
            bandwidth:            val('m_bandwidth') || null,
            power_watts:          intVal('m_powerWatts') || null,
            antenna_make_model:   val('m_antennaMakeModel') || null,
            antenna_type:         val('m_antennaType') || null,
            antenna_gain_dbi:     numVal('m_antennaGain') || null,
            antenna_polarization: val('m_antennaPolarization') || null,
            antenna_orientation:  val('m_antennaOrientation') || null,
            tx_horiz_beamwidth_deg: numVal('m_txHorizBeamwidth') || null,
            tx_vert_beamwidth_deg:  numVal('m_txVertBeamwidth') || null,
            rx_horiz_beamwidth_deg: numVal('m_rxHorizBeamwidth') || null,
            rx_vert_beamwidth_deg:  numVal('m_rxVertBeamwidth') || null,
            authorized_radius_km: numVal('m_authorizedRadius') || null,
            coverage_area:        val('m_coverageArea') || null,
            num_transmitters:     intVal('m_numFrequencies') || intVal('m_numTransmitters') || 1,
            num_receivers:        intVal('m_numReceivers') || 1,
            hours_of_operation:   val('m_hours') || null,
            is_encrypted:         document.getElementById('m_isEncrypted')?.checked || false,
            encryption_type:      val('m_encryptionType') || null,
            requires_coordination: document.getElementById('m_requiresCoord')?.checked || false,
            coordination_notes:   val('m_coordNotes') || null,
            start_date:           toRFC3339Date(val('m_startDate')),
            end_date:             toRFC3339Date(val('m_endDate')),
            justification:        val('m_justification'),
            mission_impact:       val('m_missionImpact') || null
        };
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    window.submitRequest = async function () {
        const payload = currentMode === 'guided' ? buildGuidedPayload() : buildManualPayload();

        if (!payload.unit_id)      return showToast('Please select a unit.', 'warning');
        if (!payload.start_date)   return showToast('Please enter a start date.', 'warning');
        if (!payload.justification) return showToast('Please provide a justification.', 'warning');

        await doSubmit(payload);
    };

    async function doSubmit(payload) {
        try {
            const btn = currentMode === 'guided'
                ? document.getElementById('g_submitBtn')
                : document.getElementById('m_submitBtn');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…'; }

            const res  = await fetch('/api/frequency/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.removeItem('freqReqDraft');
                showToast('Frequency request submitted successfully!', 'success');
                setTimeout(() => { window.location.href = '/frequency'; }, 2000);
            } else {
                showToast('Error: ' + (data.error || 'Failed to submit request'), 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request'; }
            }
        } catch (err) {
            console.error(err);
            showToast('Network error submitting request.', 'error');
            const btn = document.getElementById(currentMode === 'guided' ? 'g_submitBtn' : 'm_submitBtn');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request'; }
        }
    }

    window.submitAnyway = function () {
        document.getElementById('conflictModal').classList.remove('open');
        const payload = currentMode === 'guided' ? buildGuidedPayload() : buildManualPayload();
        doSubmit(payload);
    };

    // ── Draft ─────────────────────────────────────────────────────────────────
    window.saveDraft = function (silent = false) {
        const payload = currentMode === 'guided' ? buildGuidedPayload() : buildManualPayload();
        // Preserve the existing draft ID so the resume link stays stable across saves.
        let id;
        try { id = JSON.parse(localStorage.getItem('freqReqDraft') || '{}').id; } catch { id = null; }
        if (!id) id = (crypto.randomUUID?.() ?? `draft-${Date.now()}`);
        localStorage.setItem('freqReqDraft', JSON.stringify({
            id, mode: currentMode, payload, gd,
            guidedStep, manualStep,
            guidedMaxStep, manualMaxStep,
            savedAt: new Date().toISOString()
        }));
        if (!silent) showToast('Draft saved.', 'success');
    };

    function tryLoadDraft() {
        const raw = localStorage.getItem('freqReqDraft');
        if (!raw) return;

        // Only auto-restore when navigating via "Resume Draft" (?resume=<id>).
        // A direct visit always starts a fresh form.
        const resumeId = new URLSearchParams(window.location.search).get('resume');
        if (!resumeId) return;

        let draft;
        try { draft = JSON.parse(raw); } catch { return; }

        // If the URL ID doesn't match the stored draft's ID, don't restore.
        if (draft.id && draft.id !== resumeId) return;

        // Restore immediately and show a discard banner.
        restoreDraft(draft);

        const banner = document.createElement('div');
        banner.id = 'draftBanner';
        banner.style.cssText = 'background:rgba(29,78,216,0.15);border-bottom:1px solid rgba(100,150,255,0.2);color:#90caf9;padding:0.4rem 1rem;display:flex;align-items:center;gap:1rem;font-size:0.82rem;';
        const savedAt = draft.savedAt ? new Date(draft.savedAt).toLocaleString() : '';
        banner.innerHTML = `
            <i class="fas fa-history"></i>
            <span>Draft auto-restored${savedAt ? ' · saved ' + savedAt : ''}.</span>
            <button onclick="discardDraftBanner()" style="margin-left:auto;background:transparent;color:#ef5350;border:1px solid rgba(239,83,80,0.4);padding:0.2rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.8rem;">Discard draft</button>
        `;
        document.querySelector('.app')?.prepend(banner) || document.body.prepend(banner);
    }

    window.restoreDraft = function (draft) {
        if (!draft) {
            const raw = localStorage.getItem('freqReqDraft');
            if (!raw) return;
            try { draft = JSON.parse(raw); } catch { return; }
        }

        const p  = draft.payload || {};
        const dg = draft.gd     || {};

        setMode(draft.mode || 'guided');

        // Restore max-step so previously-visited steps remain clickable
        if (draft.guidedMaxStep) guidedMaxStep = draft.guidedMaxStep;
        if (draft.manualMaxStep) manualMaxStep = draft.manualMaxStep;

        if (draft.mode === 'guided') {
            // Step 1: duration / nature (card buttons)
            if (dg.duration) selectDuration(dg.duration);
            if (dg.nature)   selectNature(dg.nature);

            // Step 2: unit + POC
            if (p.unit_id)               setVal('g_unitId', p.unit_id);
            if (p.requesting_poc)        setVal('g_requestingPoc', p.requesting_poc);
            if (p.requesting_poc_phone)  setVal('g_pocPhone', p.requesting_poc_phone);
            if (p.ism_office)            setVal('g_ismOffice', p.ism_office);
            if (p.stop_buzzer)           setVal('g_stopBuzzer', p.stop_buzzer);
            if (p.net_name)              setVal('g_netName', p.net_name);
            if (p.callsign)              setVal('g_callsign', p.callsign);
            if (p.priority)              setVal('g_priority', p.priority);

            // Step 3: frequency mode + specific/band values
            if (dg.freqMode)            setFreqMode(dg.freqMode);
            if (p.requested_frequency)  setVal('g_specificFreq', p.requested_frequency);
            if (p.frequency_range_min)  setVal('g_freqMin', p.frequency_range_min);
            if (p.frequency_range_max)  setVal('g_freqMax', p.frequency_range_max);
            if (dg.selectedBand)        selectBand(dg.selectedBand);

            // Step 4: tech toggles + fields
            if (dg.knowsBW    != null)   setKnowsBW(dg.knowsBW);
            if (dg.isEncrypted != null)  setEncrypted(dg.isEncrypted);
            if (dg.knowsAntenna != null) setKnowsAntenna(dg.knowsAntenna);
            if (p.emission_designator)   setVal('g_emissionDesignator', p.emission_designator);
            if (p.power_watts)           setVal('g_powerWatts', p.power_watts);
            if (p.antenna_type) {
                setVal('g_antennaType', p.antenna_type);
                const entry = ANTENNA_TYPES.find(a => a.code === p.antenna_type);
                if (entry) setVal('g_antennaTypeText', entry.name);
            }
            if (p.antenna_make_model)    setVal('g_antennaMakeModel', p.antenna_make_model);
            if (p.antenna_gain_dbi)      setVal('g_antennaGain', p.antenna_gain_dbi);
            if (p.antenna_polarization)  setVal('g_antennaPolarization', p.antenna_polarization);
            if (p.antenna_orientation)   setVal('g_antennaOrientation', p.antenna_orientation);

            // Step 5: location / dates
            if (p.coverage_area)       setVal('g_coverageArea', p.coverage_area);
            if (p.operating_area_geojson) {
                setVal('g_operatingAreaGeoJSON', JSON.stringify(p.operating_area_geojson));
                if (_areaMap) restoreAreaMapLayer(p.operating_area_geojson);
            }
            if (p.operating_area_applies_to) { const rb = document.querySelector('input[name="g_areaAppliesTo"][value="' + p.operating_area_applies_to + '"]'); if (rb) rb.checked = true; }
            if (p.start_date)  setVal('g_startDate', p.start_date.slice(0, 10));
            if (p.end_date)    setVal('g_endDate',   p.end_date.slice(0, 10));
            if (p.hours_of_operation) {
                // Restore Field 130 button selections (format: digit + optional H-suffix)
                const match = p.hours_of_operation.match(/^([1-4])(H24|HX|HN|HJ|HT)?$/);
                if (match) {
                    if (match[1]) setTime130('usage', match[1]);
                    if (match[2]) setTime130('h', match[2]);
                }
            }

            // Step 6: justification
            if (p.purpose)          setVal('g_purpose', p.purpose);
            if (p.justification)    setVal('g_justification', p.justification);
            if (p.mission_impact)   setVal('g_missionImpact', p.mission_impact);
            if (p.classification)   setVal('g_classification', p.classification);
        } else {
            // Manual mode — restore all payload fields
            if (p.unit_id)              setVal('m_unitId', p.unit_id);
            if (p.request_type)         setVal('m_requestType', p.request_type);
            if (p.priority)             setVal('m_priority', p.priority);
            if (p.requested_frequency)  setVal('m_requestedFreq', p.requested_frequency);
            if (p.frequency_range_min)  setVal('m_freqMin', p.frequency_range_min);
            if (p.frequency_range_max)  setVal('m_freqMax', p.frequency_range_max);
            if (p.purpose)              setVal('m_purpose', p.purpose);
            if (p.net_name)             setVal('m_netName', p.net_name);
            if (p.callsign)             setVal('m_callsign', p.callsign);
            if (p.emission_designator)  setVal('m_emissionDesignator', p.emission_designator);
            if (p.bandwidth)            setVal('m_bandwidth', p.bandwidth);
            if (p.power_watts)          setVal('m_powerWatts', p.power_watts);
            if (p.antenna_make_model)   setVal('m_antennaMakeModel', p.antenna_make_model);
            if (p.antenna_gain_dbi)     setVal('m_antennaGain', p.antenna_gain_dbi);
            if (p.antenna_polarization) setVal('m_antennaPolarization', p.antenna_polarization);
            if (p.antenna_orientation)  setVal('m_antennaOrientation', p.antenna_orientation);
            if (p.coverage_area)        setVal('m_coverageArea', p.coverage_area);
            if (p.start_date)           setVal('m_startDate', p.start_date.slice(0, 10));
            if (p.end_date)             setVal('m_endDate',   p.end_date.slice(0, 10));
            if (p.justification)        setVal('m_justification', p.justification);
            if (p.classification)       setVal('m_classification', p.classification);
            if (p.is_encrypted) {
                const cb = document.getElementById('m_isEncrypted');
                if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
            }
            if (p.encryption_type)      setVal('m_encryptionType', p.encryption_type);
        }

        // Navigate to the step the user was on
        if (draft.mode === 'guided' && draft.guidedStep > 1) showGuidedStep(draft.guidedStep);
        if (draft.mode === 'manual' && draft.manualStep > 1) showManualStep(draft.manualStep);

        // Re-sync localStorage so any subsequent auto-save reflects the correctly
        // restored state (e.g. dates normalised from RFC3339 → YYYY-MM-DD).
        saveDraft(true);

        document.getElementById('draftBanner')?.remove();
    };

    window.discardDraftBanner = function () {
        localStorage.removeItem('freqReqDraft');
        window.location.href = '/frequency';
    };

    // ── Unit loader ───────────────────────────────────────────────────────────
    async function loadUnits() {
        const selectors = ['g_unitId', 'm_unitId'];

        // Fetch session once for use in both paths
        let sessionUnitId = null;
        let sessionInstallId = null;
        try {
            const sess = await fetch('/api/auth/session');
            const sessData = sess.ok ? await sess.json() : {};
            if (sessData.valid && sessData.user) {
                sessionUnitId    = sessData.user.unit_id    || null;
                sessionInstallId = sessData.user.installation_id || null;
            }
        } catch (_) { /* ignore */ }

        try {
            // Try user's assigned units first
            const res  = await fetch('/api/frequency/units');
            const data = res.ok ? await res.json() : { units: [] };
            const units = data.units || [];

            if (units.length > 0) {
                const opts = '<option value="">Select unit…</option>' +
                    units.map(u => `<option value="${u.unit.id}">${u.unit.name} (${u.unit.unit_code})</option>`).join('');
                selectors.forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.innerHTML = opts;
                    // Prefer user's primary unit, fall back to first
                    if (sessionUnitId && units.some(u => u.unit.id === sessionUnitId)) {
                        el.value = sessionUnitId;
                    } else {
                        el.value = units[0].unit.id;
                    }
                });
                return;
            }
        } catch (_) { /* fall through */ }

        // Fallback: public units filtered by installation if available
        try {
            let installParam = sessionInstallId ? '?installation_id=' + encodeURIComponent(sessionInstallId) : '';

            const res  = await fetch('/api/auth/public-units' + installParam);
            const data = await res.json();
            const units = data.units || [];
            const opts  = '<option value="">Select unit…</option>' +
                units.map(u => `<option value="${u.id}">${u.name}${u.unit_code ? ' (' + u.unit_code + ')' : ''}</option>`).join('');
            selectors.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                el.innerHTML = opts;
                if (sessionUnitId) el.value = sessionUnitId;
            });
        } catch (err) {
            console.error('Failed to load units:', err);
            selectors.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '<option value="">Error loading units</option>';
            });
        }
    }

    // ── Equipment Library (API-driven SSRF cascade) ───────────────────────────

    // Loaded equipment detail: { id, transmitters: [{name, mfg, deploy, modes:[...]}] }
    let libEquipment = null;

    // Populate the equipment dropdown from GET /api/equipment
    async function loadEquipmentLibrary() {
        const sel = document.getElementById('g_equipLibSel');
        if (!sel) return;
        try {
            const res  = await fetch('/api/equipment');
            const data = res.ok ? await res.json() : {};
            const items = data.equipment || [];
            if (!items.length) {
                sel.innerHTML = '<option value="">— No equipment in library —</option>';
                return;
            }
            sel.innerHTML = '<option value="">— Select from library —</option>' +
                items.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        } catch {
            sel.innerHTML = '<option value="">— Library unavailable —</option>';
        }
    }

    window.onEquipLibChange = async function() {
        const id = document.getElementById('g_equipLibSel')?.value;
        // Reset downstream
        libEquipment = null;
        resetRow('g_txRow',   'g_txSel',   '— Select transmitter —');
        resetRow('g_modeRow', 'g_modeSel', '— Select mode —');
        hideLibPreview();
        if (!id) {
            return;
        }
        try {
            const res  = await fetch(`/api/equipment/${encodeURIComponent(id)}`);
            if (!res.ok) { showToast('Failed to load equipment data', 'error'); return; }
            libEquipment = await res.json();
        } catch { showToast('Failed to load equipment data', 'error'); return; }

        const txs = libEquipment.transmitters || [];
        if (!txs.length) { showToast('No transmitter data in this file', 'warning'); return; }

        populateGuidedTxDropdown();
    };

    // Populate (or re-populate) the guided TX dropdown from already-loaded libEquipment,
    // filtered by the current band selection. Preserves original TX indices as option values.
    function populateGuidedTxDropdown() {
        if (!libEquipment) return;
        const allTxs = libEquipment.transmitters || [];
        const band   = getBandRange();

        const filtered = allTxs
            .map((tx, origIdx) => ({ tx, origIdx }))
            .filter(({ tx }) => txOverlapsBand(tx, band));

        const txSel = document.getElementById('g_txSel');
        if (!txSel) return;
        const prevVal = txSel.value;

        txSel.innerHTML = '<option value="">— Select transmitter —</option>' +
            filtered.map(({ tx, origIdx }) =>
                `<option value="${origIdx}">${tx.name}${tx.mfg ? ' (' + tx.mfg + ')' : ''}</option>`
            ).join('');
        document.getElementById('g_txRow').style.display = filtered.length ? '' : 'none';

        // Keep previous selection if it survived the filter
        if (prevVal && filtered.some(({ origIdx }) => String(origIdx) === prevVal)) {
            txSel.value = prevVal;
            onTxSelChange();
        } else if (prevVal) {
            // Previously selected TX filtered out — reset downstream
            resetRow('g_modeRow', 'g_modeSel', '— Select mode —');
            resetRow('g_antRow',  'g_antSel',  '— Select antenna —');
            hideLibPreview();
        } else if (filtered.length === 1) {
            txSel.value = String(filtered[0].origIdx);
            onTxSelChange();
        }
    };

    window.onTxSelChange = function() {
        const txIdx = parseInt(document.getElementById('g_txSel')?.value);
        resetRow('g_modeRow', 'g_modeSel', '— Select mode —');
        resetRow('g_antRow',  'g_antSel',  '— Select antenna —');
        hideLibPreview();
        if (isNaN(txIdx) || !libEquipment) return;

        const tx   = libEquipment.transmitters[txIdx];
        const band = getBandRange();

        const filtered = (tx?.modes || [])
            .map((m, origIdx) => ({ m, origIdx }))
            .filter(({ m }) => modeOverlapsBand(m, band));

        if (!filtered.length) return;

        const modeSel = document.getElementById('g_modeSel');
        modeSel.innerHTML = '<option value="">— Select mode —</option>' +
            filtered.map(({ m, origIdx }) => {
                const label = [
                    m.em_designator || m.ems_class,
                    m.description,
                    m.power_w != null ? m.power_w + ' W' : null,
                ].filter(Boolean).join(' — ');
                return `<option value="${origIdx}">${label}</option>`;
            }).join('');
        document.getElementById('g_modeRow').style.display = '';

        // Auto-select if only one mode
        if (filtered.length === 1) {
            modeSel.value = String(filtered[0].origIdx);
            onModeSelChange();
        }
    };

    window.onModeSelChange = function() {
        hideLibPreview();
        resetRow('g_antRow', 'g_antSel', '— Select antenna —');
        const txIdx   = parseInt(document.getElementById('g_txSel')?.value);
        const modeIdx = parseInt(document.getElementById('g_modeSel')?.value);
        if (isNaN(txIdx) || isNaN(modeIdx) || !libEquipment) return;

        const tx   = libEquipment.transmitters[txIdx];
        const mode = tx?.modes[modeIdx];
        if (!mode) return;

        // Build mode preview
        const freqStr = (mode.freq_ranges || []).map(r => `${r.min}–${r.max} MHz`).join(', ');
        const parts = [
            mode.em_designator ? `<strong style="font-family:monospace;color:#34d399;">${mode.em_designator}</strong>` : null,
            mode.description   ? mode.description : null,
            mode.power_w != null ? `${mode.power_w} W` : null,
            freqStr            ? `<span style="color:#94a3b8;">${freqStr}</span>` : null,
        ].filter(Boolean).join(' &nbsp;·&nbsp; ');

        const preview  = document.getElementById('g_libPreview');
        const previewT = document.getElementById('g_libPreviewText');
        if (preview && previewT) {
            previewT.innerHTML = parts || 'Mode selected';
            preview.style.display = 'flex';
        }

        // Populate antenna dropdown, filtered by mode freq_ranges, falling back to band range
        const allAnts    = libEquipment.antennas || [];
        const modeRanges = mode.freq_ranges || [];
        const band       = getBandRange();

        // Use mode ranges when available; otherwise fall back to the selected band range
        const filterRanges = modeRanges.length ? modeRanges
            : band ? [{ min: band.min, max: band.max }]
            : [];

        const compatible = allAnts.filter((ant, i) => {
            ant._idx = i;
            if (!filterRanges.length) return true;                     // nothing to filter on
            if (ant.freq_min == null || ant.freq_max == null) return true; // no freq data — keep
            return filterRanges.some(r => ant.freq_min <= r.max && ant.freq_max >= r.min);
        });

        const antSel = document.getElementById('g_antSel');
        const antRow = document.getElementById('g_antRow');
        if (!antSel || !allAnts.length) return;

        const filtered = compatible.length ? compatible : allAnts;
        const note = document.getElementById('g_antFilterNote');
        if (note) {
            note.textContent = compatible.length < allAnts.length
                ? `(${compatible.length} of ${allAnts.length} compatible with selected mode)`
                : `(${allAnts.length} available)`;
        }

        antSel.innerHTML = '<option value="">— Select antenna —</option>' +
            filtered.map((ant, i) => {
                const gainStr = ant.gain_dbi != null ? ` · ${ant.gain_dbi} dBi` : '';
                const freqRng = (ant.freq_min != null && ant.freq_max != null)
                    ? ` · ${ant.freq_min}–${ant.freq_max} MHz` : '';
                const label = `${ant.name || ant.ant_type}${gainStr}${freqRng}`;
                return `<option value="${i}">${label}</option>`;
            }).join('');
        // Store filtered list on the element so onAntSelChange can look up by index
        antSel._antData = filtered;
        antRow.style.display = '';

        // Auto-select if only one compatible antenna
        if (filtered.length === 1) {
            antSel.value = '0';
            onAntSelChange();
        }
    };

    window.onAntSelChange = function() {
        const antSel = document.getElementById('g_antSel');
        const antIdx = parseInt(antSel?.value);
        if (isNaN(antIdx) || !antSel?._antData) return;

        const ant = antSel._antData[antIdx];
        if (!ant) return;

        // Update preview text to also show antenna info
        const preview  = document.getElementById('g_libPreview');
        const previewT = document.getElementById('g_libPreviewText');
        if (previewT) {
            const existing = previewT.innerHTML;
            const antParts = [
                `<span style="color:#c4b5fd;">Antenna: <strong>${ant.name || ant.ant_type}</strong></span>`,
                ant.sfaf_354 ? ant.sfaf_354 : null,
                ant.gain_dbi != null ? `${ant.gain_dbi} dBi` : null,
                ant.polarization ? `Pol: ${ant.polarization}` : null,
            ].filter(Boolean).join(' &nbsp;·&nbsp; ');
            // Replace existing antenna line or append
            if (previewT.dataset.baseHtml) {
                previewT.innerHTML = previewT.dataset.baseHtml + '<br>' + antParts;
            } else {
                previewT.dataset.baseHtml = existing;
                previewT.innerHTML = existing + '<br>' + antParts;
            }
            if (preview) preview.style.display = 'flex';
        }
    };

    window.applyLibMode = function() {
        const txIdx   = parseInt(document.getElementById('g_txSel')?.value);
        const modeIdx = parseInt(document.getElementById('g_modeSel')?.value);
        if (isNaN(txIdx) || isNaN(modeIdx) || !libEquipment) return;

        const tx   = libEquipment.transmitters[txIdx];
        const mode = tx?.modes[modeIdx];
        if (!mode) return;

        // Reveal antenna/emission fields
        setKnowsAntenna(true);

        if (mode.em_designator) setVal('g_emissionDesignator', mode.em_designator);
        if (mode.power_w != null) setVal('g_powerWatts', mode.power_w);

        // Pre-fill make/model from transmitter name + manufacturer
        const makeModel = tx.name + (tx.mfg ? ` (${tx.mfg})` : '');
        setVal('g_antennaMakeModel', makeModel);

        // Set frequency range from the mode's tuning ranges only if the user
        // hasn't already chosen a specific frequency OR selected a named band.
        const ranges = mode.freq_ranges || [];
        if (ranges.length && !val('g_specificFreq') && !gd.selectedBand) {
            const allMin = Math.min(...ranges.map(r => r.min));
            const allMax = Math.max(...ranges.map(r => r.max));
            setFreqMode('band');
            setVal('g_freqMin', allMin);
            setVal('g_freqMax', allMax);
        }

        // Apply selected antenna fields if an antenna was chosen
        const antSel = document.getElementById('g_antSel');
        const antIdx = parseInt(antSel?.value);
        const ant    = (!isNaN(antIdx) && antSel?._antData) ? antSel._antData[antIdx] : null;

        if (ant) {
            // Antenna type combo: set both the hidden value and the visible text input
            const antTypeHidden = document.getElementById('g_antennaType');
            const antTypeText   = document.getElementById('g_antennaTypeText');
            const antEntry = ANTENNA_TYPES.find(a => a.code === ant.sfaf_354);
            if (antTypeHidden) antTypeHidden.value = ant.sfaf_354 || '';
            if (antTypeText)   antTypeText.value   = antEntry ? antEntry.name : (ant.sfaf_354 || ant.ant_type || '');

            // Make/model: prefer antenna name over transmitter name when antenna is selected
            const makeModel = ant.name
                ? ant.name + (ant.mfg ? ` (${ant.mfg})` : '')
                : makeModel; // already set above
            setVal('g_antennaMakeModel', ant.name ? ant.name + (ant.mfg ? ` (${ant.mfg})` : '') : val('g_antennaMakeModel'));

            if (ant.gain_dbi != null)  setVal('g_antennaGain', ant.gain_dbi);
            if (ant.polarization)      setVal('g_antennaPolarization', ant.polarization);
            if (ant.orientation)       setVal('g_antennaOrientation', ant.orientation);
        }

        const antLabel = ant ? ` + ${ant.name || ant.ant_type}` : '';
        showToast(`Applied: ${tx.name} — ${mode.em_designator || mode.ems_class}${antLabel}`, 'success');
    };

    function resetRow(rowId, selId, placeholder) {
        const row = document.getElementById(rowId);
        const sel = document.getElementById(selId);
        if (sel) sel.innerHTML = `<option value="">${placeholder}</option>`;
        if (row) row.style.display = 'none';
    }

    function hideLibPreview() {
        const p = document.getElementById('g_libPreview');
        if (p) p.style.display = 'none';
    }

    // ── Manual mode equipment library cascade ─────────────────────────────────

    let libEquipmentManual = null;

    async function loadEquipmentLibraryManual() {
        const sel = document.getElementById('m_equipLibSel');
        if (!sel) return;
        try {
            const res   = await fetch('/api/equipment');
            const data  = res.ok ? await res.json() : {};
            const items = data.equipment || [];
            if (!items.length) {
                sel.innerHTML = '<option value="">— No equipment in library —</option>';
                return;
            }
            sel.innerHTML = '<option value="">— Select from library —</option>' +
                items.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        } catch {
            sel.innerHTML = '<option value="">— Library unavailable —</option>';
        }
    }

    window.onManualEquipLibChange = async function() {
        const id = document.getElementById('m_equipLibSel')?.value;
        libEquipmentManual = null;
        resetRow('m_txRow',   'm_txSel',    '— Select transmitter —');
        resetRow('m_modeRow', 'm_modeSel',  '— Select mode —');
        resetRow('m_antRow',  'm_antLibSel','— Select antenna —');
        const p = document.getElementById('m_libPreview');
        if (p) p.style.display = 'none';
        if (!id) return;

        try {
            const res = await fetch(`/api/equipment/${encodeURIComponent(id)}`);
            if (!res.ok) { showToast('Failed to load equipment data', 'error'); return; }
            libEquipmentManual = await res.json();
        } catch { showToast('Failed to load equipment data', 'error'); return; }

        const txs = libEquipmentManual.transmitters || [];
        if (!txs.length) { showToast('No transmitter data in this file', 'warning'); return; }

        const txSel = document.getElementById('m_txSel');
        txSel.innerHTML = '<option value="">— Select transmitter —</option>' +
            txs.map((tx, i) => `<option value="${i}">${tx.name}${tx.mfg ? ' (' + tx.mfg + ')' : ''}</option>`).join('');
        document.getElementById('m_txRow').style.display = '';

        if (txs.length === 1) {
            txSel.value = '0';
            window.onManualTxSelChange();
        }
    };

    window.onManualTxSelChange = function() {
        const txIdx = parseInt(document.getElementById('m_txSel')?.value);
        resetRow('m_modeRow', 'm_modeSel',   '— Select mode —');
        resetRow('m_antRow',  'm_antLibSel', '— Select antenna —');
        const p = document.getElementById('m_libPreview');
        if (p) p.style.display = 'none';
        if (isNaN(txIdx) || !libEquipmentManual) return;

        const tx    = libEquipmentManual.transmitters[txIdx];
        const modes = tx?.modes || [];
        if (!modes.length) return;

        const modeSel = document.getElementById('m_modeSel');
        modeSel.innerHTML = '<option value="">— Select mode —</option>' +
            modes.map((m, i) => {
                const label = [
                    m.em_designator || m.ems_class,
                    m.description,
                    m.power_w != null ? m.power_w + ' W' : null,
                ].filter(Boolean).join(' — ');
                return `<option value="${i}">${label}</option>`;
            }).join('');
        document.getElementById('m_modeRow').style.display = '';

        if (modes.length === 1) {
            modeSel.value = '0';
            window.onManualModeSelChange();
        }
    };

    window.onManualModeSelChange = function() {
        const p = document.getElementById('m_libPreview');
        if (p) p.style.display = 'none';
        resetRow('m_antRow', 'm_antLibSel', '— Select antenna —');
        const txIdx   = parseInt(document.getElementById('m_txSel')?.value);
        const modeIdx = parseInt(document.getElementById('m_modeSel')?.value);
        if (isNaN(txIdx) || isNaN(modeIdx) || !libEquipmentManual) return;

        const tx   = libEquipmentManual.transmitters[txIdx];
        const mode = tx?.modes[modeIdx];
        if (!mode) return;

        const freqStr = (mode.freq_ranges || []).map(r => `${r.min}–${r.max} MHz`).join(', ');
        const parts = [
            mode.em_designator ? `<strong style="font-family:monospace;color:#34d399;">${mode.em_designator}</strong>` : null,
            mode.description   ? mode.description : null,
            mode.power_w != null ? `${mode.power_w} W` : null,
            freqStr            ? `<span style="color:#94a3b8;">${freqStr}</span>` : null,
        ].filter(Boolean).join(' &nbsp;·&nbsp; ');

        const preview  = document.getElementById('m_libPreview');
        const previewT = document.getElementById('m_libPreviewText');
        if (preview && previewT) {
            previewT.dataset.baseHtml = '';
            previewT.innerHTML = parts || 'Mode selected';
            preview.style.display = 'flex';
        }

        const allAnts    = libEquipmentManual.antennas || [];
        const modeRanges = mode.freq_ranges || [];
        const compatible = allAnts.filter(ant => {
            if (!modeRanges.length || ant.freq_min == null || ant.freq_max == null) return true;
            return modeRanges.some(r => ant.freq_min <= r.max && ant.freq_max >= r.min);
        });

        const antSel = document.getElementById('m_antLibSel');
        const antRow = document.getElementById('m_antRow');
        if (!antSel || !allAnts.length) return;

        const filtered = compatible.length ? compatible : allAnts;
        const note = document.getElementById('m_antFilterNote');
        if (note) {
            note.textContent = compatible.length < allAnts.length
                ? `(${compatible.length} of ${allAnts.length} compatible with selected mode)`
                : `(${allAnts.length} available)`;
        }

        antSel.innerHTML = '<option value="">— Select antenna —</option>' +
            filtered.map((ant, i) => {
                const gainStr = ant.gain_dbi != null ? ` · ${ant.gain_dbi} dBi` : '';
                const freqRng = (ant.freq_min != null && ant.freq_max != null)
                    ? ` · ${ant.freq_min}–${ant.freq_max} MHz` : '';
                return `<option value="${i}">${ant.name || ant.ant_type}${gainStr}${freqRng}</option>`;
            }).join('');
        antSel._antData = filtered;
        antRow.style.display = '';

        if (filtered.length === 1) {
            antSel.value = '0';
            window.onManualAntSelChange();
        }
    };

    window.onManualAntSelChange = function() {
        const antSel = document.getElementById('m_antLibSel');
        const antIdx = parseInt(antSel?.value);
        if (isNaN(antIdx) || !antSel?._antData) return;

        const ant = antSel._antData[antIdx];
        if (!ant) return;

        const preview  = document.getElementById('m_libPreview');
        const previewT = document.getElementById('m_libPreviewText');
        if (previewT) {
            const antParts = [
                `<span style="color:#c4b5fd;">Antenna: <strong>${ant.name || ant.ant_type}</strong></span>`,
                ant.sfaf_354 ? ant.sfaf_354 : null,
                ant.gain_dbi != null ? `${ant.gain_dbi} dBi` : null,
                ant.polarization ? `Pol: ${ant.polarization}` : null,
            ].filter(Boolean).join(' &nbsp;·&nbsp; ');
            const base = previewT.dataset.baseHtml || previewT.innerHTML;
            previewT.dataset.baseHtml = base;
            previewT.innerHTML = base + '<br>' + antParts;
            if (preview) preview.style.display = 'flex';
        }
    };

    window.applyManualLibMode = function() {
        const txIdx   = parseInt(document.getElementById('m_txSel')?.value);
        const modeIdx = parseInt(document.getElementById('m_modeSel')?.value);
        if (isNaN(txIdx) || isNaN(modeIdx) || !libEquipmentManual) return;

        const tx   = libEquipmentManual.transmitters[txIdx];
        const mode = tx?.modes[modeIdx];
        if (!mode) return;

        if (mode.em_designator) setVal('m_emissionDesignator', mode.em_designator);
        if (mode.power_w != null) setVal('m_powerWatts', mode.power_w);

        const ranges = mode.freq_ranges || [];
        if (ranges.length && !val('m_requestedFreq')) {
            setVal('m_freqMin', Math.min(...ranges.map(r => r.min)));
            setVal('m_freqMax', Math.max(...ranges.map(r => r.max)));
        }

        const antSel = document.getElementById('m_antLibSel');
        const antIdx = parseInt(antSel?.value);
        const ant    = (!isNaN(antIdx) && antSel?._antData) ? antSel._antData[antIdx] : null;

        const makeModel = tx.name + (tx.mfg ? ` (${tx.mfg})` : '');
        setVal('m_antennaMakeModel', ant?.name
            ? ant.name + (ant.mfg ? ` (${ant.mfg})` : '')
            : makeModel);

        if (ant) {
            const antTypeHidden = document.getElementById('m_antennaType');
            const antTypeText   = document.getElementById('m_antennaTypeText');
            const antEntry = ANTENNA_TYPES.find(a => a.code === ant.sfaf_354);
            if (antTypeHidden) antTypeHidden.value = ant.sfaf_354 || '';
            if (antTypeText)   antTypeText.value   = antEntry ? antEntry.name : (ant.sfaf_354 || ant.ant_type || '');

            if (ant.gain_dbi != null)  setVal('m_antennaGain', ant.gain_dbi);
            if (ant.polarization)      setVal('m_antennaPolarization', ant.polarization);
            if (ant.orientation)       setVal('m_antennaOrientation', ant.orientation);
        }

        const antLabel = ant ? ` + ${ant.name || ant.ant_type}` : '';
        showToast(`Applied: ${tx.name} — ${mode.em_designator || mode.ems_class}${antLabel}`, 'success');
    };

    // ── (legacy client-side SSRF parser kept for mhzToITUBw — no longer used directly) ──
    function mhzToITUBw(mhz) {
        const hz = mhz * 1e6;
        let val, unit;
        if      (hz >= 1e9) { val = hz / 1e9; unit = 'G'; }
        else if (hz >= 1e6) { val = hz / 1e6; unit = 'M'; }
        else if (hz >= 1e3) { val = hz / 1e3; unit = 'K'; }
        else                { val = hz;        unit = 'H'; }

        // Round to 3 significant figures
        const r = parseFloat(val.toPrecision(3));
        if (r >= 100) {
            // e.g., 160 kHz → "160K"
            return `${Math.round(r)}${unit}`;
        } else if (r >= 10) {
            // e.g., 16.0 kHz → "16K0"
            const i = Math.floor(r);
            const d = Math.round((r - i) * 10);
            return `${i}${unit}${d}`;
        } else {
            // e.g., 6.00 kHz → "6K00",  1.60 kHz → "1K60"
            const i = Math.floor(r);
            const d = Math.round((r - i) * 100).toString().padStart(2, '0');
            return `${i}${unit}${d}`;
        }
    }

    // Parse all <Transmitter> elements from an SSRF DOMDocument.
    function parseSSRFTransmitters(doc) {
        const ns = 'urn:us:gov:dod:standard:ssrf:3.0.1';
        // Helper: get first child element text (with or without namespace)
        function txt(parent, localName) {
            const el = parent.getElementsByTagNameNS(ns, localName)[0]
                    || parent.getElementsByTagName(localName)[0];
            return el ? el.textContent.trim() : null;
        }
        function all(parent, localName) {
            return [...(parent.getElementsByTagNameNS(ns, localName).length
                ? parent.getElementsByTagNameNS(ns, localName)
                : parent.getElementsByTagName(localName))];
        }

        const txEls = all(doc, 'Transmitter');
        return txEls.map(tx => {
            // Equipment name from Nomenclature
            const nomEl  = all(tx, 'Nomenclature')[0];
            const name   = nomEl ? txt(nomEl, 'Name')  : null;
            const mfgEl  = nomEl ? all(nomEl, 'Manufacturer')[0] : null;
            const mfg    = mfgEl ? txt(mfgEl, 'Name')  : null;
            const deploy = txt(all(tx, 'Deployment')[0] || tx, 'Type') ||
                           txt(all(tx, 'Deployment')[0] || tx, 'Installation');

            // Transmission modes
            const modes = all(tx, 'TxMode').map(m => {
                const desc    = txt(m, 'Description');
                const emsClass = txt(m, 'EmsClass');
                const bwMhz   = parseFloat(txt(m, 'NecessaryBw') || '0') || null;
                const occBwMhz = parseFloat(txt(m, 'OccBw') || '0') || null;

                // Power — prefer Mean, fall back to first available PowerMax
                let powerW = null;
                all(m, 'Power').forEach(p => {
                    const type = txt(p, 'PowerType');
                    const max  = parseFloat(txt(p, 'PowerMax') || '');
                    if (!isNaN(max) && (type === 'Mean' || powerW === null)) {
                        powerW = max;
                    }
                });

                // Frequency tuning ranges
                const tunings = all(m, 'TxSignalTuning').map(t => ({
                    min: parseFloat(txt(t, 'FreqMin') || ''),
                    max: parseFloat(txt(t, 'FreqMax') || ''),
                })).filter(t => !isNaN(t.min) && !isNaN(t.max));

                // Build emission designator: bw-code + emsClass
                const bwCode = bwMhz ? mhzToITUBw(bwMhz) : null;
                const emDesignator = (bwCode && emsClass) ? `${bwCode}${emsClass}` : null;

                return { desc, emsClass, bwMhz, occBwMhz, powerW, tunings, emDesignator };
            }).filter(m => m.emsClass); // skip modes with no emission class

            return { name, mfg, deploy, modes };
        }).filter(tx => tx.name && tx.modes.length);
    }

    window.loadSSRFFile = function(input) {
        const file = input.files[0];
        if (!file) return;
        input.value = ''; // allow re-selecting same file

        const reader = new FileReader();
        reader.onload = e => {
            try {
                const parser = new DOMParser();
                const doc    = parser.parseFromString(e.target.result, 'application/xml');
                const err    = doc.querySelector('parsererror');
                if (err) { showToast('XML parse error — is this a valid SSRF file?', 'error'); return; }

                ssrfTransmitters = parseSSRFTransmitters(doc);
                if (!ssrfTransmitters.length) {
                    showToast('No transmitter records found in this SSRF file.', 'warning');
                    return;
                }

                ssrfSelectedTx   = null;
                ssrfSelectedMode = null;
                document.getElementById('ssrfFileName').textContent =
                    `${file.name} — ${ssrfTransmitters.length} transmitter${ssrfTransmitters.length !== 1 ? 's' : ''} found`;
                document.getElementById('ssrfTxSearch').value = '';
                renderSSRFTxList();
                openSSRFModal();
            } catch (ex) {
                showToast('Failed to read file: ' + ex.message, 'error');
            }
        };
        reader.readAsText(file);
    };

    function openSSRFModal() {
        const m = document.getElementById('ssrfModal');
        if (m) m.style.display = 'flex';
    }

    window.closeSSRFModal = function() {
        const m = document.getElementById('ssrfModal');
        if (m) m.style.display = 'none';
    };

    function renderSSRFTxList() {
        const filter = (document.getElementById('ssrfTxSearch')?.value || '').toLowerCase();
        const list   = document.getElementById('ssrfTxList');
        if (!list) return;

        const visible = ssrfTransmitters
            .map((tx, i) => ({ tx, i }))
            .filter(({ tx }) => !filter ||
                (tx.name || '').toLowerCase().includes(filter) ||
                (tx.mfg  || '').toLowerCase().includes(filter));

        if (!visible.length) {
            list.innerHTML = '<div style="padding:12px 14px;font-size:0.8rem;color:#475569;font-style:italic;">No matches.</div>';
            return;
        }

        list.innerHTML = visible.map(({ tx, i }) => {
            const active = i === ssrfSelectedTx;
            return `<div class="ssrf-tx-row" data-idx="${i}"
                        onclick="selectSSRFTx(${i})"
                        style="padding:9px 14px;cursor:pointer;font-size:0.82rem;
                               background:${active ? 'rgba(59,130,246,0.15)' : 'transparent'};
                               border-left:3px solid ${active ? '#3b82f6' : 'transparent'};
                               transition:background 0.1s;"
                        onmouseenter="if(${i}!==ssrfSelectedTx)this.style.background='rgba(255,255,255,0.04)'"
                        onmouseleave="this.style.background='${active ? 'rgba(59,130,246,0.15)' : 'transparent'}'">
                <div style="color:#e2e8f0;font-weight:500;">${esc(tx.name)}</div>
                <div style="color:#64748b;font-size:0.72rem;margin-top:1px;">
                    ${tx.mfg ? esc(tx.mfg) + ' &nbsp;·&nbsp; ' : ''}${tx.modes.length} mode${tx.modes.length !== 1 ? 's' : ''}
                    ${tx.deploy ? ' &nbsp;·&nbsp; ' + esc(tx.deploy) : ''}
                </div>
            </div>`;
        }).join('');
    }

    window.filterSSRFTransmitters = function() { renderSSRFTxList(); };

    window.selectSSRFTx = function(idx) {
        ssrfSelectedTx   = idx;
        ssrfSelectedMode = null;
        updateSSRFApplyBtn();
        renderSSRFTxList();
        renderSSRFModeList();
    };

    function renderSSRFModeList() {
        const list = document.getElementById('ssrfModeList');
        if (!list) return;
        const tx = ssrfTransmitters[ssrfSelectedTx];
        if (!tx) { list.innerHTML = ''; return; }

        list.innerHTML = tx.modes.map((m, mi) => {
            const active = mi === ssrfSelectedMode;
            const freqStr = m.tunings.length
                ? m.tunings.map(t => `${t.min}–${t.max} MHz`).join(', ')
                : '—';
            return `<div onclick="selectSSRFMode(${mi})"
                        style="padding:10px 14px;cursor:pointer;font-size:0.8rem;
                               background:${active ? 'rgba(16,185,129,0.12)' : 'transparent'};
                               border-left:3px solid ${active ? '#10b981' : 'transparent'};
                               border-bottom:1px solid rgba(255,255,255,0.04);
                               transition:background 0.1s;"
                        onmouseenter="if(${mi}!==ssrfSelectedMode)this.style.background='rgba(255,255,255,0.04)'"
                        onmouseleave="this.style.background='${active ? 'rgba(16,185,129,0.12)' : 'transparent'}'">
                <div style="color:#e2e8f0;font-weight:500;">
                    ${m.emDesignator
                        ? `<span style="font-family:monospace;color:#34d399;">${esc(m.emDesignator)}</span>`
                        : `<span style="color:#64748b;">—</span>`}
                    <span style="color:#94a3b8;font-size:0.74rem;margin-left:6px;">${esc(m.emsClass || '')}</span>
                </div>
                <div style="color:#64748b;font-size:0.72rem;margin-top:2px;">
                    ${m.desc ? esc(m.desc) + ' &nbsp;·&nbsp; ' : ''}
                    ${m.powerW != null ? m.powerW + ' W &nbsp;·&nbsp; ' : ''}
                    ${freqStr}
                </div>
            </div>`;
        }).join('');
    }

    window.selectSSRFMode = function(mi) {
        ssrfSelectedMode = mi;
        updateSSRFApplyBtn();
        renderSSRFModeList();

        const tx = ssrfTransmitters[ssrfSelectedTx];
        const m  = tx?.modes[mi];
        if (!m) return;
        const summary = document.getElementById('ssrfSelectionSummary');
        if (summary) {
            summary.style.fontStyle = 'normal';
            summary.style.color     = '#e2e8f0';
            summary.innerHTML = `
                <strong>${esc(tx.name)}</strong>
                ${m.emDesignator ? ' &nbsp;·&nbsp; <span style="font-family:monospace;color:#34d399;">' + esc(m.emDesignator) + '</span>' : ''}
                ${m.powerW != null ? ' &nbsp;·&nbsp; ' + m.powerW + ' W' : ''}`;
        }
    };

    function updateSSRFApplyBtn() {
        const btn = document.getElementById('ssrfApplyBtn');
        if (!btn) return;
        const ready = ssrfSelectedTx !== null && ssrfSelectedMode !== null;
        btn.disabled = !ready;
        btn.style.opacity = ready ? '1' : '0.5';
        btn.style.cursor  = ready ? 'pointer' : 'default';
    }

    window.applySSRFMode = function() {
        const tx = ssrfTransmitters[ssrfSelectedTx];
        const m  = tx?.modes[ssrfSelectedMode];
        if (!tx || !m) return;

        // Switch to "Yes, I know the antenna/transmitter specs"
        setKnowsAntenna(true);

        // Populate fields
        if (m.emDesignator)  setVal('g_emissionDesignator', m.emDesignator);
        if (m.powerW != null) setVal('g_powerWatts', m.powerW);

        // Equipment make/model from transmitter name
        setVal('g_antennaMakeModel', tx.name + (tx.mfg ? ` (${tx.mfg})` : ''));

        // If frequency range available AND user hasn't picked a specific frequency yet,
        // switch to band mode and fill from the first tuning range
        if (m.tunings.length) {
            const allMin = Math.min(...m.tunings.map(t => t.min));
            const allMax = Math.max(...m.tunings.map(t => t.max));
            const freqStep = document.getElementById('g_specificFreq');
            if (freqStep && !freqStep.value && !gd.selectedBand) {
                setFreqMode('band');
                setVal('g_freqMin', allMin);
                setVal('g_freqMax', allMax);
            }
        }


        closeSSRFModal();
        showToast(`Equipment loaded: ${tx.name}`, 'success');
    };

    function esc(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── Live preview panel ────────────────────────────────────────────────────
    let _previewTimer = null;

    function updatePreview() {
        const rpContent = document.getElementById('rpContent');
        if (!rpContent) return;

        const isGuided = currentMode === 'guided';

        const row = (label, value, cls) => {
            if (!value && value !== 0) return '';
            return `<div class="rp-row"><span class="rp-label">${label}</span><span class="${cls || 'rp-value'}">${value}</span></div>`;
        };

        const sec = (title, icon, content) => {
            if (!content.trim()) return '';
            return `<div class="rp-section"><div class="rp-section-title"><i class="fas ${icon}"></i> ${title}</div>${content}</div>`;
        };

        let hasAny = false;
        let html = '';

        if (isGuided) {
            // Type / Schedule
            let typeContent = '';
            if (gd.duration) {
                hasAny = true;
                typeContent += row('Duration', gd.duration === 'permanent' ? 'Permanent' : 'Temporary', 'rp-highlight');
                if (gd.nature) typeContent += row('Nature', gd.nature === 'training' ? 'Training / Exercise' : 'Real World');
            }
            const prio = val('g_priority');
            if (prio) typeContent += row('Priority', fmt(prio));
            html += sec('Request Type', 'fa-tag', typeContent);

            // Organization
            let orgContent = '';
            const unitEl = document.getElementById('g_unitId');
            const unitLabel = unitEl?.value ? unitEl.options[unitEl.selectedIndex]?.text : null;
            if (unitLabel) { hasAny = true; orgContent += row('Unit', unitLabel); }
            const poc = val('g_requestingPoc');
            if (poc) { hasAny = true; orgContent += row('POC', poc); }
            const phone = val('g_pocPhone');
            if (phone) orgContent += row('Phone', phone);
            const ismEl = document.getElementById('g_ismOffice');
            const ismLabel = ismEl?.value ? ismEl.options[ismEl.selectedIndex]?.text : null;
            if (ismLabel) orgContent += row('ISM Office', ismLabel);
            html += sec('Organization', 'fa-users', orgContent);

            // Frequency
            let freqContent = '';
            const fMode = gd.freqMode || 'specific';
            if (fMode === 'specific') {
                const freq = val('g_specificFreq');
                if (freq) { hasAny = true; freqContent += row('Frequency', freq + ' MHz', 'rp-highlight'); }
            } else {
                const fMin = val('g_freqMin'), fMax = val('g_freqMax');
                if (fMin || fMax) {
                    hasAny = true;
                    const bandStr = (fMin && fMax) ? `${fMin} – ${fMax} MHz` : (fMin ? `≥${fMin} MHz` : `≤${fMax} MHz`);
                    freqContent += row('Band', bandStr, 'rp-highlight');
                }
            }
            const emission = val('g_emissionDesignator') || null;
            if (emission) freqContent += row('Emission', emission);
            const power = val('g_powerWatts');
            if (power) freqContent += row('Power', power + ' W');
            html += sec('Frequency', 'fa-wave-square', freqContent);

            // Equipment
            let eqContent = '';
            const equipSel = document.getElementById('g_equipLibSel');
            const equipName = equipSel?.value ? equipSel.options[equipSel.selectedIndex]?.text : null;
            if (equipName && equipName !== '— Select from library —') eqContent += row('Equipment', equipName);
            const txSel = document.getElementById('g_txSel');
            const txName = txSel?.value ? txSel.options[txSel.selectedIndex]?.text : null;
            if (txName && txName !== '— Select transmitter —') eqContent += row('Transmitter', txName);
            const modeSel = document.getElementById('g_modeSel');
            const modeName = modeSel?.value ? modeSel.options[modeSel.selectedIndex]?.text : null;
            if (modeName && modeName !== '— Select mode —') eqContent += row('Mode', modeName);
            eqContent += row('Encrypted', gd.isEncrypted ? 'Yes' : 'No');
            if (gd.knowsAntenna) {
                const antennaTypeEl = document.getElementById('g_antennaTypeText');
                const antennaType = antennaTypeEl?.value || val('g_antennaType');
                if (antennaType) eqContent += row('Antenna', antennaType);
                const antMakeModel = val('g_antennaMakeModel');
                if (antMakeModel) eqContent += row('Make / Model', antMakeModel);
                const antGain = val('g_antennaGain');
                if (antGain) eqContent += row('Gain', antGain + ' dBi');
            }
            html += sec('Equipment', 'fa-microchip', eqContent);

            // Schedule / Coverage
            let schedContent = '';
            const startDate = val('g_startDate');
            if (startDate) { hasAny = true; schedContent += row('Start', startDate); }
            const endDate = val('g_endDate');
            if (endDate) {
                schedContent += row('End', endDate);
            } else if (gd.duration !== 'permanent' && startDate) {
                schedContent += `<div class="rp-row"><span class="rp-label">End</span><span class="rp-warn">Required</span></div>`;
            }
            const coverage = val('g_coverageArea');
            if (coverage) schedContent += row('Coverage', coverage);
            const hours = val('g_time130');
            if (hours) schedContent += row('Hours (130)', hours);
            html += sec('Schedule', 'fa-calendar-alt', schedContent);

            // Justification
            let justContent = '';
            const purpose = val('g_purpose');
            if (purpose) { hasAny = true; justContent += row('Purpose', purpose); }
            const just = val('g_justification');
            if (just) justContent += row('Description of Use', just);
            html += sec('Justification', 'fa-clipboard-check', justContent);

        } else {
            // Manual mode

            // Request
            let reqContent = '';
            const mUnitEl = document.getElementById('m_unitId');
            const mUnitLabel = mUnitEl?.value ? mUnitEl.options[mUnitEl.selectedIndex]?.text : null;
            if (mUnitLabel) { hasAny = true; reqContent += row('Unit', mUnitLabel); }
            const mType = val('m_requestType');
            if (mType) { hasAny = true; reqContent += row('Type', fmt(mType), 'rp-highlight'); }
            const mPrio = val('m_priority');
            if (mPrio) reqContent += row('Priority', fmt(mPrio));
            html += sec('Request', 'fa-tag', reqContent);

            // Frequency
            let freqContent = '';
            const mFreq = val('m_requestedFreq');
            if (mFreq) { hasAny = true; freqContent += row('Frequency', mFreq + ' MHz', 'rp-highlight'); }
            const mFMin = val('m_freqMin'), mFMax = val('m_freqMax');
            if (mFMin || mFMax) {
                hasAny = true;
                freqContent += row('Band', `${mFMin || '?'} – ${mFMax || '?'} MHz`, 'rp-highlight');
            }
            const mEm = val('m_emissionDesignator');
            if (mEm) freqContent += row('Emission', mEm);
            const mPow = val('m_powerWatts');
            if (mPow) freqContent += row('Power', mPow + ' W');
            html += sec('Frequency', 'fa-wave-square', freqContent);

            // Schedule
            let schedContent = '';
            const mStart = val('m_startDate');
            if (mStart) { hasAny = true; schedContent += row('Start', mStart); }
            const mEnd = val('m_endDate');
            if (mEnd) schedContent += row('End', mEnd);
            html += sec('Schedule', 'fa-calendar-alt', schedContent);

            // Justification
            let justContent = '';
            const mPurpose = val('m_purpose');
            if (mPurpose) { hasAny = true; justContent += row('Purpose', mPurpose); }
            const mJust = val('m_justification');
            if (mJust) justContent += row('Justification', mJust);
            html += sec('Justification', 'fa-clipboard-check', justContent);
        }

        rpContent.innerHTML = hasAny ? html : `<div class="rp-empty"><i class="fas fa-pen" style="display:block;font-size:1.4rem;margin-bottom:0.5rem;opacity:0.25;"></i>Fill out the form to see a live summary here.</div>`;
    }

    function schedulePreview() {
        clearTimeout(_previewTimer);
        _previewTimer = setTimeout(updatePreview, 100);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function val(id)    { return document.getElementById(id)?.value || ''; }
    function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
    function numVal(id) { const v = parseFloat(val(id)); return isNaN(v) ? null : v; }
    function intVal(id) { const v = parseInt(val(id));   return isNaN(v) ? null : v; }

    function showToast(msg, type) {
        const colors = {
            success: 'linear-gradient(135deg,#10b981,#059669)',
            error:   'linear-gradient(135deg,#ef4444,#dc2626)',
            warning: 'linear-gradient(135deg,#f59e0b,#d97706)'
        };
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle' };
        const t = document.createElement('div');
        t.className = 'toast';
        t.style.background = colors[type] || colors.success;
        t.style.animation = 'toastIn 0.3s ease';
        t.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i> ${msg}`;
        document.body.appendChild(t);
        setTimeout(() => {
            t.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => t.remove(), 320);
        }, 4000);
    }

})();

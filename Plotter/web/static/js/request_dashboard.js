// request_dashboard.js - Frequency Request Dashboard

// ── Pub7 field help ──────────────────────────────────────────────────────────
const PUB7 = {
  '005': { name: 'Security Classification', desc: 'Two-part field: a 2-letter code for the record\'s security classification and special handling (e.g., UE = Unclassified/Not releasable outside USG), optionally followed by 10-char declassification instructions required for C/S/T records.', fmt: '2 chars + optional 10-char declassification suffix', req: 'Mandatory on all transactions; cannot be deleted, only changed via Data Item 006.', ex: 'UE  |  SH,DE25X5  |  CE,DE20431231' },
  '010': { name: 'Type of Action', desc: 'Single-character code that tells the FRRS what operation to perform on the record.', fmt: '1 char', req: 'Mandatory on all transactions.', ex: 'N (New)  |  M (Modification)  |  D (Delete)  |  A (Admin Mod)  |  R (Renewal)' },
  '102': { name: 'Agency Serial Number', desc: 'Primary FRRS record identifier — unique, permanent, and cannot be changed. Format is AAAAYYNNNN: 4-char agency code, 2-digit year, 4-digit sequence number.', fmt: '10 chars (AAAAYYNNNN)', req: 'Required for all action types that will be entered into the FRRS database.', ex: 'AF 191234  |  AR 190123' },
  '110': { name: 'Frequency', desc: 'The discrete frequency or band assigned. Use K prefix for <30 MHz, M for 30 MHz–100 GHz. A reference (dial/window) frequency is appended in parentheses.', fmt: '11 chars or band or with reference freq', req: 'Mandatory; cannot be changed via Modification — a new proposal is required.', ex: 'K17034  |  K6737.5(6736)  |  K2000-M30' },
  '131': { name: 'Percent Time', desc: 'The percentage of time the transmitter is in use during its scheduled hours of operation.', fmt: '2 chars (numeric percent)', req: 'Required for EUCOM Germany assignments; optional for all others.', ex: '50' },
  '140': { name: 'Required Date', desc: 'The date (YYYYMMDD) when the new assignment or modification must be operational. For exercises, enter the first date the frequencies are needed.', fmt: '8 chars (YYYYMMDD)', req: 'Required for CENTCOM assignments; optional for others.', ex: '20190101' },
  '141': { name: 'Expiration Date', desc: 'The date (YYYYMMDD) when the assignment expires. Must be blank when a review date (142) is present.', fmt: '8 chars (YYYYMMDD)', req: 'Required for all temporary assignments.', ex: '20190622' },
  '144': { name: 'Approval Authority Indicator', desc: 'Indicates whether the assignment must be processed through NTIA/IRAC. Y = IRAC required, O = OUS&P (no IRAC), U = US&P non-IRAC, N = admin mod to an IRAC record.', fmt: '1 char (Y/O/U/N)', req: 'Required on all DoD frequency transactions.', ex: 'Y  |  O  |  U' },
  '151': { name: 'Coordination Indicator', desc: 'Indicates whether IRAC has coordinated the application with Canada, Mexico, or both (US border), or with NATO/host nations (EUCOM assignments).', fmt: '1 char', req: 'Enter for US-border assignments or EUCOM assignments requiring host-nation coordination.', ex: 'C (Canada)  |  M (Mexico)  |  B (both)  |  H (Host Nation)' },
  '200': { name: 'Agency', desc: 'Identifies the military service or agency responsible for managing the frequency assignment (e.g., USAF, USA, DON, MC, NSA, USCG, or JNTSVC for joint use).', fmt: '6 chars', req: 'Enter the appropriate service/agency abbreviation.', ex: 'USAF  |  USA  |  DON  |  JNTSVC' },
  '201': { name: 'Unified Command', desc: 'Identifies the geographic Combatant Command (CCMD) responsible for the area where the assignment will be used.', fmt: '8 chars — up to 10 occurrences', req: 'Required for all assignments where any transmitter or receiver is located OUS&P.', ex: 'USINDOPACOM  |  EUCOM  |  CENTCOM' },
  '202': { name: 'Unified Command Service', desc: 'Identifies the service-level organization (MAJCOM or Specified/Unified Command) within the CCMD area, or the MAJCOM of the host installation within CONUS.', fmt: '8 chars — up to 10 occurrences', req: 'Enter the MAJCOM or command with operational control of the installation or region.', ex: 'PACAF  |  FORSCOM  |  USMC' },
  '203': { name: 'Bureau', desc: 'Identifies the Army, Navy, or Marine Corps bureau code included in the record.', fmt: '4 chars', req: 'Required for Army, USMC, and USN assignments worldwide.', ex: 'PA  |  USMC  |  USN' },
  '204': { name: 'Command', desc: 'Identifies the Major Command or equivalent organization subordinate to the agency in Data Item 200.', fmt: '18 chars', req: 'Required in all assignments.', ex: 'ACC  |  TRADOC  |  USARPAC' },
  '205': { name: 'Subcommand', desc: 'Identifies the frequency management level between the command (204) and the installation frequency manager (206).', fmt: '18 chars', req: 'Enter when an intermediate command level exists between 204 and 206.', ex: '5AF  |  1106SIGBDE' },
  '206': { name: 'Installation Frequency Manager', desc: 'Identifies the station, base, or installation-level frequency management office responsible for the operating unit\'s location.', fmt: '18 chars', req: 'Enter the installation frequency manager when one exists.', ex: 'ANDREWS  |  LIBERTY  |  NASPAXRV' },
  '207': { name: 'Operating Unit', desc: 'Identifies the organization that actually uses the frequency assignment — the short name or designation of the unit.', fmt: '18 chars — up to 10 occurrences', req: 'Required on all assignments.', ex: '602TCW  |  SUBRON18  |  517ARTY' },
  '208': { name: 'User Net/Code', desc: 'A unique code identifying the specific user of the frequency. Army enters a Net Control Code; Navy enters the Unit Identification Code (UIC).', fmt: '6 chars', req: 'Submitted to IRAC for Army and NSA records only.', ex: 'N53618  |  ACEUS' },
  '209': { name: 'Area AFC / Other Organizations', desc: 'Identifies any DoD Area Frequency Coordinator (AFC), CCMD, or other organization not captured in Data Items 200–208.', fmt: '18 chars — up to 10 occurrences', req: 'Optional; enter standard DoD AFC codes or other applicable organizational identifiers.', ex: 'JJPN  |  GAFC  |  NAFC' },
  '300': { name: 'State/Country (Transmitter)', desc: 'Authorized abbreviation for the state, country, or geographical area where the transmitting station is located. Cannot be changed via Modification for IRAC-reportable records.', fmt: '4 chars', req: 'Required; enter the standard state/country abbreviation from Annex C.', ex: 'TX  |  J (Japan)  |  PAC  |  SPCE' },
  '301': { name: 'Antenna Location (Transmitter)', desc: 'Name of the city, base, or area of operation within the state/country (300) where the transmitting antenna is located. If 300 and 301 are identical, the record is treated as an area assignment.', fmt: '24 chars', req: 'Required; use standardized abbreviations (e.g., FT for Fort, JB for Joint Base).', ex: 'FT LIBERTY  |  NASHVILLE  |  ANDERSEN' },
  '303': { name: 'Antenna Coordinates (Transmitter)', desc: 'WGS-84 latitude and longitude of the transmitter antenna in degrees-minutes-seconds (DDMMSSNdddMMSSH). Required for interference analysis.', fmt: '15 chars (DDMMSSNdddMMSSH)', req: 'Required except for non-geostationary satellites or area-of-operation sites where coordinates are not applicable.', ex: '214216N1171039W' },
  '306': { name: 'Authorized Radius (Transmitter)', desc: 'Radius in nautical miles defining the area of operation for a portable, mobile, or transportable transmitter, measured from coordinates in Data Item 303. Append T (transmitter only) or B (covers both TX and RX). Receiver-only radius goes in field 406.', fmt: '5 chars (numeric + T or B suffix)', req: 'Required for CENTCOM and when a mobile/transportable transmitter uses a circular area of operation.', ex: '30T  |  150B' },
  '340': { name: 'Equipment Nomenclature (Transmitter)', desc: 'Two-part field: a type code (G = government, C = commercial) followed by the military nomenclature or commercial make/model of the transmitter.', fmt: '1 char type + comma + up to 18-char nomenclature — up to 10 occurrences', req: 'Required; accompany with Data Item 343 (J/F 12 number) when known.', ex: 'G,AN/GRC-103  |  C,MOTH23FFN1130E' },
  '341': { name: 'Number of Stations / System Name', desc: 'Number of land-mobile, transportable, or portable stations associated with the assignment (rounded per table) and an optional system name.', fmt: '5 chars (station count) + comma + 29 chars (system name) — up to 3 occurrences', req: 'Required in specified VHF/UHF land-mobile bands (30–50, 138–174, 406–420 MHz, 1030 MHz); optional elsewhere.', ex: '1001,NET  |  30,MOBNET' },
  '343': { name: 'Equipment Certification ID (J/F 12)', desc: 'The J/F 12 (DD Form 1494) certification number assigned to the transmitter equipment by the MC4EB ESG PWG.', fmt: '15 chars — up to 10 occurrences', req: 'Enter when known; must be accompanied by a corresponding entry in Data Item 340.', ex: 'J/F 12/01234  |  PC /01234' },
  '354': { name: 'Antenna Name (Transmitter)', desc: 'Generic name for the type of transmitter antenna per NTIA Manual Annex G (e.g., PARABOLIC, WHIP, YAGI).', fmt: '10 chars — up to 10 occurrences', req: 'Required for terrestrial stations operating at 29,890 kHz and above (except experimental/mobile); required for all CENTCOM assignments.', ex: 'PARABOLIC  |  WHIP  |  YAGI' },
  '355': { name: 'Antenna Nomenclature (Transmitter)', desc: 'Standard military nomenclature or commercial manufacturer\'s make and model of the transmitter antenna.', fmt: '18 chars — up to 10 occurrences', req: 'Required except when the antenna is part of a satellite transponder.', ex: 'AS102  |  RCATVM000IA' },
  '356': { name: 'Antenna Structure Height (Transmitter)', desc: 'Overall height in meters of the transmitter antenna support structure above ground level.', fmt: '3 chars (meters) — up to 10 occurrences', req: 'Required for EUCOM assignments; optional for all others. Not applicable to mobile services unless fixed.', ex: '17' },
  '357': { name: 'Antenna Gain (Transmitter)', desc: 'Antenna gain in dBi (decibels relative to an isotropic source) in the direction of maximum radiation. Used directly in interference analysis — missing data reduces accuracy.', fmt: '3 chars — up to 10 occurrences', req: 'Required for CENTCOM; may be omitted for mobile/experimental terrestrial stations above 29,890 kHz.', ex: '20  |  4.5' },
  '358': { name: 'Antenna Elevation (Transmitter)', desc: 'Terrain elevation (meters AMSL) at the base of the transmitter antenna structure — not the height of the antenna itself.', fmt: '4 chars — up to 10 occurrences', req: 'Required for frequencies at 29,890 kHz and above; may be omitted for experimental and mobile terrestrial stations.', ex: '980' },
  '359': { name: 'Antenna Feed Point Height (Transmitter)', desc: 'Distance in meters between the transmitter antenna feedpoint and the terrain. Used in frequency nomination or interference analysis; omitting this value causes a default to be used, reducing analysis accuracy.', fmt: '5 chars — up to 10 occurrences', req: 'Required except for applications below 29,890 kHz and for experimental, mobile terrestrial, or transportable stations at 29,890 kHz and above.', ex: '10' },
  '360': { name: 'Antenna Horizontal Beamwidth (Transmitter)', desc: 'Angular beamwidth in degrees at the half-power (−3 dB) points of the transmitter antenna horizontal pattern. For fractional beamwidths, prefix the decimal with a zero.', fmt: '4 chars — up to 10 occurrences', req: 'Required for space, earth, or terrestrial stations employing space or earth station techniques.', ex: '0.5  |  12  |  17.2' },
  '361': { name: 'Antenna Vertical Beamwidth (Transmitter)', desc: 'Transmitter antenna vertical beamwidth in degrees, measured between the half-power (−3 dB) points of the vertical pattern.', fmt: '3 chars — up to 10 occurrences', req: 'Required for EUCOM assignments; optional for all others.', ex: '23' },
  '458': { name: 'Antenna Elevation (Receiver)', desc: 'Terrain elevation (meters AMSL) at the base of the receiver antenna structure.', fmt: '4 chars — up to 10 occurrences', req: 'Required for fixed receiver stations at 29,890 kHz and above.', ex: '980' },
  '459': { name: 'Antenna Feed Point Height (Receiver)', desc: 'Distance in meters between the receiver antenna feedpoint and the terrain. Used in frequency nomination or interference analysis; omitting this value causes a default to be used, reducing analysis accuracy.', fmt: '5 chars — up to 10 occurrences', req: 'Required except for applications below 29,890 kHz and for experimental, mobile terrestrial, or transportable stations at 29,890 kHz and above.', ex: '10' },
  '460': { name: 'Antenna Horizontal Beamwidth (Receiver)', desc: 'Angular beamwidth in degrees at the half-power (−3 dB) points of the receiver antenna horizontal pattern. For fractional beamwidths, prefix the decimal with a zero.', fmt: '4 chars — up to 10 occurrences', req: 'Required for space, earth, or terrestrial stations employing space or earth station techniques.', ex: '0.5  |  12' },
  '461': { name: 'Antenna Vertical Beamwidth (Receiver)', desc: 'Receiver antenna vertical beamwidth in degrees, measured between the half-power (−3 dB) points of the vertical pattern.', fmt: '3 chars — up to 10 occurrences', req: 'Required for EUCOM assignments; optional for all others.', ex: '23' },
  '362': { name: 'Antenna Orientation (Transmitter)', desc: 'Physical direction or movement of the transmitter antenna. For terrestrial stations: azimuth in degrees from true north or a movement code (ND = non-directional, R = rotating, S = steerable, SSH/SSV = semi-fixed, T = tracking).', fmt: '2–7 chars — up to 10 occurrences', req: 'Required for all earth, space, and terrestrial stations.', ex: '225  |  ND  |  R  |  EC' },
  '363': { name: 'Antenna Polarization (Transmitter)', desc: 'Single-character code for the polarization of the transmitted wave (V = vertical, H = horizontal, R = right-hand circular, L = left-hand circular, etc.).', fmt: '1 char — up to 10 occurrences', req: 'Required for terrestrial stations at 420 MHz and above (with exceptions), all earth/space stations, and Canadian border assignments above 1000 MHz.', ex: 'V  |  H  |  R  |  L' },
  '502': { name: 'Description of Requirement', desc: 'Free-text internal agency remarks describing the purpose and operational context of the assignment. Not submitted to NTIA/GMF — DoD internal use only.', fmt: 'Up to 1,440 chars (max 72/line, max 20 lines)', req: 'Required for CENTCOM assignments; optional for all others. Delete and re-enter entire block to modify.', ex: 'THIS ASSIGNMENT PROVIDES TWO ADDITIONAL VOICE CHANNELS' },
  '503': { name: 'Agency Free-Text Comments', desc: 'Free-text remarks submitted to NTIA and stored in the GMF. Use for remarks intended for IRAC review. Internal-only remarks go in 502.', fmt: '35 chars/line — up to 30 occurrences', req: 'Optional; remarks intended for IRAC go here rather than in 502.', ex: 'ACME ELECTRONIC CORP TO SUPPORT EXP TELECOMMAND SYSTEM' },
  '504': { name: 'FAS Agenda / OUS&P Comments', desc: 'Information provided to IRAC FAS members reviewing the assignment agenda. Appears only in the FAS Agenda Action File and FRRS permanent proposal records — not stored in the GMF or FRRS databases.', fmt: '72 chars/line — up to 5 occurrences', req: 'Use to communicate processing notes to FAS reviewers.', ex: 'FIVE YEAR REVIEW UPDATE  |  RECORD REVIEW - NO CHANGES' },
  '511': { name: 'Major Function Identifier (MFI)', desc: 'MC4EB-standardized code identifying the primary operational function of the frequency assignment (e.g., AIR OPERATIONS, GROUND OPERATIONS, C3).', fmt: '30 chars', req: 'Required for all DoD assignments; entries must come from the MC4EB-approved Annex G list.', ex: 'AIR OPERATIONS  |  GROUND OPERATIONS  |  C3' },
  '512': { name: 'Intermediate Function Identifier (IFI)', desc: 'MC4EB-standardized code identifying the sub-function of the frequency assignment, subordinate to the Major Function Identifier in Data Item 511.', fmt: '30 chars', req: 'Required for all DoD assignments; entries must come from the MC4EB-approved Annex G list.', ex: 'AIR TRAFFIC CONTROL  |  INFANTRY  |  DATA LINK' },
  '513': { name: 'Detailed Function Identifier (DFI)', desc: 'MC4EB-standardized code for the detailed function of the frequency assignment, subordinate to Data Items 511 and 512. Up to 5 occurrences permitted.', fmt: '30 chars — up to 5 occurrences', req: 'Required when the function appears in the DFI column of Annex G; otherwise optional.', ex: 'GROUND CONTROL  |  TADIL-C  |  AIRBORNE INFANTRY' },
  '520': { name: 'Supplementary Details', desc: 'Free-text IRAC-submitted field for additional amplifying information: Doppler shift, sounder justification, coordination data, etc. Submitted to NTIA and stored in the GMF.', fmt: 'Up to 1,080 chars (max 72/line, max 15 lines)', req: 'Required for certain assignment types (experimental, transportable earth stations, sounders, frequency diversity); optional otherwise.', ex: 'COORDINATED WITH FAA AS0406' },
  '701': { name: 'Frequency Action Officer', desc: 'MILDEP code (3 characters) identifying the person or group responsible for the assignment at the major headquarters level.', fmt: '3 chars', req: 'Required for Air Force assignments; optional for all others.', ex: 'T08  |  322  |  T04' },
  '702': { name: 'Control / Request Number', desc: 'Organizational control or request number allowing subordinate organizations to track specific frequency applications through the approval chain.', fmt: '15 chars', req: 'Required; format varies by service/CCMD.', ex: 'ACC 81-007  |  USAREUR19-266' },
  '704': { name: 'Type of Service', desc: 'Single-character code identifying the circuit type or service mode (e.g., simplex, duplex, broadcast, radionavigation).', fmt: '1 char', req: 'Required for EUCOM assignments; optional for all others.', ex: 'S (simplex)  |  D (full duplex)  |  H (half-duplex)  |  N (radionavigation)' },
  '711': { name: 'Aeronautical Service Range and Height', desc: 'Service range (nautical miles) and flight level (thousands of feet) for aeronautical NAVAIDS and ATC assignments above 29,890 kHz and for LF beacons.', fmt: '6 chars: 3-digit NM range + 3-digit flight level (×1000 ft)', req: 'Required for aeronautical NAVAIDS and ATC assignments; required by CENTCOM.', ex: '250050 (250 NM range, 50,000 ft)' },
  '716': { name: 'Usage Code', desc: 'Single-digit code denoting whether the assignment is required in wartime, peacetime, contingency, training exercises, or deployment phases.', fmt: '1 char (1–7)', req: 'Required for all DoD assignments.', ex: '1 (wartime/peacetime-ready)  |  4 (training/exercises)  |  7 (peacetime only)' },
  '801': { name: 'Coordination Data / Remarks', desc: 'Free-text field listing agencies with which coordination has been accomplished and any processing remarks. Not retained in the FRRS database after approval.', fmt: '60 chars/line — up to 20 occurrences', req: 'Optional; list coordinating agencies (FAA, GAFC, etc.) and any processing remarks.', ex: 'GAFC 021200Z AUG 82' },
  '803': { name: 'Point of Contact', desc: 'Name and commercial phone number (and optionally date) of the individual submitting and/or validating the assignment data.', fmt: '35 chars', req: 'Required on all transactions; in CENTCOM must be kept current to reflect the actual frequency user.', ex: 'JIM HUNT,7032813824,160725' },
  '910': { name: 'Exercise / Project', desc: 'Name of the project, exercise, OPLAN, CONPLAN, or mission associated with the frequency assignment.', fmt: '20 chars', req: 'Required for CENTCOM assignments; optional for all others.', ex: 'GUARDRAIL  |  OPLAN 5027' },
};

(function initPub7Help() {
    const pop = document.getElementById('pub7-popover');
    if (!pop) return;

    let pinned = false;
    let hoverTimer = null;

    function fieldNumFrom(forAttr) {
        // sfaf_005_1 → '005', sfaf_354 → '354', sfaf_511 → '511'
        const m = forAttr.match(/^sfaf_(\d+)/);
        return m ? m[1] : null;
    }

    function show(btn, entry) {
        pop.innerHTML =
            `<div class="p7-field">SFAF Field ${btn.dataset.field}</div>` +
            `<div class="p7-name">${entry.name}</div>` +
            `<div class="p7-desc">${entry.desc}</div>` +
            `<div class="p7-meta">` +
            (entry.fmt ? `<span><strong>Format:</strong> ${entry.fmt}</span>` : '') +
            (entry.req ? `<span><strong>Req:</strong> ${entry.req}</span>` : '') +
            (entry.ex  ? `<span class="p7-ex"><strong>Ex:</strong> ${entry.ex}</span>` : '') +
            `</div>`;

        const rect = btn.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        const popW = 340, popH = 220;

        let left = rect.left;
        let top  = rect.bottom + 6;
        if (left + popW > vw - 8) left = vw - popW - 8;
        if (top  + popH > vh - 8) top  = rect.top - popH - 6;

        pop.style.left = left + 'px';
        pop.style.top  = top  + 'px';
        pop.classList.add('visible');
    }

    function hide() {
        if (pinned) return;
        pop.classList.remove('visible');
    }

    document.addEventListener('click', e => {
        if (!e.target.closest('#pub7-popover') && !e.target.classList.contains('pub7-btn')) {
            pinned = false;
            pop.classList.remove('visible');
            document.querySelectorAll('.pub7-btn.active').forEach(b => b.classList.remove('active'));
        }
    });

    // Inject (?) buttons after DOM is ready
    document.querySelectorAll('label[for]').forEach(label => {
        const num = fieldNumFrom(label.getAttribute('for'));
        if (!num || !PUB7[num]) return;

        const btn = document.createElement('span');
        btn.className = 'pub7-btn';
        btn.textContent = '?';
        btn.dataset.field = num;
        btn.title = PUB7[num].name;

        btn.addEventListener('mouseenter', () => {
            if (pinned) return;
            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(() => show(btn, PUB7[num]), 180);
        });
        btn.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimer);
            if (!pinned) hide();
        });
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const isActive = btn.classList.contains('active');
            document.querySelectorAll('.pub7-btn.active').forEach(b => b.classList.remove('active'));
            if (isActive) {
                pinned = false;
                pop.classList.remove('visible');
            } else {
                pinned = true;
                btn.classList.add('active');
                show(btn, PUB7[num]);
            }
        });

        label.appendChild(btn);
    });
})();

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

const REVIEWER_ROLES = ['ism', 'command', 'combatant_command', 'agency', 'ntia', 'admin'];

let allRequests    = [];
let pendingRequests = [];
let currentTab     = 'permanent';
let currentRequestId = null;
let userRole       = null;
let userWorkbox    = null;
let currentUser    = null;

// ── SFAF field-lookup cache ───────────────────────────────────────────────────
// Populated once at page load; used to drive every managed <select> in the
// approval modal so that values maintained in the SFAF Codes admin tab are
// automatically reflected here without any code changes.

function calcSFAFHAMSL(elevId, feedpointId, hamslId) {
    const elev      = parseFloat(document.getElementById(elevId)?.value) || 0;
    const feedpoint = parseFloat(document.getElementById(feedpointId)?.value) || 0;
    const hamslEl   = document.getElementById(hamslId);
    if (!hamslEl) return;
    hamslEl.value = (elev || feedpoint) ? (elev + feedpoint).toFixed(1) : '';
}

const _LOOKUP_FIELDS = ['010','144','151','200','201','202','203','204','205','206','209','300','400','354','363','704','716'];
const _sfafLookupCache = {};  // fieldCode → [{value, label}]

let _serialNumberEntries = [];  // [{value, label}] for field 102 combobox

async function _loadSerialNumbers() {
    // No longer pre-fetching — picker loads on demand. Keep empty so the text field is free-form.
}

// ── Serial Number Picker ───────────────────────────────────────────────────
let _serialPickerRows = [];  // raw rows from last fetch
let _serialPickerPrefix = 'AF';

async function openSerialPicker() {
    document.getElementById('serialPickerModal').style.display = 'flex';
    document.getElementById('serialPickerSearch').value = '';
    await serialPickerBuildPrefixTabs();
}

async function serialPickerBuildPrefixTabs() {
    const container = document.getElementById('serialPrefixBtns');
    container.innerHTML = '<span style="color:#64748b;font-size:0.8rem;">Loading…</span>';
    try {
        const res  = await fetch('/api/serial-numbers/my-pool');
        const data = res.ok ? await res.json() : {};
        const pool = data.pool || [];
        // Collect distinct prefixes that have available serials
        const prefixes = [...new Set(pool.filter(r => r.available_count > 0).map(r => r.prefix))].sort();
        container.innerHTML = '';
        if (prefixes.length === 0) {
            container.innerHTML = '<span style="color:#64748b;font-size:0.8rem;font-style:italic;">No serials allocated to your unit.</span>';
            document.getElementById('serialPickerList').innerHTML = '';
            return;
        }
        prefixes.forEach((pfx, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-sm btn-secondary serial-prefix-btn' + (i === 0 ? ' active' : '');
            btn.dataset.prefix = pfx;
            btn.textContent = pfx;
            btn.onclick = () => serialPickerLoadPrefix(pfx, btn);
            container.appendChild(btn);
        });
        // Load first available prefix
        await serialPickerLoadPrefix(prefixes[0], container.querySelector('.serial-prefix-btn'));
    } catch (e) {
        container.innerHTML = '<span style="color:#ef5350;font-size:0.8rem;">Failed to load prefixes.</span>';
    }
}

function closeSerialPicker() {
    document.getElementById('serialPickerModal').style.display = 'none';
}

async function serialPickerLoadPrefix(prefix, btn) {
    _serialPickerPrefix = prefix;
    document.querySelectorAll('.serial-prefix-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.getElementById('serialPickerSearch').value = '';
    const list = document.getElementById('serialPickerList');
    list.innerHTML = '<div style="color:#64748b;font-size:0.85rem;grid-column:1/-1;text-align:center;padding:20px 0;">Loading…</div>';
    try {
        const res  = await fetch(`/api/serial-numbers/next?prefix=${encodeURIComponent(prefix)}&limit=50`);
        const data = await res.json();
        if (!res.ok) {
            list.innerHTML = `<div style="color:#ef5350;grid-column:1/-1;text-align:center;padding:20px 0;">Error: ${data.error || res.status}</div>`;
            return;
        }
        _serialPickerRows = data.serials || [];
        document.getElementById('serialPickerInfo').textContent =
            `Showing ${_serialPickerRows.length} next available (${prefix})`;
        serialPickerRender(_serialPickerRows);
    } catch (e) {
        console.error('Serial picker fetch failed:', e);
        list.innerHTML = `<div style="color:#ef5350;grid-column:1/-1;text-align:center;padding:20px 0;">Failed: ${e.message}</div>`;
    }
}

function serialPickerFilter() {
    const q = document.getElementById('serialPickerSearch').value.trim();
    if (!q) { serialPickerRender(_serialPickerRows); return; }
    const filtered = _serialPickerRows.filter(s => String(s.number).includes(q));
    serialPickerRender(filtered);
}

function serialPickerRender(rows) {
    const list = document.getElementById('serialPickerList');
    if (!rows.length) {
        list.innerHTML = '<div style="color:#64748b;font-size:0.85rem;grid-column:1/-1;text-align:center;padding:20px 0;">No matches</div>';
        return;
    }
    list.innerHTML = rows.map(s => `
        <button type="button" class="btn btn-sm btn-secondary"
            style="font-family:monospace;font-size:0.82rem;text-align:left;padding:5px 8px;"
            onclick="serialPickerSelect('${s.serial.trim()}')">
            ${s.serial.trim()}
        </button>`).join('');
}

function serialPickerSelect(serial) {
    document.getElementById('sfaf_102_text').value = serial;
    document.getElementById('sfaf_102').value = serial;
    closeSerialPicker();
}

// ── Pool Frequency Picker ──────────────────────────────────────────────────
let _poolPickerWindow = null;

function openPoolPicker() {
    if (_poolPickerWindow && !_poolPickerWindow.closed) {
        _poolPickerWindow.focus();
        return;
    }
    _poolPickerWindow = window.open(
        '/frequency-nomination',
        'poolPicker',
        'width=1300,height=750,resizable=yes,scrollbars=yes'
    );
}

function applyPoolSelection(data) {
    const input   = document.getElementById('sfaf_105');
    const clearBtn = document.getElementById('sfaf_105_clear');
    if (!input) return;
    input.value = data.serial || '';
    if (clearBtn) clearBtn.style.display = data.serial ? '' : 'none';

    // Auto-populate field 110 (frequency) if not already set
    const f110 = document.getElementById('sfaf_110');
    if (f110 && !f110.value.trim() && data.field110) {
        f110.value = data.field110;
        f110.dispatchEvent(new Event('input'));
    }
    // Auto-populate emission designator (field 114) if not already set
    const f114 = document.getElementById('sfaf_114');
    if (f114 && !f114.value.trim() && data.field114) {
        f114.value = data.field114;
        f114.dispatchEvent(new Event('input'));
    }
}

function clearPoolSelection() {
    const input   = document.getElementById('sfaf_105');
    const clearBtn = document.getElementById('sfaf_105_clear');
    if (input)   input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
}

// Listen for pool selection postMessage from the popup
window.addEventListener('message', function(event) {
    if (event.origin !== window.location.origin) return;
    if (!event.data || event.data.type !== 'pool-select') return;
    applyPoolSelection(event.data);
});

// ── AFSMO Serial Management ────────────────────────────────────────────────
let _smUnits = [];

async function openSerialMgmt() {
    document.getElementById('serialMgmtModal').style.display = 'flex';
    const filterSel = document.getElementById('smFilterPrefix');
    if (filterSel) filterSel.value = '';   // always start with All Prefixes
    const prefixSel = document.getElementById('smPrefix');
    if (prefixSel) prefixSel.value = 'AF';
    await Promise.all([smLoadUnits(), smLoadAllocations()]);
}

function closeSerialMgmt() {
    document.getElementById('serialMgmtModal').style.display = 'none';
}

async function smLoadUnits() {
    try {
        const res  = await fetch('/api/frequency/units/majcom');
        const data = res.ok ? await res.json() : {};
        _smUnits = (data.units || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        const sel = document.getElementById('smUnitId');
        sel.innerHTML = '<option value="">— Select MAJCOM —</option>' +
            _smUnits.map(u =>
                `<option value="${u.id}">${u.name}${u.unit_code ? ' (' + u.unit_code + ')' : ''}</option>`
            ).join('');
    } catch (e) {
        console.warn('smLoadUnits failed:', e);
    }
}

async function smLoadAllocations() {
    const prefix = document.getElementById('smFilterPrefix')?.value || '';
    const tbody  = document.getElementById('smTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:16px;">Loading…</td></tr>';
    try {
        const res = await fetch(`/api/serial-numbers/allocations${prefix ? '?prefix=' + prefix : ''}`);
        const data = res.ok ? await res.json() : {};
        const rows = data.allocations || [];
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:16px;">No allocations found.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(row => {
            const isUnalloc = !row.allocated_unit_id;
            const pct = row.total_allocated > 0
                ? Math.round((row.used_count / row.total_allocated) * 100)
                : 0;
            return `<tr>
                <td><span style="font-family:monospace;font-size:0.85rem;">${row.prefix}</span></td>
                <td>${isUnalloc
                    ? '<span style="color:#64748b;font-style:italic;">Unallocated</span>'
                    : row.unit_name}</td>
                <td style="font-family:monospace;font-size:0.78rem;color:#64748b;">${row.unit_code || '—'}</td>
                <td style="text-align:right;">${row.total_allocated.toLocaleString()}</td>
                <td style="text-align:right;color:#4ade80;">${row.available_count.toLocaleString()}</td>
                <td style="text-align:right;color:#94a3b8;">${row.used_count.toLocaleString()}
                    ${pct > 0 ? `<span style="font-size:0.72rem;color:#64748b;"> (${pct}%)</span>` : ''}
                </td>
                <td style="text-align:right;">
                    ${!isUnalloc ? `
                    <button class="btn-xs btn-xs-danger" onclick="smDeallocate('${row.allocated_unit_id}','${row.unit_name}','${row.prefix}')"
                        title="Remove all unassigned allocations for this unit">
                        <i class="fas fa-minus-circle"></i> Remove
                    </button>` : ''}
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ef5350;padding:16px;">Failed to load allocations.</td></tr>';
    }
}

async function smAllocate() {
    const prefix  = document.getElementById('smPrefix')?.value || 'AF';
    const unitId  = document.getElementById('smUnitId').value;
    const count   = parseInt(document.getElementById('smCount').value, 10);
    const msgEl   = document.getElementById('smAllocateMsg');

    if (!unitId) { smMsg('Select a unit first.', 'warning'); return; }
    if (!count || count < 1) { smMsg('Enter a valid count.', 'warning'); return; }

    const unitName = document.getElementById('smUnitId').selectedOptions[0]?.text || unitId;
    if (!confirm(`Allocate ${count.toLocaleString()} "${prefix}" serials to ${unitName}?`)) return;

    try {
        const res  = await fetch('/api/serial-numbers/allocate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefix, unit_id: unitId, count })
        });
        const data = await res.json();
        if (!res.ok) { smMsg(data.error || 'Allocation failed.', 'danger'); return; }
        smMsg(`Allocated ${data.allocated.toLocaleString()} serials to ${unitName}.`, 'success');
        smLoadAllocations();
    } catch (e) {
        smMsg('Error during allocation.', 'danger');
    }
}

async function smDeallocate(unitId, unitName, prefix) {
    if (!confirm(`Remove all unassigned "${prefix}" serial allocations from ${unitName}?\n\nSerials already assigned to frequency records will NOT be affected.`)) return;
    try {
        const res  = await fetch(`/api/serial-numbers/allocations/${unitId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) { smMsg(data.error || 'Deallocation failed.', 'danger'); return; }
        smMsg(`Removed ${data.deallocated.toLocaleString()} serial allocations from ${unitName}.`, 'success');
        smLoadAllocations();
    } catch (e) {
        smMsg('Error during deallocation.', 'danger');
    }
}

function smMsg(text, type) {
    const el = document.getElementById('smAllocateMsg');
    const colors = { success: '#4ade80', danger: '#ef5350', warning: '#fbbf24' };
    el.style.color = colors[type] || '#94a3b8';
    el.textContent = text;
    el.style.display = '';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ── MAJCOM Serial Sub-Allocation ──────────────────────────────────────────────

let _msMyUnitId = null;

async function openMajcomSerialMgmt() {
    document.getElementById('majcomSerialMgmtModal').style.display = 'flex';
    // Resolve own unit from the user profile
    try {
        const res  = await fetch('/api/user/profile');
        const data = res.ok ? await res.json() : {};
        _msMyUnitId = data.primary_unit_id || null;
    } catch (e) {
        _msMyUnitId = null;
    }
    await Promise.all([msLoadMyPool(), msLoadSubUnits(), msLoadSubAllocations()]);
}

function closeMajcomSerialMgmt() {
    document.getElementById('majcomSerialMgmtModal').style.display = 'none';
}

async function msLoadMyPool() {
    if (!_msMyUnitId) {
        document.getElementById('msMyPoolBody').textContent = 'Could not determine your unit.';
        return;
    }
    try {
        const res  = await fetch(`/api/serial-numbers/pool?unit_id=${_msMyUnitId}`);
        const data = res.ok ? await res.json() : {};
        const rows = data.pool || [];

        if (rows.length === 0) {
            document.getElementById('msMyPoolBody').textContent = 'No serials allocated to your unit.';
            return;
        }
        const html = rows.map(r => `
            <span style="display:inline-block;margin-right:24px;margin-bottom:4px;">
                <strong style="color:#e2e8f0;">${r.prefix}</strong>
                — <span style="color:#4ade80;">${r.available_count.toLocaleString()} available</span>
                / ${r.total_allocated.toLocaleString()} total
                (${r.used_count.toLocaleString()} used)
            </span>`).join('');
        document.getElementById('msMyPoolBody').innerHTML = html;
    } catch (e) {
        document.getElementById('msMyPoolBody').textContent = 'Error loading pool.';
    }
}

async function msLoadSubUnits() {
    if (!_msMyUnitId) {
        document.getElementById('msToUnitId').innerHTML = '<option value="">— Unit unknown —</option>';
        return;
    }
    try {
        const res  = await fetch(`/api/frequency/units/${_msMyUnitId}/subordinates`);
        const data = res.ok ? await res.json() : {};
        const sel  = document.getElementById('msToUnitId');
        const current = sel.value;
        sel.innerHTML = '<option value="">— Select unit —</option>';
        const units = data.units || [];
        if (units.length === 0) {
            sel.innerHTML = '<option value="">No subordinate units found</option>';
            return;
        }
        units.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.unit_code ? `${u.unit_code} — ${u.name}` : u.name;
            sel.appendChild(opt);
        });
        if (current) sel.value = current;
    } catch (e) {
        document.getElementById('msToUnitId').innerHTML = '<option value="">Error loading units</option>';
    }
}

async function msLoadSubAllocations() {
    if (!_msMyUnitId) return;
    const tbody = document.getElementById('msTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:20px;">Loading…</td></tr>';
    try {
        // Get allocations for all units; filter to ones whose serials came from our pool
        // We show the global allocation summary and let the admin see the context
        const res  = await fetch('/api/serial-numbers/allocations');
        const data = res.ok ? await res.json() : {};
        const rows = (data.allocations || []).filter(r => r.allocated_unit_id && r.allocated_unit_id !== _msMyUnitId);
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:20px;">No sub-allocations found.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(row => {
            return `<tr>
                <td><span class="badge badge-secondary">${row.prefix}</span></td>
                <td>${row.unit_name}</td>
                <td style="color:#64748b;font-size:0.8rem;">${row.unit_code || ''}</td>
                <td style="text-align:right;">${row.total_allocated.toLocaleString()}</td>
                <td style="text-align:right;color:#4ade80;">${row.available_count.toLocaleString()}</td>
                <td style="text-align:right;color:#f87171;">${row.used_count.toLocaleString()}</td>
                <td style="text-align:right;">
                    <button class="btn-xs btn-xs-danger" onclick="msReclaim('${row.allocated_unit_id}','${row.unit_name}','${row.prefix}')"
                        title="Reclaim all unassigned allocations from this unit">
                        <i class="fas fa-undo"></i> Reclaim
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ef5350;padding:20px;">Error loading allocations.</td></tr>';
    }
}

async function msSubAllocate() {
    const prefix  = document.getElementById('msPrefix').value;
    const toUnitId = document.getElementById('msToUnitId').value;
    const count   = parseInt(document.getElementById('msCount').value, 10);

    if (!_msMyUnitId) { msMsg('Could not determine your unit.', 'danger'); return; }
    if (!prefix)      { msMsg('Select a prefix first.', 'warning'); return; }
    if (!toUnitId)    { msMsg('Select a unit first.', 'warning'); return; }
    if (!count || count < 1) { msMsg('Enter a valid count.', 'warning'); return; }

    const unitName = document.getElementById('msToUnitId').selectedOptions[0]?.text || toUnitId;
    if (!confirm(`Sub-allocate ${count.toLocaleString()} "${prefix}" serials to ${unitName}?`)) return;

    try {
        const res  = await fetch('/api/serial-numbers/sub-allocate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_unit_id: _msMyUnitId, to_unit_id: toUnitId, prefix, count })
        });
        const data = await res.json();
        if (!res.ok) { msMsg(data.error || 'Sub-allocation failed.', 'danger'); return; }
        if (data.allocated === 0) { msMsg(`No "${prefix}" serials available in your pool. Contact AFSMO to allocate ${prefix} serials to your MAJCOM first.`, 'warning'); return; }
        msMsg(`Sub-allocated ${data.allocated.toLocaleString()} serials to ${unitName}.`, 'success');
        msLoadMyPool();
        msLoadSubAllocations();
    } catch (e) {
        msMsg('Error during sub-allocation.', 'danger');
    }
}

async function msReclaim(toUnitId, unitName, prefix) {
    if (!_msMyUnitId) { msMsg('Could not determine your unit.', 'danger'); return; }
    if (!confirm(`Reclaim all unassigned "${prefix}" serial allocations from ${unitName}?\n\nSerials already assigned to frequency records will NOT be affected.`)) return;
    try {
        const url = `/api/serial-numbers/sub-allocate?from_unit_id=${_msMyUnitId}&to_unit_id=${toUnitId}&count=0`;
        const res  = await fetch(url, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) { msMsg(data.error || 'Reclaim failed.', 'danger'); return; }
        msMsg(`Reclaimed ${data.reclaimed.toLocaleString()} serials from ${unitName}.`, 'success');
        msLoadMyPool();
        msLoadSubAllocations();
    } catch (e) {
        msMsg('Error during reclaim.', 'danger');
    }
}

function msMsg(text, type) {
    const el = document.getElementById('msAllocateMsg');
    const colors = { success: '#4ade80', danger: '#ef5350', warning: '#fbbf24' };
    el.style.color = colors[type] || '#94a3b8';
    el.textContent = text;
    el.style.display = '';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

async function _loadSfafLookups() {
    try {
        await Promise.all(_LOOKUP_FIELDS.map(async fc => {
            const res  = await fetch(`/api/sfaf-lookup?field=${fc}`);
            const data = res.ok ? await res.json() : {};
            _sfafLookupCache[fc] = (data.entries || []).filter(e => e.is_active !== false);
        }));
    } catch (e) {
        console.warn('SFAF lookup preload failed:', e);
    }
}

// Repopulate a <select> from the cache for the given fieldCode.
// keepCustom=true appends a "Custom…" option at the end (for 200-series).
// The current value is restored if it still exists in the new option list.
function _populateSfafSelect(selectId, fieldCode, keepCustom = false) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const entries = _sfafLookupCache[fieldCode] || [];
    if (entries.length === 0) return;   // leave hardcoded fallback in place

    const currentVal = sel.value;
    const placeholder = sel.querySelector('option[value=""]');
    const placeholderText = placeholder?.textContent || '— Select —';

    sel.innerHTML = '';

    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = placeholderText;
    sel.appendChild(ph);

    entries.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.value;
        opt.textContent = e.label ? `${e.value} — ${e.label}` : e.value;
        sel.appendChild(opt);
    });

    if (keepCustom) {
        const custom = document.createElement('option');
        custom.value = 'CUSTOM';
        custom.textContent = 'Custom…';
        sel.appendChild(custom);
    }

    if (currentVal && [...sel.options].some(o => o.value === currentVal)) {
        sel.value = currentVal;
    }
}

// Build combined state/country entry list from both field '300' (US states/territories)
// and field '400' (countries), deduplicated by value so overlapping codes appear once.
function _buildStateCountryEntries() {
    const seen = new Set();
    return [...(_sfafLookupCache['300'] || []), ...(_sfafLookupCache['400'] || [])].filter(e => {
        if (seen.has(e.value)) return false;
        seen.add(e.value);
        return true;
    });
}

// Wire up a filterable combobox: text input filters the dropdown; selection commits
// the code value to the paired hidden input.  Safe to call multiple times — re-init
// is skipped if the text element already has data-combo-init set.
function _initLookupComboByEl(textEl, hiddenEl, listEl, entries) {
    if (!textEl || !hiddenEl || !listEl) return;
    if (textEl.dataset.comboInit) return;
    textEl.dataset.comboInit = '1';

    function renderList(filter) {
        const q = (filter || '').toLowerCase();
        const matches = q
            ? entries.filter(e =>
                e.value.toLowerCase().includes(q) ||
                (e.label || '').toLowerCase().includes(q))
            : entries;
        if (matches.length === 0) {
            listEl.innerHTML = '<div class="lookup-combo-empty">No matches</div>';
        } else {
            listEl.innerHTML = matches.map(e => {
                const d = e.label ? `${e.value} — ${e.label}` : e.value;
                return `<div class="lookup-combo-item" data-value="${e.value}">${d}</div>`;
            }).join('');
            listEl.querySelectorAll('.lookup-combo-item').forEach(item => {
                item.addEventListener('mousedown', ev => {
                    ev.preventDefault();
                    hiddenEl.value = item.dataset.value;
                    textEl.value   = item.textContent;
                    listEl.style.display = 'none';
                });
            });
        }
        listEl.style.display = '';
    }

    textEl.addEventListener('focus', () => renderList(textEl.value));
    textEl.addEventListener('input', () => renderList(textEl.value));
    textEl.addEventListener('blur', () => {
        setTimeout(() => { listEl.style.display = 'none'; }, 150);
        // Commit typed text: exact code match → expand to full display; otherwise accept as custom.
        const raw = textEl.value.trim();
        if (!raw) { hiddenEl.value = ''; return; }
        if (hiddenEl.value) return; // already committed via mousedown
        const match = entries.find(e => e.value.toUpperCase() === raw.toUpperCase());
        if (match) {
            hiddenEl.value = match.value;
            textEl.value   = match.label ? `${match.value} — ${match.label}` : match.value;
        } else {
            hiddenEl.value = raw;
        }
    });

    // Clear the committed value when the user starts editing so blur can re-evaluate.
    textEl.addEventListener('input', () => { hiddenEl.value = ''; });
}

// Sync the text display with whatever value is currently in the hidden input.
// Call after draft restore / setVal / form reset.
function _syncComboboxText(textId, hiddenId, entries) {
    const textEl   = document.getElementById(textId);
    const hiddenEl = document.getElementById(hiddenId);
    if (!textEl || !hiddenEl) return;
    if (!hiddenEl.value) { textEl.value = ''; return; }
    const e = entries.find(x => x.value === hiddenEl.value);
    textEl.value = e ? (e.label ? `${e.value} — ${e.label}` : e.value) : hiddenEl.value;
}

// Repopulate every lookup-backed select in the approval modal.
function _populateAllApprovalSelects() {
    // Simple selects (no custom option)
    _populateSfafSelect('sfaf_010',  '010');
    _populateSfafSelect('sfaf_144',  '144');
    _populateSfafSelect('sfaf_151',  '151');
    _populateSfafSelect('sfaf_354',  '354');
    _populateSfafSelect('sfaf_454',  '354');   // RX antenna uses same list as TX
    _populateSfafSelect('sfaf_363',  '363');
    _populateSfafSelect('sfaf_463',  '363');   // RX polarization uses same list as TX
    _populateSfafSelect('sfaf_704',  '704');
    _populateSfafSelect('sfaf_716',  '716');
    // Selects that keep a "Custom…" option (200-series)
    _populateSfafSelect('sfaf_200',  '200', true);
    _populateSfafSelect('sfaf_201',  '201', true);
    _populateSfafSelect('sfaf_202',  '202', true);
    _populateSfafSelect('sfaf_203',  '203', true);
    _populateSfafSelect('sfaf_204',  '204', true);
    _populateSfafSelect('sfaf_205',  '205', true);
    _populateSfafSelect('sfaf_206',  '206', true);
    _populateSfafSelect('sfaf_209',  '209', true);
    // Fields 300 and 400 share a combined state + country list and use a filterable combobox.
    const _sc = _buildStateCountryEntries();
    _initLookupComboByEl(
        document.getElementById('sfaf_300_text'),
        document.getElementById('sfaf_300'),
        document.getElementById('sfaf_300_list'),
        _sc
    );
    _syncComboboxText('sfaf_300_text', 'sfaf_300', _sc);
    _initLookupComboByEl(
        document.getElementById('sfaf_400_text'),
        document.getElementById('sfaf_400'),
        document.getElementById('sfaf_400_list'),
        _sc
    );
    _syncComboboxText('sfaf_400_text', 'sfaf_400', _sc);

    // Field 102 — sync text display from hidden value (picker sets both; manual entry syncs on blur)
    const _102text = document.getElementById('sfaf_102_text');
    const _102hidden = document.getElementById('sfaf_102');
    if (_102text && _102hidden) {
        _102text.addEventListener('blur', () => { _102hidden.value = _102text.value.trim(); });
    }
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function () {
    // Determine role before rendering
    try {
        const res  = await fetch('/api/auth/session');
        const data = res.ok ? await res.json() : {};
        if (!data.valid) { window.location.href = '/'; return; }
        userRole    = data.user?.role || 'operator';
        userWorkbox = data.user?.default_ism_office || null;
        currentUser = data.user || null;
    } catch {
        window.location.href = '/';
        return;
    }

    // Load system config map defaults (best-effort, fallback to world view)
    try {
        const cfgRes  = await fetch('/api/system-config');
        const cfgData = cfgRes.ok ? await cfgRes.json() : {};
        const byKey   = Object.fromEntries((cfgData.configs || []).map(c => [c.key, c.value]));
        if (byKey['map.default_lat'])  _mapDefaultLat  = parseFloat(byKey['map.default_lat']);
        if (byKey['map.default_lng'])  _mapDefaultLng  = parseFloat(byKey['map.default_lng']);
        if (byKey['map.default_zoom']) _mapDefaultZoom = parseInt(byKey['map.default_zoom'], 10);
    } catch { /* non-fatal */ }

    const PROPOSAL_ROLES  = ['command', 'combatant_command', 'agency', 'ntia', 'admin'];
    const ELEVATION_ROLES = ['agency', 'ntia', 'admin'];

    // Store on window for access in other functions
    window.canViewProposals  = PROPOSAL_ROLES.includes(userRole);
    window.canElevate        = ELEVATION_ROLES.includes(userRole);

    const isWorkbox     = window.location.pathname === '/workbox';
    const isISM         = REVIEWER_ROLES.includes(userRole);

    // Hide workbox tab for non-ISM roles
    if (!isISM) {
        const tab = document.getElementById('pendingReviewTab');
        if (tab) tab.style.display = 'none';
    }

    // Show proposals tab for command and above
    if (window.canViewProposals) {
        const tab = document.getElementById('proposalsTab');
        if (tab) tab.style.display = '';
    }

    // Show AFSMO serial management for agency/ntia/admin
    if (['agency', 'ntia', 'admin'].includes(userRole)) {
        const smBtn = document.getElementById('btnSerialMgmt');
        if (smBtn) smBtn.style.display = '';
    }

    // Show MAJCOM serial sub-allocation for command role
    if (userRole === 'command') {
        const msBtn = document.getElementById('btnMajcomSerialMgmt');
        if (msBtn) msBtn.style.display = '';
    }

    // Show Workbox nav link for ISM+ roles; set active link based on current path
    if (isISM) {
        const wb = document.getElementById('navWorkbox');
        if (wb) wb.style.display = '';
    }
    const navFreq = document.getElementById('navFrequencies');
    const navWb   = document.getElementById('navWorkbox');
    if (isWorkbox) {
        if (navWb)   navWb.classList.add('active');
        if (navFreq) navFreq.classList.remove('active');
    } else {
        if (navFreq) navFreq.classList.add('active');
        if (navWb)   navWb?.classList.remove('active');
    }

    setupTabs();
    setupEventListeners();
    loadRequests();
    _loadSfafLookups();     // pre-fetch all lookup fields for the approval modal
    _loadSerialNumbers();   // pre-fetch available serial numbers for field 102

    // Route default tab by URL path
    if (isWorkbox) {
        if (window.canViewProposals) switchTab('proposals');
        else if (isISM)              switchTab('pending-review');
        else                         window.location.replace('/frequency');
    }
    // /frequency stays on 'permanent' (the default active tab in HTML)
});

// ── Tab management ────────────────────────────────────────────────────────────
function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function () {
            switchTab(this.dataset.tab);
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add('active');

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`${tabName}-tab`)?.classList.add('active');

    currentTab = tabName;

    if (tabName === 'drafts')              loadDrafts();
    else if (tabName === 'pending-review') loadPendingRequests();
    else if (tabName === 'proposals')      loadProposals();
    // permanent/temporary/rejected already rendered from loadRequests()
}

// ── Event listeners ───────────────────────────────────────────────────────────
function setupEventListeners() {
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        if (currentTab === 'pending-review') loadPendingRequests();
        else if (currentTab === 'drafts')    loadDrafts();
        else if (currentTab === 'proposals') loadProposals();
        else                                  loadRequests();
    });

    document.getElementById('permanentSearch')?.addEventListener('input', e => {
        renderFiltered('permanentContainer', 'permanent', e.target.value,
            document.getElementById('permanentStatusFilter').value);
    });
    document.getElementById('permanentStatusFilter')?.addEventListener('change', e => {
        renderFiltered('permanentContainer', 'permanent',
            document.getElementById('permanentSearch').value, e.target.value);
    });

    document.getElementById('temporarySearch')?.addEventListener('input', e => {
        renderFiltered('temporaryContainer', 'temporary', e.target.value,
            document.getElementById('temporaryStatusFilter').value);
    });
    document.getElementById('temporaryStatusFilter')?.addEventListener('change', e => {
        renderFiltered('temporaryContainer', 'temporary',
            document.getElementById('temporarySearch').value, e.target.value);
    });

    document.getElementById('proposalsSearch')?.addEventListener('input', () => applyProposalFilters());
    document.getElementById('proposalsTypeFilter')?.addEventListener('change', () => applyProposalFilters());

    document.getElementById('submittedSearch')?.addEventListener('input', () => applySubmittedFilters());
    document.getElementById('submittedTypeFilter')?.addEventListener('change', () => applySubmittedFilters());

    // Workbox sub-tab switching
    document.querySelectorAll('.workbox-subtab').forEach(btn => {
        btn.addEventListener('click', function() {
            const subtab = this.dataset.subtab;
            switchWorkboxSubtab(subtab);
            if (subtab === 'submitted-proposals') loadSubmittedProposals();
            if (subtab === 'five-year-reviews')   loadFiveYearReviews();
        });
    });

    document.getElementById('fiveYearSearch')?.addEventListener('input', () => applyFiveYearFilters());
    document.getElementById('fiveYearStatusFilter')?.addEventListener('change', () => applyFiveYearFilters());

    document.getElementById('pendingSearch')?.addEventListener('input', () => applyWorkboxFilters());
    document.getElementById('priorityFilter')?.addEventListener('change', () => applyWorkboxFilters());
    document.getElementById('workboxStatusFilter')?.addEventListener('change', () => applyWorkboxFilters());

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function () {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Collapsible sections in approval modal
    document.querySelectorAll('#approvalModal .section-header').forEach(header => {
        header.addEventListener('click', () => {
            header.closest('.collapsible-section').classList.toggle('collapsed');
        });
    });

    // Collapsible sections in resubmit modal
    document.querySelectorAll('#resubmitModal .section-header').forEach(header => {
        header.addEventListener('click', () => {
            header.closest('.collapsible-section').classList.toggle('collapsed');
        });
    });
}

window.approvalExpandAll = function() {
    document.querySelectorAll('#approvalModal .collapsible-section').forEach(s => s.classList.remove('collapsed'));
};

window.approvalCollapseAll = function() {
    document.querySelectorAll('#approvalModal .collapsible-section').forEach(s => s.classList.add('collapsed'));
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function loadRequests() {
    try {
        const res  = await fetch('/api/frequency/requests');
        const data = await res.json();
        allRequests = data.requests || [];

        const permanent = allRequests.filter(r => isPermanent(r.request) && r.request.status !== 'denied');
        const temporary = allRequests.filter(r => !isPermanent(r.request) && r.request.status !== 'denied');
        const rejected  = allRequests.filter(r => r.request.status === 'denied');

        renderRequests('permanentContainer', permanent);
        renderRequests('temporaryContainer', temporary);
        renderRejectedRequests(rejected);

        const permBadge = document.getElementById('permanentCount');
        if (permBadge) permBadge.textContent = permanent.length;
        const tempBadge = document.getElementById('temporaryCount');
        if (tempBadge) tempBadge.textContent = temporary.length;
        const rejectedBadge = document.getElementById('rejectedCount');
        if (rejectedBadge) rejectedBadge.textContent = rejected.length;
    } catch (err) {
        console.error('Error loading requests:', err);
        showError('permanentContainer', 'Error loading requests');
        showError('temporaryContainer', 'Error loading requests');
    }
}

async function loadPendingRequests() {
    try {
        const res  = await fetch('/api/frequency/requests/pending');
        const data = await res.json();
        pendingRequests = sortByPriorityAndAge(data.requests || []);
        const pendingBadge = document.getElementById('pendingCount');
        if (pendingBadge) pendingBadge.textContent = pendingRequests.length;
        document.getElementById('actionItemsCount').textContent = pendingRequests.length;
        renderWorkbox(pendingRequests);
    } catch (err) {
        console.error('Error loading pending requests:', err);
        showError('pendingRequestsContainer', 'Error loading workbox');
    }
}

// ── Workbox helpers ───────────────────────────────────────────────────────────
const PRIORITY_WEIGHT = { emergency: 4, urgent: 3, priority: 2, routine: 1 };

function sortByPriorityAndAge(reqs) {
    return [...reqs].sort((a, b) => {
        const pw = (PRIORITY_WEIGHT[b.request.priority] || 0) - (PRIORITY_WEIGHT[a.request.priority] || 0);
        if (pw !== 0) return pw;
        return new Date(a.request.created_at) - new Date(b.request.created_at);
    });
}

function daysAgo(dateStr) {
    if (!dateStr) return 0;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function ageClass(days) {
    if (days <= 1)  return 'age-fresh';
    if (days <= 7)  return 'age-week';
    if (days <= 14) return 'age-old';
    return 'age-stale';
}

function applyWorkboxFilters() {
    const search = (document.getElementById('pendingSearch')?.value || '').toLowerCase();
    const pri    = document.getElementById('priorityFilter')?.value || '';
    const status = document.getElementById('workboxStatusFilter')?.value || '';
    const filtered = pendingRequests.filter(r =>
        (!pri    || r.request.priority === pri) &&
        (!status || r.request.status === status) &&
        (!search || matchesSearch(r, search))
    );
    renderWorkbox(filtered, true);
}

// ── Workbox selection state ───────────────────────────────────────────────────
let selectedWorkboxIds = new Set();

function updateWorkboxActionBar() {
    const bar   = document.getElementById('workboxActionBar');
    const count = document.getElementById('workboxSelectedCount');
    if (!bar) return;
    bar.style.display = selectedWorkboxIds.size > 0 ? 'flex' : 'none';
    if (count) count.textContent = `${selectedWorkboxIds.size} selected`;

    // Status Log and Lateral Coordination only apply to a single selection
    const single = selectedWorkboxIds.size === 1;
    const statusLogBtn = document.getElementById('workboxStatusLogBtn');
    const coordBtn     = document.getElementById('workboxCoordBtn');
    if (statusLogBtn) statusLogBtn.disabled = !single;
    if (coordBtn)     coordBtn.disabled     = !single;
}

window.toggleWorkboxSelect = function(cb) {
    const id = cb.dataset.id;
    if (cb.checked) selectedWorkboxIds.add(id);
    else selectedWorkboxIds.delete(id);
    cb.closest('.workbox-card')?.classList.toggle('wb-card-selected', cb.checked);
    updateWorkboxActionBar();
};

window.clearWorkboxSelection = function() {
    selectedWorkboxIds.clear();
    document.querySelectorAll('.workbox-cb').forEach(cb => {
        cb.checked = false;
        cb.closest('.workbox-card')?.classList.remove('wb-card-selected');
    });
    updateWorkboxActionBar();
};

window.routeSelectedWorkbox = async function() {
    if (selectedWorkboxIds.size === 0) return;
    const sel   = document.getElementById('workboxRouteToAction');
    const dest  = sel?.value || null;
    const label = sel?.selectedOptions[0]?.text || 'all reviewers';

    // Require a comment
    const comment = prompt(`Comment required for Status Log (distributing ${selectedWorkboxIds.size} record${selectedWorkboxIds.size > 1 ? 's' : ''} to: ${label}):`);
    if (comment === null) return; // cancelled
    if (!comment.trim()) {
        showAlert('A comment is required when distributing records.', 'warning');
        return;
    }

    // Post comment to each request's status log, then route
    const ids = [...selectedWorkboxIds];
    try {
        // Add status log comment to each selected request
        await Promise.all(ids.map(id =>
            fetch(`/api/frequency/requests/${id}/review`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'under_review', notes: comment.trim() })
            })
        ));
        showAlert(`Distributed ${ids.length} record${ids.length > 1 ? 's' : ''} to ${label} with comment.`, 'success');
        clearWorkboxSelection();
        loadPendingRequests();
    } catch (err) {
        showAlert('Error distributing: ' + err.message, 'danger');
    }
};

function renderWorkbox(reqs, filtered = false) {
    // Show stats (always from full pendingRequests, not filtered slice)
    const source = filtered ? pendingRequests : reqs;
    const counts = { emergency: 0, urgent: 0, priority: 0, routine: 0 };
    let oldestDays = 0;
    source.forEach(r => {
        const p = r.request.priority;
        if (counts[p] !== undefined) counts[p]++;
        const d = daysAgo(r.request.created_at);
        if (d > oldestDays) oldestDays = d;
    });
    const statsEl = document.getElementById('workboxStats');
    if (statsEl) {
        statsEl.style.display = source.length > 0 ? '' : 'none';
        document.getElementById('statTotal').textContent     = source.length;
        document.getElementById('statEmergency').textContent = counts.emergency;
        document.getElementById('statUrgent').textContent    = counts.urgent;
        document.getElementById('statPriority').textContent  = counts.priority;
        document.getElementById('statRoutine').textContent   = counts.routine;
        document.getElementById('statOldest').textContent    = source.length ? oldestDays : '—';
    }

    const container = document.getElementById('pendingRequestsContainer');
    if (!container) return;

    if (!reqs || reqs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Workbox Empty</h3>
                <p>${filtered ? 'No requests match the current filters.' : 'No pending requests — all caught up!'}</p>
            </div>`;
        return;
    }

    // Populate workbox distribute dropdown if empty
    const routeSel = document.getElementById('workboxRouteToAction');
    if (routeSel && routeSel.options.length <= 1) {
        fetch('/api/frequency/reviewers').then(r => r.json()).then(data => {
            (data.workboxes || []).forEach(wb => {
                const opt = document.createElement('option');
                opt.value = wb; opt.textContent = wb;
                routeSel.appendChild(opt);
            });
        }).catch(() => {});
    }

    container.innerHTML = reqs.map(r => {
        const req  = r.request;
        const unit = r.unit;
        const days = daysAgo(req.created_at);
        const pri  = req.priority || 'routine';
        const isPending     = req.status === 'pending';
        const isUnderReview = req.status === 'under_review';
        const checked = selectedWorkboxIds.has(req.id) ? 'checked' : '';
        const commentCount = (r.comments || []).length;
        const coordChips = (r.coordinated_with || []).map(wb =>
            `<span class="coord-chip" title="Lateral coordination">${wb}</span>`
        ).join('');

        const freqStr = req.requested_frequency ||
            (req.frequency_range_min != null ? `${req.frequency_range_min}–${req.frequency_range_max} MHz` : '—');

        const actionBtns = [
            `<button class="btn-xs btn-xs-info" onclick="viewRequest('${req.id}')"><i class="fas fa-eye"></i> View</button>`
        ];
        if (isPending) {
            actionBtns.push(
                `<button class="btn-xs btn-xs-review" onclick="markUnderReview('${req.id}')"><i class="fas fa-clipboard-check"></i> Mark Under Review</button>`
            );
        }
        if (isUnderReview && REVIEWER_ROLES.includes(userRole)) {
            actionBtns.push(
                `<button class="btn-xs btn-xs-approve" onclick="currentRequestId='${req.id}'; openApprovalModal()"><i class="fas fa-clipboard-check"></i> Review</button>`
            );
        }
        if (REVIEWER_ROLES.includes(userRole)) {
            actionBtns.push(
                `<button class="btn-xs btn-xs-deny" onclick="quickReject('${req.id}')"><i class="fas fa-times"></i> Reject</button>`
            );
        }

        const commentLogHtml = renderRequestCommentLog(req.id, r.comments || []);

        return `
        <div class="request-card workbox-card pri-${pri}${checked ? ' wb-card-selected' : ''}" style="position:relative;">
            <label style="position:absolute;top:10px;left:10px;cursor:pointer;z-index:1;">
                <input type="checkbox" class="workbox-cb" data-id="${req.id}" ${checked}
                    onchange="toggleWorkboxSelect(this)" style="accent-color:#3b82f6;cursor:pointer;">
            </label>
            <div class="workbox-card-header" style="padding-left:34px;">
                <div class="workbox-card-title">
                    <h4>${unit?.name || 'Unknown Unit'} — ${formatRequestType(req.request_type)}</h4>
                    <div class="workbox-card-meta">
                        <span class="workbox-age ${ageClass(days)}">${days === 0 ? 'Today' : days + 'd ago'}</span>
                        <span>Submitted ${formatDate(req.created_at)}</span>
                        ${req.reviewed_at ? '<span>• Reviewed ' + formatDate(req.reviewed_at) + '</span>' : ''}
                    </div>
                </div>
                <div class="workbox-card-badges">
                    <span class="frequency-badge badge-${pri}">${formatPurpose(pri)}</span>
                    <span class="frequency-badge badge-${req.status.replace('_', '-')}">${formatStatus(req.status)}</span>
                    ${coordChips}
                </div>
            </div>
            <div class="workbox-card-body">
                <div class="workbox-field">
                    <span class="workbox-field-label">Frequency:</span>
                    <span class="workbox-field-value frequency-value">${freqStr}</span>
                </div>
                <div class="workbox-field">
                    <span class="workbox-field-label">Purpose:</span>
                    <span class="workbox-field-value">${req.purpose || '—'}</span>
                </div>
                ${req.net_name ? `<div class="workbox-field"><span class="workbox-field-label">Net:</span><span class="workbox-field-value">${req.net_name}</span></div>` : ''}
                <div class="workbox-field">
                    <span class="workbox-field-label">Dates:</span>
                    <span class="workbox-field-value">${formatDate(req.start_date)}${req.end_date ? ' – ' + formatDate(req.end_date) : ' (permanent)'}</span>
                </div>
                ${req.justification ? `<div class="workbox-field" style="width:100%;flex-basis:100%;"><span class="workbox-field-label">Justification:</span><span class="workbox-field-value">${req.justification}</span></div>` : ''}
            </div>
            <div class="workbox-card-actions">
                ${actionBtns.join('')}
            </div>
            <div id="req-comment-row-${req.id}" style="display:none;padding:0 12px 8px;">
                ${commentLogHtml}
            </div>
        </div>`;
    }).join('');
}

window.markUnderReview = async function(requestId) {
    try {
        const res = await fetch(`/api/frequency/requests/${requestId}/review`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'under_review', notes: '' })
        });
        if (res.ok) {
            showAlert('Marked as Under Review', 'success');
            loadPendingRequests();
        } else {
            const d = await res.json();
            showAlert('Error: ' + (d.error || 'Failed'), 'danger');
        }
    } catch (err) {
        showAlert('Error: ' + err.message, 'danger');
    }
};

window.quickReject = async function(requestId) {
    const reason = prompt('Reason for rejection (required):');
    if (!reason || !reason.trim()) return;
    currentRequestId = requestId;
    try {
        const res = await fetch(`/api/frequency/requests/${requestId}/review`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'denied', notes: reason.trim() })
        });
        if (res.ok) {
            showAlert('Request rejected and returned to originator', 'success');
            loadPendingRequests();
        } else {
            const d = await res.json();
            showAlert('Error: ' + (d.error || 'Failed to reject'), 'danger');
        }
    } catch (err) {
        showAlert('Error: ' + err.message, 'danger');
    }
};

function loadDrafts() {
    const container = document.getElementById('draftsContainer');
    const raw = localStorage.getItem('freqReqDraft');

    if (!raw) {
        document.getElementById('draftsCount').textContent = '0';
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

    document.getElementById('draftsCount').textContent = draft ? '1' : '0';

    if (!draft) {
        container.innerHTML = `<div class="alert alert-warning">Draft data is corrupted. <button class="btn btn-sm" onclick="discardDraft()">Discard</button></div>`;
        return;
    }

    const gd      = draft.gd      || {};
    const p       = draft.payload || {};
    const mode    = draft.mode === 'manual' ? 'Manual' : 'Guided';
    const freqStr = p.requested_frequency
        ? `${p.requested_frequency} MHz`
        : (p.frequency_range_min && p.frequency_range_max ? `${p.frequency_range_min}–${p.frequency_range_max} MHz` : 'Frequency not set');
    const typeStr = formatRequestType(gd.requestType || gd.duration || p.request_type || '');
    const unitStr = p._unitLabel || '';
    const savedAt = draft.savedAt ? new Date(draft.savedAt).toLocaleString() : 'Unknown time';

    container.innerHTML = `
        <div class="request-card">
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
                    <span class="request-field-value">${freqStr}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Mode</span>
                    <span class="request-field-value">${mode}</span>
                </div>
            </div>
            <div class="request-footer" style="display:flex;gap:0.5rem;padding:0.75rem 1rem;border-top:1px solid var(--border,#e5e7eb)">
                <a href="/frequency/request?resume=${encodeURIComponent(draft.id || '1')}" class="btn btn-primary btn-sm">
                    <i class="fas fa-edit"></i> Resume Draft
                </a>
                <button class="btn btn-sm" onclick="discardDraft()" style="color:#dc2626">
                    <i class="fas fa-trash"></i> Discard
                </button>
            </div>
        </div>`;
}

window.discardDraft = function () {
    if (!confirm('Discard this draft? This cannot be undone.')) return;
    localStorage.removeItem('freqReqDraft');
    loadDrafts();
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function isPermanent(req) {
    if (req.request_type === 'permanent') return true;
    if (req.request_type === 'exercise' || req.request_type === 'real_world') return false;
    // Fallback for legacy request_type values: treat no end_date as permanent
    return !req.end_date;
}

function renderFiltered(containerId, bucket, search, status) {
    const source = allRequests.filter(r =>
        (bucket === 'permanent' ? isPermanent(r.request) : !isPermanent(r.request)) &&
        (!status || r.request.status === status) &&
        matchesSearch(r, search)
    );
    renderRequests(containerId, source);
}

function matchesSearch(r, term) {
    if (!term) return true;
    const t = term.toLowerCase();
    return (r.unit?.name || '').toLowerCase().includes(t) ||
           (r.request.requested_frequency || '').toLowerCase().includes(t) ||
           (r.request.purpose || '').toLowerCase().includes(t) ||
           (r.request.net_name || '').toLowerCase().includes(t);
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function renderRequests(containerId, requests) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!requests || requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No Requests Found</h3>
                <p>There are no frequency requests to display.</p>
            </div>`;
        return;
    }

    container.innerHTML = requests.map(req => {
        const retractable = ['pending', 'under_review'].includes(req.request.status);
        const retractBtn = retractable
            ? `<button class="btn-xs btn-xs-danger" title="Retract this request"
                onclick="event.stopPropagation(); retractRequest('${req.request.id}')">
                <i class="fas fa-undo-alt"></i> Retract
               </button>`
            : '';
        return `
        <div class="request-card" onclick="viewRequest('${req.request.id}')">
            <div class="request-header">
                <div class="request-title">
                    <h4>${req.unit?.name || 'Unknown Unit'} — ${formatRequestType(req.request.request_type)}</h4>
                    <div class="request-meta">
                        Submitted ${formatDate(req.request.created_at)}
                        ${req.request.reviewed_at ? ' • Reviewed ' + formatDate(req.request.reviewed_at) : ''}
                    </div>
                </div>
                <div class="request-badges">
                    <span class="frequency-badge badge-${req.request.priority}">${formatPurpose(req.request.priority)}</span>
                    <span class="frequency-badge badge-${req.request.status.replace('_', '-')}">${formatStatus(req.request.status)}</span>
                    ${retractBtn}
                </div>
            </div>
            <div class="request-body">
                <div class="request-field">
                    <span class="request-field-label">Frequency</span>
                    <span class="request-field-value">${req.request.requested_frequency || (req.request.frequency_range_min ? req.request.frequency_range_min + '–' + req.request.frequency_range_max + ' MHz' : '—')}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Purpose</span>
                    <span class="request-field-value">${req.request.purpose || '—'}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Assignment Type</span>
                    <span class="request-field-value">${formatValue(req.request.assignment_type)}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Start Date</span>
                    <span class="request-field-value">${formatDate(req.request.start_date)}</span>
                </div>
                ${req.request.end_date ? `
                <div class="request-field">
                    <span class="request-field-label">End Date</span>
                    <span class="request-field-value">${formatDate(req.request.end_date)}</span>
                </div>` : ''}
            </div>
        </div>`;
    }).join('');
}

// ── Rejected tab rendering ────────────────────────────────────────────────────
function renderRejectedRequests(requests) {
    const container = document.getElementById('rejectedContainer');
    if (!container) return;

    if (!requests || requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle" style="color:#22c55e;"></i>
                <h3>No Rejected Requests</h3>
                <p>None of your requests have been rejected.</p>
            </div>`;
        return;
    }

    container.innerHTML = requests.map(req => {
        const r = req.request;
        const denial = r.denied_reason ? `
            <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:6px;
                        padding:8px 12px;margin-top:8px;font-size:0.82rem;color:#fca5a5;">
                <i class="fas fa-times-circle" style="margin-right:5px;"></i>
                <strong>Rejection reason:</strong> ${r.denied_reason}
            </div>` : '';
        return `
        <div class="request-card">
            <div class="request-header">
                <div class="request-title">
                    <h4>${req.unit?.name || 'Unknown Unit'} — ${formatRequestType(r.request_type)}</h4>
                    <div class="request-meta">
                        Submitted ${formatDate(r.created_at)}
                        ${r.reviewed_at ? ' • Reviewed ' + formatDate(r.reviewed_at) : ''}
                    </div>
                </div>
                <div class="request-badges">
                    <span class="frequency-badge badge-${r.priority}">${formatPurpose(r.priority)}</span>
                    <span class="frequency-badge badge-denied">Rejected</span>
                    <button class="btn-xs btn-xs-primary" onclick="openResubmitModal('${r.id}')">
                        <i class="fas fa-edit"></i> Edit &amp; Resubmit
                    </button>
                    <button class="btn-xs btn-xs-danger" onclick="deleteRequest('${r.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            <div class="request-body">
                <div class="request-field">
                    <span class="request-field-label">Frequency</span>
                    <span class="request-field-value">${r.requested_frequency || (r.frequency_range_min ? r.frequency_range_min + '–' + r.frequency_range_max + ' MHz' : '—')}</span>
                </div>
                <div class="request-field">
                    <span class="request-field-label">Purpose</span>
                    <span class="request-field-value">${r.purpose || '—'}</span>
                </div>
            </div>
            ${denial}
        </div>`;
    }).join('');
}

// ── Edit & Resubmit modal ─────────────────────────────────────────────────────
function openResubmitModal(requestId) {
    const entry = allRequests.find(r => r.request.id === requestId);
    if (!entry) return;
    const r = entry.request;

    document.getElementById('rsb_requestId').value    = r.id;
    document.getElementById('rsb_priority').value     = r.priority || 'routine';
    document.getElementById('rsb_requestType').value  = r.request_type || 'new_assignment';
    document.getElementById('rsb_purpose').value      = r.purpose || '';
    document.getElementById('rsb_netName').value      = r.net_name || '';
    document.getElementById('rsb_callsign').value     = r.callsign || '';
    document.getElementById('rsb_requestedFreq').value = r.requested_frequency || '';
    document.getElementById('rsb_assignmentType').value = r.assignment_type || '';
    document.getElementById('rsb_freqMin').value      = r.frequency_range_min != null ? r.frequency_range_min : '';
    document.getElementById('rsb_freqMax').value      = r.frequency_range_max != null ? r.frequency_range_max : '';
    document.getElementById('rsb_emissionDesignator').value = r.emission_designator || '';
    document.getElementById('rsb_bandwidth').value    = r.bandwidth || '';
    document.getElementById('rsb_powerWatts').value   = r.power_watts != null ? r.power_watts : '';
    document.getElementById('rsb_authorizedRadius').value = r.authorized_radius_km != null ? r.authorized_radius_km : '';
    const rsbAppliesTo = document.querySelector(`input[name="rsb_areaAppliesTo"][value="${r.operating_area_applies_to || 'B'}"]`);
    if (rsbAppliesTo) rsbAppliesTo.checked = true;
    document.getElementById('rsb_antennaMakeModel').value = r.antenna_make_model || '';
    document.getElementById('rsb_antennaType').value  = r.antenna_type || '';
    document.getElementById('rsb_antennaGain').value  = r.antenna_gain_dbi != null ? r.antenna_gain_dbi : '';
    document.getElementById('rsb_antennaPolarization').value = r.antenna_polarization || '';
    document.getElementById('rsb_antennaOrientation').value  = r.antenna_orientation || '';
    document.getElementById('rsb_txHorizBeamwidth').value = r.tx_horiz_beamwidth_deg != null ? r.tx_horiz_beamwidth_deg : '';
    document.getElementById('rsb_txVertBeamwidth').value  = r.tx_vert_beamwidth_deg  != null ? r.tx_vert_beamwidth_deg  : '';
    document.getElementById('rsb_rxHorizBeamwidth').value = r.rx_horiz_beamwidth_deg != null ? r.rx_horiz_beamwidth_deg : '';
    document.getElementById('rsb_rxVertBeamwidth').value  = r.rx_vert_beamwidth_deg  != null ? r.rx_vert_beamwidth_deg  : '';
    document.getElementById('rsb_startDate').value    = r.start_date ? r.start_date.slice(0, 10) : '';
    document.getElementById('rsb_endDate').value      = r.end_date   ? r.end_date.slice(0, 10)   : '';
    document.getElementById('rsb_hoursOfOperation').value = r.hours_of_operation || '';
    document.getElementById('rsb_coverageArea').value = r.coverage_area || '';
    document.getElementById('rsb_numTransmitters').value = r.num_transmitters != null ? r.num_transmitters : 1;
    document.getElementById('rsb_numReceivers').value    = r.num_receivers    != null ? r.num_receivers    : 1;
    document.getElementById('rsb_isEncrypted').checked  = !!r.is_encrypted;
    document.getElementById('rsb_encryptionType').value = r.encryption_type || '';
    document.getElementById('rsb_requiresCoord').checked = !!r.requires_coordination;
    document.getElementById('rsb_coordNotes').value   = r.coordination_notes || '';
    document.getElementById('rsb_justification').value = r.justification || '';
    document.getElementById('rsb_missionImpact').value  = r.mission_impact || '';

    const banner = document.getElementById('resubmitDenialBanner');
    const bannerText = document.getElementById('resubmitDenialText');
    if (r.denied_reason) {
        bannerText.textContent = r.denied_reason;
        banner.style.display = '';
    } else {
        banner.style.display = 'none';
    }

    document.getElementById('resubmitModal').style.display = 'flex';

    // Init map after modal visible so Leaflet can measure the container
    setTimeout(() => {
        _initRsbMap();
        _updateRsbMap(r);
        _rsbMap && _rsbMap.invalidateSize();
    }, 120);
}

function closeResubmitModal() {
    document.getElementById('resubmitModal').style.display = 'none';
}

window.openResubmitModal = openResubmitModal;
window.closeResubmitModal = closeResubmitModal;

// ── Resubmit modal map ────────────────────────────────────────────────────────
let _rsbMap    = null;
let _rsbMarker = null;
let _rsbCircle = null;
let _rsbTile   = null;

function _initRsbMap() {
    if (_rsbMap) return;
    _rsbMap = L.map('rsbMap', {
        center: [_mapDefaultLat, _mapDefaultLng], zoom: _mapDefaultZoom,
        zoomControl: true, attributionControl: false,
    });
    const savedLayer = localStorage.getItem('approvalMapLayer') || 'dark';
    const layerKey   = _TILE_LAYERS[savedLayer] ? savedLayer : 'dark';
    const def = _TILE_LAYERS[layerKey];
    _rsbTile = L.tileLayer(def.url, def.opts).addTo(_rsbMap);
    document.querySelectorAll('[data-rsb-layer]').forEach(b => {
        b.classList.toggle('active', b.dataset.rsbLayer === layerKey);
    });

    _rsbMap.on('click', function(e) {
        _placeRsbMarker(e.latlng.lat, e.latlng.lng);
        _updateRsbCircle();
    });

    // Draggable splitter
    const resizer  = document.getElementById('resubmitResizer');
    const formPane = document.getElementById('resubmitFormScroll');
    if (resizer && formPane) {
        let startX, startW;
        resizer.addEventListener('mousedown', function(e) {
            startX = e.clientX;
            startW = formPane.offsetWidth;
            document.addEventListener('mousemove', onRsbDrag);
            document.addEventListener('mouseup',   onRsbUp);
            e.preventDefault();
        });
        function onRsbDrag(e) {
            const newW = Math.max(320, Math.min(startW + (e.clientX - startX), window.innerWidth - 320));
            formPane.style.width = newW + 'px';
            _rsbMap.invalidateSize();
        }
        function onRsbUp() {
            document.removeEventListener('mousemove', onRsbDrag);
            document.removeEventListener('mouseup',   onRsbUp);
            _rsbMap.invalidateSize();
        }
    }
}

function _placeRsbMarker(lat, lng) {
    if (_rsbMarker) {
        _rsbMarker.setLatLng([lat, lng]);
    } else {
        _rsbMarker = L.marker([lat, lng], { icon: _markerIcon(), draggable: true }).addTo(_rsbMap);
        _rsbMarker.on('dragend', function() {
            _updateRsbCircle();
        });
    }
}

function _updateRsbCircle() {
    if (!_rsbMap || !_rsbMarker) return;
    const latlng = _rsbMarker.getLatLng();
    const radiusVal = parseFloat(document.getElementById('rsb_radiusValue')?.value) || 0;
    const unit      = document.getElementById('rsb_radiusUnit')?.value || 'KM';
    let radiusM = 0;
    if (unit === 'KM')      radiusM = radiusVal * 1000;
    else if (unit === 'NM') radiusM = radiusVal * 1852;
    else if (unit === 'MI') radiusM = radiusVal * 1609.344;

    if (_rsbCircle) { _rsbMap.removeLayer(_rsbCircle); _rsbCircle = null; }
    if (radiusM > 0) {
        _rsbCircle = L.circle(latlng, {
            radius: radiusM, color: '#64b5f6', fillColor: '#64b5f6',
            fillOpacity: 0.07, weight: 1.5, dashArray: '4 4',
        }).addTo(_rsbMap);
    }
    // Sync authorized_radius_km field
    const km = unit === 'KM' ? radiusVal : unit === 'NM' ? radiusVal * 1.852 : radiusVal * 1.60934;
    const radEl = document.getElementById('rsb_authorizedRadius');
    if (radEl && radiusVal > 0) radEl.value = km.toFixed(2);
}

function _updateRsbMap(req) {
    if (!_rsbMap || !req) return;
    // Try to get center from GeoJSON
    let lat = null, lng = null;
    if (req.operating_area_geojson) {
        try {
            const geo = typeof req.operating_area_geojson === 'string'
                ? JSON.parse(req.operating_area_geojson) : req.operating_area_geojson;
            const center = geo?.properties?.center || (geo?.geometry?.type === 'Point' ? geo.geometry.coordinates : null);
            if (center) {
                [lng, lat] = Array.isArray(center) ? center : [center.lng, center.lat];
            }
        } catch (_) {}
    }
    if (lat != null && lng != null) {
        _placeRsbMarker(lat, lng);
        _rsbMap.setView([lat, lng], 8);
    }
    // Populate radius input from authorized_radius_km
    if (req.authorized_radius_km != null) {
        const radEl = document.getElementById('rsb_radiusValue');
        if (radEl) radEl.value = req.authorized_radius_km;
    }
    _updateRsbCircle();
}

window.setRsbMapLayer = function(key, btn) {
    if (!_rsbMap || !_TILE_LAYERS[key]) return;
    if (_rsbTile) { _rsbMap.removeLayer(_rsbTile); _rsbTile = null; }
    const def = _TILE_LAYERS[key];
    _rsbTile = L.tileLayer(def.url, def.opts).addTo(_rsbMap);
    document.querySelectorAll('[data-rsb-layer]').forEach(b => b.classList.toggle('active', b === btn));
    localStorage.setItem('approvalMapLayer', key);
};

window.onRsbRadiusInput = function() { _updateRsbCircle(); };
window.onRsbRadiusUnitChange = function() { _updateRsbCircle(); };

window.submitResubmit = async function() {
    const requestId   = document.getElementById('rsb_requestId').value;
    const justification = document.getElementById('rsb_justification').value.trim();
    const purpose     = document.getElementById('rsb_purpose').value.trim();
    const startDate   = document.getElementById('rsb_startDate').value;

    if (!purpose)       return showAlert('Purpose is required.', 'warning');
    if (!startDate)     return showAlert('Start date is required.', 'warning');
    if (!justification) return showAlert('Justification is required.', 'warning');

    const entry = allRequests.find(r => r.request.id === requestId);
    if (!entry) return;

    const numVal = id => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; };
    const intVal = id => { const v = parseInt(document.getElementById(id).value, 10); return isNaN(v) ? null : v; };
    const strVal = id => document.getElementById(id).value.trim() || null;

    const endDateVal = document.getElementById('rsb_endDate').value;

    const payload = {
        unit_id:              entry.request.unit_id,
        request_type:         document.getElementById('rsb_requestType').value,
        priority:             document.getElementById('rsb_priority').value,
        purpose,
        net_name:             strVal('rsb_netName'),
        callsign:             strVal('rsb_callsign'),
        requested_frequency:  strVal('rsb_requestedFreq'),
        assignment_type:      strVal('rsb_assignmentType'),
        frequency_range_min:  numVal('rsb_freqMin'),
        frequency_range_max:  numVal('rsb_freqMax'),
        emission_designator:  strVal('rsb_emissionDesignator'),
        bandwidth:            strVal('rsb_bandwidth'),
        power_watts:          intVal('rsb_powerWatts'),
        authorized_radius_km: numVal('rsb_authorizedRadius'),
        operating_area_applies_to: (document.querySelector('input[name="rsb_areaAppliesTo"]:checked')?.value || 'B'),
        operating_area_geojson: (() => {
            if (!_rsbMarker) return null;
            const ll = _rsbMarker.getLatLng();
            const radiusVal = parseFloat(document.getElementById('rsb_radiusValue')?.value) || 0;
            const unit = document.getElementById('rsb_radiusUnit')?.value || 'KM';
            const radiusM = unit === 'KM' ? radiusVal * 1000 : unit === 'NM' ? radiusVal * 1852 : radiusVal * 1609.344;
            return { type: 'Feature', geometry: { type: 'Point', coordinates: [ll.lng, ll.lat] },
                     properties: { center: [ll.lng, ll.lat], radius_m: radiusM } };
        })(),
        antenna_make_model:   strVal('rsb_antennaMakeModel'),
        antenna_type:         strVal('rsb_antennaType'),
        antenna_gain_dbi:     numVal('rsb_antennaGain'),
        antenna_polarization: strVal('rsb_antennaPolarization'),
        antenna_orientation:  strVal('rsb_antennaOrientation'),
        tx_horiz_beamwidth_deg: numVal('rsb_txHorizBeamwidth'),
        tx_vert_beamwidth_deg:  numVal('rsb_txVertBeamwidth'),
        rx_horiz_beamwidth_deg: numVal('rsb_rxHorizBeamwidth'),
        rx_vert_beamwidth_deg:  numVal('rsb_rxVertBeamwidth'),
        coverage_area:        strVal('rsb_coverageArea'),
        hours_of_operation:   strVal('rsb_hoursOfOperation'),
        num_transmitters:     intVal('rsb_numTransmitters') || 1,
        num_receivers:        intVal('rsb_numReceivers') || 1,
        is_encrypted:         document.getElementById('rsb_isEncrypted').checked,
        encryption_type:      strVal('rsb_encryptionType'),
        classification:       entry.request.classification || 'UNCLASS',
        requires_coordination: document.getElementById('rsb_requiresCoord').checked,
        coordination_notes:   strVal('rsb_coordNotes'),
        justification,
        mission_impact:       strVal('rsb_missionImpact'),
        start_date:           new Date(startDate + 'T00:00:00Z').toISOString(),
        end_date:             endDateVal ? new Date(endDateVal + 'T00:00:00Z').toISOString() : null,
    };

    try {
        const res = await fetch(`/api/frequency/requests/${requestId}/resubmit`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showAlert('Request resubmitted successfully', 'success');
            closeResubmitModal();
            await loadRequests();
            // If no more rejected items, switch away from rejected tab
            if (currentTab === 'rejected') {
                const stillRejected = allRequests.filter(r => r.request.status === 'denied');
                if (stillRejected.length === 0) switchTab('permanent');
            }
        } else {
            const d = await res.json();
            showAlert('Error: ' + (d.error || 'Failed to resubmit'), 'danger');
        }
    } catch (err) {
        showAlert('Error resubmitting: ' + err.message, 'danger');
    }
};

// ── Request detail modal ──────────────────────────────────────────────────────
async function viewRequest(requestId) {
    currentRequestId = requestId;

    let request = allRequests.find(r => r.request.id === requestId) ||
                  pendingRequests.find(r => r.request.id === requestId);

    if (!request) {
        try {
            const res = await fetch(`/api/frequency/requests/${requestId}`);
            if (res.ok) request = await res.json();
        } catch (err) {
            console.error('Error fetching request:', err);
        }
    }

    if (!request) { showAlert('Request not found', 'danger'); return; }

    document.getElementById('requestDetails').innerHTML = generateRequestDetailsHTML(request);
    document.getElementById('requestActions').innerHTML = generateRequestActionsHTML(request);
    document.getElementById('requestModal').style.display = 'flex';
}

function generateRequestDetailsHTML(requestData) {
    const req  = requestData.request;
    const unit = requestData.unit;

    return `
        <div class="review-summary">
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                Status: ${formatStatus(req.status)} • Purpose: ${formatPurpose(req.priority)}
            </div>
            <div class="review-section">
                <h3><i class="fas fa-building"></i> Unit Information</h3>
                <div class="review-field"><span class="review-field-label">Unit:</span><span class="review-field-value">${unit?.name || 'Unknown'}</span></div>
                <div class="review-field"><span class="review-field-label">Unit Code:</span><span class="review-field-value">${unit?.unit_code || '—'}</span></div>
            </div>
            <div class="review-section">
                <h3><i class="fas fa-clipboard-list"></i> Request Details</h3>
                <div class="review-field"><span class="review-field-label">Request Type:</span><span class="review-field-value">${formatRequestType(req.request_type)}</span></div>
                <div class="review-field"><span class="review-field-label">Requested Frequency:</span><span class="review-field-value">${req.requested_frequency || (req.frequency_range_min ? req.frequency_range_min + '–' + req.frequency_range_max + ' MHz' : '—')}</span></div>
                <div class="review-field"><span class="review-field-label">Assignment Type:</span><span class="review-field-value">${formatValue(req.assignment_type)}</span></div>
                <div class="review-field"><span class="review-field-label">Purpose:</span><span class="review-field-value">${req.purpose}</span></div>
                <div class="review-field"><span class="review-field-label">Net Name:</span><span class="review-field-value">${req.net_name || '—'}</span></div>
                <div class="review-field"><span class="review-field-label">Callsign:</span><span class="review-field-value">${req.callsign || '—'}</span></div>
            </div>
            <div class="review-section">
                <h3><i class="fas fa-cogs"></i> Technical Specifications</h3>
                <div class="review-field"><span class="review-field-label">Emission Designator:</span><span class="review-field-value">${req.emission_designator || '—'}</span></div>
                <div class="review-field"><span class="review-field-label">Bandwidth:</span><span class="review-field-value">${req.bandwidth || '—'}</span></div>
                <div class="review-field"><span class="review-field-label">Power:</span><span class="review-field-value">${req.power_watts ? req.power_watts + ' W' : '—'}</span></div>
                <div class="review-field"><span class="review-field-label">Coverage Area:</span><span class="review-field-value">${req.coverage_area || '—'}</span></div>
                ${(() => { try { const g = req.operating_area_geojson; if (!g) return ''; const coords = g.geometry?.coordinates; const rm = g.properties?.radius_m; if (!coords) return ''; const lat = coords[1].toFixed(5), lng = coords[0].toFixed(5); const radiusStr = rm ? ` &nbsp;•&nbsp; Radius: ${(rm/1000).toFixed(2)} km` : ''; return `<div class="review-field"><span class="review-field-label">Operating Area:</span><span class="review-field-value">${lat}, ${lng}${radiusStr}</span></div>`; } catch { return ''; } })()}
                <div class="review-field"><span class="review-field-label">Transmitters:</span><span class="review-field-value">${req.num_transmitters || '—'}</span></div>
                <div class="review-field"><span class="review-field-label">Receivers:</span><span class="review-field-value">${req.num_receivers || '—'}</span></div>
                <div class="review-field"><span class="review-field-label">Hours of Operation:</span><span class="review-field-value">${req.hours_of_operation || '—'}</span></div>
            </div>
            <div class="review-section">
                <h3><i class="fas fa-broadcast-tower"></i> Transmitter (TX)</h3>
                <div class="review-field"><span class="review-field-label">Station Type:</span><span class="review-field-value">${req.tx_station_type || '—'}</span></div>
                <div class="review-field"><span class="review-field-label">Antenna Type:</span><span class="review-field-value">${req.antenna_type || '—'}</span></div>
                <div class="review-field"><span class="review-field-label">Antenna Make/Model:</span><span class="review-field-value">${req.antenna_make_model || '—'}</span></div>
                <div class="review-field"><span class="review-field-label">Antenna Gain:</span><span class="review-field-value">${req.antenna_gain_dbi != null ? req.antenna_gain_dbi + ' dBi' : '—'}</span></div>
                <div class="review-field"><span class="review-field-label">Polarization:</span><span class="review-field-value">${req.antenna_polarization || '—'}</span></div>
                <div class="review-field"><span class="review-field-label">Orientation:</span><span class="review-field-value">${req.antenna_orientation || '—'}</span></div>
                <div class="review-field"><span class="review-field-label">Authorized Radius:</span><span class="review-field-value">${req.authorized_radius_km ? req.authorized_radius_km + ' km' : '—'}</span></div>
                <div class="review-field"><span class="review-field-label">358 — Elevation AMSL:</span><span class="review-field-value">${req.tx_elevation_m != null ? req.tx_elevation_m + ' m' : '—'}</span></div>
                <div class="review-field"><span class="review-field-label">359 — Feedpoint Height AGL:</span><span class="review-field-value">${req.tx_feedpoint_height_m != null ? req.tx_feedpoint_height_m + ' m' : '—'}</span></div>
                <div class="review-field"><span class="review-field-label">Feedpoint AMSL (auto):</span><span class="review-field-value">${(req.tx_elevation_m != null && req.tx_feedpoint_height_m != null) ? (req.tx_elevation_m + req.tx_feedpoint_height_m).toFixed(1) + ' m' : '—'}</span></div>
            </div>
            <div class="review-section">
                <h3><i class="fas fa-satellite-dish"></i> Receiver (RX)</h3>
                ${req.rx_same_as_tx
                    ? `<div class="review-field"><span class="review-field-value" style="color:#8899cc;font-style:italic;">Same as transmitter</span></div>
                       <div class="review-field"><span class="review-field-label">Antenna Type:</span><span class="review-field-value">${req.antenna_type || '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">Antenna Make/Model:</span><span class="review-field-value">${req.antenna_make_model || '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">Antenna Gain:</span><span class="review-field-value">${req.antenna_gain_dbi != null ? req.antenna_gain_dbi + ' dBi' : '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">Polarization:</span><span class="review-field-value">${req.antenna_polarization || '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">Orientation:</span><span class="review-field-value">${req.antenna_orientation || '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">Authorized Radius:</span><span class="review-field-value">${req.authorized_radius_km ? req.authorized_radius_km + ' km' : '—'}</span></div>`
                    : `<div class="review-field"><span class="review-field-label">Station Type:</span><span class="review-field-value">${req.rx_station_type || '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">Make / Model:</span><span class="review-field-value">${req.rx_make_model || '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">Antenna Type:</span><span class="review-field-value">${req.rx_antenna_type || '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">Antenna Gain:</span><span class="review-field-value">${req.antenna_gain_dbi != null ? req.antenna_gain_dbi + ' dBi' : '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">Polarization:</span><span class="review-field-value">${req.antenna_polarization || '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">Orientation:</span><span class="review-field-value">${req.antenna_orientation || '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">Authorized Radius:</span><span class="review-field-value">${req.authorized_radius_km ? req.authorized_radius_km + ' km' : '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">458 — Elevation AMSL:</span><span class="review-field-value">${req.rx_elevation_m != null ? req.rx_elevation_m + ' m' : '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">459 — Feedpoint Height AGL:</span><span class="review-field-value">${req.rx_feedpoint_height_m != null ? req.rx_feedpoint_height_m + ' m' : '—'}</span></div>
                       <div class="review-field"><span class="review-field-label">Feedpoint AMSL (auto):</span><span class="review-field-value">${(req.rx_elevation_m != null && req.rx_feedpoint_height_m != null) ? (req.rx_elevation_m + req.rx_feedpoint_height_m).toFixed(1) + ' m' : '—'}</span></div>`
                }
            </div>
            <div class="review-section">
                <h3><i class="fas fa-shield-alt"></i> Security</h3>
                <div class="review-field"><span class="review-field-label">Classification:</span><span class="review-field-value">${req.classification}</span></div>
                <div class="review-field"><span class="review-field-label">Encrypted:</span><span class="review-field-value">${req.is_encrypted ? 'Yes' : 'No'}</span></div>
            </div>
            <div class="review-section">
                <h3><i class="fas fa-calendar"></i> Dates &amp; Justification</h3>
                <div class="review-field"><span class="review-field-label">Start Date:</span><span class="review-field-value">${formatDate(req.start_date)}</span></div>
                <div class="review-field"><span class="review-field-label">End Date:</span><span class="review-field-value">${req.end_date ? formatDate(req.end_date) : 'Permanent'}</span></div>
                <div class="review-field"><span class="review-field-label">Justification:</span><span class="review-field-value">${req.justification}</span></div>
                ${req.mission_impact ? `<div class="review-field"><span class="review-field-label">Mission Impact:</span><span class="review-field-value">${req.mission_impact}</span></div>` : ''}
            </div>
            ${req.review_notes ? `<div class="review-section"><h3><i class="fas fa-comment"></i> Review Notes</h3><p>${req.review_notes}</p></div>` : ''}
            ${req.denied_reason ? `<div class="review-section"><h3><i class="fas fa-times-circle"></i> Rejection Reason</h3><p>${req.denied_reason}</p></div>` : ''}
        </div>`;
}

function generateRequestActionsHTML(requestData) {
    const req = requestData.request;
    let actions = '<button class="btn" onclick="closeRequestModal()">Close</button>';

    if (REVIEWER_ROLES.includes(userRole) && req.status === 'pending') {
        actions += '<button class="btn btn-primary" onclick="openReviewModal()">Review</button>';
    }
    if (userRole === 'admin' && req.status === 'under_review') {
        actions += '<button class="btn btn-success" onclick="openApprovalModal()">Approve</button>';
        actions += '<button class="btn btn-danger" onclick="rejectRequest()">Reject</button>';
    }
    if (['pending', 'under_review'].includes(req.status)) {
        actions += `<button class="btn btn-danger" onclick="closeRequestModal(); retractRequest('${req.id}')">
            <i class="fas fa-undo-alt"></i> Retract
        </button>`;
    }
    if (['cancelled', 'denied'].includes(req.status)) {
        actions += `<button class="btn btn-danger" onclick="closeRequestModal(); deleteRequest('${req.id}')">
            <i class="fas fa-trash"></i> Delete
        </button>`;
    }
    return actions;
}

async function deleteRequest(requestId) {
    if (!confirm('Permanently delete this request? This cannot be undone.')) return;
    try {
        const res  = await fetch(`/api/frequency/requests/${requestId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) {
            showAlert('Error: ' + (data.error || 'Failed to delete request'), 'danger');
            return;
        }
        showAlert('Request deleted', 'success');
        loadRequests();
    } catch (err) {
        showAlert('Error deleting request: ' + err.message, 'danger');
    }
}

async function retractRequest(requestId) {
    if (!confirm('Retract this request? It will be saved as a draft so you can edit and resubmit it.')) return;

    // Grab the enriched request from the already-loaded list before the API call
    // so we have the unit label for the draft.
    const existing = allRequests.find(r => r.request.id === requestId);

    try {
        const res  = await fetch(`/api/frequency/requests/${requestId}/retract`, { method: 'PUT' });
        const data = await res.json();
        if (!res.ok) {
            showAlert('Error: ' + (data.error || 'Failed to retract request'), 'danger');
            return;
        }

        // Build a localStorage draft from the returned request so the operator
        // can resume editing without having to re-enter everything.
        const req = data.request;
        if (req) {
            const draft = {
                id: (crypto.randomUUID?.() ?? `draft-${Date.now()}`),
                mode: 'manual',
                savedAt: new Date().toISOString(),
                gd: {},
                guidedStep: 1, manualStep: 1,
                guidedMaxStep: 1, manualMaxStep: 1,
                payload: {
                    unit_id:               req.unit_id,
                    _unitLabel:            existing?.unit?.name || '',
                    request_type:          req.request_type        || null,
                    priority:              req.priority            || 'routine',
                    purpose:               req.purpose             || '',
                    net_name:              req.net_name            || null,
                    callsign:              req.callsign            || null,
                    requested_frequency:   req.requested_frequency || null,
                    frequency_range_min:   req.frequency_range_min || null,
                    frequency_range_max:   req.frequency_range_max || null,
                    classification:        req.classification      || 'UNCLASS',
                    emission_designator:   req.emission_designator || null,
                    bandwidth:             req.bandwidth           || null,
                    power_watts:           req.power_watts         || null,
                    antenna_make_model:    req.antenna_make_model  || null,
                    antenna_gain_dbi:      req.antenna_gain_dbi    || null,
                    antenna_polarization:  req.antenna_polarization || null,
                    antenna_orientation:   req.antenna_orientation  || null,
                    authorized_radius_km:  req.authorized_radius_km || null,
                    coverage_area:         req.coverage_area       || null,
                    num_transmitters:      req.num_transmitters    || null,
                    num_receivers:         req.num_receivers       || null,
                    hours_of_operation:    req.hours_of_operation  || null,
                    is_encrypted:          req.is_encrypted        || false,
                    encryption_type:       req.encryption_type     || null,
                    requires_coordination: req.requires_coordination || false,
                    coordination_notes:    req.coordination_notes  || null,
                    start_date:            req.start_date          || null,
                    end_date:              req.end_date            || null,
                    justification:         req.justification       || '',
                    mission_impact:        req.mission_impact      || null,
                }
            };
            localStorage.setItem('freqReqDraft', JSON.stringify(draft));
        }

        showAlert('Request retracted and saved as a draft', 'success');
        loadRequests();
        switchTab('drafts');
    } catch (err) {
        showAlert('Error retracting request: ' + err.message, 'danger');
    }
}

function closeRequestModal() {
    document.getElementById('requestModal').style.display = 'none';
}

// ── Review / Approval modals ──────────────────────────────────────────────────
function openReviewModal() {
    closeRequestModal();
    document.getElementById('reviewModal').style.display = 'flex';
}
function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
}

async function submitReview() {
    const status = document.getElementById('reviewStatus').value;
    const notes  = document.getElementById('reviewNotes').value;
    if (!status) { showAlert('Please select a status', 'warning'); return; }

    try {
        const res = await fetch(`/api/frequency/requests/${currentRequestId}/review`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, notes })
        });
        const data = await res.json();
        if (res.ok) {
            showAlert('Review submitted', 'success');
            closeReviewModal();
            loadPendingRequests();
        } else {
            showAlert('Error: ' + (data.error || 'Failed to submit review'), 'danger');
        }
    } catch (err) {
        showAlert('Error submitting review: ' + err.message, 'danger');
    }
}


// ── Review Form Defaults ──────────────────────────────────────────────────────
// Fields eligible for defaults — those not auto-populated from request data.
// sfaf_005_1, sfaf_005_2, sfaf_130_use are auto-filled from the request, so
// defaults only apply if the request left them blank.
const APPROVAL_DEFAULT_FIELDS = [
    'sfaf_record_type',
    'sfaf_005_1', 'sfaf_005_2',
    'sfaf_010',
    'sfaf_130_use', 'sfaf_130_hf',
    'sfaf_144', 'sfaf_151',
    'sfaf_354',
    'sfaf_362', 'sfaf_363',
    'sfaf_511', 'sfaf_512', 'sfaf_513',
    'sfaf_704', 'sfaf_716',
];
const APPROVAL_DEFAULTS_KEY = 'sfaf_review_defaults';

function applyApprovalDefaults() {
    const saved = JSON.parse(localStorage.getItem(APPROVAL_DEFAULTS_KEY) || 'null');
    if (!saved) return;
    APPROVAL_DEFAULT_FIELDS.forEach(id => {
        if (!(id in saved)) return;
        const el = document.getElementById(id);
        if (el && !el.value) el.value = saved[id];
    });
    // Re-run cascades in case MFI/IFI were defaulted.
    // cascade511to512 wipes 512 options, so the DOM set of 512/513 in the forEach
    // above will have silently failed (no options existed yet). Prefer the current DOM
    // value (already set by a draft restore), then fall back to the saved default.
    {
        const cur512 = document.getElementById('sfaf_512')?.value || '';
        const cur513 = document.getElementById('sfaf_513')?.value || '';
        const val512 = cur512 || (saved.sfaf_512 || '');
        const val513 = cur513 || (saved.sfaf_513 || '');
        cascade511to512(); // always run — hides 512 optgroups if no 511 is set
        if (val512) { setVal('sfaf_512', val512); cascade512to513(); }
        if (val513) setVal('sfaf_513', val513);
    }
    updateDefaultsBadge();
}

window.saveApprovalDefaults = function() {
    const defaults = {};
    APPROVAL_DEFAULT_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) defaults[id] = el.value;
    });
    localStorage.setItem(APPROVAL_DEFAULTS_KEY, JSON.stringify(defaults));
    updateDefaultsBadge();
    closeDefaultsMenu();
    showAlert('Form defaults saved.', 'success');
};

window.clearApprovalDefaults = function() {
    localStorage.removeItem(APPROVAL_DEFAULTS_KEY);
    updateDefaultsBadge();
    closeDefaultsMenu();
    showAlert('Form defaults cleared.', 'info');
};

function updateDefaultsBadge() {
    const active = !!localStorage.getItem(APPROVAL_DEFAULTS_KEY);
    const badge  = document.getElementById('defaultsActiveBadge');
    if (badge) badge.style.display = active ? '' : 'none';
}

window.toggleDefaultsMenu = function() {
    const menu = document.getElementById('defaultsMenu');
    if (!menu) return;
    const open = menu.style.display !== 'none';
    menu.style.display = open ? 'none' : 'block';
    if (!open) {
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', closeDefaultsMenuOutside, { once: true });
        }, 0);
    }
};

function closeDefaultsMenu() {
    const menu = document.getElementById('defaultsMenu');
    if (menu) menu.style.display = 'none';
}

function closeDefaultsMenuOutside(e) {
    const menu = document.getElementById('defaultsMenu');
    const btn  = document.getElementById('defaultsMenuBtn');
    if (menu && !menu.contains(e.target) && e.target !== btn) {
        closeDefaultsMenu();
    }
}

function openApprovalModal() {
    closeRequestModal();
    const requestData = allRequests.find(r => r.request.id === currentRequestId) ||
                        pendingRequests.find(r => r.request.id === currentRequestId);

    // Reset form
    document.getElementById('approvalForm').reset();
    toggleApprovalEncryption(false);
    // Clear any stale 512/513 options left over from a previous modal open.
    cascade511to512();

document.getElementById('approvalRequestId').value = currentRequestId;
    // Pre-fill today's date into field 107 (receipt date) in YYYYMMDD format
    const todayYMD = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const el107 = document.getElementById('sfaf_107');
    if (el107) el107.value = todayYMD;

    // Show/hide A and T options based on role
    const canAssign = ['agency', 'ntia', 'admin'].includes(userRole);
    document.querySelectorAll('#sfaf_record_type .assign-only').forEach(opt => {
        opt.disabled = !canAssign;
        opt.style.display = canAssign ? '' : 'none';
    });
    document.getElementById('approvalRecordTypeHint').textContent = canAssign
        ? 'A/T = final assignment. P/S = proposal pending further approval.'
        : 'Your role may only create proposals (P/S). Agency, NTIA, or Admin can finalize.';

    if (requestData) {
        const req          = requestData.request;
        const unit         = requestData.unit;
        const installation = requestData.installation || null;

        document.getElementById('approvalUnitId').value = req.unit_id || '';

        // Auto-select record type
        const isPerm   = req.request_type === 'permanent' || !req.end_date;
        const autoType = isPerm ? (canAssign ? 'A' : 'P') : (canAssign ? 'T' : 'S');
        setVal('sfaf_record_type', autoType);
        setVal('sfaf_priority', req.priority || 'routine');

        // Request summary banner
        const freqStr = req.requested_frequency ||
            (req.frequency_range_min != null ? `${req.frequency_range_min}–${req.frequency_range_max} MHz` : '—');
        document.getElementById('approvalRequestSummary').innerHTML =
            `<i class="fas fa-info-circle"></i> &nbsp;` +
            `<strong>${unit?.name || 'Unknown Unit'}</strong> requested <strong>${freqStr}</strong> ` +
            `&mdash; ${req.purpose || ''} &mdash; submitted ${formatDate(req.created_at)}`;

        // ── Administrative Data ──
        // Field 005: char1 = classification level, char2 = handling
        const cls = (req.classification || 'U').toUpperCase();
        setVal('sfaf_005_1', cls.charAt(0) || 'U');
        setVal('sfaf_005_2', cls.charAt(1) || '');

        // ── Emission Characteristics ──
        setVal('sfaf_110',             req.requested_frequency || '');
        initDeconflictPanel(req);
        setVal('sfaf_114',             req.emission_designator || '');
        if (req.power_watts != null)   setVal('sfaf_115', `W${req.power_watts}`);

        // ── Organizational Information ──
        setVal('sfaf_207',             unit?.unit_code || '');
        setVal('sfaf_208',             req.net_name || '');

        // ── Hours of Operation ──
        // Field 130: primary digit only (HF suffix not populated from request)
        const hoursOp = req.hours_of_operation || '';
        setVal('sfaf_130_use', hoursOp.charAt(0) || '');

        // ── Transmitter Location ──
        if (installation) {
            // 300: state code (e.g. "FL") or country
            const stateOrCountry = installation.state || installation.country || '';
            setVal('sfaf_300', stateOrCountry);
            // 301: installation name (short code if available, else full name)
            const locName = installation.code || installation.name || '';
            setVal('sfaf_301', locName.toUpperCase());
        }
        // 303: coordinates from GeoJSON center if available
        if (req.operating_area_geojson) {
            try {
                const geo = typeof req.operating_area_geojson === 'string'
                    ? JSON.parse(req.operating_area_geojson)
                    : req.operating_area_geojson;
                const center = geo?.properties?.center || (geo?.geometry?.type === 'Point' ? geo.geometry.coordinates : null);
                if (center) {
                    const [lng, lat] = Array.isArray(center) ? center : [center.lng, center.lat];
                    if (lat != null && lng != null) {
                        setVal('sfaf_303', _latlngToSFAF(lat, lng));
                    }
                }
            } catch (_) { /* ignore parse errors */ }
        }
        if (req.authorized_radius_km != null)
            setVal('sfaf_306', `${Math.round(req.authorized_radius_km)}${req.operating_area_applies_to || 'B'}`);

        // ── Transmitter Equipment / Antenna ──
        setVal('sfaf_340',             req.antenna_make_model || '');
        if (req.antenna_gain_dbi != null) setVal('sfaf_357', req.antenna_gain_dbi);
        if (req.tx_elevation_m != null)        { setVal('sfaf_358', req.tx_elevation_m); }
        if (req.tx_feedpoint_height_m != null) { setVal('sfaf_359', req.tx_feedpoint_height_m); }
        if (req.tx_horiz_beamwidth_deg != null) { setVal('sfaf_360', req.tx_horiz_beamwidth_deg); }
        if (req.tx_vert_beamwidth_deg  != null) { setVal('sfaf_361', req.tx_vert_beamwidth_deg);  }
        setVal('sfaf_362',             req.antenna_orientation || '');
        setVal('sfaf_363',             req.antenna_polarization || '');

        // ── Transmitter Antenna ──
        setVal('sfaf_354',             req.antenna_type || '');

        // ── Receiver Data (400 series) ──
        // coverage_area is internal only — not mapped to any SFAF field
        if (req.authorized_radius_km != null)
            setVal('sfaf_406', `${Math.round(req.authorized_radius_km)}${req.operating_area_applies_to || 'B'}`);
        // Mirror TX equipment to RX when rx_same_as_tx (defaults true)
        if (req.rx_same_as_tx !== false) {
            setVal('sfaf_440', req.antenna_make_model || '');
            if (req.antenna_type) setVal('sfaf_454', req.antenna_type);
        }
        if (req.rx_antenna_type) setVal('sfaf_454', req.rx_antenna_type);
        if (req.rx_elevation_m != null)        { setVal('sfaf_458', req.rx_elevation_m); }
        if (req.rx_feedpoint_height_m != null) { setVal('sfaf_459', req.rx_feedpoint_height_m); }
        if (req.rx_horiz_beamwidth_deg != null) { setVal('sfaf_460', req.rx_horiz_beamwidth_deg); }
        if (req.rx_vert_beamwidth_deg  != null) { setVal('sfaf_461', req.rx_vert_beamwidth_deg);  }

        // ── Supplementary Details ──
        // mission_impact is internal only — not mapped to any SFAF field
        setVal('sfaf_502',             req.purpose || '');
        setVal('sfaf_520',             [req.justification, req.stop_buzzer].filter(Boolean).join('\n') || '');

        // ── Other Identifiers ──
        setVal('sfaf_702',             req.coordination_notes || '');

        // ── Time/Date Information ── (YYYYMMDD format)
        if (req.start_date) setVal('sfaf_140', req.start_date.slice(0, 10).replace(/-/g, ''));
        if (req.end_date)   setVal('sfaf_141', req.end_date.slice(0, 10).replace(/-/g, ''));

        // ── Encryption ──
        const encrypted = !!req.is_encrypted;
        document.getElementById('sfaf_encrypted').checked = encrypted;
        toggleApprovalEncryption(encrypted);
        if (encrypted) setVal('sfaf_enc_type', req.encryption_type || '');
    }

    // ── 801 / 803 — fill from reviewer and submitter account info ──
    const today = new Date();
    const yymmdd = today.getFullYear().toString().slice(2) +
                   String(today.getMonth() + 1).padStart(2, '0') +
                   String(today.getDate()).padStart(2, '0');
    function _fmtPOC(user) {
        if (!user) return '';
        const name  = (user.full_name || '').toUpperCase().trim();
        const phone = (user.phone_dsn || user.phone || '').replace(/\D/g, '');
        return [name, phone, yymmdd].filter(Boolean).join(',');
    }
    if (currentUser && !document.getElementById('sfaf_801').value)
        setVal('sfaf_801', _fmtPOC(currentUser));
    if (requestData?.requested_by && !document.getElementById('sfaf_803').value)
        setVal('sfaf_803', _fmtPOC(requestData.requested_by));

    // Restore any previously saved draft (overwrites auto-populated values)
    const savedAt = restoreApprovalDraft(currentRequestId);
    if (savedAt) {
        showAlert(`Draft restored (saved ${new Date(savedAt).toLocaleTimeString()})`, 'info');
    }

    // Apply saved defaults to any fields still blank after request prefill / draft restore
    applyApprovalDefaults();
    updateDefaultsBadge();

    // Repopulate all DB-managed selects with any values added/changed via the
    // SFAF Codes admin tab. Runs after defaults so the restored value is preserved.
    _populateAllApprovalSelects();

    document.getElementById('approvalModal').style.display = 'flex';

    // Init map after modal is visible so Leaflet can measure the container.
    // Pass true so the initial pan-to-location fires exactly once on open.
    setTimeout(() => {
        _initApprovalMap();
        updateApprovalMap(true);
        _approvalMap.invalidateSize();
    }, 120);
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

window.toggleApprovalEncryption = function(checked) {
    const el = document.getElementById('sfaf_encrypted');
    if (el) el.checked = checked;
    document.getElementById('approvalEncLabel').textContent = checked ? 'Yes' : 'No';
    document.getElementById('approvalEncTypeGroup').style.display = checked ? '' : 'none';
};

function closeApprovalModal() {
    document.getElementById('approvalModal').style.display = 'none';
    // Clear deconfliction state
    const panel = document.getElementById('deconflictPanel');
    if (panel) panel.style.display = 'none';
    const results = document.getElementById('deconflictResults');
    if (results) results.innerHTML = '';
}

// ── Approval modal map ────────────────────────────────────────────────────────
let _approvalMap       = null;
let _approvalMarker    = null;
let _approvalCircle    = null;
let _approvalTile      = null;

// Defaults overwritten by system config on load
let _mapDefaultLat  = 20;
let _mapDefaultLng  = 0;
let _mapDefaultZoom = 2;

const _TILE_LAYERS = {
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        opts: { maxZoom: 19 },
    },
    osm: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        opts: { maxZoom: 19 },
    },
    sat: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        opts: { maxZoom: 19 },
    },
    topo: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        opts: { maxZoom: 17 },
    },
};

window.setApprovalMapLayer = function(key, btn) {
    if (!_approvalMap || !_TILE_LAYERS[key]) return;
    if (_approvalTile) { _approvalMap.removeLayer(_approvalTile); _approvalTile = null; }
    const def = _TILE_LAYERS[key];
    _approvalTile = L.tileLayer(def.url, def.opts).addTo(_approvalMap);
    document.querySelectorAll('.map-layer-btn').forEach(b => b.classList.toggle('active', b === btn));
    localStorage.setItem('approvalMapLayer', key);
};

const _markerIcon = () => L.divIcon({
    html: '<div style="width:16px;height:16px;background:#64b5f6;border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(100,181,246,0.9);cursor:grab;margin-left:-8px;margin-top:-8px;"></div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

function _initApprovalMap() {
    if (_approvalMap) return;
    _approvalMap = L.map('approvalMap', {
        center: [_mapDefaultLat, _mapDefaultLng], zoom: _mapDefaultZoom,
        zoomControl: true, attributionControl: false,
    });
    // Restore last-used layer, fall back to dark
    const savedLayer = localStorage.getItem('approvalMapLayer') || 'dark';
    const layerKey   = _TILE_LAYERS[savedLayer] ? savedLayer : 'dark';
    const def = _TILE_LAYERS[layerKey];
    _approvalTile = L.tileLayer(def.url, def.opts).addTo(_approvalMap);
    document.querySelectorAll('.map-layer-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.layer === layerKey);
    });

    // Click to place/move marker and write back to Field 303
    _approvalMap.on('click', function(e) {
        const sfafCoord = _latlngToSFAF(e.latlng.lat, e.latlng.lng);
        const f303 = document.getElementById('sfaf_303');
        if (f303) f303.value = sfafCoord;
        updateApprovalMap();
    });

    // Draggable splitter between form and map
    const resizer  = document.getElementById('approvalResizer');
    const formPane = document.getElementById('approvalFormScroll');
    if (resizer && formPane) {
        let startX, startW;
        resizer.addEventListener('mousedown', function(e) {
            startX = e.clientX;
            startW = formPane.offsetWidth;
            resizer.classList.add('dragging');
            document.addEventListener('mousemove', onResizerDrag);
            document.addEventListener('mouseup',   onResizerUp);
            e.preventDefault();
        });
        function onResizerDrag(e) {
            const newW = Math.max(320, Math.min(startW + (e.clientX - startX), window.innerWidth - 320));
            formPane.style.width = newW + 'px';
            _approvalMap.invalidateSize();
        }
        function onResizerUp() {
            resizer.classList.remove('dragging');
            document.removeEventListener('mousemove', onResizerDrag);
            document.removeEventListener('mouseup',   onResizerUp);
            _approvalMap.invalidateSize();
        }
    }
}

// Parse SFAF DMS coordinate string: "302521N0864150W"
function _parseSFAFCoord(str) {
    if (!str) return null;
    const s = str.trim().toUpperCase().replace(/\s+/g, '');
    const m = s.match(/^(\d{6})([NS])(\d{7})([EW])$/);
    if (!m) return null;
    const lat = (parseInt(m[1].slice(0,2)) + parseInt(m[1].slice(2,4))/60 + parseInt(m[1].slice(4,6))/3600)
                * (m[2] === 'S' ? -1 : 1);
    const lon = (parseInt(m[3].slice(0,3)) + parseInt(m[3].slice(3,5))/60 + parseInt(m[3].slice(5,7))/3600)
                * (m[4] === 'W' ? -1 : 1);
    if (isNaN(lat) || isNaN(lon)) return null;
    return [lat, lon];
}

// Convert decimal lat/lon back to SFAF DMS string: "DDMMSSxDDDMMSSx"
function _latlngToSFAF(lat, lon) {
    const latH = lat >= 0 ? 'N' : 'S';
    const lonH = lon >= 0 ? 'E' : 'W';
    const aLat = Math.abs(lat), aLon = Math.abs(lon);
    const latD = Math.floor(aLat);
    const latM = Math.floor((aLat - latD) * 60);
    const latS = Math.round(((aLat - latD) * 60 - latM) * 60);
    const lonD = Math.floor(aLon);
    const lonM = Math.floor((aLon - lonD) * 60);
    const lonS = Math.round(((aLon - lonD) * 60 - lonM) * 60);
    return String(latD).padStart(2,'0') + String(latM).padStart(2,'0') + String(latS).padStart(2,'0') + latH
         + String(lonD).padStart(3,'0') + String(lonM).padStart(2,'0') + String(lonS).padStart(2,'0') + lonH;
}

// Parse SFAF field 306 radius: "30B" → metres (NM × 1852), "UNL" → null
function _parseSFAFRadius(str) {
    if (!str) return null;
    const s = str.trim().toUpperCase();
    if (s === 'UNL' || s === 'UNLIM') return null;
    const m = s.match(/^(\d+(?:\.\d+)?)/);
    if (!m) return null;
    return parseFloat(m[1]) * 1852; // NM → metres
}

// Radius unit helpers — SFAF fields always store NM
function _getMapRadiusUnit() {
    return document.getElementById('mapRadiusUnit')?.value || 'NM';
}
function _toNM(val, unit) {
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    if (unit === 'KM')  return (n / 1.852).toFixed(4);
    if (unit === 'MI')  return (n / 1.15078).toFixed(4);
    return String(n); // already NM
}
function _fromNM(nm, unit) {
    if (unit === 'KM')  return (nm * 1.852).toFixed(1);
    if (unit === 'MI')  return (nm * 1.15078).toFixed(1);
    return nm.toFixed(1); // NM
}

// updateApprovalMap — redraws marker + circle, never moves the camera.
// Pass panToLocation=true only on modal open to fly to pre-filled coordinates.
window.updateApprovalMap = function(panToLocation) {
    _initApprovalMap();
    const coordStr  = document.getElementById('sfaf_303')?.value || '';
    const radius306 = document.getElementById('sfaf_306')?.value || '';
    const radius406 = document.getElementById('sfaf_406')?.value || '';
    // For map circle: use 306 first (strip T/B suffix), fall back to 406
    const radiusStr = radius306 || radius406;

    // Keep map-panel radius input in sync (convert NM → selected display unit)
    const mapRadiusEl = document.getElementById('mapRadiusInput');
    if (mapRadiusEl && mapRadiusEl !== document.activeElement) {
        const nmRaw = parseFloat(radiusStr.replace(/[TBtb]$/, ''));
        mapRadiusEl.value = isNaN(nmRaw) ? radiusStr.replace(/[TBtb]$/, '') : _fromNM(nmRaw, _getMapRadiusUnit());
    }
    _syncRadiusSuffixCheckboxes(radius306, radius406);

    const latlng  = _parseSFAFCoord(coordStr);
    const radiusM = _parseSFAFRadius(radiusStr);
    const note    = document.getElementById('approvalMapNote');

    // Remove existing layers
    if (_approvalMarker) { _approvalMap.removeLayer(_approvalMarker); _approvalMarker = null; }
    if (_approvalCircle) { _approvalMap.removeLayer(_approvalCircle); _approvalCircle = null; }

    if (!latlng) {
        if (note) {
            note.style.color = '#64748b';
            note.innerHTML = '<i class="fas fa-mouse-pointer" style="opacity:0.5"></i>&nbsp; Click map to set coordinates &nbsp;|&nbsp; or type in Field 303';
        }
        return;
    }

    _approvalMarker = L.marker(latlng, { draggable: true, icon: _markerIcon() }).addTo(_approvalMap);

    // Drag marker → update Field 303 and redraw (no pan)
    _approvalMarker.on('dragend', function() {
        const pos = _approvalMarker.getLatLng();
        const f303 = document.getElementById('sfaf_303');
        if (f303) f303.value = _latlngToSFAF(pos.lat, pos.lng);
        updateApprovalMap();
    });

    if (radiusM) {
        _approvalCircle = L.circle(latlng, {
            radius: radiusM,
            color: '#64b5f6', fillColor: '#3b82f6', fillOpacity: 0.12, weight: 1.5, dashArray: '4 4',
        }).addTo(_approvalMap);
        if (panToLocation) _approvalMap.fitBounds(_approvalCircle.getBounds(), { padding: [20, 20] });
        const nm = (radiusM / 1852).toFixed(1);
        const km = (radiusM / 1000).toFixed(1);
        const mi = (radiusM / 1609.344).toFixed(1);
        if (note) {
            note.style.color = '#81c784';
            note.innerHTML = `<i class="fas fa-map-marker-alt"></i>&nbsp; Center: ${coordStr} &mdash; radius ${nm} NM (${km} km / ${mi} mi)`;
        }
    } else {
        if (panToLocation) _approvalMap.setView(latlng, 10);
        if (note) {
            note.style.color = '#81c784';
            note.innerHTML = `<i class="fas fa-map-marker-alt"></i>&nbsp; Center: ${coordStr}` +
                (radiusStr.toUpperCase().includes('UNL') ? ' &mdash; Radius: Unlimited' : '');
        }
    }

    setTimeout(() => _approvalMap.invalidateSize(), 50);
};

// Parse decimal degrees or DMS into [lat, lon]
function _parseCoordInput(str) {
    if (!str) return null;
    str = str.trim();
    // Try SFAF format first (DDMMSSNDDDMMSEW)
    const sfaf = _parseSFAFCoord(str);
    if (sfaf) return sfaf;
    // Try "lat, lon" decimal
    const dec = str.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
    if (dec) return [parseFloat(dec[1]), parseFloat(dec[2])];
    // Try DMS: 35°40'58"N 78°28'3"W or 35 40 58 N 78 28 3 W
    const dms = str.match(/(\d+)[°\s]+(\d+)[′'\s]+(\d+(?:\.\d+)?)[″"\s]*([NS])[,\s]+(\d+)[°\s]+(\d+)[′'\s]+(\d+(?:\.\d+)?)[″"\s]*([EW])/i);
    if (dms) {
        const lat = (parseInt(dms[1]) + parseInt(dms[2])/60 + parseFloat(dms[3])/3600) * (dms[4].toUpperCase()==='S' ? -1 : 1);
        const lon = (parseInt(dms[5]) + parseInt(dms[6])/60 + parseFloat(dms[7])/3600) * (dms[8].toUpperCase()==='W' ? -1 : 1);
        return [lat, lon];
    }
    return null;
}

window.applyApprovalCoordInput = function() {
    const input = document.getElementById('approvalCoordInput');
    if (!input) return;
    const ll = _parseCoordInput(input.value);
    if (!ll) {
        input.style.borderColor = '#ef5350';
        return;
    }
    input.style.borderColor = '';
    const f303 = document.getElementById('sfaf_303');
    if (f303) f303.value = _latlngToSFAF(ll[0], ll[1]);
    updateApprovalMap(true);
    input.value = '';
};

window.clearApprovalMap = function() {
    const f303 = document.getElementById('sfaf_303');
    const f306 = document.getElementById('sfaf_306');
    const f406 = document.getElementById('sfaf_406');
    if (f303) f303.value = '';
    if (f306) f306.value = '';
    if (f406) f406.value = '';
    const mapRadiusEl = document.getElementById('mapRadiusInput');
    if (mapRadiusEl) mapRadiusEl.value = '';
    updateApprovalMap();
};

function _syncRadiusSuffixCheckboxes(f306val, f406val) {
    // Field 306 suffix: T = transmitter only, B = both. No R suffix exists.
    // Receiver-only radius lives in field 406 (no suffix).
    const suffix306 = (f306val || '').trim().toUpperCase().slice(-1);
    let active = '';
    if (suffix306 === 'B')               active = 'B'; // 306 ends in B → both
    else if (suffix306 === 'T')          active = 'T'; // 306 ends in T → TX only
    else if ((f406val || '').trim())     active = 'R'; // 406 has value, 306 doesn't → RX only
    else if ((f306val || '').trim())     active = 'T'; // 306 has bare numeric → treat as TX
    document.querySelectorAll('input[name="radiusSuffix"]').forEach(cb => {
        cb.checked = cb.value === active;
    });
    _updateRadiusLabel(active);
}

function _updateRadiusLabel(suffix) {
    const label = document.getElementById('mapRadiusLabel');
    if (!label) return;
    if (suffix === 'R')      label.textContent = '406 — Radius';
    else if (suffix === 'B') label.textContent = '306 — Radius (Both)';
    else                     label.textContent = '306 — Radius';
}

// Called when user types in the map-panel radius input
window.onMapRadiusInput = function(raw) {
    const numeric = raw.replace(/[TBtb]$/, '').trim();
    const nmVal   = numeric ? _toNM(numeric, _getMapRadiusUnit()) : '';
    const checked = [...document.querySelectorAll('input[name="radiusSuffix"]')].find(c => c.checked);
    const suffix = checked?.value || 'T';
    const f306 = document.getElementById('sfaf_306');
    const f406 = document.getElementById('sfaf_406');
    if (suffix === 'R') {
        if (f306) f306.value = '';
        if (f406) f406.value = nmVal;
    } else if (suffix === 'B') {
        if (f306) f306.value = nmVal ? nmVal + 'B' : '';
        if (f406) f406.value = '';
    } else {
        if (f306) f306.value = nmVal ? nmVal + 'T' : '';
        if (f406) f406.value = '';
    }
    updateApprovalMap();
};

// Called when a suffix checkbox is clicked — enforce single-select behaviour
window.onRadiusSuffixChange = function(cb) {
    // Uncheck siblings
    document.querySelectorAll('input[name="radiusSuffix"]').forEach(other => {
        if (other !== cb) other.checked = false;
    });
    const mapRadiusEl = document.getElementById('mapRadiusInput');
    const numeric = (mapRadiusEl?.value || '').replace(/[TBtb]$/, '').trim();
    const f306 = document.getElementById('sfaf_306');
    const f406 = document.getElementById('sfaf_406');
    const activeSuffix = cb.checked ? cb.value : 'T';
    _updateRadiusLabel(cb.checked ? cb.value : '');
    if (activeSuffix === 'R') {
        // Receiver only → field 406 (plain numeric), clear 306
        if (f306) f306.value = '';
        if (f406) f406.value = numeric;
    } else if (activeSuffix === 'B') {
        // Both → field 306 with 'B' suffix, clear 406
        if (f306) f306.value = numeric ? numeric + 'B' : '';
        if (f406) f406.value = '';
    } else {
        // Transmitter only → field 306 with 'T' suffix, clear 406
        if (f306) f306.value = numeric ? numeric + 'T' : '';
        if (f406) f406.value = '';
    }
    if (mapRadiusEl) mapRadiusEl.value = numeric; // keep input clean (no suffix)
    updateApprovalMap();
};

// Called when the unit dropdown changes — re-display the current NM value in the new unit
window.onMapRadiusUnitChange = function() {
    const f306 = document.getElementById('sfaf_306')?.value || '';
    const f406 = document.getElementById('sfaf_406')?.value || '';
    const radiusStr = f306 || f406;
    const nm = parseFloat(radiusStr.replace(/[TBtb]$/, ''));
    const mapRadiusEl = document.getElementById('mapRadiusInput');
    if (mapRadiusEl && !isNaN(nm)) {
        mapRadiusEl.value = _fromNM(nm, _getMapRadiusUnit());
    }
    updateApprovalMap();
};

// ── Frequency Deconfliction ────────────────────────────────────────────────────

// Called when opening the approval modal; shows the range banner if the request
// has a frequency range but no specific requested_frequency.
function initDeconflictPanel(req) {
    const panel   = document.getElementById('deconflictPanel');
    const banner  = document.getElementById('deconflictRangeBanner');
    const rangeEl = document.getElementById('deconflictRangeText');
    const results = document.getElementById('deconflictResults');
    if (!panel) return;

    results.innerHTML = '';
    panel.style.display = '';

    if (req.frequency_range_min != null && req.frequency_range_max != null && !req.requested_frequency) {
        const min = parseFloat(req.frequency_range_min).toFixed(3);
        const max = parseFloat(req.frequency_range_max).toFixed(3);
        rangeEl.textContent = `Requested band: ${min} – ${max} MHz`;
        banner.style.display = '';
        // Store on the panel for use by checkBandOccupancy()
        panel.dataset.rangeMin = min;
        panel.dataset.rangeMax = max;
    } else {
        banner.style.display = 'none';
    }
}

// Check the frequency entered in Field 110 for conflicts (25 kHz window).
window.runDeconflict = async function() {
    const freqRaw = document.getElementById('sfaf_110')?.value.trim();
    const unitId  = document.getElementById('approvalUnitId')?.value;
    const results = document.getElementById('deconflictResults');
    const panel   = document.getElementById('deconflictPanel');
    if (!results || !panel) return;

    if (!freqRaw) {
        results.innerHTML = '<div class="deconflict-msg deconflict-warn"><i class="fas fa-exclamation-triangle"></i> Enter a frequency in Field 110 first.</div>';
        panel.style.display = '';
        return;
    }

    const freqMhz = parseFrequencyMhz(freqRaw);
    if (isNaN(freqMhz)) {
        results.innerHTML = '<div class="deconflict-msg deconflict-warn"><i class="fas fa-exclamation-triangle"></i> Could not parse frequency — use M34.000, K4028, or 34.000.</div>';
        panel.style.display = '';
        return;
    }

    results.innerHTML = '<div class="deconflict-msg"><i class="fas fa-spinner fa-spin"></i> Checking conflicts…</div>';
    panel.style.display = '';

    try {
        const params = new URLSearchParams({ frequency: freqMhz, unit_id: unitId || '00000000-0000-0000-0000-000000000000' });
        const res  = await fetch(`/api/frequency/assignments/conflicts?${params}`);
        const data = res.ok ? await res.json() : {};
        renderConflictResults(results, freqMhz, freqRaw, data.conflicts || []);
    } catch (err) {
        results.innerHTML = `<div class="deconflict-msg deconflict-error"><i class="fas fa-times-circle"></i> Check failed: ${err.message}</div>`;
    }
};

// Show all assigned frequencies inside the requested band.
window.checkBandOccupancy = async function() {
    const panel   = document.getElementById('deconflictPanel');
    const results = document.getElementById('deconflictResults');
    if (!panel || !results) return;

    const min = panel.dataset.rangeMin;
    const max = panel.dataset.rangeMax;
    if (!min || !max) return;

    results.innerHTML = '<div class="deconflict-msg"><i class="fas fa-spinner fa-spin"></i> Loading band occupancy…</div>';

    try {
        const params = new URLSearchParams({ min, max });
        const res  = await fetch(`/api/frequency/assignments/in-range?${params}`);
        const data = res.ok ? await res.json() : {};
        renderBandOccupancy(results, parseFloat(min), parseFloat(max), data.assignments || []);
    } catch (err) {
        results.innerHTML = `<div class="deconflict-msg deconflict-error"><i class="fas fa-times-circle"></i> Load failed: ${err.message}</div>`;
    }
};

function renderConflictResults(container, freqMhz, freqRaw, conflicts) {
    if (!conflicts.length) {
        container.innerHTML = `
            <div class="deconflict-msg deconflict-clear">
                <i class="fas fa-check-circle"></i>
                <strong>${freqRaw}</strong> (${freqMhz.toFixed(3)} MHz) — No conflicts found within ±25 kHz.
            </div>`;
        return;
    }
    const rows = conflicts.map(a => `
        <tr>
            <td><span class="record-type-badge record-type-${a.sfaf_record_type}">${a.sfaf_record_type}</span></td>
            <td>${a.frequency}</td>
            <td>${a.frequency_mhz != null ? a.frequency_mhz.toFixed(3) + ' MHz' : '—'}</td>
            <td>${a.serial || '—'}</td>
            <td>${a.classification || '—'}</td>
        </tr>`).join('');
    container.innerHTML = `
        <div class="deconflict-msg deconflict-conflict">
            <i class="fas fa-exclamation-circle"></i>
            <strong>${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''}</strong> found within ±25 kHz of ${freqRaw}.
        </div>
        <table class="deconflict-table">
            <thead><tr><th>Type</th><th>Freq</th><th>MHz</th><th>Serial</th><th>Class</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderBandOccupancy(container, minMhz, maxMhz, assignments) {
    if (!assignments.length) {
        container.innerHTML = `
            <div class="deconflict-msg deconflict-clear">
                <i class="fas fa-check-circle"></i>
                Band ${minMhz.toFixed(3)}–${maxMhz.toFixed(3)} MHz is clear — no existing assignments found.
            </div>`;
        return;
    }
    const rows = assignments.map(a => {
        const mhz = a.frequency_mhz != null ? parseFloat(a.frequency_mhz).toFixed(3) : '—';
        return `
        <tr>
            <td>${mhz} MHz</td>
            <td><span class="record-type-badge record-type-${a.sfaf_record_type}">${a.sfaf_record_type}</span></td>
            <td>${a.frequency}</td>
            <td>${a.serial || '—'}</td>
            <td>${a.classification || '—'}</td>
            <td>
                <button type="button" class="btn-xs btn-xs-info" onclick="assignDeconflictFreq('${a.frequency}', ${a.frequency_mhz})" title="Use this frequency">
                    Use
                </button>
            </td>
        </tr>`;
    }).join('');
    container.innerHTML = `
        <div class="deconflict-msg deconflict-conflict">
            <i class="fas fa-broadcast-tower"></i>
            <strong>${assignments.length} assignment${assignments.length > 1 ? 's' : ''}</strong>
            already in ${minMhz.toFixed(3)}–${maxMhz.toFixed(3)} MHz band.
        </div>
        <table class="deconflict-table">
            <thead><tr><th>MHz</th><th>Type</th><th>Freq</th><th>Serial</th><th>Class</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// Clicking "Use" in the band occupancy table pre-fills Field 110 and immediately checks conflicts.
window.assignDeconflictFreq = function(freqStr, freqMhz) {
    setVal('sfaf_110', freqStr);
    runDeconflict();
};

// Collect every input/select/textarea inside the approval form into a plain object
function collectApprovalFormData() {
    const data = {};
    document.querySelectorAll('#approvalForm input, #approvalForm select, #approvalForm textarea').forEach(el => {
        const key = el.id || el.dataset.field;
        if (!key) return;
        if (el.type === 'checkbox') {
            data[key] = el.checked;
        } else {
            data[key] = el.value;
        }
    });
    return data;
}

function saveApprovalDraft() {
    const requestId = document.getElementById('approvalRequestId').value;
    if (!requestId) { showAlert('No request selected.', 'warning'); return; }

    const draft = {
        requestId,
        savedAt: new Date().toISOString(),
        fields: collectApprovalFormData(),
    };
    localStorage.setItem(`approvalDraft:${requestId}`, JSON.stringify(draft));

    const btn = document.getElementById('btnSaveDraft');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Saved';
    btn.disabled = true;
    setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2000);
}

function saveApprovalDraftAndClose() {
    saveApprovalDraft();
    closeApprovalModal();
}

function restoreApprovalDraft(requestId) {
    const raw = localStorage.getItem(`approvalDraft:${requestId}`);
    if (!raw) return false;
    try {
        const draft = JSON.parse(raw);
        Object.entries(draft.fields).forEach(([key, val]) => {
            const el = document.getElementById(key) ||
                       document.querySelector(`[data-field="${key}"]`);
            if (!el) return;
            if (el.type === 'checkbox') {
                el.checked = !!val;
                if (el.id === 'sfaf_encrypted') toggleApprovalEncryption(!!val);
            } else {
                el.value = val;
            }
        });
        // Re-cascade 511→512→513 so dynamically-built 513 options exist for the saved value.
        // cascade511to512 wipes 512/513, so capture the draft values and restore after.
        {
            const val512 = draft.fields['sfaf_512'] || '';
            const val513 = draft.fields['sfaf_513'] || '';
            cascade511to512(); // always run — locks 512 if no 511 set
            if (val512) { setVal('sfaf_512', val512); cascade512to513(); }
            if (val513) setVal('sfaf_513', val513);
        }
        // Restore pool serial clear button visibility
        const clearBtn = document.getElementById('sfaf_105_clear');
        if (clearBtn) clearBtn.style.display = draft.fields['sfaf_105'] ? '' : 'none';
        return draft.savedAt;
    } catch { return false; }
}

// Convert YYYYMMDD text to ISO-8601 string for Go time.Time binding, or return null
function ymdToISO(ymd) {
    if (!ymd || ymd.length !== 8) return null;
    const y = ymd.slice(0, 4), m = ymd.slice(4, 6), d = ymd.slice(6, 8);
    if (isNaN(Date.parse(`${y}-${m}-${d}`))) return null;
    return `${y}-${m}-${d}T00:00:00Z`;
}

// Parse SFAF frequency notation to MHz: M34.000→34, K4028→4.028, G1.5→1500, or plain number
function parseFrequencyMhz(freqStr) {
    if (!freqStr) return NaN;
    const s = freqStr.trim().toUpperCase().replace(/\s+/g, '');
    // "34.000 MHz" or "4028 KHz" trailing unit
    const trailMhz = s.match(/^([\d.]+)MHZ$/);
    if (trailMhz) return parseFloat(trailMhz[1]);
    const trailKhz = s.match(/^([\d.]+)KHZ$/);
    if (trailKhz) return parseFloat(trailKhz[1]) / 1000;
    // SFAF prefix: M=MHz, K=kHz, G=GHz
    const pfx = s.match(/^([MKGT])([\d.]+)/);
    if (pfx) {
        const v = parseFloat(pfx[2]);
        return pfx[1] === 'K' ? v / 1000 : pfx[1] === 'G' ? v * 1000 : v;
    }
    return parseFloat(s); // plain number assumed MHz
}

async function submitApproval() {
    const requestId  = document.getElementById('approvalRequestId').value;
    const unitId     = document.getElementById('approvalUnitId').value;
    const serial     = document.getElementById('sfaf_102').value.trim();
    const frequency  = document.getElementById('sfaf_110').value.trim();
    const freqMhz    = parseFrequencyMhz(frequency);

    if (!serial)        { showAlert('Field 102 (Serial Number) is required.', 'warning'); return; }
    if (!frequency)     { showAlert('Field 110 (Frequency) is required.', 'warning'); return; }
    if (isNaN(freqMhz)) { showAlert('Field 110: could not parse frequency as MHz (use M34.000, K4028, or 34.000).', 'warning'); return; }

    const encrypted = document.getElementById('sfaf_encrypted').checked;

    // Parse W-prefix power format: "W500" → 500, or plain "500" → 500
    const powerRaw = document.getElementById('sfaf_115').value.trim();
    let powerWatts = null;
    if (powerRaw) {
        const m = powerRaw.match(/^[Ww]?(\d+)/);
        powerWatts = m ? parseInt(m[1]) : null;
    }

    // Build field 005 from two dropdowns (char1 + char2)
    const cls1 = (document.getElementById('sfaf_005_1')?.value || 'U').trim();
    const cls2 = (document.getElementById('sfaf_005_2')?.value || '').trim();
    const classification = cls1 + cls2;

    // Build field 130 from usage + optional HF suffix dropdowns
    const use130 = document.getElementById('sfaf_130_use')?.value || '';
    const hf130  = document.getElementById('sfaf_130_hf')?.value || '';
    const hoursOp = use130 ? (use130 + hf130) : null;

    // Combine notes from justification and supplementary fields
    const notesParts = [
        document.getElementById('sfaf_520').value,
        document.getElementById('sfaf_502').value,
        document.getElementById('sfaf_503').value,
    ].map(s => s.trim()).filter(Boolean);

    const body = {
        unit_id:              unitId,
        serial:               serial,
        pool_serial:          document.getElementById('sfaf_105')?.value.trim() || null,
        sfaf_record_type:     document.getElementById('sfaf_record_type').value,
        priority:             document.getElementById('sfaf_priority').value || 'routine',
        frequency:            frequency,
        frequency_mhz:        freqMhz,
        assignment_type:      'primary', // default; removed from form per Pub 7 guidance
        classification:       classification,
        net_name:             document.getElementById('sfaf_208').value || null,
        emission_designator:  document.getElementById('sfaf_114').value || null,
        bandwidth:            null, // embedded in emission designator (Field 114)
        power_watts:          powerWatts,
        hours_of_operation:   hoursOp,
        is_encrypted:         encrypted,
        encryption_type:      encrypted ? (document.getElementById('sfaf_enc_type').value || null) : null,
        expiration_date:      ymdToISO(document.getElementById('sfaf_141').value) || null,
        assignment_authority: getSFAFValue('sfaf_200') || null,
        notes:                notesParts.join('\n\n') || null,
        routed_to:            null,
    };

    try {
        const res  = await fetch(`/api/frequency/requests/${requestId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            showAlert('Review submitted and SFAF record created!', 'success');
            localStorage.removeItem(`approvalDraft:${requestId}`);
            closeApprovalModal();
            loadPendingRequests();
            loadRequests();
        } else {
            showAlert('Error: ' + (data.error || 'Failed to submit review'), 'danger');
        }
    } catch (err) {
        showAlert('Error submitting review: ' + err.message, 'danger');
    }
}

async function rejectRequest() {
    const reason = prompt('Reason for rejection (required):');
    if (!reason || !reason.trim()) return;

    try {
        const res = await fetch(`/api/frequency/requests/${currentRequestId}/review`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'denied', notes: reason.trim() })
        });
        if (res.ok) {
            showAlert('Request rejected and returned to originator', 'success');
            closeRequestModal();
            loadPendingRequests();
        } else {
            const data = await res.json();
            showAlert('Error: ' + (data.error || 'Failed to reject request'), 'danger');
        }
    } catch (err) {
        showAlert('Error: ' + err.message, 'danger');
    }
}

// ── Formatters ────────────────────────────────────────────────────────────────
function formatRequestType(type) {
    return {
        permanent:      'Permanent',
        exercise:       'Exercise',
        real_world:     'Real World',
        new_assignment: 'New Assignment',
        modification:   'Modification',
        renewal:        'Renewal',
        cancellation:   'Cancellation',
    }[type] || (type || '—');
}

function formatPurpose(p) {
    return { routine: 'Routine', real_world: 'Real World', emergency: 'Emergency', urgent: 'Urgent', priority: 'Priority' }[p]
        || (p ? p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—');
}

function formatStatus(status) {
    return { pending: 'Pending', under_review: 'Under Review', approved: 'Approved', denied: 'Rejected', cancelled: 'Cancelled' }[status] || status;
}

function formatValue(value) {
    if (!value) return '—';
    return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
}

function showError(containerId, message) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> ${message}</div>`;
}

function showAlert(message, type = 'info') {
    const div = document.createElement('div');
    div.className = `alert alert-${type}`;
    Object.assign(div.style, { position: 'fixed', top: '20px', right: '20px', zIndex: '10000' });
    div.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 5000);
}

// ── Submitted Proposals (ISM Workbox sub-tab) ─────────────────────────────────

let allSubmitted    = [];
let selectedCloneIds = new Set();
let cloneRecords    = [];
let cloneIndex      = 0;
let cloneSavedSet   = new Set();

async function loadSubmittedProposals() {
    const container = document.getElementById('submittedContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>';

    try {
        const res  = await fetch('/api/frequency/assignments/submitted');
        const data = res.ok ? await res.json() : {};
        allSubmitted = data.assignments || [];
        document.getElementById('submittedProposalsCount').textContent = allSubmitted.length;
        applySubmittedFilters();
        loadWorkboxReviewers();
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><p>Failed to load: ${err.message}</p></div>`;
    }
}

async function loadWorkboxReviewers() {
    const sel = document.getElementById('workboxRouteTo');
    if (!sel) return;
    try {
        const res  = await fetch('/api/frequency/reviewers');
        const data = res.ok ? await res.json() : {};
        sel.innerHTML = '<option value="">— Unrouted (all workboxes) —</option>' +
            (data.workboxes || []).map(wb =>
                `<option value="${wb}">${wb}</option>`
            ).join('');
    } catch { /* silent — dropdown remains with unrouted option */ }
}

window.routeSelectedAssignments = async function() {
    if (selectedCloneIds.size === 0) return;
    const routedTo = document.getElementById('workboxRouteTo')?.value || null;
    const label    = document.getElementById('workboxRouteTo')?.selectedOptions[0]?.text || 'all reviewers';
    const count    = selectedCloneIds.size;
    if (!confirm(`Route ${count} record${count > 1 ? 's' : ''} to: ${label}?`)) return;

    try {
        const res = await fetch('/api/frequency/assignments/bulk-route', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assignment_ids: [...selectedCloneIds],
                routed_to: routedTo || null,
            }),
        });
        const data = await res.json();
        if (!res.ok) { showAlert('Route failed: ' + (data.error || res.statusText), 'danger'); return; }
        showAlert(`Routed ${data.updated} record${data.updated !== 1 ? 's' : ''}.`, 'success');
        clearCloneSelection();
        loadSubmittedProposals();
    } catch (err) {
        showAlert('Route failed: ' + err.message, 'danger');
    }
};

function applySubmittedFilters() {
    const search = (document.getElementById('submittedSearch')?.value || '').toLowerCase();
    const type   = document.getElementById('submittedTypeFilter')?.value || '';

    const filtered = allSubmitted.filter(p => {
        const a = p.assignment;
        if (type && a.sfaf_record_type !== type) return false;
        if (search) {
            const hay = [a.frequency, a.sfaf_record_type, a.classification,
                         p.unit?.name, p.unit?.unit_code, a.notes,
                         a.routed_to_workbox,
                         ...(p.coordinated_with || [])].join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    renderSubmitted(filtered);
}

function renderSubmitted(records) {
    const container = document.getElementById('submittedContainer');
    if (!container) return;

    if (!records.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-paper-plane"></i><p>No submitted records found.</p></div>';
        return;
    }

    const typeLabel = { A: 'Permanent Assignment', P: 'Permanent Proposal', S: 'Temporary Proposal', T: 'Temporary Assignment' };

    const rows = records.map(p => {
        const a    = p.assignment;
        const unit = p.unit;

        // Edit authority: show originator workbox/org for P/S proposals
        const originatorLabel = p.created_by?.default_ism_office || p.created_by?.organization || p.created_by?.full_name || '—';
        const editAuthority   = (a.sfaf_record_type === 'P' || a.sfaf_record_type === 'S') ? originatorLabel : '';

        const checked = selectedCloneIds.has(a.id) ? 'checked' : '';
        const retractBtn = (a.sfaf_record_type === 'P' || a.sfaf_record_type === 'S')
            ? `<button class="btn-xs btn-xs-danger" title="Retract this proposal"
                onclick="retractAssignment('${a.id}')">
                <i class="fas fa-undo-alt"></i> Retract
               </button>`
            : '';
        const coordChips = (p.coordinated_with || []).map(wb =>
            `<span class="coord-chip" title="Lateral coordination">${wb}</span>`
        ).join('');
        const coordBtn = (a.sfaf_record_type === 'P' || a.sfaf_record_type === 'S')
            ? `<button class="btn-xs" style="font-size:0.68rem;" title="Set lateral coordination workboxes"
                onclick="openCoordModal('${a.id}', ${JSON.stringify(p.coordinated_with || []).replace(/"/g, '&quot;')})">
                <i class="fas fa-handshake"></i>
               </button>`
            : '';
        const commentCount = (p.comments || []).length;
        const commentBtn = `<button class="btn-xs${commentCount ? ' btn-xs-info' : ''}" style="font-size:0.68rem;" title="Status Log"
            onclick="openCommentLog('${a.id}')">
            <i class="fas fa-comments"></i> Status Log${commentCount ? ` <span style="color:#60a5fa;margin-left:2px;">(${commentCount})</span>` : ''}
           </button>`;
        const commentLogHtml = renderCommentLog(a.id, p.comments || []);
        const colCount = 10;
        return `<tr>
            <td><input type="checkbox" class="submitted-clone-cb" data-id="${a.id}" ${checked} onchange="toggleCloneSelect(this)"></td>
            <td><span class="record-type-badge record-type-${a.sfaf_record_type}">${a.sfaf_record_type}</span></td>
            <td>${a.frequency}</td>
            <td>${unit?.name || '—'}<br><span style="color:#64748b;font-size:0.72rem;">${unit?.unit_code || ''}</span></td>
            <td>${a.classification || '—'}</td>
            <td>${editAuthority}</td>
            <td>${coordChips || '<span style="color:#475569;font-size:0.72rem;">—</span>'}</td>
            <td style="color:#94a3b8;">${formatDate(a.created_at)}</td>
            ${a.expiration_date ? `<td style="color:#94a3b8;">${formatDate(a.expiration_date)}</td>` : '<td>—</td>'}
            <td style="white-space:nowrap;">${coordBtn} ${commentBtn} ${retractBtn}</td>
        </tr>
        <tr id="comment-row-${a.id}" style="display:none;">
            <td colspan="${colCount}" style="padding:0 0 4px 0;background:rgba(10,10,28,0.5);">
                ${commentLogHtml}
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <table class="submitted-table">
            <thead>
                <tr>
                    <th><input type="checkbox" id="selectAllClone" title="Select all" onchange="toggleSelectAllClone(this)"></th>
                    <th>Type</th>
                    <th>Frequency</th>
                    <th>Unit</th>
                    <th>Classification</th>
                    <th>Edit Authority</th>
                    <th>Coordinated With</th>
                    <th>Submitted</th>
                    <th>Expires</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function switchWorkboxSubtab(name) {
    document.querySelectorAll('.workbox-subtab').forEach(b => b.classList.remove('active'));
    document.querySelector(`.workbox-subtab[data-subtab="${name}"]`)?.classList.add('active');
    document.getElementById('action-items-subpanel').style.display        = name === 'action-items'        ? '' : 'none';
    document.getElementById('submitted-proposals-subpanel').style.display = name === 'submitted-proposals' ? '' : 'none';
    document.getElementById('five-year-reviews-subpanel').style.display   = name === 'five-year-reviews'   ? '' : 'none';
}

async function retractAssignment(assignmentId) {
    if (!confirm('Retract this proposal? It will be withdrawn and the linked request will return to the workbox.')) return;
    try {
        const res  = await fetch(`/api/frequency/assignments/${assignmentId}/retract`, { method: 'PUT' });
        const data = await res.json();
        if (!res.ok) {
            showAlert('Error: ' + (data.error || 'Failed to retract proposal'), 'danger');
            return;
        }
        const returned = data.requests_returned || 0;
        await loadPendingRequests();
        loadSubmittedProposals();
        if (returned > 0) {
            showAlert('Proposal retracted — request returned to workbox', 'success');
            switchWorkboxSubtab('action-items');
        } else {
            showAlert('Proposal retracted', 'success');
        }
    } catch (err) {
        showAlert('Error retracting proposal: ' + err.message, 'danger');
    }
}

async function retractSelectedAssignments() {
    const ids = [...selectedCloneIds];
    if (!ids.length) return;
    if (!confirm(`Retract ${ids.length} selected proposal${ids.length > 1 ? 's' : ''}? They will be withdrawn and any linked requests will return to the workbox.`)) return;

    const results = await Promise.allSettled(
        ids.map(id => fetch(`/api/frequency/assignments/${id}/retract`, { method: 'PUT' }).then(r => r.json().then(d => ({ ok: r.ok, data: d, id }))))
    );

    const failed   = results.filter(r => r.status === 'rejected' || !r.value?.ok);
    const returned = results.reduce((sum, r) => sum + (r.value?.data?.requests_returned || 0), 0);

    if (failed.length === 0) {
        showAlert(`${ids.length} proposal${ids.length > 1 ? 's' : ''} retracted${returned > 0 ? ` — ${returned} request${returned > 1 ? 's' : ''} returned to workbox` : ''}`, 'success');
    } else {
        showAlert(`${ids.length - failed.length} retracted, ${failed.length} failed`, 'warning');
    }

    selectedCloneIds.clear();
    updateCloneBar();
    await loadPendingRequests();
    loadSubmittedProposals();
    if (returned > 0) switchWorkboxSubtab('action-items');
}

// ── 5-Year Reviews (ISM Workbox sub-tab) ──────────────────────────────────────

let allFiveYearReviews = [];

async function loadFiveYearReviews() {
    const container = document.getElementById('fiveYearContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>';

    try {
        const res  = await fetch('/api/frequency/assignments/five-year-review');
        const data = res.ok ? await res.json() : {};
        allFiveYearReviews = data.assignments || [];
        document.getElementById('fiveYearReviewsCount').textContent = allFiveYearReviews.length;
        applyFiveYearFilters();
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><p>Failed to load: ${err.message}</p></div>`;
    }
}

function applyFiveYearFilters() {
    const search = (document.getElementById('fiveYearSearch')?.value || '').toLowerCase();
    const status = document.getElementById('fiveYearStatusFilter')?.value || '';
    const today  = new Date();

    const filtered = allFiveYearReviews.filter(p => {
        const a = p.assignment;
        if (status) {
            const dueDate = a.assignment_date ? new Date(new Date(a.assignment_date).setFullYear(new Date(a.assignment_date).getFullYear() + 5)) : null;
            const overdue = dueDate && dueDate <= today;
            if (status === 'overdue'  && !overdue)  return false;
            if (status === 'due_soon' && overdue)   return false;
        }
        if (search) {
            const hay = [a.frequency, a.serial, a.classification, a.purpose,
                         p.unit?.name, p.unit?.unit_code].join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    renderFiveYearReviews(filtered);
}

function renderFiveYearReviews(records) {
    const container = document.getElementById('fiveYearContainer');
    if (!container) return;

    if (!records.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No 5-year reviews due.</p></div>';
        return;
    }

    const today = new Date();

    const rows = records.map(p => {
        const a        = p.assignment;
        const unit     = p.unit;
        const assigned = a.assignment_date ? new Date(a.assignment_date) : null;
        const due      = assigned ? new Date(assigned.getFullYear() + 5, assigned.getMonth(), assigned.getDate()) : null;
        const overdue  = due && due <= today;
        const dueDays  = due ? Math.round((due - today) / 86400000) : null;

        const dueLabel = due
            ? (overdue
                ? `<span style="color:#f87171;">Overdue by ${Math.abs(dueDays)}d</span>`
                : `<span style="color:#facc15;">Due in ${dueDays}d</span>`)
            : '—';

        return `<tr>
            <td>${a.serial || '—'}</td>
            <td>${a.frequency}</td>
            <td>${unit?.name || '—'}<br><span style="color:#64748b;font-size:0.72rem;">${unit?.unit_code || ''}</span></td>
            <td>${a.classification || '—'}</td>
            <td>${a.purpose || '—'}</td>
            <td style="color:#94a3b8;">${assigned ? formatDate(a.assignment_date) : '—'}</td>
            <td>${dueLabel}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <table class="submitted-table">
            <thead>
                <tr>
                    <th>Serial</th>
                    <th>Frequency</th>
                    <th>Unit</th>
                    <th>Classification</th>
                    <th>Purpose</th>
                    <th>Assigned</th>
                    <th>Review Due</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// ── Collapsible section toggle (used by approval modal and clone wizard) ─────
window.toggleSection = function(header) {
    const section = header.closest('.collapsible-section');
    if (!section) return;
    section.classList.toggle('collapsed');
    const chevron = header.querySelector('.section-chevron');
    if (chevron) chevron.style.transform = section.classList.contains('collapsed') ? 'rotate(-90deg)' : '';
};

// ── Clone Wizard ───────────────────────────────────────────────────────────────

function toggleCloneSelect(cb) {
    const id = cb.dataset.id;
    if (cb.checked) {
        selectedCloneIds.add(id);
    } else {
        selectedCloneIds.delete(id);
        const all = document.getElementById('selectAllClone');
        if (all) all.checked = false;
    }
    updateCloneBar();
}

function toggleSelectAllClone(cb) {
    document.querySelectorAll('.submitted-clone-cb').forEach(el => {
        el.checked = cb.checked;
        const id = el.dataset.id;
        if (cb.checked) selectedCloneIds.add(id);
        else selectedCloneIds.delete(id);
    });
    updateCloneBar();
}

function updateCloneBar() {
    const bar = document.getElementById('cloneActionBar');
    if (!bar) return;
    const count = selectedCloneIds.size;
    bar.style.display = count > 0 ? 'flex' : 'none';
    document.getElementById('cloneSelectedCount').textContent =
        count === 1 ? '1 record selected' : `${count} records selected`;
}

function clearCloneSelection() {
    selectedCloneIds.clear();
    document.querySelectorAll('.submitted-clone-cb').forEach(cb => cb.checked = false);
    const all = document.getElementById('selectAllClone');
    if (all) all.checked = false;
    updateCloneBar();
}

function openCloneWizard() {
    if (selectedCloneIds.size === 0) return;
    cloneRecords = allSubmitted.filter(r => selectedCloneIds.has(r.assignment.id));
    cloneIndex   = 0;
    cloneSavedSet = new Set();
    loadCloneReviewers();
    populateCloneForm(cloneRecords[0]);
    updateCloneNav();
    document.getElementById('cloneWizardModal').style.display = 'flex';
}

function closeCloneWizard() {
    document.getElementById('cloneWizardModal').style.display = 'none';
    cloneRecords  = [];
    cloneSavedSet = new Set();
}

async function loadCloneReviewers() {
    const sel = document.getElementById('clone_routed_to');
    if (!sel) return;
    try {
        const res = await fetch('/api/frequency/reviewers');
        if (!res.ok) return;
        const data = await res.json();
        const base = '<option value="">— Unrouted (visible to all workboxes) —</option>';
        sel.innerHTML = base + (data.workboxes || []).map(wb =>
            `<option value="${wb}">${wb}</option>`
        ).join('');
    } catch { /* silent */ }
}

function setCloneVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

window.toggleCloneEncryption = function(checked) {
    const lbl = document.getElementById('cloneEncLabel');
    const grp = document.getElementById('cloneEncTypeGroup');
    if (lbl) lbl.textContent = checked ? 'Yes' : 'No';
    if (grp) grp.style.display = checked ? '' : 'none';
};

function populateCloneForm(record) {
    const a    = record.assignment;
    const unit = record.unit;

    // Source banner
    document.getElementById('cloneSourceBanner').innerHTML =
        `<i class="fas fa-info-circle"></i>&nbsp; Cloning from: ` +
        `<strong>${a.frequency}</strong> &mdash; Type ${a.sfaf_record_type}` +
        (unit ? ` &mdash; ${unit.name}` : '');

    document.getElementById('clone_unit_id').value = a.unit_id;
    const unitDisp = document.getElementById('cloneUnitDisplay');
    if (unitDisp) unitDisp.textContent = unit ? `${unit.name} (${unit.unit_code || '—'})` : '—';

    setCloneVal('clone_record_type', a.sfaf_record_type);
    document.getElementById('clone_102').value = ''; // cleared — must be unique

    setCloneVal('clone_110', a.frequency || '');

    const cls = (a.classification || 'U').toUpperCase();
    setCloneVal('clone_005_1', cls.charAt(0) || 'U');
    setCloneVal('clone_005_2', cls.charAt(1) || '');

    const toYMD = iso => iso ? iso.slice(0, 10).replace(/-/g, '') : '';
    setCloneVal('clone_140', toYMD(a.assignment_date));
    setCloneVal('clone_141', toYMD(a.expiration_date));
    setCloneVal('clone_200', a.assignment_authority || '');
    setCloneVal('clone_114', a.emission_designator || '');
    setCloneVal('clone_115', a.power_watts != null ? `W${a.power_watts}` : '');
    setCloneVal('clone_025', a.purpose || '');
    setCloneVal('clone_208', a.net_name || '');
    setCloneVal('clone_026', a.callsign || '');
    setCloneVal('clone_notes', a.notes || '');
    setCloneVal('clone_routed_to', ''); // cleared for clone

    const enc = !!a.is_encrypted;
    const encCb = document.getElementById('clone_encrypted');
    if (encCb) encCb.checked = enc;
    toggleCloneEncryption(enc);
    setCloneVal('clone_enc_type', enc ? (a.encryption_type || '') : '');

    // Role-based A/T option visibility
    const canAssign = ['agency', 'ntia', 'admin'].includes(userRole);
    document.querySelectorAll('#clone_record_type .assign-only').forEach(opt => {
        opt.disabled  = !canAssign;
        opt.style.display = canAssign ? '' : 'none';
    });
}

function updateCloneNav() {
    const total = cloneRecords.length;
    const i     = cloneIndex;
    const meta  = document.getElementById('cloneWizardMeta');
    if (meta) meta.textContent = `Record ${i + 1} of ${total}`;

    const prevBtn       = document.getElementById('clonePrevBtn');
    const skipBtn       = document.getElementById('cloneSkipBtn');
    const saveNextBtn   = document.getElementById('cloneSaveNextBtn');
    const saveFinishBtn = document.getElementById('cloneSaveFinishBtn');
    const isLast = i === total - 1;

    if (prevBtn)       prevBtn.style.display       = i > 0    ? '' : 'none';
    if (skipBtn)       skipBtn.style.display       = isLast   ? 'none' : '';
    if (saveNextBtn)   saveNextBtn.style.display   = isLast   ? 'none' : '';
    if (saveFinishBtn) saveFinishBtn.style.display = isLast   ? '' : 'none';

    // Progress dots
    const bar = document.getElementById('cloneProgressBar');
    if (bar && total > 1) {
        bar.innerHTML = cloneRecords.map((_, idx) => {
            let cls = '';
            if (idx === i)               cls = 'current';
            else if (cloneSavedSet.has(idx)) cls = 'saved';
            return `<div class="clone-progress-dot ${cls}" title="Record ${idx + 1}"></div>`;
        }).join('');
    } else if (bar) {
        bar.innerHTML = '';
    }
}

async function saveCurrentClone() {
    const serial    = document.getElementById('clone_102').value.trim();
    const frequency = document.getElementById('clone_110').value.trim();
    const freqMhz   = parseFrequencyMhz(frequency);
    const unitId    = document.getElementById('clone_unit_id').value;

    if (!serial)        { showAlert('Serial Number (field 102) is required.', 'warning'); return false; }
    if (!frequency)     { showAlert('Frequency (field 110) is required.', 'warning'); return false; }
    if (isNaN(freqMhz)) { showAlert('Could not parse frequency (use M34.000, K4028, or 34.000).', 'warning'); return false; }
    if (!unitId)        { showAlert('Unit ID missing — please refresh and try again.', 'warning'); return false; }

    const encrypted = document.getElementById('clone_encrypted').checked;
    const powerRaw  = document.getElementById('clone_115').value.trim();
    let powerWatts  = null;
    if (powerRaw) {
        const m = powerRaw.match(/^[Ww]?(\d+)/);
        powerWatts = m ? parseInt(m[1]) : null;
    }
    const cls1 = (document.getElementById('clone_005_1')?.value || 'U').trim();
    const cls2 = (document.getElementById('clone_005_2')?.value || '').trim();

    const body = {
        unit_id:              unitId,
        serial:               serial,
        sfaf_record_type:     document.getElementById('clone_record_type').value,
        frequency:            frequency,
        frequency_mhz:        freqMhz,
        assignment_type:      'primary',
        classification:       cls1 + cls2,
        purpose:              document.getElementById('clone_025').value || null,
        net_name:             document.getElementById('clone_208').value || null,
        callsign:             document.getElementById('clone_026').value || null,
        emission_designator:  document.getElementById('clone_114').value || null,
        power_watts:          powerWatts,
        is_encrypted:         encrypted,
        encryption_type:      encrypted ? (document.getElementById('clone_enc_type').value || null) : null,
        assignment_authority: document.getElementById('clone_200').value || null,
        expiration_date:      ymdToISO(document.getElementById('clone_141').value) || null,
        notes:                document.getElementById('clone_notes').value || null,
        routed_to_workbox:    document.getElementById('clone_routed_to')?.value || null,
    };

    try {
        const res  = await fetch('/api/frequency/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
            cloneSavedSet.add(cloneIndex);
            showAlert(`Cloned: ${frequency} (${serial})`, 'success');
            updateCloneNav();
            return true;
        } else {
            showAlert('Error saving clone: ' + (data.error || 'Unknown error'), 'danger');
            return false;
        }
    } catch (err) {
        showAlert('Error saving clone: ' + err.message, 'danger');
        return false;
    }
}

async function saveAndNextClone() {
    const ok = await saveCurrentClone();
    if (ok) nextCloneRecord();
}

async function saveAndFinishClone() {
    const ok = await saveCurrentClone();
    if (ok) {
        closeCloneWizard();
        clearCloneSelection();
        loadSubmittedProposals();
    }
}

function skipClone() { nextCloneRecord(); }

function nextCloneRecord() {
    if (cloneIndex < cloneRecords.length - 1) {
        cloneIndex++;
        populateCloneForm(cloneRecords[cloneIndex]);
        updateCloneNav();
    }
}

function prevClone() {
    if (cloneIndex > 0) {
        cloneIndex--;
        populateCloneForm(cloneRecords[cloneIndex]);
        updateCloneNav();
    }
}

// ── Multi-occurrence helpers ───────────────────────────────────────────────────

// Generic simple text occurrence (500/501 series)
window.addOccurrence = function(containerId, fieldName, label, placeholder) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const group = document.createElement('div');
    group.className = 'occurrence-group';
    group.innerHTML = `
        <input type="text" data-field="${fieldName}" class="form-control" placeholder="${placeholder}">
        <button type="button" class="btn-remove-occurrence" onclick="removeOccurrence(this)">✕</button>`;
    container.appendChild(group);
    // Show remove buttons on all groups when more than one exists
    updateRemoveButtons(container);
};

window.removeOccurrence = function(btn) {
    const group = btn.closest('.occurrence-group');
    const container = group.parentElement;
    group.remove();
    updateRemoveButtons(container);
};

function updateRemoveButtons(container) {
    const groups = container.querySelectorAll('.occurrence-group');
    groups.forEach((g, i) => {
        const btn = g.querySelector('.btn-remove-occurrence');
        if (btn) btn.style.display = groups.length > 1 ? '' : 'none';
    });
}

// Emission group (113-116) multi-occurrence
window.addEmissionGroup = function() {
    const container = document.getElementById('emission-groups');
    if (!container) return;
    const count = container.querySelectorAll('.emission-group').length + 1;
    if (count > 10) { showAlert('Maximum 10 emission groups allowed.', 'warning'); return; }
    const group = document.createElement('div');
    group.className = 'occurrence-group emission-group';
    group.setAttribute('data-occurrence', count);
    group.innerHTML = `
        <div class="occurrence-header">
            <span class="occurrence-title">Emission Group ${count}</span>
            <button type="button" class="btn-remove-occurrence" onclick="removeEmissionGroup(this)">✕ Remove</button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>113 — Station Class</label>
                <input type="text" data-field="sfaf_113" class="form-control" placeholder="e.g. MO, ML, MA">
            </div>
            <div class="form-group">
                <label>114 — Emission Designator</label>
                <input type="text" data-field="sfaf_114" class="form-control" placeholder="e.g. 2K70J3E, 16K0F3E, 10M0G1D">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>115 — Transmitter Power</label>
                <input type="text" data-field="sfaf_115" class="form-control" placeholder="e.g. W500, W20, W5">
            </div>
            <div class="form-group">
                <label>116 — Power Type</label>
                <input type="text" data-field="sfaf_116" class="form-control" placeholder="e.g. ERP, TPO, EIRP">
            </div>
        </div>`;
    container.appendChild(group);
};

window.removeEmissionGroup = function(btn) {
    btn.closest('.emission-group').remove();
    // Renumber titles
    document.querySelectorAll('#emission-groups .emission-group').forEach((g, i) => {
        const title = g.querySelector('.occurrence-title');
        if (title) title.textContent = `Emission Group ${i + 1}`;
    });
};

// Receiver block (400 series) multi-occurrence
const RX_ANTENNA_OPTIONS = `
    <option value="">— Select Antenna Type —</option>
    <option value="DIPOLE">DIPOLE</option><option value="WHIP">WHIP</option>
    <option value="MONOPOLE">MONOPOLE</option><option value="PARABOLIC">PARABOLIC</option>
    <option value="YAGI">YAGI</option><option value="HORN">HORN</option>
    <option value="LOOP">LOOP</option><option value="PANEL">PANEL</option>
    <option value="BLADE">BLADE</option><option value="OMNI">OMNI</option>
    <option value="LOG PER">LOG PER</option><option value="PATCH">PATCH</option>
    <option value="HELIX">HELIX</option><option value="FLAT PLATE">FLAT PLATE</option>
    <option value="CORNER">CORNER</option><option value="BICONICAL">BICONICAL</option>
    <option value="DISCONE">DISCONE</option><option value="SLEEVE">SLEEVE</option>
    <option value="LONG WIRE">LONG WIRE</option><option value="RHOMBIC">RHOMBIC</option>
    <option value="INVERTED V">INVERTED V</option><option value="OTHER">OTHER</option>`;

const RX_ORIENT_OPTIONS = `
    <option value="ND">ND — Non-directional</option>
    <option value="R">R — Rotating</option><option value="S">S — Steerable</option>
    <option value="SSH">SSH — Steerable, semi-fixed horizontal</option>
    <option value="SSV">SSV — Steerable, semi-fixed vertical</option>
    <option value="T">T — Tracking</option>
    <option value="NB">NB — Narrow beam (space)</option>
    <option value="EC">EC — Earth coverage (space)</option>`;

const RX_POLAR_OPTIONS = `
    <option value="">— Select Polarization —</option>
    <option value="A">A — Elliptic left-hand</option><option value="B">B — Elliptic right-hand</option>
    <option value="D">D — Rotating</option><option value="E">E — Elliptical</option>
    <option value="F">F — 45° linear</option><option value="H">H — Horizontal</option>
    <option value="J">J — Linear (unspecified)</option><option value="L">L — Left-hand circular</option>
    <option value="M">M — Oblique left-hand</option><option value="N">N — Oblique right-hand</option>
    <option value="O">O — Oblique crossed</option><option value="R">R — Right-hand circular</option>
    <option value="S">S — Horizontal and vertical</option>
    <option value="T">T — Right- and left-hand circular</option>
    <option value="V">V — Vertical</option><option value="X">X — Other</option>`;

window.addRxBlock = function() {
    const container = document.getElementById('sfaf-rx-blocks');
    if (!container) return;
    const count = container.querySelectorAll('.rx-block').length + 1;
    if (count > 30) { showAlert('Maximum 30 receiver blocks allowed per Pub 7.', 'warning'); return; }
    const block = document.createElement('div');
    block.className = 'occurrence-group rx-block';
    block.innerHTML = `
        <div class="occurrence-header">
            <span class="occurrence-title">Receiver ${count}</span>
            <button type="button" class="btn-remove-occurrence" onclick="removeRxBlock(this)">✕ Remove</button>
        </div>
        <div class="form-row">
            <div class="form-group"><label>400 — State/Country</label>
                <div class="lookup-combo">
                    <input type="text" class="form-control lookup-combo-input" placeholder="Type to filter state / country…" autocomplete="off">
                    <input type="hidden" data-field="sfaf_400">
                    <div class="lookup-combo-list" style="display:none"></div>
                </div></div>
            <div class="form-group"><label>401 — Antenna Location</label>
                <input type="text" data-field="sfaf_401" class="form-control" placeholder="e.g. HURLBURT"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>403 — Antenna Coordinates</label>
                <input type="text" data-field="sfaf_403" class="form-control" placeholder="e.g. 302521N0864150W"></div>
            <div class="form-group"><label>406 — Authorized Radius</label>
                <input type="text" data-field="sfaf_406" class="form-control" placeholder="e.g. 5B, 30B, UNL"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>440 — Equipment Nomenclature</label>
                <input type="text" data-field="sfaf_440" class="form-control" placeholder="e.g. G,AN/PRC-160(V)"></div>
            <div class="form-group"><label>443 — Equipment Certification</label>
                <input type="text" data-field="sfaf_443" class="form-control" placeholder="e.g. J/F 12/11171"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>454 — Antenna Name</label>
                <select data-field="sfaf_454" class="form-control">${RX_ANTENNA_OPTIONS}</select></div>
            <div class="form-group"><label>455 — Antenna Nomenclature</label>
                <input type="text" data-field="sfaf_455" class="form-control" placeholder="e.g. BLADE, HACOE505"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>456 — Antenna Structure Height</label>
                <input type="text" data-field="sfaf_456" class="form-control" placeholder="e.g. height in meters"></div>
            <div class="form-group"><label>457 — Antenna Gain</label>
                <input type="number" step="0.1" data-field="sfaf_457" class="form-control" placeholder="dBi e.g. 0"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>462 — Antenna Orientation</label>
                <div style="display:flex;gap:0.5rem;">
                    <select data-field="sfaf_462" class="form-control" style="flex:0 0 auto;width:auto;">${RX_ORIENT_OPTIONS}</select>
                    <input type="text" data-field="sfaf_462_az" class="form-control" placeholder="Azimuth (e.g. 045)" style="flex:1;">
                </div></div>
            <div class="form-group"><label>463 — Antenna Polarization</label>
                <select data-field="sfaf_463" class="form-control">${RX_POLAR_OPTIONS}</select></div>
        </div>`;
    container.appendChild(block);
    // Init the filterable state/country combobox in the newly added block.
    const newCombo = block.querySelector('.lookup-combo');
    if (newCombo) {
        _initLookupComboByEl(
            newCombo.querySelector('.lookup-combo-input'),
            newCombo.querySelector('input[type="hidden"]'),
            newCombo.querySelector('.lookup-combo-list'),
            _buildStateCountryEntries()
        );
    }
    // Show remove on first block now that there are multiple
    container.querySelectorAll('.rx-block').forEach(b => {
        const btn = b.querySelector('.btn-remove-occurrence');
        if (btn) btn.style.display = '';
    });
    // Update add button label
    const addBtn = document.getElementById('btn-add-rx');
    if (addBtn) addBtn.textContent = `+ Add Receiver (${count}/30)`;
};

window.removeRxBlock = function(btn) {
    const block = btn.closest('.rx-block');
    const container = block.parentElement;
    block.remove();
    // Renumber and update button
    const remaining = container.querySelectorAll('.rx-block');
    remaining.forEach((b, i) => {
        const title = b.querySelector('.occurrence-title');
        if (title) title.textContent = `Receiver ${i + 1}`;
        const rb = b.querySelector('.btn-remove-occurrence');
        if (rb) rb.style.display = remaining.length > 1 ? '' : 'none';
    });
    const addBtn = document.getElementById('btn-add-rx');
    if (addBtn) addBtn.textContent = `+ Add Receiver (${remaining.length}/30)`;
};

// ── Proposals tab ─────────────────────────────────────────────────────────────

let allProposals = [];

async function loadProposals() {
    const container = document.getElementById('proposalsContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Loading proposals...</p></div>';

    try {
        const res  = await fetch('/api/frequency/assignments/proposals');
        const data = res.ok ? await res.json() : {};
        allProposals = data.proposals || [];
        document.getElementById('proposalsCount').textContent = allProposals.length;
        applyProposalFilters();
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Failed to load proposals: ${err.message}</p></div>`;
    }
}

function applyProposalFilters() {
    const search   = (document.getElementById('proposalsSearch')?.value || '').toLowerCase();
    const typeFilter = document.getElementById('proposalsTypeFilter')?.value || '';

    const filtered = allProposals.filter(p => {
        const a = p.assignment;
        if (typeFilter && a.sfaf_record_type !== typeFilter) return false;
        if (search) {
            const haystack = [
                a.frequency, a.classification, a.sfaf_record_type,
                a.emission_designator, a.notes,
                p.unit?.name, p.unit?.unit_code,
            ].join(' ').toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });

    renderProposals(filtered);
}

function renderProposals(proposals) {
    const container = document.getElementById('proposalsContainer');
    if (!container) return;

    if (!proposals.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle" style="color:#4ade80"></i><p>No pending proposals.</p></div>';
        return;
    }

    const typeLabel = { P: 'Permanent Proposal', S: 'Temporary Proposal' };
    const rows = proposals.map(p => {
        const a    = p.assignment;
        const unit = p.unit;
        const elevateBtn = window.canElevate
            ? `<button class="btn-xs btn-xs-review" onclick="openElevationModal('${a.id}')">
                   <i class="fas fa-arrow-up"></i> Elevate
               </button>`
            : `<span style="font-size:0.72rem;color:#64748b;font-style:italic;">Awaiting agency review</span>`;

        return `
        <div class="request-card" data-id="${a.id}">
            <div class="request-card-header">
                <div class="request-card-title">
                    <span class="badge badge-info">${a.sfaf_record_type}</span>
                    <strong>${a.frequency}</strong>
                    <span style="color:#94a3b8;font-size:0.82rem;">${typeLabel[a.sfaf_record_type] || a.sfaf_record_type}</span>
                </div>
                <div class="request-card-actions">${elevateBtn}</div>
            </div>
            <div class="request-card-meta">
                <span><i class="fas fa-building"></i> ${unit?.name || 'Unknown Unit'} (${unit?.unit_code || '—'})</span>
                <span><i class="fas fa-shield-alt"></i> ${a.classification || '—'}</span>
                ${a.emission_designator ? `<span><i class="fas fa-broadcast-tower"></i> ${a.emission_designator}</span>` : ''}
                ${a.expiration_date    ? `<span><i class="fas fa-calendar-times"></i> Expires ${formatDate(a.expiration_date)}</span>` : ''}
                <span><i class="fas fa-clock"></i> Created ${formatDate(a.created_at)}</span>
                ${a.routed_to_workbox
                    ? `<span><i class="fas fa-paper-plane"></i> Routed to: ${a.routed_to_workbox}</span>`
                    : `<span style="color:#64748b;font-size:0.75rem;"><i class="fas fa-globe"></i> Unrouted — visible to all workboxes</span>`}
                ${(p.coordinated_with || []).length
                    ? `<span><i class="fas fa-handshake"></i> Coordinated: ${(p.coordinated_with).map(wb => `<span class="coord-chip">${wb}</span>`).join(' ')}</span>`
                    : ''}
            </div>
            ${a.notes ? `<div class="request-card-notes" style="font-size:0.8rem;color:#94a3b8;padding:0.3rem 0;">${a.notes}</div>` : ''}
            ${renderCommentLog(a.id, p.comments || [])}
        </div>`;
    }).join('');

    container.innerHTML = rows;
}

// ── Elevation modal ───────────────────────────────────────────────────────────

let currentElevationId = null;

window.openElevationModal = function(assignmentId) {
    currentElevationId = assignmentId;

    const proposal = allProposals.find(p => p.assignment.id === assignmentId);
    if (!proposal) return;

    const a    = proposal.assignment;
    const unit = proposal.unit;
    const dest = a.sfaf_record_type === 'P' ? 'A (Permanent Assignment)' : 'T (Temporary Assignment)';

    document.getElementById('elevationSummary').innerHTML =
        `<i class="fas fa-info-circle"></i> &nbsp;` +
        `<strong>${unit?.name || 'Unknown Unit'}</strong> &mdash; ` +
        `<strong>${a.frequency}</strong> &mdash; ` +
        `Record type <strong>${a.sfaf_record_type}</strong> → <strong>${dest}</strong>`;

    document.getElementById('elevationNotes').value = '';
    document.getElementById('elevationModal').style.display = 'flex';
};

window.closeElevationModal = function() {
    document.getElementById('elevationModal').style.display = 'none';
    currentElevationId = null;
};

window.confirmElevation = async function() {
    if (!currentElevationId) return;

    const notes = document.getElementById('elevationNotes').value.trim();

    try {
        const res  = await fetch(`/api/frequency/assignments/${currentElevationId}/elevate`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ notes }),
        });
        const data = await res.json();
        if (res.ok) {
            showAlert(data.message || 'Proposal elevated successfully.', 'success');
            closeElevationModal();
            loadProposals();
        } else {
            showAlert('Error: ' + (data.error || 'Elevation failed'), 'danger');
        }
    } catch (err) {
        showAlert('Error: ' + err.message, 'danger');
    }
};

// ── SFAF lookup helpers ───────────────────────────────────────────────────────
// Returns the effective value of a lookup select: the custom text input when
// "CUSTOM" is selected, or the select value itself otherwise.
function getSFAFValue(id) {
    const sel = document.getElementById(id);
    if (!sel) return '';
    if (sel.tagName === 'SELECT' && sel.value === 'CUSTOM') {
        return (document.getElementById(id + '_custom')?.value || '').trim();
    }
    return (sel.value || '').trim();
}

// Show/hide the paired custom text input based on whether "CUSTOM" is selected.
function onLookupSelChange(selId, inputId) {
    const sel = document.getElementById(selId);
    const inp = document.getElementById(inputId);
    if (!sel || !inp) return;
    const isCustom = sel.value === 'CUSTOM';
    inp.style.display = isCustom ? '' : 'none';
    if (isCustom) inp.focus();
}

// ── MFI / IFI / DFI cascade ──────────────────────────────────────────────────

// Maps MFI → { IFI → Set<valid DFI values> }.
// When an IFI is selected, only DFI options present in the matching set are
// shown. If the IFI is not in the map the full MFI-scoped list is shown (safe
// fallback for less-common IFI values).
const DFI_BY_MFI_IFI = {
    'AIR OPERATIONS': {
        // Source: MC4EB Pub 7 CHG 1, Annex G
        'AIR/AIR COMMUNICATIONS':       new Set(['A-EPLRS (SADL)','AIR DEFENSE/INTERCEPT','BLUE ANGELS','HELO CONTROL','INSTRUCTOR/STUDENT TRAINING','INTERPLANE','PILOT-TO-PILOT','REFUELING','SATURN','THUNDERBIRDS']),
        'AIR/GROUND/AIR COMMUNICATIONS':new Set(['AIR DEFENSE/INTERCEPT','BROADCAST','COMMAND POST','FLIGHT FOLLOWING','GOLDEN KNIGHTS','PILOT-TO-DISPATCHER','PILOT-TO-METRO','SATURN','SQUADRON/WING COMMON','SOF (Supervisor of Flying)','TRAINING']),
        'AIR DEFENSE':                  new Set(['BMDS','GROUND MISSILE DEFENSE (GMD)']),
        'AIR TRAFFIC CONTROL':          new Set(['APPROACH CONTROL','ATIS','CLEARANCE DELIVERY','DBRITE','DEPARTURE CONTROL','FEEDER CONTROL','FLIGHT INSPECTION','GCA','GROUND CONTROL','LOCAL CONTROL','TOWER']),
        'C-UAS':                        new Set(['TARGET ACQUISITION']),
        'EXECUTIVE':                    new Set(['AIR FORCE ONE','AIRBORNE COMMAND CENTER','CCMD/GENERAL/FLAG OFFICER SPT','ERCS','MYSTIC STAR','NAOC','NORAD','WHCA']),
        'FLIGHT TEST':                  new Set(['COMMAND DESTRUCT/TERMINATION','MICROWAVE DATA LINK','TARGET ACQUISITION','TMGS','TOSS','TRAINING']),
        'NAVAIDS':                      new Set(['AIR ROUTE SURVEILLANCE RADAR','AIRPORT SURVEILLANCE RADAR','BEACON','ETCAS','IFF/SIF','ILS','MLS','PAR','RF TAGS','TACAN','TCAS','VOR','VORTAC','WEATHER RADAR']),
        'TELECOMMAND':                  new Set(['COMMAND DESTRUCT/TERMINATION','DRONE CONTROL','SATURN']),
        'TRAINING':                     new Set(['GOLDEN KNIGHTS','INSTRUCTOR/STUDENT TRAINING','THUNDERBIRDS','TRAINING']),
        'UAS':                          new Set(['DRONE CONTROL','MICROWAVE DATA LINK','TARGET ACQUISITION','TMGS','TOSS']),
    },
    'GROUND OPERATIONS': {
        // Source: MC4EB Pub 7 CHG 1, Annex G
        'AIR DEFENSE':               new Set(['AVENGER-STC','FAADC2','LINEBACKER','LONGBOW MISSILE','PATRIOT','SENTINEL']),
        'ARTILLERY':                 new Set(['AQF','LLDR','MLRS']),
        'BATTLE COMMAND':            new Set(['A2C2S','A-EPLRS (SADL)','AUN','CTT','EPLRS','ITN','LAND WARRIOR','NTDR','SCAMP','SINCGARS','SINCGARS-ASIP','WEAPONS SYSTEMS','WIN-T']),
        'CAVALRY':                   new Set(['STRIKER II']),
        'CLOSE AIR SUPPORT (CAS)':   new Set(['CLOSE AIR SUPPORT (CAS)']),
        'COMBAT CONTROL TEAM':       new Set(['COMBAT CONTROL TEAM']),
        'COMMAND POST':              new Set(['COMMAND POST']),
        'ELECTRONIC WARFARE':        new Set(['ACS','AHFEWS','ARL','IEWCS','LMRDFS','TACJAM','TEAMMATE','TRACKWOLF']),
        'ENGINEERS':                 new Set(['GRIZZLY','M93A1 FOX','WOLVERINE']),
        'FIRE SUPPORT':              new Set(['AFATDS','ARTILLERY']),
        'FORWARD AIR CONTROL POST':  new Set(['CLOSE AIR SUPPORT (CAS)','MFCS']),
        'GROUND INTERDICTION':       new Set(['CIWS','GBCS-L','GSR']),
        'INFANTRY':                  new Set(['INFANTRY']),
        'INTELLIGENCE':              new Set(['ASAS','C-sUAS','I-REMBASS','TRAILBLAZER']),
        'TRAINING':                  new Set(['TRAINING']),
    },
    'SEA OPERATIONS': {
        // Source: MC4EB Pub 7 CHG 1, Annex G
        'ASW':                    new Set(['SONOBOUY']),
        'ELECTRONIC WARFARE':     new Set(['TARGET NAVIGATION RADAR']),
        'EXPERIMENTAL':           new Set(['EXPERIMENTAL']),
        'FLEET SUPPORT':          new Set(['AEGIS','ATFP','HYDRA']),
        'FORACS':                 new Set(['FORACS']),
        'GBS':                    new Set(['GBS']),
        'HARBOR-PORT OPERATIONS': new Set(['HARBOR-PORT OPERATIONS']),
        'INTELLIGENCE':           new Set(['ASAS']),
        'LOCKS AND DAMS':         new Set(['LOCKS AND DAMS']),
        'NAVAL GUNFIRE SUPPORT':  new Set(['NAVAL GUNFIRE SUPPORT']),
        'RESUPPLY':               new Set(['RESUPPLY']),
        'SHIP/AIR OPERATIONS':    new Set(['IFF/SIF','SHIP/AIR OPERATIONS','TACAN']),
        'SHIP/SHIP':              new Set(['BRIDGE-TO-BRIDGE','COMMAND AND CONTROL','SHIP/SHIP']),
        'SHIP/SHORE OPERATIONS':  new Set(['COMMAND AND CONTROL','FLEET SUPPORT','GBS','RESUPPLY','SHIP/SHORE OPERATIONS']),
        'SURFACE NAVAIDS':        new Set(['BEACON','SURFACE NAVAIDS','TACAN']),
        'TACCS':                  new Set(['TACCS']),
        'TRAINING':               new Set(['TRAINING']),
    },
    'SPACE OPERATIONS': {
        // Source: MC4EB Pub 7 CHG 1, Annex G
        'EXPERIMENTAL':     new Set(['EXPERIMENTAL']),
        'FLIGHT TEST':      new Set(['FLIGHT TEST']),
        'GBS':              new Set(['GBS']),
        'GPS':              new Set(['GPS']),
        'METEOROLOGICAL':   new Set(['DMSP','SAWDS']),
        'NASA':             new Set(['NASA']),
        'RANGE CONTROL':    new Set(['RANGE CONTROL']),
        'RANGE OPERATIONS': new Set(['OCCS SUPPORT','RDMS','TELEMETRY','TRUNKING']),
        'SAFETY':           new Set(['SAFETY']),
        'SIMULATOR':        new Set(['SIMULATOR']),
        'TEST RANGE':       new Set(['TARGET','TARGET SCORING','TCRS','TEST RANGE','TIMING','TOSS']),
        'TRAINING':         new Set(['MITT/DTES']),
    },
    'SURVEILLANCE/RECONNAISSANCE': {
        // Source: MC4EB Pub 7 CHG 1, Annex G
        'AIR DEFENSE WARNING':  new Set(['AWACS','BMEWS','CARS','GRCS','JSS','OTHR/ROTHR','PAVE PAWS']),
        'TRAINING':             new Set(['TRAINING']),
    },
    'SPECIAL OPERATIONS': {
        // Source: MC4EB Pub 7 CHG 1, Annex G
        'AIR FORCE SPECIAL OPERATIONS': new Set(['AIR FORCE SPECIAL OPERATIONS']),
        'ARMY SPECIAL OPERATIONS':      new Set(['CIVIL AFFAIRS','PSYCHOLOGICAL OPERATIONS','RANGER UNITS','SPECIAL FORCES']),
        'COMMAND NET':                  new Set(['GLOBAL ALE','GLOBAL BLACK','GLOBAL DISCRETE','GLOBAL RED','HICOM']),
        'NAVY SPECIAL OPERATIONS':      new Set(['NAVY SPECIAL OPERATIONS']),
        'TRAINING':                     new Set(['TRAINING']),
    },
    'C3': {
        // Source: MC4EB Pub 7 CHG 1, Annex G
        'COMMUNICATIONS':                      new Set(['IONOSPHERIC SOUNDER','ISYSCON','MARS','MICROWAVE','MSE','RADIO RELAY','TACTS']),
        'DATA LINK':                           new Set(['ARTS (Automated Remote Tracking System) (Telemetry)','JTIDS/MIDS','SGLS','TADIL-A','TADIL-C']),
        'GCCS':                                new Set(['GCCS-A','GCCS-J','GCCS-M']),
        'MILITARY SATELLITE COMMUNICATIONS':   new Set(['AEHF','DSCS','MILSTAR','MUOS','SPITFIRE','TROJAN SPIRIT','WIDEBAND GLOBAL SATCOM (WGS)']),
        'MOBILE USER OBJECTIVE SYSTEM (MUOS)': new Set(['MOBILE USER OBJECTIVE SYSTEM (MUOS)']),
        'TELEMETRY':                           new Set(['ARTS','SGLS']),
        'WIDEBAND GLOBAL SATCOM (WGS)':        new Set(['WIDEBAND GLOBAL SATCOM (WGS)']),
    },
    'SUSTAINING OPERATIONS': {
        // Source: MC4EB Pub 7 CHG 1, Annex G
        'ADMINISTRATIVE':      new Set(['BROADCAST','INSTALLATION','PA SYSTEM (Giant Voice)','PAGING','TIS OR TRAVELERS INFORMATION SYSTEM','UNLICENSED DEVICE','WIRELESS LOCAL AREA NETWORK','WIRELESS MIKE']),
        'CIVIL ENGINEERING':   new Set(['CIVIL WORKS','CONSTRUCTION','INDUSTRIAL CONTROLS','PRIME BEEF','PUBLIC WORKS','RED HORSE','SAFETY','SEABEES','UTILITIES']),
        'COMMAND AND CONTROL': new Set(['BASE OPERATIONS','COMMAND NET','MOBILE TELEPHONE','MOMS','TRUNKING']),
        'EMERGENCY SERVICES':  new Set(['ALARM SYSTEMS','DISASTER PLANNING','EOD','FIRE']),
        'ENVIRONMENTAL':       new Set(['FIRE ALARM','FLOOD WARNING SYSTEM','HAZMAT','MEDICAL WARNING SYSTEM','RESOURCES CONSERVATION']),
        'LAW ENFORCEMENT':     new Set(['CID','DIS','MILITARY POLICE','NCIS','OSI','SCOPE','SECURITY FORCE','SHIELD','SHORE PATROL','SPEED MEASUREMENT SYSTEMS','SURVEILLANCE SYSTEMS','TETHERED AEROSTAT RADAR','WEAPONS STORAGE PROTECTION']),
        'MAINTENANCE':         new Set(['AIRCRAFT COMMUNICATIONS EQUIPMENT CHECKS']),
        'METEOROLOGICAL':      new Set(['AMSS','ASOS','AWOS','GOES','IMETS','NEXRAD','RADIOSONDE','WEATHER','WIND PROFILER']),
        'MISSILE MUNITIONS':   new Set(['MISSILE MUNITIONS']),
        'NATURAL RESOURCES':   new Set(['CONSERVATION','WILDLIFE PRESERVATION']),
        'NAVAIDS CONTROLS':    new Set(['REMOTE BARRIER CONTROL SYSTEMS','RUNWAY LIGHTING CONTROL']),
        'RAMP CONTROL':        new Set(['REMOTE CONTROL CRANE','RUNWAY ICE DETECTION SYSTEMS','SNOW REMOVAL']),
        'SUPPLY AND LOGISTICS':new Set(['AMPS','CSSCS','INVENTORY/INVENTORY CONTROLS']),
        'TRAINING':            new Set(['TRAINING']),
        'TRANSPORTATION':      new Set(['MOTOR POOL','MTS','POL','RESUPPLY','RF TAGS','SHIPYARD','TAXI']),
    },
    'DOMESTIC SUPPORT OPERATIONS': {
        // Source: MC4EB Pub 7 CHG 1, Annex G
        'COMMUNITY ASSISTANCE':   new Set(['AERO CLUB','COLOR/HONOR GUARD','EDUCATION','MUTUAL AID','PUBLIC WORKS','SHORT TERM INCIDENT RESPONSE','TRAINING']),
        'CONSEQUENCE MANAGEMENT': new Set(['CBR','CIVIL SUPPORT TEAM','ENVIRONMENTAL CLEANUP','FEMA','HAZARDOUS MATERIAL RELEASE','TECHNICAL ESCORT UNIT']),
        'CONTINGENCY':            new Set(['CONTINGENCY']),
        'LAW ENFORCEMENT':        new Set(['ANTI-TERRORISM','CIVIL DISTURBANCES']),
        'TRAINING':               new Set(['TRAINING']),
    },
    'OTHER OPERATIONS': {
        // Source: MC4EB Pub 7 CHG 1, Annex G
        'DTSS':             new Set(['DTSS']),
        'ETRAC':            new Set(['ETRAC']),
        'EXERCISE':         new Set(['COG/COOP','EXERCISE']),
        'EXPERIMENTAL':     new Set(['AFAUX/CAP','HAARP','HEMP']),
        'HYDROLOGIC':       new Set(['HYDROLOGIC','LOCKS AND DAMS']),
        'INSPECTION':       new Set(['INSPECTION','SURVEY','TEST AND MEASUREMENT','TRAINING']),
        'MISC RDTE SUPPORT':new Set(['MISC RDTE SUPPORT']),
        'SEARCH AND RESCUE':new Set(['SEARCH AND RESCUE']),
        'SEISMIC':          new Set(['SEISMIC']),
        'SPECIAL COURIER':  new Set(['SPECIAL COURIER']),
        'SPECIAL PROJECTS': new Set(['ALLIANCE PROJECT','COTHEN','COUNTER DRUG OPERATION','SPECIAL SECURITY OPERATIONS']),
    },
};

function cascade511to512() {
    const mfi    = document.getElementById('sfaf_511')?.value || '';
    const sel512 = document.getElementById('sfaf_512');
    const sel513 = document.getElementById('sfaf_513');
    if (!sel512) return;

    // Dynamically rebuild 512 options for the selected MFI (mirrors cascade512to513 pattern)
    sel512.innerHTML = '';

    if (!mfi) {
        sel512.innerHTML = '<option value="">— Select a 511 MFI first —</option>';
        if (sel513) sel513.innerHTML = '<option value="">— Select a 512 IFI first —</option>';
        return;
    }

    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = '— Select Intermediate Function —';
    sel512.appendChild(ph);

    const ifiMap = DFI_BY_MFI_IFI[mfi] || {};
    Object.keys(ifiMap).sort().forEach(ifi => {
        const opt = document.createElement('option');
        opt.value = ifi;
        opt.textContent = ifi;
        sel512.appendChild(opt);
    });

    cascade512to513();
}

function cascade512to513() {
    const mfi    = document.getElementById('sfaf_511')?.value || '';
    const ifi    = document.getElementById('sfaf_512')?.value || '';
    const sel513 = document.getElementById('sfaf_513');
    if (!sel513) return;

    // Dynamically rebuild options from the DFI_BY_MFI_IFI map
    sel513.innerHTML = '';

    if (!mfi || !ifi) {
        sel513.innerHTML = '<option value="">— Select a 512 IFI first —</option>';
        return;
    }

    const dfiSet = DFI_BY_MFI_IFI[mfi]?.[ifi];

    if (!dfiSet || dfiSet.size === 0) {
        sel513.innerHTML = '<option value="">— No DFI entries for this IFI —</option>';
        return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— Select Detailed Function —';
    sel513.appendChild(placeholder);

    [...dfiSet].sort().forEach(dfi => {
        const opt = document.createElement('option');
        opt.value = dfi;
        opt.textContent = dfi;
        sel513.appendChild(opt);
    });
}

// ── Approval SSRF Equipment Picker ───────────────────────────────────────────

let _approvalSsrfTransmitters = [];
let _approvalSsrfSelectedTx   = null;
let _approvalSsrfSelectedMode = null;

function _parseApprovalSSRFTransmitters(doc) {
    const ns = 'urn:us:gov:dod:standard:ssrf:3.0.1';
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
    return all(doc, 'Transmitter').map(tx => {
        const serial  = txt(tx, 'Serial');
        const nomEl   = all(tx, 'Nomenclature')[0];
        const name    = nomEl ? txt(nomEl, 'Name')  : null;
        const nomType = nomEl ? txt(nomEl, 'Type')  : null;
        const mfgEl   = nomEl ? all(nomEl, 'Manufacturer')[0] : null;
        const mfg     = mfgEl ? txt(mfgEl, 'Name') : null;
        const deploy  = txt(all(tx, 'Deployment')[0] || tx, 'Type') ||
                        txt(all(tx, 'Deployment')[0] || tx, 'Installation');
        const modes = all(tx, 'TxMode').map(m => {
            const desc     = txt(m, 'Description');
            const emsClass = txt(m, 'EmsClass');
            return { desc, emsClass };
        }).filter(m => m.emsClass);
        return { serial, name, nomType, mfg, deploy, modes };
    }).filter(tx => tx.name);
}

window.loadApprovalSSRFFile = function(input) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const doc = new DOMParser().parseFromString(e.target.result, 'application/xml');
            if (doc.querySelector('parsererror')) {
                showAlert('XML parse error — is this a valid SSRF file?', 'warning'); return;
            }
            _approvalSsrfTransmitters = _parseApprovalSSRFTransmitters(doc);
            if (!_approvalSsrfTransmitters.length) {
                showAlert('No transmitter records found in this SSRF file.', 'warning'); return;
            }
            _approvalSsrfSelectedTx   = null;
            _approvalSsrfSelectedMode = null;
            const label = `${file.name} — ${_approvalSsrfTransmitters.length} transmitter${_approvalSsrfTransmitters.length !== 1 ? 's' : ''} found`;
            document.querySelectorAll('#approvalSsrfFileName').forEach(el => el.textContent = label);
            document.getElementById('approvalSsrfTxSearch').value = '';
            _renderApprovalSSRFTxList();
            _renderApprovalSSRFModeList();
            document.getElementById('approvalSsrfModal').style.display = 'flex';
        } catch (ex) {
            showAlert('Failed to read file: ' + ex.message, 'danger');
        }
    };
    reader.readAsText(file);
};

window.closeApprovalSSRFModal = function() {
    document.getElementById('approvalSsrfModal').style.display = 'none';
};

window.filterApprovalSSRFTransmitters = function() { _renderApprovalSSRFTxList(); };

function _renderApprovalSSRFTxList() {
    const filter = (document.getElementById('approvalSsrfTxSearch')?.value || '').toLowerCase();
    const list   = document.getElementById('approvalSsrfTxList');
    if (!list) return;
    const visible = _approvalSsrfTransmitters
        .map((tx, i) => ({ tx, i }))
        .filter(({ tx }) => !filter ||
            (tx.name || '').toLowerCase().includes(filter) ||
            (tx.mfg  || '').toLowerCase().includes(filter));
    if (!visible.length) {
        list.innerHTML = '<div style="padding:12px 14px;font-size:0.8rem;color:#475569;font-style:italic;">No matches.</div>';
        return;
    }
    list.innerHTML = visible.map(({ tx, i }) => {
        const active = i === _approvalSsrfSelectedTx;
        return `<div onclick="selectApprovalSSRFTx(${i})"
                    style="padding:9px 14px;cursor:pointer;font-size:0.82rem;
                           background:${active ? 'rgba(59,130,246,0.15)' : 'transparent'};
                           border-left:3px solid ${active ? '#3b82f6' : 'transparent'};">
            <div style="color:#e2e8f0;font-weight:500;">${escHtml(tx.name)}</div>
            <div style="color:#64748b;font-size:0.72rem;">${tx.mfg ? escHtml(tx.mfg) : '—'}</div>
        </div>`;
    }).join('');
}

function _renderApprovalSSRFModeList() {
    const list = document.getElementById('approvalSsrfModeList');
    if (!list) return;
    const tx = _approvalSsrfTransmitters[_approvalSsrfSelectedTx];
    if (!tx) { list.innerHTML = ''; return; }
    if (!tx.modes.length) {
        list.innerHTML = '<div style="padding:12px;font-size:0.8rem;color:#475569;font-style:italic;">No emission modes found.</div>';
        return;
    }
    list.innerHTML = tx.modes.map((m, mi) => {
        const active = mi === _approvalSsrfSelectedMode;
        return `<div onclick="selectApprovalSSRFMode(${mi})"
                    style="padding:10px 14px;cursor:pointer;font-size:0.8rem;
                           background:${active ? 'rgba(16,185,129,0.12)' : 'transparent'};
                           border-left:3px solid ${active ? '#10b981' : 'transparent'};
                           border-bottom:1px solid rgba(255,255,255,0.04);">
            <div style="color:#e2e8f0;font-family:monospace;">${escHtml(m.emsClass || '—')}</div>
            ${m.desc ? `<div style="color:#64748b;font-size:0.72rem;">${escHtml(m.desc)}</div>` : ''}
        </div>`;
    }).join('');
}

window.selectApprovalSSRFTx = function(idx) {
    _approvalSsrfSelectedTx   = idx;
    _approvalSsrfSelectedMode = null;
    _renderApprovalSSRFTxList();
    _renderApprovalSSRFModeList();
    _updateApprovalSSRFApplyBtn();
};

window.selectApprovalSSRFMode = function(mi) {
    _approvalSsrfSelectedMode = mi;
    _renderApprovalSSRFModeList();
    _updateApprovalSSRFApplyBtn();
    const tx = _approvalSsrfTransmitters[_approvalSsrfSelectedTx];
    const m  = tx?.modes[mi];
    const summary = document.getElementById('approvalSsrfSelectionSummary');
    if (summary && tx && m) {
        summary.style.fontStyle = 'normal';
        summary.style.color     = '#e2e8f0';
        summary.textContent     = `${tx.name} · ${m.emsClass}`;
    }
};

function _updateApprovalSSRFApplyBtn() {
    const btn = document.getElementById('approvalSsrfApplyBtn');
    if (!btn) return;
    const ready = _approvalSsrfSelectedTx !== null && _approvalSsrfSelectedMode !== null;
    btn.disabled    = !ready;
    btn.style.opacity = ready ? '1' : '0.5';
    btn.style.cursor  = ready ? 'pointer' : 'default';
}

window.applyApprovalSSRFSelection = function() {
    const tx = _approvalSsrfTransmitters[_approvalSsrfSelectedTx];
    if (!tx) return;
    // Field 340: "G,AN/PRC-209 SINCGARS Transmitter" (type prefix + name)
    const typeCode = tx.nomType ? tx.nomType.charAt(0).toUpperCase() : 'G';
    setVal('sfaf_340', `${typeCode},${tx.name}`);
    // Field 343: SSRF Serial (closest available to J/F 12 in XML)
    if (tx.serial) setVal('sfaf_343', tx.serial);
    closeApprovalSSRFModal();
    showAlert(`Equipment loaded: ${tx.name}`, 'success');
};

// ── Workbox request comment log (Status Log) ─────────────────────────────────

function renderRequestCommentLog(requestId, comments) {
    const count = comments.length;
    const entries = comments.map(c => `
        <div class="comment-entry">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                <strong style="font-size:0.74rem;color:#94a3b8;">${escHtml(c.workbox)}${c.author_name ? ' · ' + escHtml(c.author_name) : ''}</strong>
                <span style="font-size:0.68rem;color:#64748b;">${formatDate(c.created_at)}</span>
            </div>
            <div style="white-space:pre-wrap;">${escHtml(c.body)}</div>
        </div>`).join('');

    return `
    <div class="comment-log" id="req-comment-log-${requestId}">
        <div class="comment-log-header" onclick="toggleRequestCommentLog('${requestId}')">
            <span><i class="fas fa-comments" style="margin-right:4px;"></i>Status Log (${count})</span>
            <i class="fas fa-chevron-down" id="req-comment-log-chevron-${requestId}"></i>
        </div>
        <div id="req-comment-log-body-${requestId}" style="display:none;">
            ${entries || '<div style="font-size:0.75rem;color:#64748b;padding:4px 0;">No entries yet.</div>'}
            <div class="comment-input-row" style="margin-top:8px;display:flex;gap:6px;">
                <input type="text" id="req-comment-input-${requestId}" placeholder="Add a status log entry…"
                    style="flex:1;background:rgba(15,23,42,0.7);border:1px solid rgba(100,150,255,0.2);border-radius:6px;padding:5px 10px;color:#e2e8f0;font-size:0.8rem;"
                    onkeydown="if(event.key==='Enter')submitRequestComment('${requestId}')">
                <button class="btn-xs btn-xs-info" onclick="submitRequestComment('${requestId}')">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    </div>`;
}

window.toggleRequestCommentLog = function(requestId) {
    const body    = document.getElementById(`req-comment-log-body-${requestId}`);
    const chevron = document.getElementById(`req-comment-log-chevron-${requestId}`);
    if (!body) return;
    const open = body.style.display === 'none';
    body.style.display = open ? '' : 'none';
    if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : '';
};

window.openRequestCommentLog = function(requestId) {
    const row = document.getElementById(`req-comment-row-${requestId}`);
    if (!row) return;
    const open = row.style.display === 'none';
    row.style.display = open ? '' : 'none';
    if (open) {
        const body    = document.getElementById(`req-comment-log-body-${requestId}`);
        const chevron = document.getElementById(`req-comment-log-chevron-${requestId}`);
        if (body) body.style.display = '';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
    }
};

window.submitRequestComment = async function(requestId) {
    const input = document.getElementById(`req-comment-input-${requestId}`);
    if (!input) return;
    const body = input.value.trim();
    if (!body) return;

    try {
        const res = await fetch(`/api/frequency/requests/${requestId}/comments`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ body, workbox: userWorkbox || '' }),
        });
        const data = await res.json();
        if (!res.ok) { showAlert('Error: ' + (data.error || 'Failed to save comment'), 'danger'); return; }
        input.value = '';
        showAlert('Status log entry added.', 'success');
        loadPendingRequests();
    } catch (err) {
        showAlert('Error: ' + err.message, 'danger');
    }
};

// Action-bar Status Log button: opens the comment log for the single selected workbox item
window.openWorkboxStatusLog = function() {
    if (selectedWorkboxIds.size !== 1) return;
    const [id] = selectedWorkboxIds;
    openRequestCommentLog(id);
};

// Action-bar Lateral Coord button: opens the coord modal for the single selected workbox item
window.openWorkboxCoordModal = function() {
    if (selectedWorkboxIds.size !== 1) return;
    const [id] = selectedWorkboxIds;
    const entry = pendingRequests.find(r => r.request.id === id);
    const current = entry?.coordinated_with || [];
    openRequestCoordModal(id, current);
};

// ── Workbox lateral coordination modal ───────────────────────────────────────

let reqCoordModalRequestId = null;
let reqCoordSelected = new Set();

function renderReqCoordList() {
    const filter = (document.getElementById('reqCoordSearch')?.value || '').toLowerCase();
    const list   = document.getElementById('reqCoordModalList');
    if (!list) return;
    list.innerHTML = WORKBOX_LIST
        .filter(wb => !reqCoordSelected.has(wb) && wb.toLowerCase().includes(filter))
        .map(wb => `
            <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;
                        cursor:pointer;background:rgba(15,23,42,0.5);border:1px solid rgba(100,150,255,0.1);"
                 onclick="toggleReqCoordSelection('${escHtml(wb)}', true)">
                <i class="fas fa-plus" style="font-size:0.65rem;color:#3b82f6;"></i>
                <span style="font-size:0.8rem;">${escHtml(wb)}</span>
            </div>`).join('');
    renderReqCoordChips();
}

function renderReqCoordChips() {
    const chips = document.getElementById('reqCoordSelectedChips');
    const count = document.getElementById('reqCoordSelectedCount');
    if (!chips) return;
    if (count) count.textContent = reqCoordSelected.size;
    chips.innerHTML = [...reqCoordSelected].map(wb => `
        <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;
                     background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);
                     border-radius:12px;font-size:0.75rem;cursor:pointer;"
              onclick="toggleReqCoordSelection('${escHtml(wb)}', false); renderReqCoordList()">
            ${escHtml(wb)} <i class="fas fa-times" style="font-size:0.6rem;"></i>
        </span>`).join('');
}

function toggleReqCoordSelection(wb, add) {
    if (add) reqCoordSelected.add(wb); else reqCoordSelected.delete(wb);
    renderReqCoordList();
}

window.openRequestCoordModal = function(requestId, currentWorkboxes) {
    reqCoordModalRequestId = requestId;
    reqCoordSelected = new Set(currentWorkboxes || []);
    const modal = document.getElementById('reqCoordModal');
    if (!modal) return;
    const search = document.getElementById('reqCoordSearch');
    if (search) search.value = '';
    renderReqCoordList();
    modal.style.display = 'flex';
};

window.closeReqCoordModal = function() {
    const modal = document.getElementById('reqCoordModal');
    if (modal) modal.style.display = 'none';
    reqCoordModalRequestId = null;
};

window.saveReqCoordinations = async function() {
    if (!reqCoordModalRequestId) return;
    try {
        const res = await fetch(`/api/frequency/requests/${reqCoordModalRequestId}/coordinations`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ workboxes: [...reqCoordSelected] }),
        });
        if (!res.ok) { showAlert('Error saving coordinations', 'danger'); return; }
        closeReqCoordModal();
        showAlert('Lateral coordination updated.', 'success');
        loadPendingRequests();
    } catch (err) {
        showAlert('Error: ' + err.message, 'danger');
    }
};

// ── Lateral Coordination ──────────────────────────────────────────────────────

const WORKBOX_LIST = [
    'GAFC','NAFC','AFSOC ISM','ACC ISM','AMC ISM','AFGSC ISM','AFMC ISM','AFRC ISM',
    'ANG ISM','PACAF ISM','USAFE ISM','CENTCOM AFC','INDOPACOM AFC','EUCOM AFC',
    'SOCOM AFC','NORTHCOM AFC','FORSCOM AFC','USAREUR AFC','NAVEUR AFC','NAVPAC AFC',
];

// Render a collapsible comment log section for a card
function renderCommentLog(assignmentId, comments) {
    const count = comments.length;
    const entries = comments.map(c => `
        <div class="comment-entry">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                <strong style="font-size:0.74rem;color:#94a3b8;">${escHtml(c.workbox)}${c.author_name ? ' · ' + escHtml(c.author_name) : ''}</strong>
                <span style="font-size:0.68rem;color:#64748b;">${formatDate(c.created_at)}</span>
            </div>
            <div style="white-space:pre-wrap;">${escHtml(c.body)}</div>
        </div>`).join('');

    return `
    <div class="comment-log" id="comment-log-${assignmentId}">
        <div class="comment-log-header" onclick="toggleCommentLog('${assignmentId}')">
            <span><i class="fas fa-comments" style="margin-right:4px;"></i>Comments (${count})</span>
            <i class="fas fa-chevron-down" id="comment-log-chevron-${assignmentId}"></i>
        </div>
        <div id="comment-log-body-${assignmentId}" style="display:none;">
            ${entries || '<div style="font-size:0.75rem;color:#64748b;padding:4px 0;">No comments yet.</div>'}
            <div class="comment-input-row" style="margin-top:8px;display:flex;gap:6px;">
                <input type="text" id="comment-input-${assignmentId}" placeholder="Add a comment…"
                    style="flex:1;background:rgba(15,23,42,0.7);border:1px solid rgba(100,150,255,0.2);border-radius:6px;padding:5px 10px;color:#e2e8f0;font-size:0.8rem;"
                    onkeydown="if(event.key==='Enter')submitComment('${assignmentId}')">
                <button class="btn-xs btn-xs-info" onclick="submitComment('${assignmentId}')">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    </div>`;
}

function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.openCommentLog = function(assignmentId) {
    const row = document.getElementById(`comment-row-${assignmentId}`);
    if (!row) return;
    const open = row.style.display === 'none';
    row.style.display = open ? '' : 'none';
    // Auto-expand the inner comment log body when opening
    if (open) {
        const body    = document.getElementById(`comment-log-body-${assignmentId}`);
        const chevron = document.getElementById(`comment-log-chevron-${assignmentId}`);
        if (body) body.style.display = '';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
    }
};

window.toggleCommentLog = function(assignmentId) {
    const body    = document.getElementById(`comment-log-body-${assignmentId}`);
    const chevron = document.getElementById(`comment-log-chevron-${assignmentId}`);
    if (!body) return;
    const open = body.style.display === 'none';
    body.style.display    = open ? '' : 'none';
    if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : '';
};

window.submitComment = async function(assignmentId) {
    const input = document.getElementById(`comment-input-${assignmentId}`);
    if (!input) return;
    const body = input.value.trim();
    if (!body) return;

    try {
        const res = await fetch(`/api/frequency/assignments/${assignmentId}/comments`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ body, workbox: userWorkbox || '' }),
        });
        const data = await res.json();
        if (!res.ok) { showAlert('Error: ' + (data.error || 'Failed to save comment'), 'danger'); return; }
        input.value = '';
        showAlert('Comment added.', 'success');
        // Refresh to show new comment
        loadProposals();
        loadSubmittedProposals();
    } catch (err) {
        showAlert('Error: ' + err.message, 'danger');
    }
};

// Coordination modal state
let coordModalAssignmentId = null;
let coordSelected = new Set();

function renderCoordList() {
    const filter = (document.getElementById('coordSearch')?.value || '').toLowerCase();
    const list   = document.getElementById('coordModalList');
    if (!list) return;

    const visible = WORKBOX_LIST.filter(wb => !filter || wb.toLowerCase().includes(filter));
    list.innerHTML = visible.map(wb => {
        const checked = coordSelected.has(wb);
        return `<label style="display:flex;align-items:center;gap:8px;padding:5px 6px;font-size:0.84rem;
                              cursor:pointer;border-radius:5px;transition:background 0.1s;
                              ${checked ? 'background:rgba(16,185,129,0.12);' : ''}"
                      onmouseenter="this.style.background='rgba(100,150,255,0.08)'"
                      onmouseleave="this.style.background='${checked ? 'rgba(16,185,129,0.12)' : ''}'">
            <input type="checkbox" value="${escHtml(wb)}" ${checked ? 'checked' : ''}
                   onchange="toggleCoordSelection('${escHtml(wb)}', this.checked)">
            ${escHtml(wb)}
        </label>`;
    }).join('');

    renderCoordChips();
}

function renderCoordChips() {
    const chips = document.getElementById('coordSelectedChips');
    const count = document.getElementById('coordSelectedCount');
    if (!chips) return;
    if (count) count.textContent = coordSelected.size;

    if (coordSelected.size === 0) {
        chips.innerHTML = '<span style="font-size:0.75rem;color:#475569;font-style:italic;">None selected</span>';
        return;
    }
    chips.innerHTML = [...coordSelected].map(wb => `
        <span class="coord-chip" style="cursor:pointer;" title="Remove ${escHtml(wb)}"
              onclick="toggleCoordSelection('${escHtml(wb)}', false); renderCoordList()">
            ${escHtml(wb)} <i class="fas fa-times" style="font-size:0.6rem;opacity:0.7;"></i>
        </span>`).join('');
}

window.toggleCoordSelection = function(workbox, selected) {
    if (selected) {
        coordSelected.add(workbox);
    } else {
        coordSelected.delete(workbox);
    }
    renderCoordList();
};

window.openCoordModal = function(assignmentId, currentWorkboxes) {
    coordModalAssignmentId = assignmentId;
    const modal = document.getElementById('coordModal');
    if (!modal) return;

    coordSelected = new Set(Array.isArray(currentWorkboxes) ? currentWorkboxes : []);
    const searchEl = document.getElementById('coordSearch');
    if (searchEl) searchEl.value = '';
    renderCoordList();
    modal.style.display = 'flex';
};

window.closeCoordModal = function() {
    const modal = document.getElementById('coordModal');
    if (modal) modal.style.display = 'none';
    coordModalAssignmentId = null;
    coordSelected = new Set();
};

window.saveCoordinations = async function() {
    if (!coordModalAssignmentId) return;
    const workboxes = [...coordSelected];

    try {
        const res = await fetch(`/api/frequency/assignments/${coordModalAssignmentId}/coordinations`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ workboxes }),
        });
        const data = await res.json();
        if (!res.ok) { showAlert('Error: ' + (data.error || 'Failed'), 'danger'); return; }
        showAlert('Lateral coordination updated.', 'success');
        closeCoordModal();
        loadSubmittedProposals();
    } catch (err) {
        showAlert('Error: ' + err.message, 'danger');
    }
};

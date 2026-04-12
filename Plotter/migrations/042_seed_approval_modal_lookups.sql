-- Migration: Seed additional SFAF field lookup entries for approval modal dropdowns
-- Fields: 010 (Type of Action), 144 (Approval Authority), 151 (Coordination Indicator),
--         203 (Bureau), 209 (Area AFC), 354/454 (Antenna Name), 363/463 (Antenna Polarization),
--         704 (Type of Service), 716 (Usage Code)
-- Created: 2026-03-28

-- ─── Field 010: Type of Action ──────────────────────────────────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('010', 'N', 'New (create a new record)',                                               1),
    ('010', 'M', 'Modification (add, substitute, or remove data items)',                    2),
    ('010', 'A', 'Administrative Modification (typographical errors, admin data only)',     3),
    ('010', 'D', 'Delete (remove record from database)',                                    4),
    ('010', 'R', 'Renewal (periodic renewal of frequency assignment)',                      5),
    ('010', 'F', 'Notification',                                                            6)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 144: Approval Authority Indicator ────────────────────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('144', 'Y', 'Process through IRAC',                                                    1),
    ('144', 'U', 'Inside US&P; NOT through IRAC',                                          2),
    ('144', 'O', 'Outside US&P (OUS&P); NOT through IRAC',                                 3),
    ('144', 'N', 'Existing IRAC record; this transaction NOT through IRAC (use with 010=A)', 4)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 151: Coordination Indicator ──────────────────────────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('151', 'C', 'Coordinated with Canada',                                                 1),
    ('151', 'M', 'Coordinated with Mexico / NATO (EUCOM)',                                  2),
    ('151', 'B', 'Coordinated with both Canada & Mexico / NATO & Host Nation (EUCOM)',      3),
    ('151', 'H', 'Coordinated with Host Nation (EUCOM)',                                    4),
    ('151', 'D', 'Coordinated through NTIA with FAS member agencies',                       5),
    ('151', 'F', 'Coordinated through FAA',                                                 6),
    ('151', 'J', 'Coordinated through DoD/JCS',                                             7),
    ('151', 'U', 'No coordination indicated',                                               8)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 203: Bureau ───────────────────────────────────────────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('203', 'J1',   'Personnel',                  1),
    ('203', 'J2',   'Intelligence',               2),
    ('203', 'J3',   'Operations',                 3),
    ('203', 'J4',   'Logistics',                  4),
    ('203', 'J5',   'Plans & Policy',             5),
    ('203', 'J6',   'Communications / C4',        6),
    ('203', 'J7',   'Training & Exercises',       7),
    ('203', 'J8',   'Resource Management',        8),
    ('203', 'PA',   'US Army',                    9),
    ('203', 'USMC', 'US Marine Corps',           10),
    ('203', 'USN',  'US Navy',                   11)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 209: Area AFC / Other Organizations ──────────────────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('209', 'AFCA',  'DoD AFC Arizona',                            1),
    ('209', 'WSMR',  'DoD AFC White Sands Missile Range',          2),
    ('209', 'GAFC',  'Gulf Area Frequency Coordinator',            3),
    ('209', 'NAFC',  'National Area Frequency Coordinator',        4),
    ('209', 'JJPN',  'Joint Japan Area Frequency Coordinator',     5),
    ('209', 'JKOR',  'Joint Korea Area Frequency Coordinator',     6),
    ('209', 'JPAC',  'Joint Pacific Area Frequency Coordinator',   7),
    ('209', 'JEUR',  'Joint European Area Frequency Coordinator',  8)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 354: Antenna Name (Transmitter) — also used for field 454 (Receiver) ─
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('354', 'BICONICAL',   NULL,  1),
    ('354', 'BLADE',       NULL,  2),
    ('354', 'CORNER',      NULL,  3),
    ('354', 'DIPOLE',      NULL,  4),
    ('354', 'DISCONE',     NULL,  5),
    ('354', 'FLAT PLATE',  NULL,  6),
    ('354', 'HELIX',       NULL,  7),
    ('354', 'HORN',        NULL,  8),
    ('354', 'INVERTED V',  NULL,  9),
    ('354', 'LOG PER',     NULL, 10),
    ('354', 'LONG WIRE',   NULL, 11),
    ('354', 'LOOP',        NULL, 12),
    ('354', 'MONOPOLE',    NULL, 13),
    ('354', 'OMNI',        NULL, 14),
    ('354', 'PANEL',       NULL, 15),
    ('354', 'PARABOLIC',   NULL, 16),
    ('354', 'PATCH',       NULL, 17),
    ('354', 'RHOMBIC',     NULL, 18),
    ('354', 'SLEEVE',      NULL, 19),
    ('354', 'WHIP',        NULL, 20),
    ('354', 'YAGI',        NULL, 21),
    ('354', 'OTHER',       NULL, 22)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 363: Antenna Polarization — also used for field 463 (Receiver) ────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('363', 'A', 'Elliptic left-hand',         1),
    ('363', 'B', 'Elliptic right-hand',        2),
    ('363', 'D', 'Rotating',                   3),
    ('363', 'E', 'Elliptical',                 4),
    ('363', 'F', '45° linear',                 5),
    ('363', 'H', 'Horizontal',                 6),
    ('363', 'J', 'Linear (unspecified)',        7),
    ('363', 'L', 'Left-hand circular',         8),
    ('363', 'M', 'Oblique left-hand',          9),
    ('363', 'N', 'Oblique right-hand',        10),
    ('363', 'O', 'Oblique crossed',           11),
    ('363', 'R', 'Right-hand circular',       12),
    ('363', 'S', 'Horizontal and vertical',   13),
    ('363', 'T', 'Right- and left-hand circular', 14),
    ('363', 'V', 'Vertical',                  15),
    ('363', 'X', 'Other',                     16)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 704: Type of Service ─────────────────────────────────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('704', 'S', 'Fixed',                              1),
    ('704', 'D', 'Land Mobile',                        2),
    ('704', 'H', 'Maritime Mobile',                    3),
    ('704', 'Z', 'Aeronautical Mobile',                4),
    ('704', 'T', 'Broadcasting',                       5),
    ('704', 'B', 'Radionavigation',                    6),
    ('704', 'M', 'Meteorological',                     7),
    ('704', 'N', 'Standard Frequency and Time Signal', 8),
    ('704', 'L', 'Space Research',                     9),
    ('704', 'R', 'Radiodetermination',                10),
    ('704', 'X', 'Other',                             11)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 716: Usage Code ───────────────────────────────────────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('716', '1', 'Exclusive Government use',                                           1),
    ('716', '2', 'Shared Government/Non-Government, Government primary',               2),
    ('716', '3', 'Shared Government/Non-Government, co-equal',                         3),
    ('716', '4', 'Shared Government/Non-Government, Non-Government primary',           4),
    ('716', '5', 'Exclusive Non-Government use',                                       5),
    ('716', '6', 'Government secondary use',                                           6),
    ('716', '7', 'Non-Government secondary use',                                       7)
ON CONFLICT (field_code, value) DO NOTHING;

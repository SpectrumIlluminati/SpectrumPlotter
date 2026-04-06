-- Migration: Create SFAF field lookup tables (Fields 200, 201, 202, 204, 205, 206, 300, 400)
-- Created: 2026-03-26

CREATE TABLE IF NOT EXISTS sfaf_field_lookup (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_code VARCHAR(10)  NOT NULL,
    value      VARCHAR(100) NOT NULL,
    label      VARCHAR(200),
    sort_order INT          NOT NULL DEFAULT 0,
    is_active  BOOLEAN      NOT NULL DEFAULT true,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (field_code, value)
);

CREATE INDEX IF NOT EXISTS idx_sfaf_field_lookup_field_code ON sfaf_field_lookup(field_code);
CREATE INDEX IF NOT EXISTS idx_sfaf_field_lookup_active     ON sfaf_field_lookup(is_active);

-- ─── Field 200: Agency / Service ───────────────────────────────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('200', 'USA',     'US Army',                  1),
    ('200', 'DON',     'Department of the Navy',   2),
    ('200', 'USAF',    'US Air Force',             3),
    ('200', 'MC',      'Marine Corps',             4),
    ('200', 'NSA',     'National Security Agency', 5),
    ('200', 'USCG',    'US Coast Guard',           6),
    ('200', 'JNTSVC',  'Joint Service',            7)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 201: Combatant Command ──────────────────────────────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('201', 'USINDOPACOM', 'US Indo-Pacific Command',   1),
    ('201', 'EUCOM',       'US European Command',       2),
    ('201', 'SOUTHCOM',    'US Southern Command',       3),
    ('201', 'CENTCOM',     'US Central Command',        4),
    ('201', 'NORTHCOM',    'US Northern Command',       5),
    ('201', 'AFRICOM',     'US Africa Command',         6),
    ('201', 'USSTRATCOM',  'US Strategic Command',      7),
    ('201', 'SOCOM',       'US Special Operations Command', 8)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 202: Major Command (MAJCOM) ─────────────────────────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('202', 'AFSOC',  'Air Force Special Operations Command', 1),
    ('202', 'ACC',    'Air Combat Command',                   2),
    ('202', 'AFGSC',  'Air Force Global Strike Command',      3),
    ('202', 'AMC',    'Air Mobility Command',                 4),
    ('202', 'AETC',   'Air Education and Training Command',   5),
    ('202', 'USAFE',  'US Air Forces in Europe',              6),
    ('202', 'PACAF',  'Pacific Air Forces',                   7)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 204: Sub-Major Command ──────────────────────────────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('204', 'AFSOC',  'Air Force Special Operations Command', 1),
    ('204', 'ACC',    'Air Combat Command',                   2),
    ('204', 'AFGSC',  'Air Force Global Strike Command',      3),
    ('204', 'AMC',    'Air Mobility Command',                 4),
    ('204', 'AETC',   'Air Education and Training Command',   5),
    ('204', 'USAFE',  'US Air Forces in Europe',              6),
    ('204', 'PACAF',  'Pacific Air Forces',                   7)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 205: Numbered Air Force / Wing ──────────────────────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('205', 'AFSOC',  'Air Force Special Operations Command', 1),
    ('205', 'ACC',    'Air Combat Command',                   2),
    ('205', 'AFGSC',  'Air Force Global Strike Command',      3),
    ('205', 'AMC',    'Air Mobility Command',                 4),
    ('205', 'AETC',   'Air Education and Training Command',   5),
    ('205', 'USAFE',  'US Air Forces in Europe',              6),
    ('205', 'PACAF',  'Pacific Air Forces',                   7),
    ('205', '5AF',    'Fifth Air Force',                      8),
    ('205', '7AF',    'Seventh Air Force',                    9)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 206: ISM Office ─────────────────────────────────────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('206', 'GAFC',         'Gulf Area Frequency Coordinator',  1),
    ('206', 'NAFC',         'National Area Frequency Coordinator', 2),
    ('206', 'AFSOC',        'AFSOC ISM Office',                 3),
    ('206', 'HURLBURT ISM', 'Hurlburt Field ISM Office',        4)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 300: State / Area (US States + DC + Territories) ────────────────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    ('300', 'AL', 'Alabama',              1),
    ('300', 'AK', 'Alaska',              2),
    ('300', 'AZ', 'Arizona',             3),
    ('300', 'AR', 'Arkansas',            4),
    ('300', 'CA', 'California',          5),
    ('300', 'CO', 'Colorado',            6),
    ('300', 'CT', 'Connecticut',         7),
    ('300', 'DE', 'Delaware',            8),
    ('300', 'FL', 'Florida',             9),
    ('300', 'GA', 'Georgia',             10),
    ('300', 'HI', 'Hawaii',              11),
    ('300', 'ID', 'Idaho',               12),
    ('300', 'IL', 'Illinois',            13),
    ('300', 'IN', 'Indiana',             14),
    ('300', 'IA', 'Iowa',                15),
    ('300', 'KS', 'Kansas',              16),
    ('300', 'KY', 'Kentucky',            17),
    ('300', 'LA', 'Louisiana',           18),
    ('300', 'ME', 'Maine',               19),
    ('300', 'MD', 'Maryland',            20),
    ('300', 'MA', 'Massachusetts',       21),
    ('300', 'MI', 'Michigan',            22),
    ('300', 'MN', 'Minnesota',           23),
    ('300', 'MS', 'Mississippi',         24),
    ('300', 'MO', 'Missouri',            25),
    ('300', 'MT', 'Montana',             26),
    ('300', 'NE', 'Nebraska',            27),
    ('300', 'NV', 'Nevada',              28),
    ('300', 'NH', 'New Hampshire',       29),
    ('300', 'NJ', 'New Jersey',          30),
    ('300', 'NM', 'New Mexico',          31),
    ('300', 'NY', 'New York',            32),
    ('300', 'NC', 'North Carolina',      33),
    ('300', 'ND', 'North Dakota',        34),
    ('300', 'OH', 'Ohio',                35),
    ('300', 'OK', 'Oklahoma',            36),
    ('300', 'OR', 'Oregon',              37),
    ('300', 'PA', 'Pennsylvania',        38),
    ('300', 'RI', 'Rhode Island',        39),
    ('300', 'SC', 'South Carolina',      40),
    ('300', 'SD', 'South Dakota',        41),
    ('300', 'TN', 'Tennessee',           42),
    ('300', 'TX', 'Texas',               43),
    ('300', 'UT', 'Utah',                44),
    ('300', 'VT', 'Vermont',             45),
    ('300', 'VA', 'Virginia',            46),
    ('300', 'WA', 'Washington',          47),
    ('300', 'WV', 'West Virginia',       48),
    ('300', 'WI', 'Wisconsin',           49),
    ('300', 'WY', 'Wyoming',             50),
    ('300', 'DC', 'District of Columbia',51),
    ('300', 'PR', 'Puerto Rico',         52),
    ('300', 'GU', 'Guam',                53),
    ('300', 'VI', 'US Virgin Islands',   54),
    ('300', 'AS', 'American Samoa',      55),
    ('300', 'MP', 'Northern Mariana Islands', 56)
ON CONFLICT (field_code, value) DO NOTHING;

-- ─── Field 400: Country (Pub 7 Annex C — NATO Members + Partner Nations) ────────
INSERT INTO sfaf_field_lookup (field_code, value, label, sort_order) VALUES
    -- NATO Members
    ('400', 'AL', 'Albania',            1),
    ('400', 'BE', 'Belgium',            2),
    ('400', 'BG', 'Bulgaria',           3),
    ('400', 'CA', 'Canada',             4),
    ('400', 'HR', 'Croatia',            5),
    ('400', 'CZ', 'Czech Republic',     6),
    ('400', 'DK', 'Denmark',            7),
    ('400', 'EE', 'Estonia',            8),
    ('400', 'FI', 'Finland',            9),
    ('400', 'FR', 'France',             10),
    ('400', 'DE', 'Germany',            11),
    ('400', 'GR', 'Greece',             12),
    ('400', 'HU', 'Hungary',            13),
    ('400', 'IS', 'Iceland',            14),
    ('400', 'IT', 'Italy',              15),
    ('400', 'LV', 'Latvia',             16),
    ('400', 'LT', 'Lithuania',          17),
    ('400', 'LU', 'Luxembourg',         18),
    ('400', 'ME', 'Montenegro',         19),
    ('400', 'NL', 'Netherlands',        20),
    ('400', 'MK', 'North Macedonia',    21),
    ('400', 'NO', 'Norway',             22),
    ('400', 'PL', 'Poland',             23),
    ('400', 'PT', 'Portugal',           24),
    ('400', 'RO', 'Romania',            25),
    ('400', 'SK', 'Slovakia',           26),
    ('400', 'SI', 'Slovenia',           27),
    ('400', 'ES', 'Spain',              28),
    ('400', 'SE', 'Sweden',             29),
    ('400', 'TR', 'Turkey',             30),
    ('400', 'GB', 'United Kingdom',     31),
    ('400', 'US', 'United States',      32),
    -- Partner / Allied Nations
    ('400', 'AU', 'Australia',          33),
    ('400', 'AT', 'Austria',            34),
    ('400', 'BH', 'Bahrain',            35),
    ('400', 'EG', 'Egypt',              36),
    ('400', 'IE', 'Ireland',            37),
    ('400', 'IL', 'Israel',             38),
    ('400', 'JP', 'Japan',              39),
    ('400', 'JO', 'Jordan',             40),
    ('400', 'KW', 'Kuwait',             41),
    ('400', 'NZ', 'New Zealand',        42),
    ('400', 'QA', 'Qatar',              43),
    ('400', 'SA', 'Saudi Arabia',       44),
    ('400', 'KR', 'South Korea',        45),
    ('400', 'CH', 'Switzerland',        46),
    ('400', 'AE', 'United Arab Emirates', 47),
    ('400', 'UA', 'Ukraine',            48),
    ('400', 'AF', 'Afghanistan',        49),
    ('400', 'IQ', 'Iraq',               50)
ON CONFLICT (field_code, value) DO NOTHING;

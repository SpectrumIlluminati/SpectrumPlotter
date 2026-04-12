-- Migration 046: Seed AF MAJCOM units for serial number allocation management.
-- These are the Air Force Major Commands that receive AF serial number blocks from AFSMO.

INSERT INTO units (id, name, unit_code, unit_type, organization, is_active, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'Air Force Special Operations Command', 'AFSOC',  'MAJCOM', 'USAF', true, NOW(), NOW()),
    (gen_random_uuid(), 'Air Combat Command',                   'ACC',    'MAJCOM', 'USAF', true, NOW(), NOW()),
    (gen_random_uuid(), 'Air Force Global Strike Command',      'AFGSC',  'MAJCOM', 'USAF', true, NOW(), NOW()),
    (gen_random_uuid(), 'Air Mobility Command',                 'AMC',    'MAJCOM', 'USAF', true, NOW(), NOW()),
    (gen_random_uuid(), 'Air Education and Training Command',   'AETC',   'MAJCOM', 'USAF', true, NOW(), NOW()),
    (gen_random_uuid(), 'US Air Forces in Europe',              'USAFE',  'MAJCOM', 'USAF', true, NOW(), NOW()),
    (gen_random_uuid(), 'Pacific Air Forces',                   'PACAF',  'MAJCOM', 'USAF', true, NOW(), NOW()),
    (gen_random_uuid(), 'Air Force Materiel Command',           'AFMC',   'MAJCOM', 'USAF', true, NOW(), NOW()),
    (gen_random_uuid(), 'Air Force Reserve Command',            'AFRC',   'MAJCOM', 'USAF', true, NOW(), NOW()),
    (gen_random_uuid(), 'Air Force District of Washington',     'AFDW',   'MAJCOM', 'USAF', true, NOW(), NOW()),
    (gen_random_uuid(), 'Air National Guard',                   'ANG',    'MAJCOM', 'USAF', true, NOW(), NOW()),
    (gen_random_uuid(), 'Air Force Space Command',              'AFSPC',  'MAJCOM', 'USAF', true, NOW(), NOW())
ON CONFLICT (unit_code) DO NOTHING;

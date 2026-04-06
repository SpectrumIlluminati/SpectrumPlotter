-- Migration 048: Seed ISM-level units and link them to their parent MAJCOM.
-- Each ISM unit has parent_unit_id = their MAJCOM's ID (looked up by unit_code).
-- Additional MAJCOMs and ISMs can be added here as the hierarchy is established.

-- AFSOC ISMs
INSERT INTO units (id, name, unit_code, unit_type, organization, parent_unit_id, is_active, created_at, updated_at)
SELECT
    gen_random_uuid(),
    'Hurlburt Field ISM',
    'HURLBURT-ISM',
    'ISM',
    'USAF',
    u.id,
    true,
    NOW(),
    NOW()
FROM units u WHERE u.unit_code = 'AFSOC'
ON CONFLICT (unit_code) DO UPDATE SET parent_unit_id = EXCLUDED.parent_unit_id;

INSERT INTO units (id, name, unit_code, unit_type, organization, parent_unit_id, is_active, created_at, updated_at)
SELECT
    gen_random_uuid(),
    'Cannon AFB ISM',
    'CANNON-ISM',
    'ISM',
    'USAF',
    u.id,
    true,
    NOW(),
    NOW()
FROM units u WHERE u.unit_code = 'AFSOC'
ON CONFLICT (unit_code) DO UPDATE SET parent_unit_id = EXCLUDED.parent_unit_id;

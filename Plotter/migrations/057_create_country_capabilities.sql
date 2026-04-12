-- 057_create_country_capabilities.sql
-- Stores per-country spectrum capability entries for the map sidebar.
-- Each entry belongs to a category (civilian / military / cema).

CREATE TABLE IF NOT EXISTS country_capabilities (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    country     VARCHAR(100) NOT NULL,
    category    VARCHAR(20)  NOT NULL
                             CHECK (category IN ('civilian','military','cema')),
    equipment   TEXT         NOT NULL DEFAULT '',
    usage       TEXT         NOT NULL DEFAULT '',
    freq_range  TEXT         NOT NULL DEFAULT '',
    wattage     TEXT         NOT NULL DEFAULT '',
    created_by  UUID         REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_country_cap_country
    ON country_capabilities(country);
CREATE INDEX IF NOT EXISTS idx_country_cap_country_cat
    ON country_capabilities(country, category);

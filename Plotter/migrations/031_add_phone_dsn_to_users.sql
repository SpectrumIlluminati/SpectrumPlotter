-- Migration 031: Add phone_dsn column to users
-- The existing 'phone' column becomes the commercial (mandatory) phone.
-- phone_dsn is the optional DSN (Defense Switched Network) phone number.

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_dsn VARCHAR(30);

-- Add unified_command (SFAF 201) field to account_requests
ALTER TABLE account_requests
    ADD COLUMN IF NOT EXISTS unified_command VARCHAR(100);

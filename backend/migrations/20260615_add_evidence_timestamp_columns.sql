ALTER TABLE evidence
    ADD COLUMN IF NOT EXISTS timestamp_token TEXT,
    ADD COLUMN IF NOT EXISTS timestamp_authority VARCHAR(500),
    ADD COLUMN IF NOT EXISTS timestamp_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS timestamp_hash_algorithm VARCHAR(50),
    ADD COLUMN IF NOT EXISTS timestamp_message_imprint VARCHAR(128),
    ADD COLUMN IF NOT EXISTS timestamp_nonce VARCHAR(64);

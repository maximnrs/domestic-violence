-- Evidence files table
CREATE TABLE IF NOT EXISTS evidence_files (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    hmac_hash TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending'  -- 'pending' | 'verified' | 'tampered' | 'error'
);

-- Audit logs table — insert only, never update or delete
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    object_key TEXT NOT NULL,
    check_time TIMESTAMPTZ DEFAULT NOW(),
    result TEXT NOT NULL,        -- 'ok' | 'tampered' | 'error'
    stored_hash TEXT NOT NULL,
    computed_hash TEXT NOT NULL,
    message TEXT
);

-- Enforce append-only on audit_logs: raise an error on any UPDATE or DELETE
-- so buggy application code fails loudly instead of silently doing nothing.
CREATE OR REPLACE FUNCTION audit_log_readonly() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_no_update ON audit_logs;
CREATE TRIGGER audit_no_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit_log_readonly();

DROP TRIGGER IF EXISTS audit_no_delete ON audit_logs;
CREATE TRIGGER audit_no_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit_log_readonly();

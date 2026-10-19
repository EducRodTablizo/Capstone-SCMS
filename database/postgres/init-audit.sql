-- SMS Tamper-Evident Audit Log Database (Append-Only)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id VARCHAR(100) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID,
    previous_value JSONB,
    new_value JSONB,
    details JSONB,
    client_ip VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reject all UPDATE and DELETE operations on audit_logs (SMS-014 AC2)
CREATE OR REPLACE FUNCTION reject_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SCMS Security Violation: audit_logs table is append-only. Modification or deletion is strictly rejected.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit_update ON audit_logs;
CREATE TRIGGER trg_protect_audit_update
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION reject_audit_modification();

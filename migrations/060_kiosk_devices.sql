-- ============================================================================
-- Kiosk Devices — paired physical devices that can clock employees in/out
-- without requiring a user to sign in. Each device gets a long-lived token
-- and an optional IP allowlist (CIDR list).
-- ============================================================================

CREATE TABLE IF NOT EXISTS kiosk_devices (
    id                       uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id               uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name                     text        NOT NULL,
    description              text,

    -- Pairing flow: admin creates the row with a 6-digit code, device exchanges
    -- it for a permanent token. Code is single-use and expires.
    pairing_code             text,
    pairing_code_expires_at  timestamptz,

    -- The actual auth credential. Stored as sha256(token).
    -- Token itself is shown to the device once (in the pair API response).
    token_hash               text,
    paired_at                timestamptz,

    -- Optional CIDR allowlist (e.g. ["203.0.113.0/24", "198.51.100.42"])
    -- NULL or empty array = no IP restriction
    ip_allowlist             jsonb       DEFAULT '[]'::jsonb,

    last_seen_at             timestamptz,
    last_seen_ip             text,

    revoked_at               timestamptz,
    created_by               uuid        REFERENCES auth.users(id),
    created_at               timestamptz DEFAULT now(),
    updated_at               timestamptz DEFAULT now()
);

CREATE INDEX idx_kiosk_devices_company   ON kiosk_devices(company_id);
CREATE INDEX idx_kiosk_devices_token     ON kiosk_devices(token_hash) WHERE token_hash IS NOT NULL;
CREATE INDEX idx_kiosk_devices_pairing   ON kiosk_devices(pairing_code) WHERE pairing_code IS NOT NULL;

ALTER TABLE kiosk_devices ENABLE ROW LEVEL SECURITY;

-- Admins read company devices
CREATE POLICY kiosk_devices_select ON kiosk_devices FOR SELECT
    USING (company_id = public.get_my_company_id());

-- HR+/admin can create devices
CREATE POLICY kiosk_devices_insert ON kiosk_devices FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager')
    );

-- HR+/admin can update (rename, change IP allowlist, revoke)
CREATE POLICY kiosk_devices_update ON kiosk_devices FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager')
    );

CREATE POLICY kiosk_devices_delete ON kiosk_devices FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager')
    );

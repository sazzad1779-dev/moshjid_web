-- ============================================================
-- Mosque Finance Dashboard — Cloud schema (Supabase / PostgreSQL)
-- Mirrors the schema already created in the Supabase project.
-- Run in the Supabase SQL Editor (idempotent where possible).
-- ============================================================

-- ── Enums ──────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('cash', 'bkash', 'nagad', 'bank', 'card', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'collector', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE due_status AS ENUM ('unpaid', 'partial', 'paid', 'waived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Profiles (members, collectors, admins) ─────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY,
  member_code  text,
  full_name    text NOT NULL,
  phone        text,
  email        text,
  role         user_role    NOT NULL DEFAULT 'member',
  status       user_status  NOT NULL DEFAULT 'active',
  area_id      uuid,
  collector_id uuid,
  address      text,
  avatar_url   text,
  joined_at    date         NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz  NOT NULL DEFAULT NOW(),
  updated_at   timestamptz  NOT NULL DEFAULT NOW()
);

-- ── Monthly dues ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monthly_dues (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     uuid NOT NULL REFERENCES profiles (id),
  period        date NOT NULL,
  amount_due    numeric NOT NULL,
  amount_paid   numeric NOT NULL DEFAULT 0,
  status        due_status NOT NULL DEFAULT 'unpaid',
  due_date      date NOT NULL,
  waived_reason text,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);

-- ── Transactions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  type              transaction_type   NOT NULL,
  member_id         uuid,
  monthly_due_id    uuid,
  donor_name        text,
  donor_phone       text,
  collector_id      uuid,
  amount            numeric            NOT NULL CHECK (amount > 0),
  payment_method    payment_method     NOT NULL DEFAULT 'cash',
  gateway_reference text,
  status            transaction_status NOT NULL DEFAULT 'pending',
  note              text,
  receipt_number    text UNIQUE,
  date              date               NOT NULL DEFAULT CURRENT_DATE,
  entered_by        uuid               NOT NULL REFERENCES profiles (id),
  approved_by       uuid,
  created_at        timestamptz        NOT NULL DEFAULT NOW(),
  updated_at        timestamptz        NOT NULL DEFAULT NOW(),
  category          text,
  id                text,
  CONSTRAINT fk_member      FOREIGN KEY (member_id)      REFERENCES profiles (id),
  CONSTRAINT fk_monthly_due FOREIGN KEY (monthly_due_id) REFERENCES monthly_dues (id),
  CONSTRAINT fk_collector   FOREIGN KEY (collector_id)   REFERENCES profiles (id),
  CONSTRAINT fk_approved_by FOREIGN KEY (approved_by)    REFERENCES profiles (id),
  CONSTRAINT member_or_donor CHECK (member_id IS NOT NULL OR donor_name IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_transactions_date      ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_type      ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_status    ON transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_member    ON transactions (member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_collector ON transactions (collector_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receipt   ON transactions (receipt_number);

-- ── Expenses ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text,
  description  text,
  amount       numeric,
  expense_date date,
  receipt_url  text,
  created_by   uuid,
  approved_by  uuid,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW()
);

-- ── Settings ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id                      boolean PRIMARY KEY DEFAULT true CHECK (id),
  mosque_name             text NOT NULL DEFAULT 'My Masjid',
  address                 text,
  logo_url                text,
  currency                text NOT NULL DEFAULT 'BDT',
  default_monthly_due     numeric NOT NULL DEFAULT 0,
  receipt_prefix          text NOT NULL DEFAULT 'RCPT',
  fiscal_year_start_month integer NOT NULL DEFAULT 1,
  payment_methods         text[] NOT NULL DEFAULT ARRAY['cash','bkash','nagad','bank'],
  contact_phone           text,
  contact_email           text,
  updated_at              timestamptz NOT NULL DEFAULT NOW()
);

-- ── Audit logs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (reference — already configured in cloud)
-- The app connects with the service role (postgres) which
-- bypasses RLS, so these are only for direct client access.
-- ============================================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS txn_admin_all ON transactions;
CREATE POLICY txn_admin_all ON transactions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

DROP POLICY IF EXISTS txn_insert_collector ON transactions;
CREATE POLICY txn_insert_collector ON transactions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('collector','admin','super_admin')));

DROP POLICY IF EXISTS txn_select_own ON transactions;
CREATE POLICY txn_select_own ON transactions
  FOR SELECT TO authenticated
  USING (entered_by = auth.uid());

DROP POLICY IF EXISTS txn_select_collector_own_entries ON transactions;
CREATE POLICY txn_select_collector_own_entries ON transactions
  FOR SELECT TO authenticated
  USING (collector_id = auth.uid());

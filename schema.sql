CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  date        DATE        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('income', 'expense')),
  category    TEXT        NOT NULL DEFAULT 'Uncategorized',
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  note           TEXT        DEFAULT '',
  entered_by     TEXT        DEFAULT '',
  payment_method TEXT        DEFAULT 'Cash',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);

CREATE TABLE t_p98037960_adr_security_prototy.adr_exports (
  adr_id       TEXT PRIMARY KEY,
  markdown     TEXT NOT NULL DEFAULT '',
  jira         TEXT NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

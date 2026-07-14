-- Инициализация локальной БД Sentinel ADR
-- Используется только при запуске через Docker (схема: public)

CREATE TABLE IF NOT EXISTS public.adrs (
  id            TEXT PRIMARY KEY,
  number        INTEGER NOT NULL,
  title         TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'Предложено',
  jira_ticket   TEXT NOT NULL DEFAULT '',
  product_name  TEXT NOT NULL DEFAULT '',
  appeal_type   TEXT NOT NULL DEFAULT 'Консультация',
  date          TEXT NOT NULL DEFAULT '',
  author        TEXT NOT NULL DEFAULT '',
  tags          JSONB NOT NULL DEFAULT '[]',
  context       TEXT NOT NULL DEFAULT '',
  decision      TEXT NOT NULL DEFAULT '',
  consequences  TEXT NOT NULL DEFAULT '',
  section_order JSONB NOT NULL DEFAULT '[]',
  section_layout JSONB NOT NULL DEFAULT '[]',
  versions      JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS adrs_number_key ON public.adrs (number);

CREATE TABLE IF NOT EXISTS public.adr_exports (
  adr_id       TEXT PRIMARY KEY,
  markdown     TEXT NOT NULL DEFAULT '',
  jira         TEXT NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.adr_templates (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL DEFAULT '',
  description    TEXT NOT NULL DEFAULT '',
  icon           TEXT NOT NULL DEFAULT 'FileText',
  source_adr_id  TEXT NOT NULL DEFAULT '',
  title          TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'Предложено',
  jira_ticket    TEXT NOT NULL DEFAULT '',
  product_name   TEXT NOT NULL DEFAULT '',
  appeal_type    TEXT NOT NULL DEFAULT 'Консультация',
  author         TEXT NOT NULL DEFAULT '',
  tags           JSONB NOT NULL DEFAULT '[]',
  context        TEXT NOT NULL DEFAULT '',
  decision       TEXT NOT NULL DEFAULT '',
  consequences   TEXT NOT NULL DEFAULT '',
  section_order  JSONB NOT NULL DEFAULT '[]',
  section_layout JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
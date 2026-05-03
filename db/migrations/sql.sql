DROP TABLE IF EXISTS accounts;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT NOT NULL UNIQUE PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  x_access_tokens TEXT NOT NULL DEFAULT '[]',
  x_refresh_tokens TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

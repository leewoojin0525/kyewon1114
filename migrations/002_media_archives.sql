-- Original bytes can be moved to a verified, private offline archive without
-- changing immutable media records or any published/historical photographs.
CREATE TABLE IF NOT EXISTS w_media_archives (
  media_id uuid PRIMARY KEY REFERENCES w_media(id) ON DELETE CASCADE,
  original_key text UNIQUE NOT NULL,
  archive_id text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  bytes bigint NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO w_migrations(name) VALUES ('002_media_archives') ON CONFLICT DO NOTHING;

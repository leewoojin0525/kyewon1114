CREATE TABLE IF NOT EXISTS w_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS w_content (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK(kind IN ('projects','journal','settings')),
  current_version integer NOT NULL DEFAULT 1,
  review_version integer,
  published_version integer,
  public_slug text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kind, public_slug)
);
CREATE UNIQUE INDEX IF NOT EXISTS w_one_settings ON w_content(kind) WHERE kind='settings';
CREATE TABLE IF NOT EXISTS w_versions (
  content_id uuid NOT NULL REFERENCES w_content(id) ON DELETE CASCADE,
  version integer NOT NULL,
  data jsonb NOT NULL,
  created_by integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(content_id, version)
);
CREATE TABLE IF NOT EXISTS w_publications (
  id bigserial PRIMARY KEY,
  content_id uuid NOT NULL REFERENCES w_content(id),
  version integer NOT NULL,
  action text NOT NULL CHECK(action IN ('publish','unpublish','restore')),
  actor_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS w_redirects (
  kind text NOT NULL, slug text NOT NULL,
  content_id uuid NOT NULL REFERENCES w_content(id),
  PRIMARY KEY(kind,slug)
);
CREATE TABLE IF NOT EXISTS w_media (
  id uuid PRIMARY KEY, original_key text NOT NULL,
  mime text NOT NULL, bytes integer NOT NULL,
  width integer NOT NULL, height integer NOT NULL,
  derivatives jsonb NOT NULL,
  uploaded_by integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS w_media_refs (
  content_id uuid NOT NULL REFERENCES w_content(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES w_media(id),
  PRIMARY KEY(content_id,media_id)
);
CREATE TABLE IF NOT EXISTS w_inquiries (
  id uuid PRIMARY KEY, receipt text UNIQUE NOT NULL,
  submission_key uuid UNIQUE NOT NULL, payload_hash text NOT NULL,
  data jsonb NOT NULL, state text NOT NULL DEFAULT 'new' CHECK(state IN ('new','reviewing','answered','archived')),
  note text NOT NULL DEFAULT '', privacy_version text NOT NULL,
  consent_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 months')
);
CREATE TABLE IF NOT EXISTS w_notification_jobs (
  id uuid PRIMARY KEY,
  inquiry_id uuid UNIQUE NOT NULL REFERENCES w_inquiries(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','retry','failed','sent','test')),
  attempts integer NOT NULL DEFAULT 0, next_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz, provider_id text, error_code text,
  generation integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS w_rate_limits (key text PRIMARY KEY, hits integer NOT NULL, resets_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS w_audit (
  id bigserial PRIMARY KEY, actor_id integer, action text NOT NULL,
  target text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS w_worker_health (id integer PRIMARY KEY CHECK(id=1), heartbeat timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS w_jobs_due ON w_notification_jobs(next_at) WHERE state IN ('pending','retry','processing');
CREATE INDEX IF NOT EXISTS w_inquiry_expiry ON w_inquiries(expires_at);
INSERT INTO w_migrations(name) VALUES ('001_editorial') ON CONFLICT DO NOTHING;

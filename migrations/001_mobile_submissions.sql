BEGIN;

CREATE TABLE IF NOT EXISTS public.mobile_submissions (
  actor_id uuid NOT NULL REFERENCES public.profiles (id),
  submission_id uuid NOT NULL,
  payload_hash text NOT NULL,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, submission_id)
);

ALTER TABLE public.mobile_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mobile_submissions FROM anon, authenticated;

COMMIT;

CREATE TABLE public.preset_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL,
  body text NOT NULL,
  created_by_member_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preset_messages TO anon, authenticated;
GRANT ALL ON public.preset_messages TO service_role;
ALTER TABLE public.preset_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY preset_messages_all ON public.preset_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX preset_messages_group_idx ON public.preset_messages(group_id, created_at DESC);
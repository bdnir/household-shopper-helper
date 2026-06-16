
CREATE TYPE public.member_role AS ENUM ('purchasing','requesting','both');
CREATE TYPE public.item_status AS ENUM ('pending','purchased');

CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO anon, authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_all" ON public.groups FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  role public.member_role NOT NULL DEFAULT 'both',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, device_id),
  UNIQUE(group_id, phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO anon, authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_all" ON public.members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  status public.item_status NOT NULL DEFAULT 'pending',
  added_by_name text NOT NULL,
  added_by_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  purchased_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO anon, authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_all" ON public.items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.recent_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recent_items TO anon, authenticated;
GRANT ALL ON public.recent_items TO service_role;
ALTER TABLE public.recent_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recent_all" ON public.recent_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  from_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  from_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_all" ON public.messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.message_reads (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reads TO anon, authenticated;
GRANT ALL ON public.message_reads TO service_role;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reads_all" ON public.message_reads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;

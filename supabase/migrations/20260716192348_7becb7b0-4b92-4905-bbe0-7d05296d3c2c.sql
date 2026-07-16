
-- 1. Link members to auth users
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS members_user_id_idx ON public.members(user_id);
CREATE INDEX IF NOT EXISTS members_group_user_idx ON public.members(group_id, user_id);

-- 2. Helper: is the calling user a member of the group?
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE group_id = _group_id AND user_id = auth.uid()
  )
$$;

-- 3. Helper: is the calling user an admin of the group?
CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE group_id = _group_id AND user_id = auth.uid() AND is_admin = true
  )
$$;

-- 4. Drop the old permissive policies
DROP POLICY IF EXISTS groups_all ON public.groups;
DROP POLICY IF EXISTS members_all ON public.members;
DROP POLICY IF EXISTS items_all ON public.items;
DROP POLICY IF EXISTS recent_all ON public.recent_items;
DROP POLICY IF EXISTS messages_all ON public.messages;
DROP POLICY IF EXISTS reads_all ON public.message_reads;
DROP POLICY IF EXISTS preset_messages_all ON public.preset_messages;
DROP POLICY IF EXISTS push_subscriptions_all ON public.push_subscriptions;

-- 5. Revoke anon access
REVOKE ALL ON public.groups, public.members, public.items, public.recent_items,
  public.messages, public.message_reads, public.preset_messages, public.push_subscriptions FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups, public.members, public.items,
  public.recent_items, public.messages, public.message_reads, public.preset_messages,
  public.push_subscriptions TO authenticated;

-- 6. New policies

-- groups: view groups you are a member of; anyone signed-in can create; admins can update/delete
CREATE POLICY groups_select ON public.groups FOR SELECT TO authenticated
  USING (public.is_group_member(id));
CREATE POLICY groups_insert ON public.groups FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY groups_update ON public.groups FOR UPDATE TO authenticated
  USING (public.is_group_admin(id)) WITH CHECK (public.is_group_admin(id));
CREATE POLICY groups_delete ON public.groups FOR DELETE TO authenticated
  USING (public.is_group_admin(id));

-- members: see members of your groups; only manage your own row (or admins can manage anyone in their group)
CREATE POLICY members_select ON public.members FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));
CREATE POLICY members_insert ON public.members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_group_admin(group_id));
CREATE POLICY members_update ON public.members FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_group_admin(group_id))
  WITH CHECK (user_id = auth.uid() OR public.is_group_admin(group_id));
CREATE POLICY members_delete ON public.members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_group_admin(group_id));

-- items
CREATE POLICY items_select ON public.items FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));
CREATE POLICY items_insert ON public.items FOR INSERT TO authenticated
  WITH CHECK (public.is_group_member(group_id));
CREATE POLICY items_update ON public.items FOR UPDATE TO authenticated
  USING (public.is_group_member(group_id)) WITH CHECK (public.is_group_member(group_id));
CREATE POLICY items_delete ON public.items FOR DELETE TO authenticated
  USING (public.is_group_member(group_id));

-- recent_items
CREATE POLICY recent_select ON public.recent_items FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));
CREATE POLICY recent_insert ON public.recent_items FOR INSERT TO authenticated
  WITH CHECK (public.is_group_member(group_id));
CREATE POLICY recent_update ON public.recent_items FOR UPDATE TO authenticated
  USING (public.is_group_member(group_id)) WITH CHECK (public.is_group_member(group_id));
CREATE POLICY recent_delete ON public.recent_items FOR DELETE TO authenticated
  USING (public.is_group_member(group_id));

-- messages: view messages in your groups; write as yourself; delete if author or admin
CREATE POLICY messages_select ON public.messages FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));
CREATE POLICY messages_insert ON public.messages FOR INSERT TO authenticated
  WITH CHECK (public.is_group_member(group_id));
CREATE POLICY messages_delete ON public.messages FOR DELETE TO authenticated
  USING (
    public.is_group_admin(group_id)
    OR EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = messages.from_member_id AND m.user_id = auth.uid()
    )
  );

-- message_reads
CREATE POLICY reads_select ON public.message_reads FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.messages msg
    WHERE msg.id = message_reads.message_id AND public.is_group_member(msg.group_id)
  ));
CREATE POLICY reads_insert ON public.message_reads FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = message_reads.member_id AND m.user_id = auth.uid()
  ));
CREATE POLICY reads_delete ON public.message_reads FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = message_reads.member_id AND m.user_id = auth.uid()
  ));

-- preset_messages
CREATE POLICY preset_select ON public.preset_messages FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));
CREATE POLICY preset_insert ON public.preset_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_group_member(group_id));
CREATE POLICY preset_delete ON public.preset_messages FOR DELETE TO authenticated
  USING (public.is_group_member(group_id));

-- push_subscriptions: owner-only
CREATE POLICY push_select ON public.push_subscriptions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = push_subscriptions.member_id AND m.user_id = auth.uid()
  ));
CREATE POLICY push_insert ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = push_subscriptions.member_id AND m.user_id = auth.uid()
  ));
CREATE POLICY push_delete ON public.push_subscriptions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = push_subscriptions.member_id AND m.user_id = auth.uid()
  ));

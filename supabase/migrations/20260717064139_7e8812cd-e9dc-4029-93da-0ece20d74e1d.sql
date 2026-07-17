
-- Re-grant anon access to public app tables
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.groups, public.members, public.items, public.recent_items,
  public.messages, public.message_reads, public.preset_messages, public.push_subscriptions
TO anon;

-- Add permissive anon policies (authenticated policies remain strict via is_group_member)
CREATE POLICY groups_anon_all ON public.groups FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY members_anon_all ON public.members FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY items_anon_all ON public.items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY recent_items_anon_all ON public.recent_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY messages_anon_all ON public.messages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY message_reads_anon_all ON public.message_reads FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY preset_messages_anon_all ON public.preset_messages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY push_subscriptions_anon_all ON public.push_subscriptions FOR ALL TO anon USING (true) WITH CHECK (true);

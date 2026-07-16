import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

export function supabaseForUser(ctx: ToolContext): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export async function getCallerMember(ctx: ToolContext, groupId: string) {
  const supa = supabaseForUser(ctx);
  const { data, error } = await supa
    .from("members")
    .select("id, name, is_admin, role")
    .eq("group_id", groupId)
    .eq("user_id", ctx.getUserId()!)
    .maybeSingle();
  if (error) throw error;
  return data;
}

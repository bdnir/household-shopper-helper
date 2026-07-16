import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_members",
  title: "List group members",
  description: "List members of a group.",
  inputSchema: { group_id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ group_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("members")
      .select("id, name, role, is_admin")
      .eq("group_id", group_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { members: data ?? [] } };
  },
});

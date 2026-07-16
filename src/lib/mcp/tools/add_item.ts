import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getCallerMember, supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_item",
  title: "Add shopping item",
  description: "Add a new item to a group's shopping list.",
  inputSchema: {
    group_id: z.string().uuid(),
    name: z.string().min(1).max(200),
    is_private: z.boolean().optional(),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ group_id, name, is_private }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const me = await getCallerMember(ctx, group_id);
    if (!me) return { content: [{ type: "text", text: "You are not a member of this group." }], isError: true };
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("items")
      .insert({
        group_id,
        name,
        is_private: !!is_private,
        added_by_member_id: me.id,
        added_by_name: me.name,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Added: ${data.name}` }], structuredContent: { item: data } };
  },
});

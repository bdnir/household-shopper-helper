import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getCallerMember, supabaseForUser } from "../supabase";

export default defineTool({
  name: "send_message",
  title: "Send a reminder",
  description: "Post a reminder message to a group. Delivers a push notification to other group members.",
  inputSchema: {
    group_id: z.string().uuid(),
    body: z.string().min(1).max(500),
  },
  annotations: { readOnlyHint: false, openWorldHint: true },
  handler: async ({ group_id, body }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const me = await getCallerMember(ctx, group_id);
    if (!me) return { content: [{ type: "text", text: "You are not a member of this group." }], isError: true };
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("messages")
      .insert({ group_id, body, from_name: me.name, from_member_id: me.id })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: "Sent" }], structuredContent: { message: data } };
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_messages",
  title: "List reminders/messages",
  description: "List recent reminder messages in a group (newest first).",
  inputSchema: {
    group_id: z.string().uuid(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ group_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("messages")
      .select("id, body, from_name, created_at")
      .eq("group_id", group_id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { messages: data ?? [] } };
  },
});

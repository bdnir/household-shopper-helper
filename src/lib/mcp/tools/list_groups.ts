import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_groups",
  title: "List your groups",
  description: "List all shopping groups the signed-in user belongs to.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa.from("groups").select("id, name, created_at").order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { groups: data ?? [] } };
  },
});

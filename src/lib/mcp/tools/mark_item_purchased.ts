import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "mark_item_purchased",
  title: "Mark item purchased",
  description: "Mark a shopping item as purchased.",
  inputSchema: { item_id: z.string().uuid() },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ item_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("items")
      .update({ status: "purchased", purchased_at: new Date().toISOString() })
      .eq("id", item_id)
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Purchased: ${data.name}` }], structuredContent: { item: data } };
  },
});

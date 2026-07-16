import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_items",
  title: "List shopping items",
  description: "List items in a group. Filter by status: pending (default), purchased, or all.",
  inputSchema: {
    group_id: z.string().uuid().describe("Group ID."),
    status: z.enum(["pending", "purchased", "all"]).optional().describe("Filter items by status. Default: pending."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ group_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supa = supabaseForUser(ctx);
    let q = supa
      .from("items")
      .select("id, name, status, added_by_name, is_private, purchased_at, created_at")
      .eq("group_id", group_id)
      .order("created_at", { ascending: false });
    if (status && status !== "all") q = q.eq("status", status);
    else if (!status) q = q.eq("status", "pending");
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { items: data ?? [] } };
  },
});

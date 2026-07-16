import { auth, defineMcp } from "@lovable.dev/mcp-js";
import addItem from "./tools/add_item";
import deleteItem from "./tools/delete_item";
import listGroups from "./tools/list_groups";
import listItems from "./tools/list_items";
import listMembers from "./tools/list_members";
import listMessages from "./tools/list_messages";
import markItemPurchased from "./tools/mark_item_purchased";
import sendMessage from "./tools/send_message";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "super-helper-mcp",
  title: "Super-Helper",
  version: "0.1.0",
  instructions:
    "Tools for the Super-Helper family shopping app. Use list_groups to find the user's groups, then list_items/list_messages/list_members and add_item/mark_item_purchased/delete_item/send_message to act on a specific group. Every tool acts as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listGroups,
    listItems,
    listMessages,
    listMembers,
    addItem,
    markItemPurchased,
    deleteItem,
    sendMessage,
  ],
});

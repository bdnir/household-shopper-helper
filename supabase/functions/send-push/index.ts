// Sends web push notifications to all members of a group (except the sender)
// when a new message is inserted. Triggered by a database webhook.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:notifications@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { message_id } = await req.json();
    if (!message_id) return new Response("missing message_id", { status: 400 });

    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .select("id, group_id, from_member_id, from_name, body")
      .eq("id", message_id)
      .single();
    if (msgErr || !msg) {
      return new Response(JSON.stringify({ error: msgErr?.message ?? "not found" }), { status: 404, headers: corsHeaders });
    }

    const { data: group } = await supabase
      .from("groups")
      .select("name")
      .eq("id", msg.group_id)
      .single();

    let subsQuery = supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, member_id")
      .eq("group_id", msg.group_id);
    if (msg.from_member_id) subsQuery = subsQuery.neq("member_id", msg.from_member_id);
    const { data: subs, error: subsErr } = await subsQuery;
    if (subsErr) throw subsErr;

    const payload = JSON.stringify({
      title: group?.name ?? "Family Cart",
      body: `${msg.from_name}: ${msg.body}`,
      url: "/app",
    });

    const results = await Promise.allSettled(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
          }
          throw err;
        }
      }),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;
    return new Response(JSON.stringify({ sent, failed }), {
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("send-push error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
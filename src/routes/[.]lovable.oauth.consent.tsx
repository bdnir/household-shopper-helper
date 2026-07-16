import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type AuthorizationDetails = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
} | null;

// The @supabase/supabase-js auth.oauth namespace is beta; wrap the three methods we need.
type OAuthClient = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: Error | null }>;
};
function oauth(): OAuthClient {
  return (supabase.auth as unknown as { oauth: OAuthClient }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="text-xl font-semibold">Could not load this authorization request</h1>
        <p className="mt-2 text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setErr(null);
    const result = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (result.error) {
      setBusy(false);
      setErr(result.error.message);
      return;
    }
    const target = result.data?.redirect_url ?? result.data?.redirect_to;
    if (!target) {
      setBusy(false);
      setErr("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an application";

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-semibold">Connect {clientName} to your account</h1>
        <p className="text-sm text-muted-foreground">
          This lets {clientName} use Super-Helper as you — read your groups, items, and messages, and send reminders on your behalf.
        </p>
        {details?.client?.redirect_uri && (
          <p className="text-xs text-muted-foreground break-all">Redirects to: {details.client.redirect_uri}</p>
        )}
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <div className="flex gap-2">
          <Button onClick={() => decide(true)} disabled={busy} className="flex-1">Approve</Button>
          <Button onClick={() => decide(false)} disabled={busy} variant="outline" className="flex-1">Deny</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          This does not bypass app permissions — the app can only see and change data in the same groups you can.
        </p>
      </div>
    </main>
  );
}
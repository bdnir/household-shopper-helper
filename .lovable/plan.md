This is a large change. It adds real user accounts on top of the current device-based flow, tightens the database so each user only sees their own groups, and exposes an OAuth-protected MCP server so ChatGPT/Claude/Codex can read and write on behalf of the signed-in user.

## Phase 1 — Add real user accounts

- Enable email/password + Google sign-in via Lovable Cloud managed auth. Google is enabled with `supabase--configure_social_auth`.
- Add a public `/auth` route (email/password form + "Sign in with Google" button) using `lovable.auth.signInWithOAuth`.
- Add an integration-managed `_authenticated/route.tsx` gate. Move `app.*` routes under `_authenticated/`.
- The existing device-based flow stays for now: on first sign-in, the current device's `members` rows are linked to the new `auth.users.id` (see phase 2). Users don't lose their group.

## Phase 2 — Link members to auth users and lock down RLS

Migration:
- Add `members.user_id uuid REFERENCES auth.users(id)`.
- Backfill helper: when a signed-in user hits `/app` with an active device member, set `members.user_id = auth.uid()` for that row.
- Replace all six permissive `<table>_all` policies with scoped ones:
  - `members`: user sees rows for groups where they are a member (`user_id = auth.uid()`), inserts/updates/deletes only their own row.
  - `groups`: user sees only groups they belong to (via a `is_group_member(group_id)` SECURITY DEFINER function to avoid RLS recursion).
  - `items`, `messages`, `preset_messages`, `message_reads`, `recent_items`, `push_subscriptions`: gated by `is_group_member(group_id)`. Deletes on `messages` allowed for author or group admin.
- Revoke anon grants; keep authenticated + service_role.

## Phase 3 — MCP server with Supabase OAuth 2.1

- Install `@lovable.dev/mcp-js` (add to `minimumReleaseAgeExcludes`).
- Activate Supabase OAuth 2.1 with `supabase--configure_oauth_server`.
- Add the consent route at `src/routes/[.]lovable.oauth.consent.tsx`. Unauthenticated visitors are sent through `/auth?next=...` and returned to the consent URL after sign-in (login, signup, and Google all preserve `next`).
- Add `src/lib/mcp/index.ts` (defineMcp) + `src/lib/mcp/tools/*` and `mcpPlugin()` in `vite.config.ts` — mounted at `/mcp`.

## MCP tools exposed (all scoped by RLS to the signed-in user's groups)

Read-only:
- `list_groups` — the user's groups
- `list_items` — pending / purchased items in a group
- `list_messages` — recent group messages
- `list_members` — members of a group

Mutating:
- `add_item` — add an item to a group
- `mark_item_purchased` — mark an item purchased
- `delete_item`
- `send_message` — post a reminder to a group (triggers existing push fan-out)
- `send_preset_reminder` — send a saved preset by id

Each tool takes the token via `ctx.getToken()` and forwards it to Supabase so RLS runs as that user. No admin client used anywhere in `src/lib/mcp/`.

## Files created / changed

- `bunfig.toml` — allow `@lovable.dev/mcp-js`
- `vite.config.ts` — `mcpPlugin()`
- `src/routes/auth.tsx` — sign-in / sign-up
- `src/routes/_authenticated/route.tsx` — auth gate
- `src/routes/_authenticated/app.*.tsx` — moved from `src/routes/app.*.tsx`
- `src/routes/[.]lovable.oauth.consent.tsx` — OAuth consent
- `src/lib/mcp/index.ts` + `src/lib/mcp/tools/*.ts` — MCP definition
- Migration adding `members.user_id`, `is_group_member(group_id)`, and rewritten policies
- Small edits in `app.index.tsx` / `app.tsx` to link device member to `auth.uid()` on load

## What stays the same

- Push notifications, reminders, private items, add-items flow, admin delete, preset messages, item timestamps, "added on" display — all untouched other than routing under `_authenticated/`.
- The device-based group join still works for existing group members after they sign in.

## Risks / notes

- Existing users must sign in once for their device member to be linked; until then they see the auth page.
- The consent screen requires an active Supabase auth session; users need to sign in before an MCP client (ChatGPT, Claude) can complete the OAuth handshake.
- This is a large multi-migration change; I'll ship it as three ordered steps (auth, RLS, MCP) so each can be verified before moving to the next.

Reply to approve and I'll start with Phase 1.
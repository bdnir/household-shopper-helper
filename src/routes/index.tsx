import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShoppingBasket, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId, getActiveMember, setActiveMember } from "@/lib/device";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>) => ({
    group: typeof s.group === "string" ? s.group : undefined,
    name: typeof s.name === "string" ? s.name : undefined,
  }),
  component: Landing,
});

function Landing() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"create" | "join">(search.group ? "join" : "create");
  const [groupName, setGroupName] = useState(search.name ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const m = getActiveMember();
    if (m && !search.group) navigate({ to: "/app" });
  }, []);

  async function submit() {
    if (!groupName.trim() || !name.trim() || !phone.trim()) {
      toast.error(t("yes") + " 🙏");
      return;
    }
    setBusy(true);
    try {
      const deviceId = getDeviceId();
      let groupId = search.group;

      if (mode === "create") {
        const { data: g, error } = await supabase
          .from("groups")
          .insert({ name: groupName.trim() })
          .select()
          .single();
        if (error) throw error;
        groupId = g.id;
      } else if (!groupId) {
        // join by name lookup
        const { data: g } = await supabase
          .from("groups")
          .select()
          .eq("name", groupName.trim())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!g) throw new Error("Group not found");
        groupId = g.id;
      }

      // upsert member
      const { data: existing } = await supabase
        .from("members")
        .select()
        .eq("group_id", groupId!)
        .eq("device_id", deviceId)
        .maybeSingle();

      let member = existing;
      if (!member) {
        const { data, error } = await supabase
          .from("members")
          .insert({
            group_id: groupId!,
            device_id: deviceId,
            name: name.trim(),
            phone: phone.trim(),
            is_admin: mode === "create",
            role: "both",
          })
          .select()
          .single();
        if (error) throw error;
        member = data;
      }

      const { data: group } = await supabase.from("groups").select().eq("id", groupId!).single();

      setActiveMember({
        groupId: groupId!,
        memberId: member!.id,
        groupName: group!.name,
        name: member!.name,
        isAdmin: member!.is_admin,
      });
      navigate({ to: "/app" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="absolute top-4 end-4">
        <button
          onClick={() => setLang(lang === "he" ? "en" : "he")}
          className="text-sm text-muted-foreground hover:text-foreground transition"
        >
          {lang === "he" ? "English" : "עברית"}
        </button>
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[image:var(--gradient-warm)] shadow-[var(--shadow-soft)]">
            <ShoppingBasket className="w-8 h-8 text-accent-foreground" strokeWidth={2.2} />
          </div>
          <h1 className="text-4xl font-bold text-foreground">{t("appName")}</h1>
          <p className="text-muted-foreground">{t("tagline")}</p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-[var(--shadow-card)] space-y-4">
          {!search.group && (
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              <button
                onClick={() => setMode("create")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === "create" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                {t("createGroup")}
              </button>
              <button
                onClick={() => setMode("join")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === "join" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                {t("joinGroup")}
              </button>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="g">{t("groupName")}</Label>
              <Input id="g" value={groupName} onChange={(e) => setGroupName(e.target.value)} disabled={!!search.group} />
            </div>
            <div>
              <Label htmlFor="n">{t("yourName")}</Label>
              <Input id="n" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="p">{t("phone")}</Label>
              <Input id="p" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <Button onClick={submit} disabled={busy} className="w-full h-12 text-base font-semibold">
            <Sparkles className="w-4 h-4 me-2" />
            {mode === "create" ? t("create") : t("join")}
          </Button>
        </div>
      </div>
    </div>
  );
}

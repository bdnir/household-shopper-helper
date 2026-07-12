import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveMember } from "@/lib/device";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/app/reminder")({
  component: ReminderPage,
});

function ReminderPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const m = getActiveMember();
  const [text, setText] = useState("");
  const [savePreset, setSavePreset] = useState(false);
  const [presets, setPresets] = useState<{ id: string; body: string }[]>([]);

  useEffect(() => {
    if (!m) return;
    supabase
      .from("preset_messages")
      .select("id, body")
      .eq("group_id", m.groupId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPresets((data ?? []) as { id: string; body: string }[]));
  }, []);

  if (!m) return null;

  async function send(body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;
    const { error } = await supabase.from("messages").insert({
      group_id: m!.groupId,
      from_member_id: m!.memberId,
      from_name: m!.name,
      body: trimmed,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (savePreset) {
      await supabase.from("preset_messages").insert({
        group_id: m!.groupId,
        body: trimmed,
        created_by_member_id: m!.memberId,
      });
    }
    toast.success("✓");
    navigate({ to: "/app" });
  }

  const defaults = [t("presetReminder")];

  return (
    <div className="max-w-2xl mx-auto p-4 pt-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[image:var(--gradient-warm)] flex items-center justify-center shadow-[var(--shadow-soft)]">
          <Bell className="w-6 h-6 text-accent-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{m.groupName}</p>
          <h1 className="text-2xl font-bold">{t("sendReminder")}</h1>
        </div>
      </header>

      <section className="bg-card rounded-2xl p-4 shadow-[var(--shadow-card)] space-y-3">
        <Textarea
          rows={4}
          placeholder={t("writeMessage")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="save-preset"
            checked={savePreset}
            onCheckedChange={(c) => setSavePreset(c === true)}
          />
          <Label htmlFor="save-preset" className="text-sm text-muted-foreground cursor-pointer">
            {t("saveAsPreset")}
          </Label>
        </div>
        <Button onClick={() => send(text)} disabled={!text.trim()} className="w-full h-11">
          {t("send")}
        </Button>
      </section>

      <section className="space-y-2">
        {[...defaults, ...presets.map((p) => p.body)].map((p, i) => (
          <button
            key={`${i}-${p}`}
            onClick={() => setText(p)}
            className="w-full text-start p-4 bg-card rounded-xl border border-border hover:border-accent transition shadow-sm"
          >
            {p}
          </button>
        ))}
      </section>
    </div>
  );
}
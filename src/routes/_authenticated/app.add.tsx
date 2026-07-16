import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, X, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveMember } from "@/lib/device";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/add")({
  component: AddItemPage,
});

type RecentItem = {
  id: string;
  name: string;
  is_private: boolean;
  created_by_member_id: string | null;
};

function AddItemPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const m = getActiveMember();
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [selected, setSelected] = useState<Map<string, boolean>>(new Map());
  const [manual, setManual] = useState("");
  const [manualPrivate, setManualPrivate] = useState(false);
  const [autoReminder, setAutoReminder] = useState(true);

  useEffect(() => {
    if (!m) return;
    supabase
      .from("recent_items")
      .select()
      .eq("group_id", m.groupId)
      .or(`is_private.eq.false,created_by_member_id.eq.${m.memberId}`)
      .order("last_used_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setRecent((data ?? []) as RecentItem[]));
  }, []);

  if (!m) return null;

  function addItem(name: string, isPrivate: boolean) {
    setSelected((s) => new Map(s).set(name, isPrivate));
  }
  function removeItem(name: string) {
    setSelected((s) => {
      const n = new Map(s);
      n.delete(name);
      return n;
    });
  }

  async function deleteRecent(id: string) {
    setRecent((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("recent_items").delete().eq("id", id);
  }

  async function sendSelected() {
    if (selected.size === 0 && !manual.trim()) {
      toast.error(t("itemName"));
      return;
    }
    const entries = Array.from(selected.entries());
    if (manual.trim()) entries.push([manual.trim(), manualPrivate]);

    const rows = entries.map(([name, isPrivate]) => ({
      group_id: m!.groupId,
      name,
      added_by_name: m!.name,
      added_by_member_id: m!.memberId,
      is_private: isPrivate,
    }));
    const { error } = await supabase.from("items").insert(rows);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("recent_items").upsert(
      entries.map(([name, isPrivate]) => ({
        group_id: m!.groupId,
        name,
        is_private: isPrivate,
        created_by_member_id: isPrivate ? m!.memberId : null,
        last_used_at: new Date().toISOString(),
      })),
      { onConflict: "group_id,name,is_private,owner_key" },
    );
    if (autoReminder) {
      await supabase.from("messages").insert({
        group_id: m!.groupId,
        from_member_id: m!.memberId,
        from_name: m!.name,
        body: t("autoReminderText"),
      });
    }
    toast.success(`+${entries.length}`);
    navigate({ to: "/app" });
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pt-6 space-y-6">
      <header>
        <p className="text-xs text-muted-foreground">{m.groupName}</p>
        <h1 className="text-2xl font-bold">{t("addItem")}</h1>
      </header>

      <section className="bg-card rounded-2xl p-4 shadow-[var(--shadow-card)]">
        <div className="flex gap-2">
          <Input
            placeholder={t("addManually")}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manual.trim()) {
                setSelected((s) => new Map(s).set(manual.trim(), manualPrivate));
                setManual("");
                setManualPrivate(false);
              }
            }}
          />
          <Button
            variant="outline"
            onClick={() => {
              if (manual.trim()) {
                setSelected((s) => new Map(s).set(manual.trim(), manualPrivate));
                setManual("");
                setManualPrivate(false);
              }
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Checkbox
            id="private-item"
            checked={manualPrivate}
            onCheckedChange={(c) => setManualPrivate(c === true)}
          />
          <Label htmlFor="private-item" className="text-sm text-muted-foreground cursor-pointer">
            {t("privateItem")}
          </Label>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Checkbox
            id="auto-reminder"
            checked={autoReminder}
            onCheckedChange={(c) => setAutoReminder(c === true)}
          />
          <Label htmlFor="auto-reminder" className="text-sm text-muted-foreground cursor-pointer">
            {t("autoReminder")}
          </Label>
        </div>

        {selected.size > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from(selected.entries()).map(([n, isPrivate]) => (
              <button
                key={n}
                onClick={() => removeItem(n)}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20"
                title="✕"
              >
                {isPrivate && <Lock className="w-3 h-3" />}
                {n} ✕
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          {t("recentItems")}
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {recent.map((r) => {
              const on = selected.has(r.name);
              return (
                <div
                  key={r.id}
                  className={`relative flex items-center gap-1 px-2 py-2 rounded-lg border-2 transition text-sm ${
                    on
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div
                    className="flex-1 cursor-pointer truncate font-medium flex items-center gap-1"
                    onClick={() => (on ? removeItem(r.name) : addItem(r.name, r.is_private))}
                  >
                    {r.is_private && (
                      <Lock
                        className="w-3 h-3 shrink-0 text-muted-foreground"
                        aria-label={t("privateBadge")}
                      />
                    )}
                    <span className="truncate">{r.name}</span>
                  </div>
                  {on && <span className="text-primary text-xs shrink-0">✓</span>}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRecent(r.id);
                    }}
                    className="w-5 h-5 rounded-full bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex items-center justify-center shrink-0"
                    title={t("delete")}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Button
        onClick={sendSelected}
        disabled={selected.size === 0 && !manual.trim()}
        className="w-full h-12 text-base font-semibold"
      >
        {t("sendSelected")} {selected.size > 0 && `(${selected.size})`}
      </Button>
    </div>
  );
}

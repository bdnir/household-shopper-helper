import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveMember } from "@/lib/device";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/app/add")({
  component: AddItemPage,
});

function AddItemPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const m = getActiveMember();
  const [recent, setRecent] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!m) return;
    supabase
      .from("recent_items")
      .select()
      .eq("group_id", m.groupId)
      .order("last_used_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setRecent(data ?? []));
  }, []);

  if (!m) return null;

  function addItem(name: string) {
    setSelected((s) => new Set(s).add(name));
  }
  function removeItem(name: string) {
    setSelected((s) => {
      const n = new Set(s);
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
    const names = Array.from(selected);
    if (manual.trim()) names.push(manual.trim());
    const rows = names.map((name) => ({
      group_id: m!.groupId,
      name,
      added_by_name: m!.name,
      added_by_member_id: m!.memberId,
    }));
    const { error } = await supabase.from("items").insert(rows);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("recent_items")
      .upsert(
        names.map((n) => ({ group_id: m!.groupId, name: n, last_used_at: new Date().toISOString() })),
        { onConflict: "group_id,name" }
      );
    toast.success(`+${names.length}`);
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
                setSelected((s) => new Set(s).add(manual.trim()));
                setManual("");
              }
            }}
          />
          <Button
            variant="outline"
            onClick={() => {
              if (manual.trim()) {
                setSelected((s) => new Set(s).add(manual.trim()));
                setManual("");
              }
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {selected.size > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from(selected).map((n) => (
              <button
                key={n}
                onClick={() => removeItem(n)}
                className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20"
                title="✕"
              >
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
                <button
                  key={r.id}
                  onClick={() => (on ? removeItem(r.name) : addItem(r.name))}
                  className={`flex items-center justify-between gap-1 px-2 py-2 rounded-lg border-2 transition text-start text-sm ${
                    on
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span className="font-medium truncate">{r.name}</span>
                  {on && <span className="text-primary text-xs shrink-0">✓</span>}
                </button>
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
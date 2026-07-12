import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Check, ShoppingBasket, MessageSquare, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveMember } from "@/lib/device";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/")({
  component: MainPage,
});

type Item = {
  id: string;
  name: string;
  status: "pending" | "purchased";
  added_by_name: string;
  added_by_member_id: string | null;
  is_private: boolean;
  created_at: string;
};

type Message = {
  id: string;
  body: string;
  from_name: string;
  from_member_id: string | null;
  created_at: string;
};

function MainPage() {
  const { t, dir } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [reads, setReads] = useState<Record<string, { name: string }[]>>({});
  const m = getActiveMember();

  async function loadItems() {
    if (!m) return;
    const { data } = await supabase
      .from("items")
      .select()
      .eq("group_id", m.groupId)
      .or(`is_private.eq.false,added_by_member_id.eq.${m.memberId}`)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Item[]);
  }

  async function loadMessages() {
    if (!m) return;
    const { data } = await supabase
      .from("messages")
      .select()
      .eq("group_id", m.groupId)
      .order("created_at", { ascending: false })
      .limit(50);
    setMessages((data ?? []) as Message[]);
  }

  async function loadReads(messageId: string) {
    const { data } = await supabase
      .from("message_reads")
      .select("member_id, members(name)")
      .eq("message_id", messageId);
    setReads((r) => ({
      ...r,
      [messageId]: (data ?? []).map((row) => ({
        name: (row as { members: { name: string } | null }).members?.name ?? "",
      })),
    }));
  }

  useEffect(() => {
    if (!m) return;
    loadItems();
    loadMessages();
    const ch = supabase
      .channel(`group-${m.groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items", filter: `group_id=eq.${m.groupId}` },
        loadItems,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `group_id=eq.${m.groupId}` },
        loadMessages,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  if (!m) return null;

  async function togglePurchased(it: Item) {
    const next = it.status === "purchased" ? "pending" : "purchased";
    await supabase
      .from("items")
      .update({
        status: next,
        purchased_at: next === "purchased" ? new Date().toISOString() : null,
      })
      .eq("id", it.id);
    if (next === "purchased") {
      await supabase.from("recent_items").upsert(
        {
          group_id: m!.groupId,
          name: it.name,
          is_private: it.is_private,
          created_by_member_id: it.is_private ? it.added_by_member_id : null,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "group_id,name,is_private,owner_key" },
      );
    }
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    await supabase.from("items").delete().eq("id", id);
  }

  async function deleteMessage(id: string) {
    setMessages((prev) => prev.filter((x) => x.id !== id));
    await supabase.from("messages").delete().eq("id", id);
  }

  async function clearAllMessages() {
    if (!m) return;
    if (!confirm(t("confirmClearAll"))) return;
    setMessages([]);
    await supabase.from("messages").delete().eq("group_id", m.groupId);
  }

  async function openMessage(msg: Message) {
    if (expandedMsg === msg.id) {
      setExpandedMsg(null);
      return;
    }
    setExpandedMsg(msg.id);
    await supabase
      .from("message_reads")
      .upsert(
        { message_id: msg.id, member_id: m!.memberId },
        { onConflict: "message_id,member_id" },
      );
    loadReads(msg.id);
  }

  return (
    <div className="max-w-5xl mx-auto p-4 pt-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{m.groupName}</p>
          <h1 className="text-2xl font-bold">{t("itemsForPurchase")}</h1>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[image:var(--gradient-warm)] flex items-center justify-center shadow-[var(--shadow-soft)]">
          <ShoppingBasket className="w-6 h-6 text-accent-foreground" />
        </div>
      </header>

      <div
        className={`flex flex-col md:flex-row gap-6 ${dir === "rtl" ? "md:flex-row-reverse" : ""}`}
      >
        <section className="flex-1 min-w-0 bg-card rounded-2xl shadow-[var(--shadow-card)] p-4">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("empty")}</p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => (
                <li
                  key={it.id}
                  onClick={() => togglePurchased(it)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                    it.status === "purchased"
                      ? "bg-success/10 border-success/30 text-muted-foreground"
                      : "bg-background border-border"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition ${
                      it.status === "purchased" ? "bg-success border-success" : "border-border"
                    }`}
                    aria-label={t("purchased")}
                  >
                    {it.status === "purchased" && (
                      <Check className="w-4 h-4 text-success-foreground" />
                    )}
                  </span>
                  <div className="flex-1">
                    <p
                      className={`font-medium flex items-center gap-1 ${it.status === "purchased" ? "line-through" : ""}`}
                    >
                      {it.is_private && (
                        <Lock
                          className="w-3 h-3 shrink-0 text-muted-foreground"
                          aria-label={t("privateBadge")}
                        />
                      )}
                      {it.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{it.added_by_name}</p>
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                      {t("added")}: {new Date(it.created_at).toLocaleString()}
                      {it.status === "purchased" && (it as Item & { purchased_at?: string | null }).purchased_at && (
                        <> · {t("purchasedAtLabel")}: {new Date((it as Item & { purchased_at?: string | null }).purchased_at as string).toLocaleString()}</>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(it.id);
                    }}
                    className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-accent" />
              {t("messages")}
            </h2>
            {messages.length > 0 && (
              <button
                onClick={clearAllMessages}
                className="text-xs text-destructive hover:underline"
              >
                {t("clearAllMessages")}
              </button>
            )}
          </div>
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">{t("emptyMessages")}</p>
          ) : (
            <ul className="space-y-2">
              {messages.map((msg) => {
                const isMine = msg.from_member_id === m.memberId;
                const open = expandedMsg === msg.id;
                return (
                  <li
                    key={msg.id}
                    onClick={() => openMessage(msg)}
                    className="bg-card rounded-2xl p-3 shadow-sm cursor-pointer hover:shadow-md transition"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-accent">{msg.from_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className={`mt-1 ${open ? "text-base" : "text-sm line-clamp-2"}`}>
                      {msg.body}
                    </p>
                    {open && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t("readBy")}:{" "}
                          {(reads[msg.id] ?? [])
                            .map((r) => r.name)
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </span>
                        {(isMine || m.isAdmin) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMessage(msg.id);
                            }}
                            className="text-destructive hover:underline"
                          >
                            {t("delete")}
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

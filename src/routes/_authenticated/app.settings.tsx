import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, UserPlus, LogOut, Link2, Bell, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveMember, setActiveMember } from "@/lib/device";
import { useI18n, type Lang } from "@/lib/i18n";
import {
  getPushStatus,
  subscribeToPush,
  unsubscribeFromPush,
  type PushStatus,
} from "@/lib/push";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

declare const __BUILD_TIME__: string;

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

type Role = "purchasing" | "requesting" | "both";
type Member = {
  id: string;
  name: string;
  phone: string;
  is_admin: boolean;
  role: Role;
};

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const m = getActiveMember();
  const [members, setMembers] = useState<Member[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [includeLink, setIncludeLink] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [pushStatus, setPushStatusState] = useState<PushStatus>("default");
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);

  async function load() {
    if (!m) return;
    const { data } = await supabase
      .from("members")
      .select()
      .eq("group_id", m.groupId)
      .order("created_at");
    setMembers((data ?? []) as Member[]);
  }

  useEffect(() => {
    load();
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifEnabled(Notification.permission === "granted");
    }
    getPushStatus().then(setPushStatusState);
    if (typeof window !== "undefined") {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setInstalled(!!standalone);
      const handler = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", handler);
      const onInstalled = () => {
        setInstalled(true);
        setInstallPrompt(null);
      };
      window.addEventListener("appinstalled", onInstalled);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }
  }, []);

  if (!m) return null;

  async function setRole(memberId: string, role: Role) {
    await supabase.from("members").update({ role }).eq("id", memberId);
    load();
  }

  async function removeMember(memberId: string) {
    if (!confirm(t("confirmDelete"))) return;
    await supabase.from("members").delete().eq("id", memberId);
    load();
  }

  async function deleteGroup() {
    if (!confirm(t("confirmDelete"))) return;
    await supabase.from("groups").delete().eq("id", m!.groupId);
    setActiveMember(null);
    navigate({ to: "/" });
  }

  async function leaveGroup() {
    if (!confirm(t("confirmDelete"))) return;
    await supabase.from("members").delete().eq("id", m!.memberId);
    setActiveMember(null);
    navigate({ to: "/" });
  }

  function buildInviteUrl() {
    return `${window.location.origin}/?group=${m!.groupId}&name=${encodeURIComponent(m!.groupName)}`;
  }

  async function addUser() {
    if (!newName.trim() || !newPhone.trim()) {
      toast.error("?");
      return;
    }
    const url = buildInviteUrl();
    const msg = includeLink ? `${m!.groupName}: ${url}` : `${m!.groupName}`;
    const sms = `sms:${newPhone.trim()}?body=${encodeURIComponent(msg)}`;
    try {
      await navigator.clipboard.writeText(includeLink ? url : m!.groupName);
      toast.success(t("inviteCopied"));
    } catch {}
    window.location.href = sms;
    setShowAdd(false);
    setNewName("");
    setNewPhone("");
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(buildInviteUrl());
    toast.success(t("inviteCopied"));
  }

  async function enableNotifications() {
    const ok = await subscribeToPush();
    const s = await getPushStatus();
    setPushStatusState(s);
    setNotifEnabled(s === "subscribed");
    if (ok) toast.success(t("pushOn"));
    else if (s === "denied") toast.error(t("pushDenied"));
    else if (s === "ios-needs-pwa") toast.error(t("pushIosNeedsPwa"));
    else if (s === "unsupported") toast.error(t("pushUnsupported"));
  }

  async function disableNotifications() {
    await unsubscribeFromPush();
    const s = await getPushStatus();
    setPushStatusState(s);
    setNotifEnabled(false);
  }

  async function installApp() {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setInstallPrompt(null);
      return;
    }
    setShowInstallHint((v) => !v);
  }

  const isIos =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);

  const buildTime = (() => {
    try {
      return new Date(__BUILD_TIME__).toLocaleString();
    } catch {
      return __BUILD_TIME__;
    }
  })();

  const roleLabel = (r: Role) => (r === "purchasing" ? t("purchasing") : r === "requesting" ? t("requesting") : t("both"));

  return (
    <div className="max-w-2xl mx-auto p-4 pt-6 space-y-6">
      <header>
        <p className="text-xs text-muted-foreground">{m.groupName}</p>
        <h1 className="text-2xl font-bold">{t("settings")}</h1>
      </header>

      <section className="bg-card rounded-2xl p-4 shadow-[var(--shadow-card)] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("users")}</h2>
          <Button size="sm" variant="outline" onClick={() => setShowAdd((v) => !v)}>
            <UserPlus className="w-4 h-4 me-1" />
            {t("addUser")}
          </Button>
        </div>

        {showAdd && (
          <div className="rounded-xl border border-border bg-background p-3 space-y-3">
            <div>
              <Label>{t("yourName")}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <Label>{t("phone")}</Label>
              <Input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={includeLink} onCheckedChange={(v) => setIncludeLink(!!v)} />
              {t("inviteLink")}
            </label>
            <Button onClick={addUser} className="w-full">
              {t("inviteSms")}
            </Button>
          </div>
        )}

        <ul className="space-y-2">
          {members.map((mb) => (
            <li key={mb.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {mb.name}
                    {mb.is_admin && (
                      <span className="ms-2 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                        {t("admin")}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground" dir="ltr">{mb.phone}</p>
                </div>
                {m.isAdmin && mb.id !== m.memberId && (
                  <button
                    onClick={() => removeMember(mb.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {m.isAdmin ? (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">{t("role")}:</Label>
                  <Select value={mb.role} onValueChange={(v) => setRole(mb.id, v as Role)}>
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchasing">{t("purchasing")}</SelectItem>
                      <SelectItem value="requesting">{t("requesting")}</SelectItem>
                      <SelectItem value="both">{t("both")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("role")}: {roleLabel(mb.role)}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-card rounded-2xl p-4 shadow-[var(--shadow-card)] space-y-3">
        <Button variant="outline" onClick={copyInvite} className="w-full">
          <Link2 className="w-4 h-4 me-2" />
          {t("copyInvite")}
        </Button>
        <Button
          variant="outline"
          onClick={pushStatus === "subscribed" ? disableNotifications : enableNotifications}
          className="w-full"
          disabled={pushStatus === "unsupported"}
        >
          <Bell className="w-4 h-4 me-2" />
          {pushStatus === "subscribed"
            ? t("pushOn")
            : pushStatus === "denied"
              ? t("pushDenied")
              : pushStatus === "ios-needs-pwa"
                ? t("pushIosNeedsPwa")
                : pushStatus === "unsupported"
                  ? t("pushUnsupported")
                  : t("pushEnable")}
        </Button>
        <Button
          variant="outline"
          onClick={installApp}
          disabled={installed}
          className="w-full"
        >
          <Download className="w-4 h-4 me-2" />
          {installed ? t("installed") : t("installApp")}
        </Button>
        {showInstallHint && !installed && (
          <p className="text-xs text-muted-foreground rounded-lg bg-background border border-border p-3">
            {isIos ? t("installIosHint") : t("installAndroidHint")}
          </p>
        )}
        <div className="flex items-center justify-between">
          <Label>{t("language")}</Label>
          <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="he">עברית</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-2">
        <Button variant="outline" onClick={leaveGroup} className="w-full">
          <LogOut className="w-4 h-4 me-2" />
          {t("leave")}
        </Button>
        {m.isAdmin && (
          <Button variant="destructive" onClick={deleteGroup} className="w-full">
            <Trash2 className="w-4 h-4 me-2" />
            {t("deleteGroup")}
          </Button>
        )}
      </section>

      <p className="text-center text-xs text-muted-foreground pt-4">
        {t("buildVersion")}: <span dir="ltr">{buildTime}</span>
      </p>
    </div>
  );
}
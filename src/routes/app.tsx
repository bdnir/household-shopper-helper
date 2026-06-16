import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { Plus, Bell, Settings as SettingsIcon } from "lucide-react";
import { getActiveMember } from "@/lib/device";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const loc = useLocation();

  useEffect(() => {
    if (!getActiveMember()) navigate({ to: "/" });
  }, []);

  const isActive = (p: string) => loc.pathname === p;

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={dir}>
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t border-border shadow-[0_-4px_24px_-12px_oklch(0.18_0.02_60/0.15)]">
        <div className="max-w-2xl mx-auto grid grid-cols-3 px-2 py-2">
          <TabLink to="/app/add" icon={<Plus />} label={t("addItem")} active={isActive("/app/add")} />
          <TabLink to="/app/reminder" icon={<Bell />} label={t("sendReminder")} active={isActive("/app/reminder")} />
          <TabLink to="/app/settings" icon={<SettingsIcon />} label={t("settings")} active={isActive("/app/settings")} />
        </div>
      </nav>
    </div>
  );
}

function TabLink({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className={`w-10 h-10 flex items-center justify-center rounded-xl ${active ? "bg-primary/10" : ""}`}>
        <span className="[&_svg]:w-5 [&_svg]:h-5">{icon}</span>
      </span>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
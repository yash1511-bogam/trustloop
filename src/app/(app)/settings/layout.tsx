import { SettingsNav } from "@/components/settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-shell">
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <SettingsNav />
        </aside>
        <div className="settings-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-stack min-w-0">{children}</div>;
}

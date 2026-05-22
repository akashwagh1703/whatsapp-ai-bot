import { Sidebar } from "@/components/layout/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-canvas min-h-dvh">
      <Sidebar />
      {/* Main column: offset by fixed sidebar width on desktop */}
      <div className="flex min-h-dvh min-w-0 flex-col lg:pl-[var(--sidebar-width)]">
        <DashboardHeader />
        <main className="relative min-h-0 flex-1 overflow-auto">
          <div
            className="dashboard-aurora pointer-events-none absolute inset-0"
            aria-hidden
          />
          <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

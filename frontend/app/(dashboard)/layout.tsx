import { DesktopNavigation } from "@/components/layout/app-navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-svh bg-muted/25">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <DesktopNavigation />
      <div className="min-w-0 md:pl-64">
        <DashboardHeader />
        {children}
      </div>
    </div>
  );
}

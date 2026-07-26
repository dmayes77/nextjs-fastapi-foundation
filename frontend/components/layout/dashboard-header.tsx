import { MobileNavigation } from "@/components/layout/app-navigation";
import { Separator } from "@/components/ui/separator";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:px-6">
      <MobileNavigation />
      <Separator orientation="vertical" className="h-5 md:hidden" />
      <div>
        <p className="text-sm font-medium">Project Management</p>
        <p className="hidden text-xs text-muted-foreground sm:block">
          A small vertical slice built on the foundation API
        </p>
      </div>
    </header>
  );
}

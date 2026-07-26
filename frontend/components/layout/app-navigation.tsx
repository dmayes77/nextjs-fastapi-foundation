"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, LayoutDashboard, Menu, PanelsTopLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <PanelsTopLeft aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">Foundation</p>
        <p className="truncate text-xs text-muted-foreground">Project workspace</p>
      </div>
    </div>
  );
}

function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="space-y-1">
      {navigation.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;
        const link = (
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            <span>{item.label}</span>
            {active ? (
              <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-primary" />
            ) : null}
          </Link>
        );

        return mobile ? (
          <SheetClose asChild key={item.href}>
            {link}
          </SheetClose>
        ) : (
          <div key={item.href}>{link}</div>
        );
      })}
    </nav>
  );
}

export function DesktopNavigation() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Brand />
      </div>
      <div className="flex-1 px-3 py-5">
        <p className="mb-2 px-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Workspace
        </p>
        <NavigationLinks />
      </div>
      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs leading-5 text-muted-foreground">
          Next.js App Router
          <br />
          FastAPI + PostgreSQL
        </p>
      </div>
    </aside>
  );
}

export function MobileNavigation() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation"
        >
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[18rem] max-w-[88vw] p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Navigate between the application overview and Projects.
          </SheetDescription>
          <Brand />
        </SheetHeader>
        <div className="px-3 py-5">
          <p className="mb-2 px-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace
          </p>
          <NavigationLinks mobile />
        </div>
      </SheetContent>
    </Sheet>
  );
}

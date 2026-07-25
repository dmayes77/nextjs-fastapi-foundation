import { Circle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/lib/api/contracts";
import { cn } from "@/lib/utils";

const statusPresentation: Record<
  ProjectStatus,
  { label: string; className: string; dotClassName: string }
> = {
  planned: {
    label: "Planned",
    className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900",
    dotClassName: "fill-slate-500 text-slate-500",
  },
  active: {
    label: "Active",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950",
    dotClassName: "fill-blue-500 text-blue-500",
  },
  completed: {
    label: "Completed",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950",
    dotClassName: "fill-emerald-500 text-emerald-500",
  },
  archived: {
    label: "Archived",
    className: "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900",
    dotClassName: "fill-zinc-500 text-zinc-500",
  },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const presentation = statusPresentation[status];

  return (
    <Badge variant="outline" className={cn("gap-1.5", presentation.className)}>
      <Circle aria-hidden="true" className={cn("size-2", presentation.dotClassName)} />
      {presentation.label}
    </Badge>
  );
}

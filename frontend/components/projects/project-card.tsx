import { Archive, CalendarDays, Pencil } from "lucide-react";

import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectResponse } from "@/lib/api/contracts";
import { cn } from "@/lib/utils";

function formatDueDate(dueDate: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${dueDate}T00:00:00Z`));
}

interface ProjectCardProps {
  project: ProjectResponse;
  onEdit: (project: ProjectResponse) => void;
  onArchive: (project: ProjectResponse) => void;
}

export function ProjectCard({ project, onEdit, onArchive }: ProjectCardProps) {
  const archived = project.status === "archived";

  return (
    <Card
      role="article"
      aria-label={`Project ${project.name}`}
      className={cn(
        "flex min-h-64 flex-col overflow-hidden transition-shadow hover:shadow-md",
        archived && "bg-muted/45 text-muted-foreground shadow-none hover:shadow-none",
      )}
    >
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className={cn("line-clamp-2 text-base", archived && "text-foreground/75")}>
            {project.name}
          </CardTitle>
          <ProjectStatusBadge status={project.status} />
        </div>
        {project.description ? (
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {project.description}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground/75">No description</p>
        )}
      </CardHeader>
      <CardContent className="mt-auto">
        {project.dueDate ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays aria-hidden="true" className="size-4" />
            Due {formatDueDate(project.dueDate)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No due date</p>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t bg-muted/15">
        {archived ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Read only
          </p>
        ) : (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(project)}>
              <Pencil aria-hidden="true" data-icon="inline-start" />
              Edit
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onArchive(project)}
            >
              <Archive aria-hidden="true" data-icon="inline-start" />
              Archive
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

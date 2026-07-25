"use client";

import { useEffect, useRef, useState } from "react";
import { FolderPlus, Plus } from "lucide-react";

import { ArchiveProjectDialog } from "@/components/projects/archive-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import {
  ProjectsErrorPanel,
  type ProjectDisplayError,
} from "@/components/projects/projects-error-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  projectsArchive,
  projectsCreate,
  projectsUpdate,
  type ProjectCreate,
  type ProjectResponse,
  type ProjectUpdate,
} from "@/lib/api/contracts";
import { apiRequest } from "@/lib/api/client";

type DialogState =
  | { type: "create" }
  | { type: "edit"; project: ProjectResponse }
  | { type: "archive"; project: ProjectResponse }
  | null;

interface ProjectsWorkspaceProps {
  initialProjects: ProjectResponse[];
  initialError?: ProjectDisplayError | null;
}

function replaceProject(projects: ProjectResponse[], updated: ProjectResponse) {
  return projects.map((project) => (project.id === updated.id ? updated : project));
}

function projectListSnapshot(projects: ProjectResponse[]): string {
  return JSON.stringify(
    projects.map((project) => [
      project.id,
      project.name,
      project.description,
      project.status,
      project.dueDate,
      project.createdAt,
      project.updatedAt,
    ]),
  );
}

export function ProjectsWorkspace({
  initialProjects,
  initialError = null,
}: ProjectsWorkspaceProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [dialog, setDialog] = useState<DialogState>(null);
  const incomingProjectSnapshot = projectListSnapshot(initialProjects);
  const previousProjectSnapshot = useRef(incomingProjectSnapshot);

  useEffect(() => {
    if (incomingProjectSnapshot === previousProjectSnapshot.current) {
      return;
    }

    previousProjectSnapshot.current = incomingProjectSnapshot;
    setProjects(initialProjects);
  }, [incomingProjectSnapshot, initialProjects]);

  async function createProject(input: ProjectCreate) {
    const created = await projectsCreate(apiRequest, input);
    setProjects((current) => [created, ...current]);
  }

  async function updateProject(projectId: string, input: ProjectUpdate) {
    const updated = await projectsUpdate(apiRequest, {
      path: { project_id: projectId },
      body: input,
    });
    setProjects((current) => replaceProject(current, updated));
  }

  async function archiveProject(projectId: string) {
    const archived = await projectsArchive(apiRequest, {
      path: { project_id: projectId },
    });
    setProjects((current) => replaceProject(current, archived));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Projects</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Plan work, keep delivery status current, and archive finished project records.
          </p>
        </div>
        <Button type="button" size="lg" onClick={() => setDialog({ type: "create" })}>
          <Plus aria-hidden="true" data-icon="inline-start" />
          New project
        </Button>
      </div>

      {initialError ? (
        <ProjectsErrorPanel error={initialError} />
      ) : projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
              <FolderPlus aria-hidden="true" className="size-5 text-muted-foreground" />
            </span>
            <h2 className="text-lg font-semibold">No projects yet</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Create the first project to demonstrate the complete Next.js, FastAPI, and
              PostgreSQL workflow.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => setDialog({ type: "create" })}
            >
              <Plus aria-hidden="true" data-icon="inline-start" />
              Create project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section aria-label="Project list" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={(selected) => setDialog({ type: "edit", project: selected })}
              onArchive={(selected) => setDialog({ type: "archive", project: selected })}
            />
          ))}
        </section>
      )}

      {dialog?.type === "create" ? (
        <ProjectFormDialog
          mode="create"
          onClose={() => setDialog(null)}
          onCreate={createProject}
          onUpdate={updateProject}
        />
      ) : null}

      {dialog?.type === "edit" ? (
        <ProjectFormDialog
          mode="edit"
          project={dialog.project}
          onClose={() => setDialog(null)}
          onCreate={createProject}
          onUpdate={updateProject}
        />
      ) : null}

      {dialog?.type === "archive" ? (
        <ArchiveProjectDialog
          project={dialog.project}
          onClose={() => setDialog(null)}
          onArchive={archiveProject}
        />
      ) : null}
    </div>
  );
}

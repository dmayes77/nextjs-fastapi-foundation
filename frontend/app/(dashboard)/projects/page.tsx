import { PageContainer } from "@/components/layout/page-container";
import { ProjectsWorkspace } from "@/components/projects/projects-workspace";
import { projectsList } from "@/lib/api/contracts";
import { apiRequest } from "@/lib/api/server";
import { normalizeError } from "@/lib/errors/normalize";

export const dynamic = "force-dynamic";

async function loadProjects() {
  try {
    return { projects: await projectsList(apiRequest), error: null };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      projects: [],
      error: {
        message: normalized.message,
        requestId: normalized.requestId,
        retryable: normalized.retryable,
      },
    };
  }
}

export default async function ProjectsPage() {
  const { projects, error } = await loadProjects();

  return (
    <PageContainer>
      <ProjectsWorkspace initialProjects={projects} initialError={error} />
    </PageContainer>
  );
}

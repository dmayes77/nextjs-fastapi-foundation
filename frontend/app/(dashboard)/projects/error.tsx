"use client";

import { PageContainer } from "@/components/layout/page-container";
import { ProjectsErrorPanel } from "@/components/projects/projects-error-panel";

export default function ProjectsError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <PageContainer>
      <ProjectsErrorPanel
        error={{
          message: "Something went wrong while preparing the Projects page.",
          requestId: null,
          retryable: true,
        }}
        onRetry={unstable_retry}
      />
    </PageContainer>
  );
}

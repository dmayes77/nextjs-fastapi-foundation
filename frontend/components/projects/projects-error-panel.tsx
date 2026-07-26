"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, RotateCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export interface ProjectDisplayError {
  message: string;
  requestId: string | null;
  retryable: boolean;
}

export function ProjectsErrorPanel({
  error,
  onRetry,
}: {
  error: ProjectDisplayError;
  onRetry?: () => void;
}) {
  const router = useRouter();

  return (
    <Alert variant="destructive" className="mx-auto max-w-2xl">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>Projects could not be loaded</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>{error.message}</p>
        {error.requestId ? (
          <p className="font-mono text-xs">Request ID: {error.requestId}</p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry ?? (() => router.refresh())}
        >
          <RotateCw aria-hidden="true" data-icon="inline-start" />
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}

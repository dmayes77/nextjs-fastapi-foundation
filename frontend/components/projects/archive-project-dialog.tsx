"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ProjectResponse } from "@/lib/api/contracts";
import { normalizeError } from "@/lib/errors/normalize";

interface ArchiveProjectDialogProps {
  project: ProjectResponse;
  onClose: () => void;
  onArchive: (projectId: string) => Promise<void>;
}

export function ArchiveProjectDialog({
  project,
  onClose,
  onArchive,
}: ArchiveProjectDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      await onArchive(project.id);
      onClose();
    } catch (caught) {
      const normalized = normalizeError(caught);
      setError(
        normalized.status === 409
          ? "This project has already been archived or can no longer be changed."
          : normalized.message,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {project.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The project will remain visible, but it will become read only. This action uses
            the dedicated archive lifecycle endpoint.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void handleArchive();
            }}
            disabled={pending}
            className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
          >
            {pending ? "Archiving…" : "Archive project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

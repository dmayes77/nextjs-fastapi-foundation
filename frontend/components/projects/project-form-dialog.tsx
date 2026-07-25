"use client";

import { useState, type FormEvent } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  ProjectCreate,
  ProjectResponse,
  ProjectStatus,
  ProjectUpdate,
} from "@/lib/api/contracts";
import { normalizeError } from "@/lib/errors/normalize";

type EditableStatus = Exclude<ProjectStatus, "archived">;
type CreateStatusValue = EditableStatus | "default";

const editableStatuses: { value: EditableStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

interface ProjectFormDialogProps {
  mode: "create" | "edit";
  project?: ProjectResponse;
  onClose: () => void;
  onCreate: (input: ProjectCreate) => Promise<void>;
  onUpdate: (projectId: string, input: ProjectUpdate) => Promise<void>;
}

function fieldId(mode: ProjectFormDialogProps["mode"], field: string): string {
  return `${mode}-project-${field}`;
}

export function ProjectFormDialog({
  mode,
  project,
  onClose,
  onCreate,
  onUpdate,
}: ProjectFormDialogProps) {
  const isEdit = mode === "edit" && project !== undefined;
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [dueDate, setDueDate] = useState(project?.dueDate ?? "");
  const [status, setStatus] = useState<CreateStatusValue>(
    isEdit ? (project.status as EditableStatus) : "default",
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Project name is required.");
      return;
    }

    setNameError(null);
    setFormError(null);
    setPending(true);

    try {
      if (!isEdit) {
        const input: ProjectCreate = {
          name: trimmedName,
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(dueDate ? { dueDate } : {}),
          ...(status === "default" ? {} : { status }),
        };
        await onCreate(input);
      } else {
        const input: ProjectUpdate = {};
        if (trimmedName !== project.name) {
          input.name = trimmedName;
        }
        if (description !== (project.description ?? "")) {
          input.description = description.trim() ? description.trim() : null;
        }
        if (dueDate !== (project.dueDate ?? "")) {
          input.dueDate = dueDate || null;
        }
        if (status !== project.status) {
          input.status = status as EditableStatus;
        }

        if (Object.keys(input).length === 0) {
          setFormError("Make at least one change before saving.");
          return;
        }
        await onUpdate(project.id, input);
      }
      onClose();
    } catch (error) {
      setFormError(normalizeError(error).message);
    } finally {
      setPending(false);
    }
  }

  const title = isEdit ? `Edit ${project.name}` : "Create project";
  const descriptionId = fieldId(mode, "description");
  const nameErrorId = fieldId(mode, "name-error");

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update only the fields that need to change."
              : "Add a project to the workspace. It will default to planned unless you choose another status."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={pending}>
          {formError ? (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Project could not be saved</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={fieldId(mode, "name")}>Name</Label>
            <Input
              id={fieldId(mode, "name")}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (nameError) setNameError(null);
              }}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? nameErrorId : undefined}
              maxLength={255}
              autoFocus
              disabled={pending}
            />
            {nameError ? (
              <p id={nameErrorId} className="text-sm text-destructive">
                {nameError}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={descriptionId}>Description</Label>
            <Textarea
              id={descriptionId}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="What is this project intended to accomplish?"
              disabled={pending}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={fieldId(mode, "status")}>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as CreateStatusValue)}
                disabled={pending}
              >
                <SelectTrigger id={fieldId(mode, "status")} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {!isEdit ? <SelectItem value="default">Planned (default)</SelectItem> : null}
                  {editableStatuses.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={fieldId(mode, "due-date")}>Due date</Label>
              <Input
                id={fieldId(mode, "due-date")}
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

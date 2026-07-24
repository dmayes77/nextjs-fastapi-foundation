"use client";

import { useEffect, useState } from "react";

import type { HealthResponse } from "@/lib/api/contracts";
import { apiRequest } from "@/lib/api/client";
import { normalizeError } from "@/lib/errors/normalize";
import type { AppError } from "@/lib/errors/types";

type BackendStatusState =
  | { phase: "loading" }
  | { phase: "success"; data: HealthResponse }
  | { phase: "error"; error: AppError };

const buttonClassName =
  "text-xs font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100";

/**
 * Calls FastAPI's `/health` through the same-origin `/api/backend/health`
 * route via the browser API client, demonstrating the full reusable
 * communication path end to end. Never retries automatically — `attempt`
 * only changes in response to the user clicking Retry or Refresh.
 */
export function BackendStatus() {
  const [state, setState] = useState<BackendStatusState>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    apiRequest<HealthResponse>("/api/backend/health")
      .then(({ data }) => {
        if (!cancelled) {
          setState({ phase: "success", data });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ phase: "error", error: normalizeError(error) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Setting "loading" here — in the event handler, not the effect body —
  // keeps the effect itself a pure subscription that only reacts to
  // `attempt`, satisfying the no-setState-in-effect-body rule.
  const runAgain = () => {
    setState({ phase: "loading" });
    setAttempt((value) => value + 1);
  };

  if (state.phase === "loading") {
    return (
      <p role="status" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Checking…
      </p>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="mt-2 space-y-1">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error.message}
        </p>
        {state.error.requestId ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Reference: {state.error.requestId}
          </p>
        ) : null}
        <button type="button" onClick={runAgain} className={buttonClassName}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
        {state.data.status}
      </p>
      <button type="button" onClick={runAgain} className={buttonClassName}>
        Refresh
      </button>
    </div>
  );
}

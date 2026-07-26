import Link from "next/link";
import { ArrowRight, Braces, Database, Server } from "lucide-react";

import { BackendStatus } from "@/components/backend-status";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const foundations = [
  {
    title: "Next.js App Router",
    description: "Server-first rendering with focused client interactions.",
    icon: Braces,
  },
  {
    title: "FastAPI",
    description: "A typed, versioned API with normalized errors.",
    icon: Server,
  },
  {
    title: "PostgreSQL",
    description: "Async SQLAlchemy persistence managed by Alembic.",
    icon: Database,
  },
] as const;

export default function OverviewPage() {
  return (
    <PageContainer className="space-y-8">
      <section className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-sm sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Full-stack foundation
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            A clear path from interface to database.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            The Project workflow demonstrates the generated API contract, safe mutations,
            and responsive application shell without adding a second frontend architecture.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/projects">
            Open Projects
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </Button>
      </section>

      <section aria-labelledby="foundation-heading">
        <div className="mb-4">
          <h2 id="foundation-heading" className="text-lg font-semibold">
            Foundation status
          </h2>
          <p className="text-sm text-muted-foreground">
            Independent layers connected through the committed OpenAPI contract.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {foundations.map(({ title, description, icon: Icon }) => (
            <Card key={title}>
              <CardHeader className="gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription className="mt-1">{description}</CardDescription>
                </div>
              </CardHeader>
              {title === "FastAPI" ? (
                <CardContent>
                  <BackendStatus />
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}

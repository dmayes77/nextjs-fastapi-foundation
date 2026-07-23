import { BackendStatus } from "@/components/backend-status";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-16 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
      <section className="w-full max-w-5xl rounded-2xl border border-zinc-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-10 lg:p-14">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
            FULL-STACK BOILERPLATE
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Next.js + FastAPI + PostgreSQL
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            The frontend now talks to FastAPI through the reusable API client foundation.
            Database-backed features will be introduced as the stack is built out.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
            <h2 className="text-base font-semibold">Next.js</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Ready</p>
          </article>

          <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
            <h2 className="text-base font-semibold">FastAPI</h2>
            <BackendStatus />
          </article>

          <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
            <h2 className="text-base font-semibold">PostgreSQL</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Planned</p>
          </article>
        </div>

        <footer className="mt-10 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Built as a clear, production-ready starting point.
        </footer>
      </section>
    </main>
  );
}

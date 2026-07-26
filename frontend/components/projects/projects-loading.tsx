import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectsLoading() {
  return (
    <div className="space-y-6" aria-label="Loading projects" aria-busy="true">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="hidden h-9 w-32 sm:block" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="min-h-64">
            <CardHeader className="space-y-4">
              <div className="flex justify-between gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerLoading() {
  return (
    <PageShell>
      <header className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-48 sm:h-8" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28" />
      </header>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </PageShell>
  );
}

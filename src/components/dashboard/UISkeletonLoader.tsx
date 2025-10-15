import { Skeleton } from "@/components/ui/skeleton";

export const UISkeletonLoader = () => (
  <div className="flex w-full flex-col gap-6">
    <section className="space-y-4">
      <Skeleton className="h-6 w-32 sm:h-8 sm:w-40" />
      <Skeleton className="h-28 w-full sm:h-32" />
    </section>

    <section className="space-y-4">
      <Skeleton className="h-6 w-48 sm:h-7 sm:w-56" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="h-5 w-40 sm:h-6 sm:w-48" />
            <Skeleton className="h-4 w-24 sm:w-28" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    </section>
  </div>
);

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-[80vh] gap-4 p-6">
      <Skeleton className="h-full w-72 rounded-xl" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="flex-1 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    </div>
  );
}

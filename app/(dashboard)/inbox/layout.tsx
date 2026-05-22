import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[500px] rounded-2xl" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

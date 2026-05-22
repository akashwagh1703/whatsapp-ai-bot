"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/utils";

/** Avoids hydration mismatch from Date.now() during SSR. */
export function RelativeTime({
  date,
  className,
}: {
  date: string | Date;
  className?: string;
}) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(formatRelativeTime(date));
    const id = setInterval(() => setLabel(formatRelativeTime(date)), 60_000);
    return () => clearInterval(id);
  }, [date]);

  return (
    <span className={className} suppressHydrationWarning>
      {label ?? "…"}
    </span>
  );
}

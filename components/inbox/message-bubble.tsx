import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

export function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === "outbound";

  return (
    <div
      className={cn("flex", isOutbound ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
          isOutbound
            ? "rounded-br-md bg-emerald-600 text-white"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
        )}
      >
        {message.media_type && (
          <p className="mb-1 text-xs opacity-80">
            {message.media_type === "image" ? "📷 Image" : "🎤 Voice note"}
          </p>
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>
        <div
          className={cn(
            "mt-1 flex items-center gap-2 text-[10px]",
            isOutbound ? "text-emerald-100" : "text-slate-400"
          )}
        >
          <RelativeTime date={message.created_at} />
          {message.is_ai && <Badge variant="ai">AI</Badge>}
        </div>
      </div>
    </div>
  );
}

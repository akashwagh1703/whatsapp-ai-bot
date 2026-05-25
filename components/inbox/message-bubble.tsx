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
            ? "btn-brand rounded-br-md"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
        )}
      >
        {message.media_type === "image" && message.media_url && (
          <a
            href={message.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 block overflow-hidden rounded-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.media_url}
              alt="WhatsApp image"
              className="max-h-48 w-full object-cover"
            />
          </a>
        )}
        {message.media_type === "audio" && message.media_url && (
          <audio controls className="mb-2 w-full max-w-xs" src={message.media_url}>
            <track kind="captions" />
          </audio>
        )}
        {message.media_type && !message.media_url && (
          <p className="mb-1 text-xs opacity-80">
            {message.media_type === "image" ? "📷 Image" : "🎤 Voice note"}
            {" "}(media unavailable)
          </p>
        )}
        {message.content && message.content !== "[Image]" && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </p>
        )}
        <div
          className={cn(
            "mt-1 flex items-center gap-2 text-[10px]",
            isOutbound ? "text-white/80" : "text-slate-400"
          )}
        >
          <RelativeTime date={message.created_at} />
          {message.is_ai && <Badge variant="ai">AI</Badge>}
        </div>
      </div>
    </div>
  );
}

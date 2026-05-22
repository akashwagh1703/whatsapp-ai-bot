"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

interface ConversationItemProps {
  conversation: Conversation;
  active?: boolean;
  onClick: () => void;
}

export function ConversationItem({
  conversation,
  active,
  onClick,
}: ConversationItemProps) {
  const name = conversation.contact?.name ?? "Customer";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition-colors",
        active ? "bg-emerald-50/80" : "hover:bg-slate-50"
      )}
    >
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-slate-900">{name}</span>
          {conversation.last_message_at && (
            <RelativeTime
              date={conversation.last_message_at}
              className="shrink-0 text-xs text-slate-400"
            />
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-slate-500">
          {conversation.last_message ?? "No messages yet"}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          {conversation.ai_enabled && <Badge variant="ai">AI active</Badge>}
          {conversation.unread_count > 0 && (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

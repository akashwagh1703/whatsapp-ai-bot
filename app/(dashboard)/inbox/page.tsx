"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Search, Send } from "lucide-react";
import { ConversationItem } from "@/components/inbox/conversation-item";
import { MessageBubble } from "@/components/inbox/message-bubble";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { RelativeTime } from "@/components/shared/relative-time";
import { formatPhone } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import type { Conversation, Message } from "@/types";
import { cn } from "@/lib/utils";

export default function InboxPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { inboxPanel, setInboxPanel } = useUiStore();
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("c")
  );
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const { data: businessId } = useQuery({
    queryKey: ["business-id"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("businesses").select("id").maybeSingle();
      return data?.id as string | undefined;
    },
  });

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", businessId, search],
    enabled: !!businessId,
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("conversations")
        .select("*, contact:contacts(*)")
        .eq("business_id", businessId!)
        .order("last_message_at", { ascending: false });
      const { data } = await q;
      const list = (data ?? []) as Conversation[];
      if (!search.trim()) return list;
      const s = search.toLowerCase();
      return list.filter(
        (c) =>
          c.contact?.name?.toLowerCase().includes(s) ||
          c.last_message?.toLowerCase().includes(s)
      );
    },
  });

  const selected = conversations?.find((c) => c.id === selectedId);

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedId!)
        .order("created_at", { ascending: true });
      return (data ?? []) as Message[];
    },
  });

  useEffect(() => {
    if (!businessId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("inbox-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages"] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, queryClient]);

  const selectConversation = useCallback(
    (id: string) => {
      setSelectedId(id);
      setInboxPanel("chat");
    },
    [setInboxPanel]
  );

  async function sendMessage() {
    if (!draft.trim() || !selectedId) return;
    setSending(true);
    const res = await fetch("/api/messages/send", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: selectedId,
        content: draft.trim(),
      }),
    });
    setSending(false);
    if (res.ok) {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["messages", selectedId] });
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col lg:-mx-2 lg:-mt-2">
      <div className="mb-4 lg:hidden">
        <h1 className="text-xl font-bold text-slate-900">Inbox</h1>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {/* Conversation list */}
        <div
          className={cn(
            "flex w-full flex-col border-r border-slate-100 lg:w-80",
            inboxPanel !== "list" && "hidden lg:flex"
          )}
        >
          <div className="border-b border-slate-100 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search conversations"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : !conversations?.length ? (
              <div className="p-4">
                <EmptyState
                  icon={Inbox}
                  title="No conversations yet"
                  description="Your AI assistant is ready to help customers."
                />
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  active={conv.id === selectedId}
                  onClick={() => selectConversation(conv.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Chat */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            inboxPanel === "list" && "hidden lg:flex"
          )}
        >
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                icon={Inbox}
                title="Select a conversation"
                description="Choose a customer from the list to view messages and reply."
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <button
                  type="button"
                  className="text-sm text-emerald-600 lg:hidden"
                  onClick={() => setInboxPanel("list")}
                >
                  ← Back
                </button>
                <Avatar name={selected.contact?.name ?? "Customer"} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {selected.contact?.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatPhone(selected.contact?.phone ?? "")}
                  </p>
                </div>
                {selected.ai_enabled ? (
                  <Badge variant="ai">AI active</Badge>
                ) : (
                  <Badge variant="warning">Human mode</Badge>
                )}
                <button
                  type="button"
                  className="text-sm text-slate-500 lg:hidden"
                  onClick={() => setInboxPanel("details")}
                >
                  Details
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#F8FAFC] p-4">
                {messagesLoading ? (
                  <Skeleton className="mx-auto h-12 w-2/3" />
                ) : (
                  messages?.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    className="min-h-0 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="shrink-0 self-end"
                    onClick={sendMessage}
                    disabled={sending || !draft.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Customer panel */}
        {selected && (
          <div
            className={cn(
              "w-full border-l border-slate-100 p-6 lg:w-72",
              inboxPanel !== "details" && "hidden lg:block"
            )}
          >
            <button
              type="button"
              className="mb-4 text-sm text-emerald-600 lg:hidden"
              onClick={() => setInboxPanel("chat")}
            >
              ← Back to chat
            </button>
            <Avatar
              name={selected.contact?.name ?? "Customer"}
              className="h-14 w-14 text-lg"
            />
            <h3 className="mt-4 font-semibold text-slate-900">
              {selected.contact?.name}
            </h3>
            <p className="text-sm text-slate-500">
              {formatPhone(selected.contact?.phone ?? "")}
            </p>
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-slate-400">Last interaction</dt>
                <dd className="font-medium text-slate-800">
                  {selected.last_message_at ? (
                    <RelativeTime date={selected.last_message_at} />
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Status</dt>
                <dd className="font-medium capitalize text-slate-800">
                  {selected.status}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Notes</dt>
                <dd className="text-slate-600">
                  {selected.contact?.notes || "No notes yet."}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

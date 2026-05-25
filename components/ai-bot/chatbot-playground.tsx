"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatLine {
  role: "user" | "assistant";
  content: string;
}

interface Config {
  openRouterConfigured: boolean;
  modelFromEnv: string;
  modelResolved: string;
  modelSource: string;
  aiEnabled: boolean;
  readyForWhatsApp: boolean;
}

export function ChatbotPlayground() {
  const [config, setConfig] = useState<Config | null>(null);
  const [input, setInput] = useState("Hi, what services do you offer?");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadConfig() {
    fetch("/api/ai-bot/config", { credentials: "include" })
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null));
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function activateChatbot() {
    setActivating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-bot/activate", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Activation failed");
        return;
      }
      loadConfig();
    } catch {
      setError("Could not activate chatbot");
    } finally {
      setActivating(false);
    }
  }

  async function sendTest() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    const userLine: ChatLine = { role: "user", content: input.trim() };
    setLines((prev) => [...prev, userLine]);
    setInput("");

    try {
      const res = await fetch("/api/ai-bot/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userLine.content,
          history: lines,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Chat failed");
        return;
      }
      setLines((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setError("Network error — check server logs");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-emerald-600" />
          OpenRouter chatbot
        </CardTitle>
        <CardDescription>
          Uses your server env <code className="text-xs">OPENROUTER_API_KEY</code> and
          free model <code className="text-xs">OPENROUTER_DEFAULT_MODEL</code>. Same engine
          as WhatsApp auto-reply.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {config ? (
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 space-y-1">
            <p>
              API key:{" "}
              <strong>
                {config.openRouterConfigured ? "Configured ✓" : "Missing ✗"}
              </strong>
            </p>
            <p>
              Model (env): <code>{config.modelFromEnv}</code> ({config.modelSource})
            </p>
            <p>
              Model (active): <code>{config.modelResolved}</code>
            </p>
            <p>
              WhatsApp auto-reply:{" "}
              <strong>
                {config.readyForWhatsApp ? "Ready ✓" : "Turn AI ON + save"}
              </strong>
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading config…</p>
        )}

        {!config?.openRouterConfigured && (
          <p className="text-sm text-amber-800">
            Add OPENROUTER_API_KEY to .env.local, restart <code>npm run dev</code>, or set on
            Vercel and redeploy.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={activating || !config?.openRouterConfigured}
          onClick={activateChatbot}
        >
          {activating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          <span className="ml-2">Activate chatbot (env free model + AI ON)</span>
        </Button>

        <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
          {lines.length === 0 ? (
            <p className="text-sm text-slate-400">
              Send a test message to preview your chatbot.
            </p>
          ) : (
            lines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  line.role === "user"
                    ? "ml-8 bg-emerald-50 text-emerald-950"
                    : "mr-8 bg-slate-100 text-slate-800"
                )}
              >
                <span className="text-xs font-medium uppercase opacity-60">
                  {line.role}
                </span>
                <p className="mt-0.5 whitespace-pre-wrap">{line.content}</p>
              </div>
            ))
          )}
        </div>

        <Textarea
          placeholder="Type a customer message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendTest();
            }
          }}
        />

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button
          type="button"
          onClick={sendTest}
          disabled={loading || !config?.openRouterConfigured}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2">Thinking…</span>
            </>
          ) : (
            "Test chatbot"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

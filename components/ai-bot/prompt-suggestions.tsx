"use client";

import { Button } from "@/components/ui/button";
import {
  BUSINESS_KNOWLEDGE_SUGGESTIONS,
  MAIN_PROMPT_SUGGESTIONS,
} from "@/constants/ai-prompts";

export function PromptSuggestions({
  onApplyMain,
  onApplyKnowledge,
}: {
  onApplyMain: (text: string) => void;
  onApplyKnowledge: (text: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          Suggested main prompts
        </p>
        <div className="flex flex-wrap gap-2">
          {MAIN_PROMPT_SUGGESTIONS.map((s) => (
            <Button
              key={s.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onApplyMain(s.text)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          Suggested business knowledge
        </p>
        <div className="flex flex-wrap gap-2">
          {BUSINESS_KNOWLEDGE_SUGGESTIONS.map((s) => (
            <Button
              key={s.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onApplyKnowledge(s.text)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

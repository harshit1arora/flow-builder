import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { PRESET_BRIEFS, type FlowState } from "@/lib/flow-mock";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface Props {
  messages: ChatMessage[];
  state: FlowState;
  onSubmit: (brief: string) => void;
}

export function BriefPanel({ messages, state, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const busy = state === "planning" || state === "running";

  const submit = () => {
    const v = value.trim();
    if (!v || busy) return;
    onSubmit(v);
    setValue("");
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tell Flow what you want to make. It plans the pipeline and builds the graph for you.
          </p>
        ) : null}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-xl rounded-br-sm bg-brand-green px-3 py-2 text-sm text-primary-foreground">
                {m.text}
              </p>
            </div>
          ) : (
            <p key={m.id} className="max-w-[92%] text-sm leading-relaxed text-ink">
              {m.text}
            </p>
          ),
        )}

        {state === "planning" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-green thinking-dot" />
            Planning your workflow…
          </p>
        ) : null}
      </div>

      <div className="border-t border-hairline p-3">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {PRESET_BRIEFS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setValue(b)}
              className="rounded-full border border-brand-green-pale bg-card px-2.5 py-1 text-xs text-brand-green-deep transition-colors hover:bg-brand-green-pale/40"
            >
              {b}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-end gap-2 rounded-xl border border-hairline bg-card p-2"
        >
          <textarea
            rows={2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Describe what you want to build"
            className="min-h-[44px] flex-1 resize-none bg-transparent px-1 py-1 text-sm text-ink outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!value.trim() || busy}
            aria-label="Send brief"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-green text-primary-foreground transition-colors hover:bg-brand-green-deep disabled:bg-hairline disabled:text-muted-foreground"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

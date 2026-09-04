import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Check,
  Image as ImageIcon,
  Layers,
  Maximize2,
  PenLine,
  Sparkle,
  Upload,
  Pencil,
  AlertCircle,
  HelpCircle,
  RotateCw,
} from "lucide-react";
import type { NodeKind, NodeStatus } from "@/lib/flow-schema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  input: Upload,
  prompt: PenLine,
  prompt_generator: PenLine,
  imagegen: ImageIcon,
  image_gen: ImageIcon,
  upscale: Maximize2,
  style: Layers,
  style_transfer: Layers,
  output: Sparkle,
};

export interface WorkflowNodeData {
  id?: string;
  kind: NodeKind;
  title: string;
  summary: string;
  reason?: string;
  estimatedCost?: string;
  latencyMs?: number;
  status: NodeStatus;
  result?: { type: "image" | "text"; value: string };
  animate: boolean;
  onEdit?: (id: string) => void;
  onRetry?: (id: string) => void;
  [key: string]: unknown;
}

export function WorkflowNode({ id, data }: NodeProps) {
  const d = data as unknown as WorkflowNodeData;
  const Icon = ICONS[d.kind] || Sparkle;
  const running = d.status === "running";
  const done = d.status === "done";
  const isError = d.status === "error";

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (d.onEdit) {
      d.onEdit(id);
    }
  };

  const handleRetryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (d.onRetry) {
      d.onRetry(id);
    }
  };

  return (
    <div
      onClick={handleEditClick}
      className={[
        "group relative w-60 cursor-pointer rounded-xl border-[1.5px] bg-card px-3.5 py-3 transition-all duration-300 hover:shadow-md",
        running
          ? "border-brand-green node-running-glow"
          : isError
            ? "border-rose-500 bg-rose-50/10 shadow-rose-100 shadow-sm"
            : done
              ? "border-brand-green"
              : "border-brand-green-pale hover:border-brand-green",
        d.animate ? "node-enter" : "",
      ].join(" ")}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-brand-green-pale"
      />

      {/* Header Row */}
      <div className="flex items-start gap-2.5">
        <span
          className={[
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
            running || done
              ? "bg-brand-green text-primary-foreground"
              : isError
                ? "bg-rose-500 text-white"
                : "bg-surface text-brand-green-deep group-hover:bg-brand-green-pale/40",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-ink">{d.title}</p>

            {/* Explainability Info Tooltip */}
            {d.reason ? (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-brand-green transition-colors"
                    >
                      <HelpCircle className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs bg-ink text-white p-2">
                    <p className="font-semibold text-brand-green-pale mb-0.5">Why this step:</p>
                    <p>{d.reason}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}

            <StatusDot status={d.status} />

            {/* Edit button on hover */}
            <button
              type="button"
              onClick={handleEditClick}
              title="Edit parameters"
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-brand-green"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-tight">
            {d.summary}
          </p>
        </div>
      </div>

      {/* Cost & Latency Resource Bar */}
      <div className="mt-2.5 flex items-center justify-between border-t border-hairline/60 pt-1.5 text-[10px] text-muted-foreground font-mono">
        <span title="Estimated benchmark model cost">est. {d.estimatedCost || "$0.001"}</span>
        <span title="Estimated step latency">~{((d.latencyMs || 1500) / 1000).toFixed(1)}s</span>
      </div>

      {/* In-Graph Failure State & Inline Retry */}
      {isError ? (
        <div className="mt-2.5 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1 text-rose-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[11px] font-medium">Failed execution</span>
          </div>
          <button
            type="button"
            onClick={handleRetryClick}
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-white border border-rose-300 rounded px-1.5 py-0.5 hover:bg-rose-100 transition-colors"
          >
            <RotateCw className="h-2.5 w-2.5" />
            Retry
          </button>
        </div>
      ) : null}

      {/* Completed Visual Result Card */}
      {done && d.result ? (
        <div className="mt-2.5 rounded-lg border border-hairline bg-surface p-2">
          {d.result.type === "image" ? (
            <div className="relative overflow-hidden rounded-md bg-muted aspect-[4/3]">
              <img
                src={d.result.value}
                alt={d.title}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="h-14 w-full rounded-md bg-[linear-gradient(120deg,var(--brand-green-pale),var(--surface))]" />
          )}
          <p className="mt-1.5 text-[10px] font-medium text-brand-green-deep truncate">
            {d.result.type === "image"
              ? d.kind === "output"
                ? "Final deliverable asset"
                : d.kind === "style_transfer" || d.kind === "style"
                  ? "Brand styled asset"
                  : "Generated asset render"
              : d.result.value}
          </p>
        </div>
      ) : null}

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-brand-green-pale"
      />
    </div>
  );
}

function StatusDot({ status }: { status: NodeStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-brand-green">
        <Check className="h-2 w-2 text-primary-foreground" strokeWidth={3} />
      </span>
    );
  }
  if (status === "running") {
    return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-green thinking-dot" />;
  }
  if (status === "error") {
    return (
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-rose-500">
        <AlertCircle className="h-2.5 w-2.5 text-white" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] border-brand-green-pale" />
  );
}

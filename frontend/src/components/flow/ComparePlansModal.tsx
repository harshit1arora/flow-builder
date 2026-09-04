import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitCompare, Zap, Layers, Check, Clock, DollarSign, ArrowRight } from "lucide-react";
import type { MockGraph } from "@/lib/flow-schema";

interface ComparePlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGraph: MockGraph | null;
  brief: string;
  onSelectPlan: (planKey: "fidelity" | "speed") => void;
}

export function ComparePlansModal({
  isOpen,
  onClose,
  currentGraph,
  brief,
  onSelectPlan,
}: ComparePlansModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl border border-hairline bg-card text-ink shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-brand-green-pale text-brand-green text-[10px]">
              Orchestrator Exploration
            </Badge>
          </div>
          <DialogTitle className="font-display text-lg font-semibold text-brand-green flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Pipeline Architectures
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            LLM workflow planning explores alternative DAG architectures with distinct cost, latency, and fidelity trade-offs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          {/* Plan A: Fidelity & Parallel Branching */}
          <div className="rounded-xl border-2 border-brand-green bg-surface p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-brand-green text-primary-foreground px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Layers className="h-4 w-4 text-brand-green" />
                <h3 className="font-medium text-sm text-ink">Multi-Stage Parallel</h3>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                High-fidelity pipeline with parallel prompt generation, image synthesis, style harmonizer, and upscaling.
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs py-1 border-b border-hairline">
                  <span className="text-muted-foreground">Topology</span>
                  <span className="font-medium text-ink">Branch & Merge (DAG)</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-hairline">
                  <span className="text-muted-foreground">Node Count</span>
                  <span className="font-medium text-ink">
                    {currentGraph?.nodes?.length ? `${currentGraph.nodes.length} Nodes` : "6 Nodes"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-hairline">
                  <span className="text-muted-foreground">Est. Total Cost</span>
                  <span className="font-medium text-brand-green-deep">
                    {currentGraph?.totalCost || "$0.0075"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-muted-foreground">Est. Latency</span>
                  <span className="font-medium text-ink">
                    {currentGraph?.totalLatencyMs
                      ? `~${(currentGraph.totalLatencyMs / 1000).toFixed(1)}s`
                      : "~8.2s"}
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                onSelectPlan("fidelity");
                onClose();
              }}
              className="w-full bg-brand-green text-primary-foreground hover:bg-brand-green-deep text-xs font-medium"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Keep Multi-Stage
            </Button>
          </div>

          {/* Plan B: Direct & Low Latency */}
          <div className="rounded-xl border border-hairline bg-card p-4 flex flex-col justify-between hover:border-brand-green-pale transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-amber-600" />
                <h3 className="font-medium text-sm text-ink">Streamlined Direct</h3>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                Optimized for fast iteration with a compact linear pipeline skipping intermediate style transfer.
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs py-1 border-b border-hairline">
                  <span className="text-muted-foreground">Topology</span>
                  <span className="font-medium text-ink">Linear Fast-Path</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-hairline">
                  <span className="text-muted-foreground">Node Count</span>
                  <span className="font-medium text-ink">4 Nodes</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-hairline">
                  <span className="text-muted-foreground">Est. Total Cost</span>
                  <span className="font-medium text-brand-green-deep">$0.0035 (53% savings)</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-muted-foreground">Est. Latency</span>
                  <span className="font-medium text-ink">~4.5s (45% faster)</span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onSelectPlan("speed");
                onClose();
              }}
              className="w-full border-brand-green-pale text-brand-green hover:bg-surface text-xs font-medium"
            >
              Switch to Fast-Path
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

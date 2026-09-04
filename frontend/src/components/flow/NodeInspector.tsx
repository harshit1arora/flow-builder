import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Play, Sparkles, RefreshCw, AlertCircle, Clock, DollarSign, HelpCircle } from "lucide-react";
import type { MockNode, NodeStatus } from "@/lib/flow-schema";

interface NodeInspectorProps {
  node: MockNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, newSummary: string) => void;
  onRerunFromNode: (nodeId: string) => void;
  onSimulateError: (nodeId: string) => void;
}

export function NodeInspector({
  node,
  isOpen,
  onClose,
  onSave,
  onRerunFromNode,
  onSimulateError,
}: NodeInspectorProps) {
  const [summary, setSummary] = useState("");

  useEffect(() => {
    if (node) {
      setSummary(node.summary);
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    onSave(node.id, summary.trim() || node.summary);
    onClose();
  };

  const handleRerun = () => {
    onSave(node.id, summary.trim() || node.summary);
    onRerunFromNode(node.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg border border-hairline bg-card text-ink shadow-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-brand-green-pale text-brand-green font-medium text-xs">
              {node.kind}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">{node.id}</span>
          </div>
          <DialogTitle className="font-display text-lg font-semibold text-brand-green-deep flex items-center justify-between">
            {node.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure node parameters and selectively execute downstream workflow dependencies.
          </DialogDescription>
        </DialogHeader>

        {/* Explainability Section ("Why this graph") */}
        {node.reason ? (
          <div className="rounded-lg border border-hairline bg-surface p-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-brand-green mb-1">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Why this node exists</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">{node.reason}</p>
          </div>
        ) : null}

        {/* Resource Telemetry */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-md border border-hairline bg-surface px-3 py-2">
            <DollarSign className="h-3.5 w-3.5 text-brand-green" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Est. Cost</span>
              <span className="font-medium text-ink">{node.estimatedCost || "$0.002"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-hairline bg-surface px-3 py-2">
            <Clock className="h-3.5 w-3.5 text-brand-green" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Est. Latency</span>
              <span className="font-medium text-ink">{(node.latencyMs || node.duration) / 1000}s</span>
            </div>
          </div>
        </div>

        {/* Editable Summary / Directive */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink flex items-center justify-between">
            <span>Node Directive / Summary</span>
            <span className="text-[11px] text-muted-foreground font-normal">Tweak parameters</span>
          </label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="h-24 resize-none border-hairline bg-surface font-sans text-xs focus-visible:ring-brand-green"
            placeholder="e.g. Style: minimalist cyberpunk, neon emerald color grade"
          />
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-hairline items-center">
          <div className="flex items-center gap-1 sm:mr-auto">
            <span className="text-[10px] text-muted-foreground font-mono">Dev Tools:</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSimulateError(node.id)}
              className="h-7 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              Test failure recovery
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleSave} className="text-xs">
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleRerun}
            className="bg-brand-green text-primary-foreground hover:bg-brand-green-deep text-xs flex items-center gap-1.5 font-medium"
          >
            <Play className="h-3.5 w-3.5" />
            Re-run forward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

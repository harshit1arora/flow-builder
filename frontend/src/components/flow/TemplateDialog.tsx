import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bookmark, Sparkles, FolderDown, Trash2, ArrowRight } from "lucide-react";
import type { MockGraph } from "@/lib/flow-schema";

export interface SavedTemplate {
  id: string;
  name: string;
  brief: string;
  nodeCount: number;
  graph: MockGraph;
  createdAt: string;
}

const BUILT_IN_TEMPLATES: SavedTemplate[] = [
  {
    id: "tpl-ad",
    name: "5-Scene Commercial Video Ad",
    brief: "Product photo → 5-scene ad",
    nodeCount: 6,
    createdAt: "Built-in",
    graph: {
      nodes: [
        {
          id: "n1",
          kind: "input",
          title: "Input",
          summary: "1 image · product-shot.jpg",
          reason: "Receives raw master product photography",
          estimatedCost: "$0.00",
          latencyMs: 900,
          position: { x: 0, y: 120 },
          duration: 900,
        },
        {
          id: "n2",
          kind: "prompt",
          title: "Prompt generator",
          summary: "5 scene prompts, ad tone",
          reason: "Generates 5 distinct lighting, camera angle, and scene direction prompts",
          estimatedCost: "$0.0005",
          latencyMs: 1600,
          position: { x: 260, y: 120 },
          duration: 1600,
        },
        {
          id: "n3",
          kind: "imagegen",
          title: "Image gen",
          summary: "Style: cinematic, 16:9",
          reason: "Renders the photoreal 3D product commercial scenes",
          estimatedCost: "$0.003",
          latencyMs: 2400,
          position: { x: 520, y: 20 },
          duration: 2400,
        },
        {
          id: "n4",
          kind: "style",
          title: "Style transfer",
          summary: "Match brand palette & reflections",
          reason: "Harmonizes commercial color grade with emerald & gold brand reflections",
          estimatedCost: "$0.002",
          latencyMs: 1800,
          position: { x: 520, y: 220 },
          duration: 1800,
        },
        {
          id: "n5",
          kind: "upscale",
          title: "Upscale",
          summary: "4K Clarity texture preserve",
          reason: "Enhances surface bevels and micro-contrast for broadcast delivery",
          estimatedCost: "$0.002",
          latencyMs: 1500,
          position: { x: 780, y: 120 },
          duration: 1500,
        },
        {
          id: "n6",
          kind: "output",
          title: "Output",
          summary: "5-scene ad sequence deliverable",
          reason: "Packages final multi-scene marketing hero bundle",
          estimatedCost: "$0.00",
          latencyMs: 1000,
          position: { x: 1040, y: 120 },
          duration: 1000,
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n2", target: "n4" },
        { id: "e4", source: "n3", target: "n5" },
        { id: "e5", source: "n4", target: "n5" },
        { id: "e6", source: "n5", target: "n6" },
      ],
      totalCost: "$0.0075",
      totalLatencyMs: 9200,
    },
  },
  {
    id: "tpl-carousel",
    name: "LinkedIn Editorial Carousel",
    brief: "Blog post → 5-slide carousel",
    nodeCount: 5,
    createdAt: "Built-in",
    graph: {
      nodes: [
        {
          id: "n1",
          kind: "input",
          title: "Input",
          summary: "Markdown article · 1,200 words",
          reason: "Extracts key thesis and structure from article text",
          estimatedCost: "$0.00",
          latencyMs: 800,
          position: { x: 0, y: 120 },
          duration: 800,
        },
        {
          id: "n2",
          kind: "prompt",
          title: "Prompt generator",
          summary: "5 hook slides & core takeaways",
          reason: "Formulates hook headlines and slide-by-slide visual layout prompts",
          estimatedCost: "$0.0004",
          latencyMs: 1400,
          position: { x: 260, y: 120 },
          duration: 1400,
        },
        {
          id: "n3",
          kind: "imagegen",
          title: "Image gen",
          summary: "Minimalist editorial gradient textures",
          reason: "Synthesizes aesthetic backdrop cards for each slide",
          estimatedCost: "$0.003",
          latencyMs: 2200,
          position: { x: 520, y: 20 },
          duration: 2200,
        },
        {
          id: "n4",
          kind: "style",
          title: "Style transfer",
          summary: "Brand typography & duo-tone",
          reason: "Applies high-contrast typographic balance",
          estimatedCost: "$0.002",
          latencyMs: 1600,
          position: { x: 520, y: 220 },
          duration: 1600,
        },
        {
          id: "n5",
          kind: "output",
          title: "Output",
          summary: "5-slide carousel ready to publish",
          reason: "Compiles PNG bundle and copy package",
          estimatedCost: "$0.00",
          latencyMs: 1000,
          position: { x: 780, y: 120 },
          duration: 1000,
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n2", target: "n4" },
        { id: "e4", source: "n3", target: "n5" },
        { id: "e5", source: "n4", target: "n5" },
      ],
      totalCost: "$0.0054",
      totalLatencyMs: 7000,
    },
  },
];

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentGraph: MockGraph | null;
  currentBrief: string;
  onLoadTemplate: (template: SavedTemplate) => void;
}

export function TemplateDialog({
  isOpen,
  onClose,
  currentGraph,
  currentBrief,
  onLoadTemplate,
}: TemplateDialogProps) {
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("flow_saved_templates");
      if (stored) {
        setSavedTemplates(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed reading templates from localStorage", e);
    }
  }, [isOpen]);

  const handleSaveCurrent = () => {
    if (!currentGraph || !templateName.trim()) return;
    const newTpl: SavedTemplate = {
      id: `custom-${Date.now()}`,
      name: templateName.trim(),
      brief: currentBrief || "Custom workflow",
      nodeCount: currentGraph.nodes.length,
      graph: currentGraph,
      createdAt: new Date().toLocaleDateString(),
    };

    const updated = [newTpl, ...savedTemplates];
    setSavedTemplates(updated);
    localStorage.setItem("flow_saved_templates", JSON.stringify(updated));
    setTemplateName("");
  };

  const handleDelete = (id: string) => {
    const updated = savedTemplates.filter((t) => t.id !== id);
    setSavedTemplates(updated);
    localStorage.setItem("flow_saved_templates", JSON.stringify(updated));
  };

  const allTemplates = [...savedTemplates, ...BUILT_IN_TEMPLATES];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl border border-hairline bg-card text-ink shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-brand-green flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Workflow Templates & History
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Save successful agentic pipelines as reusable templates or load existing architectures.
          </DialogDescription>
        </DialogHeader>

        {/* Save Current Section */}
        {currentGraph && currentGraph.nodes.length > 0 ? (
          <div className="rounded-lg border border-hairline bg-surface p-3 space-y-2">
            <span className="text-xs font-medium text-ink block">Save Current Pipeline as Template</span>
            <div className="flex gap-2">
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name (e.g. 5-Scene Ad Pipeline)"
                className="h-8 text-xs bg-card border-hairline"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSaveCurrent}
                disabled={!templateName.trim()}
                className="h-8 bg-brand-green text-primary-foreground hover:bg-brand-green-deep text-xs shrink-0"
              >
                Save
              </Button>
            </div>
          </div>
        ) : null}

        {/* List of Templates */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {allTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="flex items-center justify-between rounded-lg border border-hairline bg-card p-3 hover:border-brand-green-pale transition-colors"
            >
              <div className="min-w-0 flex-1 mr-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs text-ink truncate">{tpl.name}</span>
                  <span className="text-[10px] rounded-full bg-surface border border-hairline px-2 py-0.5 text-muted-foreground shrink-0">
                    {tpl.nodeCount} nodes
                  </span>
                  {tpl.createdAt === "Built-in" ? (
                    <span className="text-[10px] text-brand-green font-medium shrink-0">Built-in</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground shrink-0">{tpl.createdAt}</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{tpl.brief}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {tpl.id.startsWith("custom-") ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(tpl.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onLoadTemplate(tpl);
                    onClose();
                  }}
                  className="h-7 text-xs border-brand-green-pale text-brand-green hover:bg-surface flex items-center gap-1"
                >
                  <span>Load</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

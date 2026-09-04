import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/flow/Workspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flow — agentic workflow builder by HexCoded" },
      {
        name: "description",
        content:
          "Describe a creative goal and watch Flow plan and assemble the node pipeline for you, then run it step by step.",
      },
      { property: "og:title", content: "Flow — agentic workflow builder by HexCoded" },
      {
        property: "og:description",
        content:
          "Describe a creative goal and watch Flow plan and assemble the node pipeline for you, then run it step by step.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <Workspace />;
}

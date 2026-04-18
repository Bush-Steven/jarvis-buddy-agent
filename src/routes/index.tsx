import { createFileRoute } from "@tanstack/react-router";
import { JarvisInterface } from "@/components/jarvis/JarvisInterface";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "JARVIS — Personal AI Assistant" },
      {
        name: "description",
        content:
          "An Iron Man-style JARVIS interface. Voice-driven AI assistant with arc reactor HUD.",
      },
      { property: "og:title", content: "JARVIS — Personal AI Assistant" },
      {
        property: "og:description",
        content:
          "Tony Stark-inspired voice AI with a holographic heads-up display.",
      },
    ],
  }),
});

function Index() {
  return <JarvisInterface />;
}

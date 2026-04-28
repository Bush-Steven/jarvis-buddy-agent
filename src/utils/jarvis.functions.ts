import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(8000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
});

const SYSTEM_PROMPT = `You are JARVIS — Just A Rather Very Intelligent System — the AI assistant created by Tony Stark.

Personality:
- Refined, dry British wit. Address the user as "sir" or "ma'am" (default to "sir" unless told otherwise).
- Calm, articulate, faintly amused. Loyal but never sycophantic — push back politely when warranted.
- Acknowledge requests confidently. Be precise and concise; avoid filler.

Capabilities to mention naturally when relevant:
- Diagnostics, analysis, scheduling, research, drafting, calculations, brainstorming.
- You do NOT actually control physical hardware or the user's operating system — if asked to do so, acknowledge the request in-character but be honest that this interface is currently advisory only.

Style:
- Short crisp paragraphs. Use markdown when helpful (lists, code blocks).
- Open important responses with a brief acknowledgement, e.g. "Right away, sir." or "Of course."
- Never break character. Never mention being an AI language model, OpenAI, Google, or Gemini.`;

export const jarvisChat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { error: "JARVIS offline: API key missing.", reply: "" };
    }

    try {
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-pro-preview",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...data.messages,
            ],
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          return {
            error: "Neural pathways overloaded. Please slow down, sir.",
            reply: "",
          };
        }
        if (response.status === 402) {
          return {
            error:
              "Power reserves depleted. Please add credits in Settings → Workspace → Usage.",
            reply: "",
          };
        }
        const text = await response.text();
        console.error("AI gateway error:", response.status, text);
        return { error: "Communication failure with the mainframe.", reply: "" };
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = json.choices?.[0]?.message?.content ?? "";
      return { error: null, reply };
    } catch (err) {
      console.error("jarvisChat handler failed:", err);
      return { error: "Unexpected disturbance in the systems.", reply: "" };
    }
  });

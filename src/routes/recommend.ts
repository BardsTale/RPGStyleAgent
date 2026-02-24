import { Router } from "express";
import { ollamaGenerate } from "../services/llm/ollama.js";
import { IntentSpecSchema } from "../schemas/intent.js";

export const recommendRouter = Router();

function extractFirstJson(text: string): unknown {
  // 간단한 JSON 추출(LLM이 앞뒤로 말을 붙일 때 대비)
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonText = text.slice(start, end + 1);
  return JSON.parse(jsonText);
}

recommendRouter.post("/intent", async (req, res) => {
  try {
    const userText = String(req.body?.text ?? "").trim();
    if (!userText) return res.status(400).json({ error: "text is required" });

    const prompt = `
You are a strict JSON generator.
Convert the user request into IntentSpec JSON ONLY.
Rules:
- Output MUST be valid JSON. No markdown, no explanation.
- slots must include: ["hair","top","bottom","outer","shoes","accessory"]
- style/vibe/colors/materials are arrays of strings.
- constraints.must_include / constraints.avoid are arrays of strings.

User request: ${JSON.stringify(userText)}
`;

    const raw = await ollamaGenerate({
      prompt,
      model: "mistral",
      temperature: 0.2,
    });

    const parsed = extractFirstJson(raw);
    const intent = IntentSpecSchema.parse(parsed);

    return res.json({ intent, raw });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

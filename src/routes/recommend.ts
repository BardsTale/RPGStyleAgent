import { Router } from "express";
import { ollamaGenerate } from "../services/llm/ollama.js";
import { IntentSpecSchema } from "../schemas/intent.js";
import {
  getCandidates,
  type IntentSpec,
} from "../services/items/candidates.js";
import {
  generateOutfitPlan,
  validateOutfitPlan,
  buildFallbackOutfit,
} from "../services/llm/outfit.js";

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
      - Output MUST be valid JSON only.
      - Do not output markdown.
      - Do not output explanation.
      - "slots" must be an array of strings.
      - Use exactly this format for "slots":
        ["hair", "top", "bottom", "outer", "shoes", "accessory"]

      Schema:
      {
        "slots": ["hair", "top", "bottom", "outer", "shoes", "accessory"],
        "style": [],
        "vibe": [],
        "colors": [],
        "materials": [],
        "constraints": {
          "must_include": [],
          "avoid": []
        }
      }

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

recommendRouter.post("/candidates", async (req, res) => {
  try {
    const intent = req.body?.intent as IntentSpec | undefined;

    if (!intent) {
      return res.status(400).json({ error: "intent is required" });
    }

    const candidates = getCandidates(intent, 8);

    return res.json({
      intent,
      candidates,
    });
  } catch (error: any) {
    console.error("[POST /candidates] error", {
      message: error?.message,
      stack: error?.stack,
      requestSummary: {
        userInput: req.body?.userInput,
        itemCount: req.body?.items?.length,
      },
    });

    return res.status(500).json({
      error: error?.message || "candidate generation failed",
    });
  }
});

recommendRouter.post("/outfit", async (req, res) => {
  try {
    const intent = req.body?.intent;
    const candidates = req.body?.candidates;

    if (!intent) {
      return res.status(400).json({ error: "intent is required" });
    }

    if (!candidates) {
      return res.status(400).json({ error: "candidates is required" });
    }

    const { outfit, raw } = await generateOutfitPlan({
      intent,
      candidates,
    });

    const validation = validateOutfitPlan({
      outfit,
      candidates,
    });

    if (!validation.valid) {
      const fallback = buildFallbackOutfit(candidates);

      return res.json({
        intent,
        outfit: fallback,
        raw,
        validation,
        fallbackApplied: true,
      });
    }

    return res.json({
      intent,
      outfit,
      raw,
      validation,
      fallbackApplied: false,
    });
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message ?? "unknown error",
    });
  }
});

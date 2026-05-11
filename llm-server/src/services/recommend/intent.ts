import { IntentSpecSchema } from "../../schemas/intent.js";
import { ollamaGenerate } from "../llm/ollama.js";

function extractFirstJson(text: string): unknown {
  // 간단한 JSON 추출(LLM이 앞뒤로 말을 붙일 때 대비)
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonText = text.slice(start, end + 1);
  return JSON.parse(jsonText);
}

export function buildIntentPrompt(message: string) {
  return `
    You are a strict JSON generator.
    Convert the user request into IntentSpec JSON ONLY.

    Rules:
    - Output MUST be valid JSON only.
    - Do not output markdown.
    - Do not output explanation.
    - "slots" must be an array of strings.
    - Use exactly this format for "slots":
      ["hair", "top", "bottom", "outer", "shoes", "accessory"]

    Gender rules:
    - If the request contains "남성", "남자", "male", set "gender" to "male".
    - If the request contains "여성", "여자", "female", set "gender" to "female".
    - If no gender is specified, set "gender" to null.
    - Do NOT put gender words in "style" or "vibe".

    style tag example:
    wuxia, modern, fantasy, cute, sci-fi

    themes tag example:
    animal, martial, uniform, royal, yokai, headwear, accessory

    mood tag example:
    playful, elegant, dark, cool, formal

    colors tag example:
    black, white, red, blue, gold, silver

    Schema:
    {
      "slots": ["hair", "top", "bottom", "outer", "shoes", "accessory"],
      "gender": "male" | "female" | null,
      "style": [],
      "vibe": [],
      "colors": [],
      "materials": [],
      "constraints": {
        "must_include": [],
        "avoid": []
      }
    }

    User request: ${JSON.stringify(message)}
  `;
}

export function parseJsonSafe(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function generateIntent(message: string) {
  const prompt = buildIntentPrompt(message);

  const raw = await ollamaGenerate({
    prompt,
    model: "mistral",
    temperature: 0.2,
  });

  const parsed = extractFirstJson(raw);
  const intent = IntentSpecSchema.parse(parsed);

  return {
    intent: intent,
    raw,
  };
}

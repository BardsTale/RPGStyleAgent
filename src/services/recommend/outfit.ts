import fetch from "node-fetch";
import { withTimeout } from "../../utils/utils.js";
import { type IntentSpec } from "../../types/commonTypes.js";

export type CandidateItem = {
  ItemName: string;
  SlotName: string;
  NormalizedSlot: string;
  EquipType: string;
  UseSex: number;
  meta: {
    style: string[];
    themes: string[];
    mood: string[];
    colors: string[];
    keywords: string[];
    isRental: boolean;
    confidence: number;
  };
  score: number;
};

export type CandidateGroups = Record<string, CandidateItem[]>;

export type OutfitPlan = {
  hair?: string | null;
  top?: string | null;
  bottom?: string | null;
  outer?: string | null;
  shoes?: string | null;
  accessory?: string | null;
  weapon?: string | null;
  reason?: string;
};

function extractFirstJson(text: string): unknown | null {
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function ollamaGenerate(params: {
  prompt: string;
  model?: string;
  temperature?: number;
}) {
  const { prompt, model = "mistral", temperature = 0.1 } = params;

  const res = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama error: ${res.status} ${res.statusText} ${text}`);
  }

  const data = (await res.json()) as { response: string };
  return data.response;
}

function buildCandidateSummary(candidates: CandidateGroups) {
  const summarized: Record<
    string,
    Array<{ itemName: string; tags: string[]; score: number }>
  > = {};

  for (const [slot, items] of Object.entries(candidates)) {
    summarized[slot] = items.map((item) => ({
      itemName: item.ItemName,
      tags: [
        ...item.meta.style,
        ...item.meta.themes,
        ...item.meta.mood,
        ...item.meta.colors,
        ...item.meta.keywords,
      ].slice(0, 12),
      score: item.score,
    }));
  }

  return summarized;
}

export async function generateOutfitPlan(params: {
  intent: IntentSpec;
  candidates: CandidateGroups;
}) {
  const { intent, candidates } = params;

  const summarizedCandidates = buildCandidateSummary(candidates);

  const prompt = `
intent와 candidates를 보고 가장 어울리는 코디를 고르라.
meta와 score를 참고해 직관적으로 판단하되, 각 슬롯은 반드시 candidates 안의 name 하나 또는 null만 반환하라.
배열, 객체, tags 생성 금지.

그리고 각 슬롯 값은 반드시 해당 candidates 배열의 ItemName 값을 한 글자도 바꾸지 말고 그대로 반환해야 한다.
대괄호 접두사([리런], [대여], [도감], [만일])를 제거하면 안 된다.
keywords 값을 반환하면 안 된다.
축약, 정규화, 요약, 별칭 사용 금지.

예:
후보 ItemName이 "[리런]금린추월관" 이면
반환값은 반드시 "[리런]금린추월관" 이어야 한다.
"금린추월관" 으로 반환하면 틀린다.

JSON만 반환:
{
  "hair": string | null,
  "top": string | null,
  "bottom": string | null,
  "outer": string | null,
  "shoes": string | null,
  "accessory": string | null,
  "weapon": string | null,
  "reason": string
}

input:
${JSON.stringify({ intent, candidates: summarizedCandidates })}
`;

  const raw = await withTimeout(
    ollamaGenerate({
      prompt,
      model: "qwen2.5:7b",
      temperature: 0.2,
    }),
    60000,
    "outfit llm timeout",
  );

  const parsed = extractFirstJson(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Failed to parse outfit JSON from LLM. raw: ${raw}`);
  }

  return {
    raw,
    outfit: parsed as OutfitPlan,
  };
}

export function validateOutfitPlan(params: {
  outfit: OutfitPlan;
  candidates: CandidateGroups;
}) {
  const { outfit, candidates } = params;

  const allowedMap: Record<string, Set<string>> = {};

  for (const [slot, items] of Object.entries(candidates)) {
    allowedMap[slot] = new Set(items.map((item) => item.ItemName));
  }

  const errors: string[] = [];

  const slots: Array<keyof OutfitPlan> = [
    "hair",
    "top",
    "bottom",
    "outer",
    "shoes",
    "accessory",
    "weapon",
  ];

  for (const slot of slots) {
    const value = outfit[slot];

    if (value == null) continue;
    if (typeof value !== "string") {
      errors.push(`${slot}: must be string or null`);
      continue;
    }

    const allowed = allowedMap[slot];
    if (!allowed) continue;

    if (!allowed.has(value)) {
      errors.push(`${slot}: "${value}" is not in candidates`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildFallbackOutfit(candidates: CandidateGroups): OutfitPlan {
  const pickTop = (slot: string) => candidates[slot]?.[0]?.ItemName ?? null;

  return {
    hair: pickTop("hair"),
    top: pickTop("top"),
    bottom: pickTop("bottom"),
    outer: pickTop("outer"),
    shoes: pickTop("shoes"),
    accessory: pickTop("accessory"),
    weapon: pickTop("weapon"),
    reason: "후보 점수 상위 아이템 기준으로 자동 조합된 fallback 코디",
  };
}

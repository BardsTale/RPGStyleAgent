import fetch from "node-fetch";
export type CandidateItem = {
  itemName: string;
  slotName: string;
  normalizedSlot: string;
  equipType: string;
  useSex: number;
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

export type IntentSpec = {
  slots: string[];
  style: string[];
  vibe: string[];
  colors: string[];
  materials: string[];
  constraints: {
    must_include: string[];
    avoid: string[];
    season?: string;
  };
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
      itemName: item.itemName,
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
    너는 게임 아바타 코디 플래너다.
    반드시 아래 후보 목록 안에 있는 itemName 중에서만 선택해야 한다.
    후보에 없는 이름을 만들어내면 안 된다.
    설명은 최소화하고 반드시 JSON만 출력한다.

    너의 작업은 스타일을 창작하는 것이 아니라,
    주어진 candidates 안에서 슬롯별로 정확히 1개의 아이템을 선택하는 것이다.

    판단 기준:
    - intent(style, vibe)와의 일치도
    - 슬롯 간 색상/무드/테마 조화
    - wuxia, martial, swordsman fantasy와의 적합성
    - score가 높을수록 우선
    - 단, 전체 코디 균형이 더 중요하면 score가 약간 낮아도 선택 가능
    - rental 아이템은 꼭 필요할 때만 선택

    규칙:
    1. 각 필드는 반드시 string 또는 null 이어야 한다.
    2. string 값은 반드시 해당 슬롯 candidates 배열 안에 존재하는 ItemName 중 하나여야 한다.
    3. 새 객체, 배열, tags, 설명 객체를 만들면 안 된다.
    4. 후보가 비어 있으면 null을 넣는다.
    5. bottom 후보가 비어 있으므로 null이어야 한다.
    6. reason은 문자열 1개만 작성한다.
    7. 선정 기준은 각 부위별로 score 점수가 높은 아이템 상위 10개에서 랜덤으로 지정한다. 

    반환 JSON 스키마:
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

    사용자 의도:
    ${JSON.stringify(intent, null, 2)}

    후보 목록:
    ${JSON.stringify(summarizedCandidates, null, 2)}

    JSON만 출력하라.
    `.trim();

  const raw = await ollamaGenerate({
    prompt,
    model: "mistral",
    temperature: 0.1,
  });

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
    allowedMap[slot] = new Set(items.map((item) => item.itemName));
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
  const pickTop = (slot: string) => candidates[slot]?.[0]?.itemName ?? null;

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

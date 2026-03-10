import fs from "node:fs";
import path from "node:path";

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

type Meta = {
  style: string[];
  themes: string[];
  mood: string[];
  colors: string[];
  keywords: string[];
  isRental: boolean;
  confidence: number;
};

type CacheRecord = Record<string, CandidateItem[]>;

export type CandidateItem = {
  ItemName: string;
  SlotName: string;
  NormalizedSlot: string;
  EquipType: string;
  UseSex: number;
  meta: Meta;
  score: number;
};

const CACHE_PATH = path.resolve(process.cwd(), "itemData.tagged.enriched.json");

let cacheMemo: CacheRecord | null = null;

function loadCache(): CacheRecord {
  if (cacheMemo) return cacheMemo;

  const raw = fs.readFileSync(CACHE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as CacheRecord;
  cacheMemo = parsed;

  return parsed;
}

function normalizeSlot(slotName: string): string {
  switch (slotName) {
    case "투구":
      return "hair";
    case "갑옷":
    case "세트옷":
      return "top";
    case "망토":
      return "outer";
    case "신발":
      return "shoes";
    case "장신구":
    case "얼굴장식":
    case "목/어깨장식":
    case "방패/보조무기":
      return "accessory";
    case "무기":
      return "weapon";
    default:
      return "accessory";
  }
}

function detectGender(intent: IntentSpec): number {
  const pool = [
    ...intent.style,
    ...intent.vibe,
    ...intent.colors,
    ...intent.materials,
    ...intent.constraints.must_include,
    ...intent.constraints.avoid,
  ];

  const joined = pool.join(" ");

  if (
    joined.includes("남성") ||
    joined.includes("남자") ||
    joined.includes("male")
  ) {
    return 0;
  }

  if (
    joined.includes("여성") ||
    joined.includes("여자") ||
    joined.includes("female")
  ) {
    return 1;
  }

  return 2;
}

function allowedByGender(itemUseSex: number, intentGender: number): boolean {
  // item: 0 남, 1 여, 2 공용
  // intent: 0 남, 1 여, 2 미지정
  if (intentGender === 2) return true;
  if (itemUseSex === 2) return true;
  return itemUseSex === intentGender;
}

function toSetLower(values: string[]): Set<string> {
  return new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean));
}

function expandTerms(values: string[]): string[] {
  const expanded = new Set<string>();

  const synonymMap: Record<string, string[]> = {
    무협: ["무협", "wuxia", "협객", "검객", "도객", "강호"],
    검객: ["검객", "swordsman", "sword", "협객"],
    교복: ["교복", "school", "uniform"],
    귀여운: ["귀여운", "cute", "animal", "playful"],
    공주: ["공주", "royal", "princess", "formal"],
    요괴: ["요괴", "yokai", "귀신", "dark", "fantasy"],
    어두운: ["어두운", "dark"],
    화려한: ["화려한", "flashy", "formal"],
    남성: ["남성", "남자", "male"],
    여성: ["여성", "여자", "female"],
  };

  for (const value of values) {
    const key = value.trim().toLowerCase();
    expanded.add(key);

    for (const [base, synonyms] of Object.entries(synonymMap)) {
      if (key === base || synonyms.map((s) => s.toLowerCase()).includes(key)) {
        expanded.add(base.toLowerCase());
        for (const synonym of synonyms) {
          expanded.add(synonym.toLowerCase());
        }
      }
    }
  }

  return [...expanded];
}

function countMatches(target: string[], source: string[]): number {
  if (!target.length || !source.length) return 0;

  const targetSet = toSetLower(expandTerms(target));
  const sourceSet = toSetLower(source);

  let count = 0;
  for (const token of targetSet) {
    if (sourceSet.has(token)) count++;
  }

  return count;
}

function scoreItem(intent: IntentSpec, meta: Meta): number {
  if (!Array.isArray(meta.style)) console.log("asdasd", meta.themes);
  let score = 0;

  // 성별은 점수에서 제외
  const scoringVibe = intent.vibe.filter(
    (v) =>
      !["남성", "남자", "male", "여성", "여자", "female"].includes(
        v.toLowerCase(),
      ),
  );

  const styleMatches = countMatches(intent.style, [
    ...meta.style,
    ...meta.themes,
  ]);

  const vibeMatches = countMatches(scoringVibe, [
    ...meta.themes,
    ...meta.mood,
    ...meta.keywords,
    ...meta.style,
  ]);
  const colorMatches = countMatches(intent.colors, meta.colors);
  const materialMatches = countMatches(intent.materials, meta.keywords);
  const antiStyleMap: Record<string, string[]> = {
    무협: ["futuristic", "sci-fi", "uniform", "modern", "school"],
    검객: ["sci-fi", "uniform", "school", "futuristic"],
    교복: ["wuxia", "martial", "jianghu", "협객", "검객"],
    공주: ["dark", "horror", "yokai"],
    요괴: ["school", "uniform", "modern"],
  };

  function countAntiMatches(target: string[], source: string[]): number {
    const expandedTarget = expandTerms(target);
    let count = 0;

    for (const t of expandedTarget) {
      const anti = antiStyleMap[t] ?? [];
      for (const s of source.map((v) => v.toLowerCase())) {
        if (anti.map((a) => a.toLowerCase()).includes(s)) {
          count++;
        }
      }
    }

    return count;
  }

  const antiMatches = countAntiMatches(intent.style, [
    ...meta.style,
    ...meta.themes,
    ...meta.mood,
    ...meta.keywords,
  ]);

  // 각 분류에 따라 배점 차등, 맞지 않은 품목은 감점
  score += styleMatches * 8;
  score += vibeMatches * 4;
  score += colorMatches * 2;
  score += materialMatches * 1;

  score -= antiMatches * 6;
  if (meta.isRental) score -= 0.5;

  const avoidMatches = countMatches(intent.constraints.avoid ?? [], [
    ...meta.style,
    ...meta.themes,
    ...meta.mood,
    ...meta.colors,
    ...meta.keywords,
  ]);
  score -= avoidMatches * 4;

  const mustIncludeMatches = countMatches(
    intent.constraints.must_include ?? [],
    [
      ...meta.style,
      ...meta.themes,
      ...meta.mood,
      ...meta.colors,
      ...meta.keywords,
    ],
  );
  score += mustIncludeMatches * 2;

  score += (meta.confidence ?? 0) * 0.5;

  return score;
}

export function getCandidates(intent: IntentSpec, perSlot = 8) {
  const cache = loadCache();
  const intentGender = detectGender(intent);
  const minScore = intent.style.length > 0 ? 2 : 0; // 최소 점수 커트라인
  const items: CandidateItem[] = (cache.itemData as CandidateItem[])
    .map((item: CandidateItem) => {
      const normalizedSlot = normalizeSlot(item.SlotName as string);

      return {
        ItemName: item.ItemName as string,
        SlotName: item.SlotName as string,
        NormalizedSlot: normalizedSlot,
        EquipType: item.EquipType as string,
        UseSex: item.UseSex,
        meta: item.meta,
        score: scoreItem(intent, item.meta),
      };
    })
    .filter((item) => allowedByGender(item.UseSex, intentGender))
    .filter((item) => item.score > minScore);

  const grouped: Record<string, CandidateItem[]> = {
    hair: [],
    top: [],
    bottom: [],
    outer: [],
    shoes: [],
    accessory: [],
    weapon: [],
  };

  for (const item of items) {
    const slot = item.NormalizedSlot as keyof typeof grouped;
    if (!grouped[slot]) {
      grouped[slot] = [];
    }
    grouped[slot].push(item);
  }

  for (const [slot, items] of Object.entries(grouped)) {
    grouped[slot as keyof typeof grouped] = items
      .sort((a, b) => b.score - a.score)
      .slice(0, perSlot);
  }

  return grouped;
}

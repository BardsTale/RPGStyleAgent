import fs from "node:fs";
import path from "node:path";

type Meta = {
  style: string[];
  themes: string[];
  mood: string[];
  colors: string[];
  keywords: string[];
  isRental: boolean;
  confidence: number;
};

type TaggedItem = {
  ItemSeq: number;
  EquipType: string;
  ItemName: string;
  ItemType: number;
  EquipSlot: number;
  UseSex: number;
  IsHot: boolean;
  IsNew: boolean;
  IsUse: boolean;
  SlotName: string;
  SearchSlot: number;
  meta: Meta;
};

type TaggedJson = {
  itemData: TaggedItem[];
};

const INPUT = path.resolve(process.cwd(), "itemData.tagged.json");
const OUTPUT = path.resolve(process.cwd(), "itemData.tagged.repaired.json");

function normalizeText(text: string) {
  return text.trim().toLowerCase();
}

function unique(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function hasMeaningfulMeta(meta: Meta) {
  return (
    meta.style.length > 0 ||
    meta.themes.length > 0 ||
    meta.mood.length > 0 ||
    meta.colors.length > 0
  );
}

function splitKeywords(itemName: string): string[] {
  const cleaned = itemName
    .replace(/\[.*?\]/g, " ")
    .replace(/\(남\)/g, " 남 ")
    .replace(/\(여\)/g, " 여 ")
    .replace(/No\.\d+/gi, " ")
    .replace(/No\d+/gi, " ")
    .replace(/[']/g, " ")
    .replace(/[()\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const baseTokens = cleaned.match(/[A-Za-z]+|\d+|[가-힣]+/g) ?? [];

  const subTokens: string[] = [];
  for (const token of baseTokens) {
    // 복합 단어 분해용 패턴 사전
    const fragments = [
      "고양이",
      "냥이",
      "야옹",
      "토끼",
      "곰돌이",
      "곰",
      "여우",
      "판다",
      "펭귄",
      "병아리",
      "강아지",
      "사슴",
      "다람쥐",
      "카피바라",
      "협객",
      "검객",
      "도포",
      "한복",
      "도복",
      "도령",
      "아씨",
      "무사",
      "무공",
      "학관",
      "신령",
      "용",
      "봉황",
      "귀신",
      "도깨비",
      "여우비",
      "교복",
      "캠퍼스",
      "서커스",
      "왕실",
      "공주",
      "왕자",
      "기사",
      "제복",
      "기관사",
      "열차",
      "모자",
      "머리장식",
      "머리핀",
      "베레모",
      "투구",
      "목걸이",
      "귀걸이",
      "장식",
      "리본",
      "도령모",
      "망토",
      "비익",
      "날개",
      "신발",
      "장화",
      "우산",
      "검",
      "도",
      "월도",
      "환도",
      "족자",
      "염주",
      "부케",
      "반지",
      "가방",
      "배낭",
      "크로스백",
      "슬링백",
      "토드백",
      "니트",
      "수영복",
      "비키니",
      "원피스",
      "정장",
      "수트",
      "의상",
      "갑옷",
      "세트",
    ];

    for (const fragment of fragments) {
      if (token.includes(fragment)) {
        subTokens.push(fragment);
      }
    }
  }

  return unique([...baseTokens, ...subTokens]);
}

const STYLE_RULES: Array<{ match: string[]; add: string[] }> = [
  {
    match: [
      "협객",
      "검객",
      "도포",
      "한복",
      "도복",
      "무공",
      "무사",
      "월도",
      "환도",
    ],
    add: ["wuxia"],
  },
  {
    match: [
      "교복",
      "캠퍼스",
      "제복",
      "기관사",
      "니트",
      "수영복",
      "비키니",
      "원피스",
      "수트",
    ],
    add: ["modern"],
  },
  {
    match: [
      "신령",
      "용",
      "봉황",
      "귀신",
      "도깨비",
      "여우비",
      "왕실",
      "공주",
      "왕자",
    ],
    add: ["fantasy"],
  },
  {
    match: [
      "고양이",
      "냥이",
      "토끼",
      "곰돌이",
      "곰",
      "여우",
      "판다",
      "병아리",
      "펭귄",
      "카피바라",
    ],
    add: ["cute"],
  },
  { match: ["열차", "기관사"], add: ["futuristic"] },
];

const THEME_RULES: Array<{ match: string[]; add: string[] }> = [
  {
    match: [
      "고양이",
      "냥이",
      "토끼",
      "곰돌이",
      "곰",
      "여우",
      "판다",
      "병아리",
      "펭귄",
      "사슴",
      "다람쥐",
      "카피바라",
    ],
    add: ["animal"],
  },
  { match: ["협객", "검객", "무사", "무공"], add: ["martial"] },
  { match: ["교복", "캠퍼스", "제복", "기관사"], add: ["uniform"] },
  { match: ["왕실", "공주", "왕자"], add: ["royal"] },
  { match: ["귀신", "도깨비", "여우비"], add: ["yokai"] },
  {
    match: ["모자", "머리장식", "머리핀", "베레모", "투구", "도령모"],
    add: ["headwear"],
  },
  { match: ["목걸이", "귀걸이", "장식", "리본"], add: ["accessory"] },
  { match: ["망토", "비익", "날개"], add: ["outerwear"] },
  {
    match: ["검", "도", "월도", "환도", "염주", "족자", "우산", "반지", "부케"],
    add: ["weapon-prop"],
  },
  { match: ["가방", "배낭", "크로스백", "슬링백", "토드백"], add: ["bag"] },
];

const MOOD_RULES: Array<{ match: string[]; add: string[] }> = [
  {
    match: ["고양이", "냥이", "토끼", "곰돌이", "병아리", "판다", "펭귄"],
    add: ["playful"],
  },
  { match: ["왕실", "공주", "왕자", "봉황", "용"], add: ["elegant"] },
  { match: ["귀신", "도깨비"], add: ["dark"] },
  { match: ["교복", "제복", "기관사", "수트"], add: ["formal"] },
  { match: ["협객", "검객", "무사"], add: ["cool"] },
];

const COLOR_RULES: Array<{ match: string[]; add: string[] }> = [
  { match: ["흑", "검", "블랙", "까만"], add: ["black"] },
  { match: ["백", "하얀", "화이트", "설"], add: ["white"] },
  { match: ["홍", "적", "레드", "붉"], add: ["red"] },
  { match: ["청", "푸른", "블루"], add: ["blue"] },
  { match: ["녹", "초록", "그린"], add: ["green"] },
  { match: ["황", "금", "노란", "골드"], add: ["gold"] },
  { match: ["은", "실버"], add: ["silver"] },
  { match: ["분홍", "핑크"], add: ["pink"] },
];

function applyRules(tokens: string[], slotName: string) {
  const style: string[] = [];
  const themes: string[] = [];
  const mood: string[] = [];
  const colors: string[] = [];

  const tokenSet = new Set(tokens.map(normalizeText));

  const hitRule = (
    rules: Array<{ match: string[]; add: string[] }>,
    target: string[],
  ) => {
    for (const rule of rules) {
      if (rule.match.some((m) => tokenSet.has(normalizeText(m)))) {
        target.push(...rule.add);
      }
    }
  };

  hitRule(STYLE_RULES, style);
  hitRule(THEME_RULES, themes);
  hitRule(MOOD_RULES, mood);
  hitRule(COLOR_RULES, colors);

  // 슬롯 기반 보정
  if (slotName === "투구") themes.push("headwear");
  if (
    slotName === "장신구" ||
    slotName === "얼굴장식" ||
    slotName === "목/어깨장식"
  ) {
    themes.push("accessory");
  }
  if (slotName === "망토") themes.push("outerwear");
  if (slotName === "신발") themes.push("footwear");
  if (slotName === "무기") themes.push("weapon-prop");
  if (slotName === "갑옷" || slotName === "세트옷") themes.push("bodywear");

  return {
    style: unique(style),
    themes: unique(themes),
    mood: unique(mood),
    colors: unique(colors),
  };
}

function computeConfidence(
  meta: Pick<Meta, "style" | "themes" | "mood" | "colors">,
) {
  const score =
    meta.style.length * 0.25 +
    meta.themes.length * 0.2 +
    meta.mood.length * 0.15 +
    meta.colors.length * 0.1;

  return Math.max(0.35, Math.min(0.9, Number(score.toFixed(2))));
}

function enrichItem(item: TaggedItem): TaggedItem {
  const original = item.meta;
  const tokens = splitKeywords(item.ItemName);

  const ruleMeta = applyRules(tokens, item.SlotName);

  const mergedKeywords = unique([...(original.keywords ?? []), ...tokens]);

  const style = unique([...(original.style ?? []), ...ruleMeta.style]);
  const themes = unique([...(original.themes ?? []), ...ruleMeta.themes]);
  const mood = unique([...(original.mood ?? []), ...ruleMeta.mood]);
  const colors = unique([...(original.colors ?? []), ...ruleMeta.colors]);

  const nextMeta: Meta = {
    style,
    themes,
    mood,
    colors,
    keywords: mergedKeywords,
    isRental: original.isRental ?? item.ItemName.includes("[대여]"),
    confidence: computeConfidence({ style, themes, mood, colors }),
  };

  return {
    ...item,
    meta: nextMeta,
  };
}

function main() {
  const raw = fs.readFileSync(INPUT, "utf-8");
  const parsed = JSON.parse(raw) as TaggedJson;

  let repairedCount = 0;

  const repaired = parsed.itemData.map((item) => {
    if (hasMeaningfulMeta(item.meta)) {
      return item;
    }

    const next = enrichItem(item);

    const changed =
      next.meta.style.length > 0 ||
      next.meta.themes.length > 0 ||
      next.meta.mood.length > 0 ||
      next.meta.colors.length > 0;

    if (changed) repairedCount += 1;

    return next;
  });

  fs.writeFileSync(
    OUTPUT,
    JSON.stringify({ itemData: repaired }, null, 2),
    "utf-8",
  );

  console.log(`done: ${OUTPUT}`);
  console.log(`repaired items: ${repairedCount}/${parsed.itemData.length}`);
}

main();

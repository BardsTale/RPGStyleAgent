import fs from "node:fs";
import path from "node:path";

type Item = {
  ItemSeq: number;
  EquipType: string;
  ItemName: string;
  ItemType: number;
  EquipSlot: number;
  UseSex: number; // 0 남, 1 여, 2 공용
  IsHot: boolean;
  IsNew: boolean;
  IsUse: boolean;
  SlotName: string;
  SearchSlot: number;
};

type Meta = {
  style: string[];
  themes: string[];
  mood: string[];
  colors: string[];
  keywords: string[];
  isRental: boolean;
  confidence: number; // 0~1
};

type TaggedItem = Item & { meta: Meta };

const INPUT = path.resolve(process.cwd(), "itemData.json");
const OUT = path.resolve(process.cwd(), "itemData.tagged.json");
const CACHE = path.resolve(process.cwd(), "itemData.tagged.cache.json");

// ---------- 1) 룰 기반 태깅 ----------
function ruleTag(item: Item): Partial<Meta> {
  const name = item.ItemName;
  const lower = name.toLowerCase();

  const style = new Set<string>();
  const themes = new Set<string>();
  const mood = new Set<string>();
  const colors = new Set<string>();
  const keywords = new Set<string>();

  const isRental = name.startsWith("[대여]");

  // 키워드 토큰(단순 분해; 필요하면 더 고도화)
  // 한글/영문/숫자 덩어리 추출
  const tokens = name.match(/[A-Za-z]+|\d+|[가-힣]+/g) ?? [];
  tokens.forEach((t) => keywords.add(t));

  // 확실한 룰들
  if (name.includes("교복")) {
    style.add("modern");
    themes.add("school");
    themes.add("uniform");
  }

  if (name.includes("왕실") || name.includes("공주") || name.includes("왕자")) {
    style.add("fantasy");
    themes.add("royal");
    mood.add("formal");
  }

  if (name.includes("도깨비") || name.includes("귀신")) {
    style.add("fantasy");
    themes.add("yokai");
    mood.add("dark");
  }

  if (name.includes("펭귄") || name.includes("참새")) {
    themes.add("animal");
    mood.add("playful");
    style.add("cute");
  }

  if (name.includes("서커스")) {
    themes.add("circus");
    mood.add("flashy");
  }

  // 색상 룰(이름에 컬러 단어가 직접 있을 때만)
  if (name.includes("그린") || lower.includes("green")) colors.add("green");
  if (name.includes("블랙") || lower.includes("black")) colors.add("black");
  if (name.includes("화이트") || lower.includes("white")) colors.add("white");
  if (name.includes("레드") || lower.includes("red")) colors.add("red");
  if (name.includes("블루") || lower.includes("blue")) colors.add("blue");

  // confidence는 룰 매칭 개수 기반으로 대충(나중에 조정)
  const hit =
    style.size + themes.size + mood.size + colors.size > 0 ? 0.75 : 0.0;

  return {
    style: [...style],
    themes: [...themes],
    mood: [...mood],
    colors: [...colors],
    keywords: [...keywords],
    isRental,
    confidence: hit,
  };
}

// ---------- 2) Ollama 호출 ----------
async function ollamaGenerate(
  prompt: string,
  model = "mistral",
): Promise<string> {
  const res = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0.1 },
    }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { response: string };
  return data.response;
}

function extractFirstJson(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  const jsonText = text.slice(start, end + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

// 룰로 충분히 태깅 안 되는 경우만 LLM 보정
function needsLLM(rule: Partial<Meta>) {
  const score = rule.confidence ?? 0;
  return score < 0.75; // 기준은 취향대로
}

async function llmTag(item: Item, rule: Partial<Meta>): Promise<Partial<Meta>> {
  const basePrompt = `
너는 게임 아바타 아이템 메타데이터 태깅기다.
아래 입력을 근거로만 추정해서 **JSON만** 출력해라.
규칙:
- 반드시 유효한 JSON만 출력 (설명/마크다운/코드펜스 금지)
- 모든 key는 큰따옴표로 감싸라
- 근거가 없으면 빈 배열 []
- confidence는 0~1 숫자
- 출력은 아래 스키마와 동일한 key만 사용

입력:
${JSON.stringify(
  {
    ItemName: item.ItemName,
    EquipType: item.EquipType,
    SlotName: item.SlotName,
    UseSex: item.UseSex,
    ruleHint: rule,
  },
  null,
  2,
)}

출력 스키마(그대로):
{"style":[],"themes":[],"mood":[],"colors":[],"keywords":[],"confidence":0}
`.trim();

  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await ollamaGenerate(basePrompt, "mistral");
    const json = extractFirstJson(raw);

    if (json && typeof json === "object") {
      const anyJson: any = json;
      return {
        style: Array.isArray(anyJson.style) ? anyJson.style : [],
        themes: Array.isArray(anyJson.themes) ? anyJson.themes : [],
        mood: Array.isArray(anyJson.mood) ? anyJson.mood : [],
        colors: Array.isArray(anyJson.colors) ? anyJson.colors : [],
        keywords: Array.isArray(anyJson.keywords) ? anyJson.keywords : [],
        confidence:
          typeof anyJson.confidence === "number" ? anyJson.confidence : 0,
      };
    }

    // 재시도 시 조금 더 강하게
    // (같은 프롬프트로도 재시도하면 대부분 해결됨)
  }

  // 여기까지 오면 LLM 결과가 계속 깨짐 → 안전하게 룰만 사용
  return { confidence: 0 };
}

// ---------- 3) 병합 ----------
function mergeMeta(rule: Partial<Meta>, llm: Partial<Meta>): Meta {
  const mergeArr = (a?: string[], b?: string[]) =>
    Array.from(new Set([...(a ?? []), ...(b ?? [])]));

  return {
    style: mergeArr(rule.style, llm.style),
    themes: mergeArr(rule.themes, llm.themes),
    mood: mergeArr(rule.mood, llm.mood),
    colors: mergeArr(rule.colors, llm.colors),
    keywords: mergeArr(rule.keywords, llm.keywords),
    isRental: rule.isRental ?? false,
    confidence: Math.max(rule.confidence ?? 0, llm.confidence ?? 0),
  };
}

// ---------- 4) 실행(캐시/재개 가능) ----------
function loadCache(): Record<string, Meta> {
  if (!fs.existsSync(CACHE)) return {};
  return JSON.parse(fs.readFileSync(CACHE, "utf-8"));
}
function saveCache(cache: Record<string, Meta>) {
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2), "utf-8");
}

async function main() {
  const raw = fs.readFileSync(INPUT, "utf-8");
  const parsed = JSON.parse(raw);

  // 파일이 { itemData: [...] } 형태라고 가정
  const items: Item[] = Array.isArray(parsed.itemData)
    ? parsed.itemData
    : parsed;

  const cache = loadCache();

  const tagged: TaggedItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Item;
    const key = `${item.SlotName}|${item.EquipType}|${item.UseSex}|${item.ItemName}`;

    try {
      if (cache[key]) {
        tagged.push({ ...item, meta: cache[key] });
        continue;
      }

      const rule = ruleTag(item);
      let llm: Partial<Meta> = {};
      if (needsLLM(rule)) {
        llm = await llmTag(item, rule);
      }

      const meta = mergeMeta(rule, llm);
      cache[key] = meta;
      tagged.push({ ...item, meta });
    } catch (e: any) {
      // 실패한 건 룰만이라도 저장하고 계속 진행
      const fallbackRule = ruleTag(item);
      const meta = mergeMeta(fallbackRule, {});
      cache[key] = meta;
      tagged.push({ ...item, meta });

      console.warn(`tagging failed at ${i}/${items.length}: ${item.ItemName}`);
      console.warn(e?.message ?? e);
    }

    if (i % 50 === 0) {
      saveCache(cache);
      console.log(`progress: ${i}/${items.length}`);
    }
  }

  saveCache(cache);
  fs.writeFileSync(OUT, JSON.stringify({ itemData: tagged }, null, 2), "utf-8");
  console.log(`done: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

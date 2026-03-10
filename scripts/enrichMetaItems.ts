import fs from "node:fs";
import fetch from "node-fetch";

const INPUT = "./itemData.tagged.repaired.json";
const OUTPUT = "./itemData.tagged.enriched.json";

const MODEL = "qwen2.5:7b"; // 추천

type Item = {
  ItemName: string;
  SlotName: string;
  meta: {
    style: string[];
    themes: string[];
    mood: string[];
    colors: string[];
    keywords: string[];
    isRental: boolean;
    confidence: number;
  };
};

function needsRetag(meta: Item["meta"]) {
  const metaScore =
    meta.style.length +
    meta.themes.length +
    meta.mood.length +
    meta.colors.length;

  return metaScore <= 1;
}

async function llmTag(item: Item) {
  const prompt = `
게임 아바타 아이템 이름을 보고 메타데이터를 생성해라.

아이템 이름: ${item.ItemName}
슬롯: ${item.SlotName}

출력 형식(JSON만 출력):

{
 "style": [],
 "themes": [],
 "mood": [],
 "colors": []
}

style 예시:
wuxia, modern, fantasy, cute, sci-fi

themes 예시:
animal, martial, uniform, royal, yokai, headwear, accessory

mood 예시:
playful, elegant, dark, cool, formal

colors 예시:
black, white, red, blue, gold, silver
`;

  const res = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      temperature: 0,
    }),
  });

  const data: any = await res.json();

  const text = data.response;

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function main() {
  const raw = fs.readFileSync(INPUT, "utf-8");
  const json = JSON.parse(raw);

  const items: Item[] = json.itemData;

  let processed = 0;

  for (const item of items) {
    if (!needsRetag(item.meta)) continue;

    const result = await llmTag(item);

    if (!result) continue;

    item.meta.style = result.style ?? [];
    item.meta.themes = result.themes ?? [];
    item.meta.mood = result.mood ?? [];
    item.meta.colors = result.colors ?? [];

    item.meta.confidence = 0.8;

    processed++;

    if (processed % 20 === 0) {
      console.log("processed:", processed);
    }
  }

  fs.writeFileSync(
    OUTPUT,
    JSON.stringify({ itemData: items }, null, 2),
    "utf-8",
  );

  console.log("done");
}

main();

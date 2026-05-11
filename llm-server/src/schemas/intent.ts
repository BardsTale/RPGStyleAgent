import { z } from "zod";

const SlotsSchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value;

  // 만에 하나라도 LLM이 객체로 줬을 경우 배열로 치환
  if (value && typeof value === "object") {
    return Object.keys(value);
  }

  return value;
}, z.array(z.string()).min(1));

export const IntentSpecSchema = z.object({
  slots: SlotsSchema,
  gender: z.enum(["male", "female"]).nullable().default(null),
  style: z.array(z.string()).default([]),
  vibe: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  materials: z.array(z.string()).default([]),
  constraints: z
    .object({
      must_include: z.array(z.string()).default([]),
      avoid: z.array(z.string()).default([]),
      season: z.string().optional(),
    })
    .default({ must_include: [], avoid: [] }),
});

export type IntentSpec = z.infer<typeof IntentSpecSchema>;

import { z } from "zod";

export const IntentSpecSchema = z.object({
  slots: z.array(z.string()).min(1),
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

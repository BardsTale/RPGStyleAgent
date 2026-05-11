import { Router } from "express";
import { generateCandidates } from "../services/recommend/candidates.js";
import { generateOutfitPlan } from "../services/recommend/outfit.js";
import { generateIntent } from "../services/recommend/intent.js";

export const recommendRouter = Router();

async function runRecommendPipeline(text: string) {
  const intent = (await generateIntent(text)).intent;
  const candidates = generateCandidates(intent, 8);
  const outfit = await generateOutfitPlan({ intent, candidates });

  return outfit;
}

recommendRouter.post("/", async (req, res) => {
  const result = await runRecommendPipeline(req.body.text);
  return res.json(result);
});

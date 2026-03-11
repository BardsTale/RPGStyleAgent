import { Router } from "express";
import { generateOutfitPlan } from "../services/recommend/outfit.js";

export const outfitRouter = Router();

outfitRouter.post("/", async (req, res) => {
  try {
    const { intent, candidates } = req.body ?? {};

    if (!intent || typeof intent !== "object") {
      return res.status(400).json({ error: "intent는 필수 객체입니다." });
    }

    if (!candidates || typeof candidates !== "object") {
      return res.status(400).json({ error: "candidates는 필수 객체입니다." });
    }

    const result = await generateOutfitPlan({ intent, candidates });
    return res.json(result);
  } catch (error: any) {
    console.error("[POST /outfit] error", error);
    return res.status(500).json({
      error: error?.message || "outfit generation failed",
    });
  }
});

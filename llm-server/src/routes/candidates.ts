import { Router } from "express";
import { generateCandidates } from "../services/recommend/candidates.js";

export const candidateRouter = Router();

candidateRouter.post("/", async (req, res) => {
  try {
    const { intent } = req.body ?? {};

    if (!intent || typeof intent !== "object") {
      return res.status(400).json({ error: "intent는 필수 객체입니다." });
    }

    const result = await generateCandidates(intent);
    return res.json(result);
  } catch (error: any) {
    console.error("[POST /candidates] error", error);
    return res.status(500).json({
      error: error?.message || "candidate generation failed",
    });
  }
});

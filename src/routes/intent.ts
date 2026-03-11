import { Router } from "express";
import { generateIntent } from "../services/recommend/intent.js";

export const intentRouter = Router();

intentRouter.post("/", async (req, res) => {
  try {
    const { message } = req.body ?? {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message는 필수 문자열입니다." });
    }

    const result = await generateIntent(message);
    return res.json(result);
  } catch (error: any) {
    console.error("[POST /intent] error", error);
    return res.status(500).json({
      error: error?.message || "intent generation failed",
    });
  }
});

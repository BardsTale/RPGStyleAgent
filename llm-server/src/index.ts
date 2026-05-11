import express from "express";
import cors from "cors";
import { recommendRouter } from "./routes/recommend.js";
import { intentRouter } from "./routes/intent.js";
import { candidateRouter } from "./routes/candidates.js";
import { outfitRouter } from "./routes/outfit.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_, res) => res.json({ ok: true }));

// 모듈 파이프라인 라우터
app.use("/recommend", recommendRouter);

// 개별 모듈 테스트용 라우터
app.use("/intent", intentRouter);
app.use("/candidates", candidateRouter);
app.use("/outfit", outfitRouter);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`BFF listening on http://localhost:${port}`);
});

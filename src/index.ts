import express from "express";
import cors from "cors";
import { recommendRouter } from "./routes/recommend.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/recommend", recommendRouter);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`BFF listening on http://localhost:${port}`);
});

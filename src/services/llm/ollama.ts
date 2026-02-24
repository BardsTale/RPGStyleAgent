import type { RequestInit } from "node-fetch";

type OllamaGenerateResponse = {
  response: string;
};

export async function ollamaGenerate(params: {
  prompt: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const { prompt, model = "mistral", temperature = 0.2 } = params;

  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature },
    }),
  } satisfies RequestInit);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama error: ${res.status} ${res.statusText} ${text}`);
  }

  const data = (await res.json()) as OllamaGenerateResponse;
  return data.response;
}

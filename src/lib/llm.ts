import type { LLMProvider } from "@/types/database"

export type LLMCallOptions = {
  provider: LLMProvider
  model: string
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}

export type LLMCallResult = {
  text: string
  latencyMs: number
}

export async function callLLM(options: LLMCallOptions): Promise<LLMCallResult> {
  const {
    provider,
    model,
    systemPrompt,
    userPrompt,
    temperature = 0.7,
    maxTokens = 500,
  } = options

  const start = Date.now()

  if (provider === "anthropic") {
    const text = await callAnthropic(model, systemPrompt, userPrompt, temperature, maxTokens)
    return { text, latencyMs: Date.now() - start }
  }

  const text = await callOpenAI(model, systemPrompt, userPrompt, temperature, maxTokens)
  return { text, latencyMs: Date.now() - start }
}

async function callOpenAI(
  model: string,
  system: string,
  user: string,
  temperature: number,
  maxTokens: number,
): Promise<string> {
  const { default: OpenAI } = await import("openai")
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature,
    max_tokens: maxTokens,
  })

  return response.choices[0]?.message?.content ?? ""
}

async function callAnthropic(
  model: string,
  system: string,
  user: string,
  temperature: number,
  maxTokens: number,
): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk")
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  })

  const block = response.content[0]
  return block.type === "text" ? block.text : ""
}

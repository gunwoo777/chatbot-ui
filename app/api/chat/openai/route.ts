import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    if (!profile) {
      throw new Error("User profile not found")
    }

    if (!profile.openai_api_key) {
      throw new Error("OpenAI API key not configured")
    }

    checkApiKey(profile.openai_api_key, "OpenAI")

    const openai = new OpenAI({
      apiKey: profile.openai_api_key,
      organization: profile.openai_organization_id
    })

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages as ChatCompletionCreateParamsBase["messages"],
      temperature: chatSettings?.temperature ?? 0.7,
      max_tokens: 4096,
      stream: true,
    })

    const stream = OpenAIStream(response)
    return new StreamingTextResponse(stream)

  } catch (error: any) {
    let errorMessage = error.message || "An error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage = "OpenAI API key not configured in profile settings"
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage = "Invalid OpenAI API key in profile settings"
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}

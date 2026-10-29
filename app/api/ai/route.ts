import { NextRequest, NextResponse } from 'next/server'
import {
  AVAILABLE_MODELS,
  DEFAULT_TEXT_MODEL,
  DEFAULT_VISION_MODEL,
  isVisionCapableModel,
  resolveModelId,
} from '@/lib/ai-models'

const AI_BASE_URL = process.env.AI_BASE_URL || 'https://genailab.tcs.in'
const AI_API_KEY = process.env.AI_API_KEY || 'sk-8arXBbsPa-sroHLpc1HJcA'
const AI_MODEL = process.env.AI_MODEL || DEFAULT_TEXT_MODEL
const AI_VISION_MODEL = process.env.AI_VISION_MODEL || DEFAULT_VISION_MODEL

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const prompt =
      body?.prompt ||
      `You are a support triage AI assistant. Analyze the ticket and return: 1) summary, 2) likely root cause, 3) recommended next steps.`

    const imageData = body?.imageData
    const imageName = body?.imageName
    const mode = body?.mode || 'general'
    const context = body?.context || ''
    const requestedModel = typeof body?.model === 'string' ? body.model : undefined
    const requestedVisionModel = typeof body?.visionModel === 'string' ? body.visionModel : undefined

    const hasImage = Boolean(imageData)
    const selectedModel = resolveModelId(
      hasImage ? requestedVisionModel || requestedModel || AI_VISION_MODEL : requestedModel || AI_MODEL,
      hasImage,
    )

    if (hasImage && !isVisionCapableModel(selectedModel)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'The selected model cannot read image attachments. Choose a vision-capable model such as Gemini 2.5 Flash or GPT-4o from the selector, or describe the screenshot manually.',
        },
        { status: 400 },
      )
    }

    if (!AVAILABLE_MODELS.some((model) => model.id === selectedModel)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unsupported model: ${selectedModel}`,
        },
        { status: 400 },
      )
    }

    const messages = [
      {
        role: 'system' as const,
        content:
          mode === 'ticket-analysis'
            ? `You are an expert IT support triage AI. Analyze tickets, identify likely root causes, and summarize actions. When an image is provided, inspect it for UI errors, logs, stack traces, screenshots, or browser issues and explain them. Return a concise but useful answer with: summary, likely root cause, recommended next steps, and confidence.`
            : 'You are a helpful AI assistant for support operations. Respond clearly and concisely.',
      },
      {
        role: 'user' as const,
        content: [
          {
            type: 'text',
            text: `${context ? `Context:\n${context}\n\n` : ''}${prompt}`,
          },
          ...(hasImage
            ? [
                {
                  type: 'image_url',
                  image_url: {
                    url: imageData,
                    detail: 'high',
                  },
                },
              ]
            : []),
        ],
      },
    ]

    const aiResponse = await fetch(`${AI_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: 0.4,
      }),
    })

    const rawText = await aiResponse.text()

    if (!aiResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: rawText || 'The AI service returned an error.',
        },
        { status: 502 },
      )
    }

    let parsed: any
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid response from the AI service.' }, { status: 500 })
    }

    const answer = parsed?.choices?.[0]?.message?.content || parsed?.answer || ''

    return NextResponse.json({
      ok: true,
      answer,
      model: selectedModel,
      imageName,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected AI error.',
      },
      { status: 500 },
    )
  }
}

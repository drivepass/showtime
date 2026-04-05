import { fal } from "@fal-ai/client";
import axios from "axios";

// The @fal-ai/client SDK automatically reads FAL_KEY from process.env.FAL_KEY
// No fal.config() call needed - it is auto-detected per the official docs

const TEXT_KEYWORDS = [
  "price", "offer", "sale", "discount", "finance", "from $", "from £",
  "0%", "%", "aed", "sar", "gbp", "usd", "qar", "bhd", "kwd",
  "test drive", "call now", "visit us", "book now", "contact us",
  "limited time", "available now", "starting from", "get yours",
  "text that says", "with the words", "showing", "headline", "title",
  "the words", "caption", "label", "badge",
  '"', "'",
  "عرض", "سعر", "خصم", "تجربة قيادة", "اتصل", "درهم", "ريال", "تمويل",
  "من", "احصل", "الآن", "محدود",
];

export function requiresTextRendering(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return TEXT_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

// Use fal.config per-call so it always picks up the latest FAL_KEY value
function ensureFalConfig() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY environment variable is not set");
  fal.config({ credentials: key });
}

async function generateWithFluxPro(prompt: string) {
  ensureFalConfig();
  // fal.subscribe returns { data, requestId }
  const result = await fal.subscribe("fal-ai/flux-pro", {
    input: {
      prompt,
      image_size: "landscape_16_9",
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      safety_tolerance: "2",
    },
  }) as any;
  const url = result.data?.images?.[0]?.url;
  if (!url) throw new Error("No image returned from FLUX Pro");
  return { mediaUrl: url as string, model: "flux-pro", type: "image" };
}

async function generateDraftWithFluxSchnell(prompt: string) {
  ensureFalConfig();
  const result = await fal.subscribe("fal-ai/flux/schnell", {
    input: {
      prompt,
      image_size: "landscape_16_9",
      num_images: 1,
    },
  }) as any;
  const url = result.data?.images?.[0]?.url;
  if (!url) throw new Error("No image returned from FLUX Schnell");
  return { mediaUrl: url as string, model: "flux-schnell", type: "image", isDraft: true };
}

const IDEOGRAM_ASPECT_MAP: Record<string, string> = {
  "16:9":  "ASPECT_16_9",
  "9:16":  "ASPECT_9_16",
  "4:3":   "ASPECT_4_3",
  "3:4":   "ASPECT_3_4",
  "1:1":   "ASPECT_1_1",
  "2:3":   "ASPECT_2_3",
  "3:2":   "ASPECT_3_2",
  "landscape": "ASPECT_16_9",
  "portrait":  "ASPECT_9_16",
};

async function generateWithIdeogram(prompt: string, aspectRatio: string = "ASPECT_16_9") {
  if (!process.env.IDEOGRAM_API_KEY) throw new Error("IDEOGRAM_API_KEY is not configured");
  const ideogramAspect = IDEOGRAM_ASPECT_MAP[aspectRatio] || IDEOGRAM_ASPECT_MAP[aspectRatio.toLowerCase()] || aspectRatio;
  const response = await axios.post(
    "https://api.ideogram.ai/generate",
    {
      image_request: {
        prompt,
        aspect_ratio: ideogramAspect,
        model: "V_2_TURBO",
        magic_prompt_option: "AUTO",
      },
    },
    {
      headers: {
        "Api-Key": process.env.IDEOGRAM_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );
  return {
    mediaUrl: response.data.data[0].url as string,
    model: "ideogram-v2-turbo",
    type: "image",
  };
}

async function submitKlingQueue(prompt: string, referenceImageUrl: string | null = null) {
  ensureFalConfig();
  const endpoint = referenceImageUrl
    ? "fal-ai/kling-video/v1.6/pro/image-to-video"
    : "fal-ai/kling-video/v1.6/pro/text-to-video";
  const input: any = referenceImageUrl
    ? { prompt, image_url: referenceImageUrl, duration: "5", aspect_ratio: "16:9" }
    : { prompt, duration: "5", aspect_ratio: "16:9" };

  // fal.queue.submit returns { request_id, response_url, status_url, cancel_url }
  const submitted = await fal.queue.submit(endpoint, { input }) as any;
  return {
    requestId: submitted.request_id as string,
    model: "kling-v1.6-pro",
    type: "video",
    status: "processing",
  };
}

async function submitMiniMaxQueue(prompt: string) {
  ensureFalConfig();
  const submitted = await fal.queue.submit("fal-ai/minimax/video-01", {
    input: { prompt },
  }) as any;
  return {
    requestId: submitted.request_id as string,
    model: "minimax-video-01",
    type: "video",
    status: "processing",
  };
}

export async function pollVideoResult(requestId: string, model: string) {
  ensureFalConfig();
  const endpoint =
    model === "kling-v1.6-pro"
      ? "fal-ai/kling-video/v1.6/pro/text-to-video"
      : "fal-ai/minimax/video-01";

  // fal.queue.status returns { status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" }
  const status = await fal.queue.status(endpoint, { requestId, logs: false }) as any;

  if (status.status === "COMPLETED") {
    const result = await fal.queue.result(endpoint, { requestId }) as any;
    const videoUrl = result.data?.video?.url || result.data?.video_url;
    return { status: "completed", mediaUrl: videoUrl as string, model, type: "video" };
  }
  if (status.status === "FAILED") {
    return { status: "failed", error: "Video generation failed" };
  }
  return { status: "processing" };
}

export async function generateCreative(
  prompt: string,
  outputType: string = "image",
  referenceImageUrl: string | null = null,
  aspectRatio: string = "16:9"
) {
  switch (outputType) {
    case "image_draft":
      // Try FLUX Schnell (fast draft), fall back to Ideogram if FAL balance exhausted
      if (process.env.FAL_KEY) {
        try {
          console.log("[AI Studio] → FLUX Schnell (draft)");
          return await generateDraftWithFluxSchnell(prompt);
        } catch (e: any) {
          const detail = e?.body?.detail || e?.message || "";
          if (detail.toLowerCase().includes("balance") || detail.toLowerCase().includes("locked") || detail.toLowerCase().includes("forbidden")) {
            console.log("[AI Studio] FLUX Schnell failed (balance), falling back to Ideogram draft");
          } else {
            throw e;
          }
        }
      }
      console.log("[AI Studio] → Ideogram (draft fallback)");
      return { ...await generateWithIdeogram(prompt, aspectRatio), isDraft: true };

    case "image":
      // Always try Ideogram first if key is present (reliable for both text and visual)
      if (process.env.IDEOGRAM_API_KEY) {
        console.log("[AI Studio] → Ideogram V2 Turbo");
        return await generateWithIdeogram(prompt, aspectRatio);
      }
      if (requiresTextRendering(prompt)) {
        throw new Error("IDEOGRAM_API_KEY is not configured. Required for prompts containing text.");
      }
      console.log("[AI Studio] → FLUX.1 Pro (pure visual)");
      return await generateWithFluxPro(prompt);

    case "video":
      if (process.env.FAL_KEY) {
        try {
          console.log("[AI Studio] → Kling text-to-video");
          return await submitKlingQueue(prompt, referenceImageUrl);
        } catch (e: any) {
          const detail = e?.body?.detail || e?.message || "";
          const isBalance = e?.status === 403 || detail.toLowerCase().includes("balance") || detail.toLowerCase().includes("locked") || detail.toLowerCase().includes("forbidden") || detail.toLowerCase().includes("exhausted");
          if (!isBalance) throw e;
          console.log("[AI Studio] Kling failed (balance exhausted), falling back to Ideogram image");
        }
      } else {
        console.log("[AI Studio] FAL_KEY not set, falling back to Ideogram image");
      }
      if (process.env.IDEOGRAM_API_KEY) {
        const imgResult = await generateWithIdeogram(prompt);
        return { ...imgResult, fallbackNote: "Video unavailable (fal.ai balance exhausted) — generated high-quality image instead. Top up at fal.ai/dashboard/billing." };
      }
      throw new Error("Video generation requires fal.ai credits. Top up at fal.ai/dashboard/billing.");

    case "video_quick":
      if (process.env.FAL_KEY) {
        try {
          console.log("[AI Studio] → MiniMax Quick Video");
          return await submitMiniMaxQueue(prompt);
        } catch (e: any) {
          const detail = e?.body?.detail || e?.message || "";
          const isBalance = e?.status === 403 || detail.toLowerCase().includes("balance") || detail.toLowerCase().includes("locked") || detail.toLowerCase().includes("forbidden") || detail.toLowerCase().includes("exhausted");
          if (!isBalance) throw e;
          console.log("[AI Studio] MiniMax failed (balance exhausted), falling back to Ideogram image");
        }
      } else {
        console.log("[AI Studio] FAL_KEY not set, falling back to Ideogram image");
      }
      if (process.env.IDEOGRAM_API_KEY) {
        const imgResult = await generateWithIdeogram(prompt);
        return { ...imgResult, fallbackNote: "Video unavailable (fal.ai balance exhausted) — generated high-quality image instead. Top up at fal.ai/dashboard/billing." };
      }
      throw new Error("Video generation requires fal.ai credits. Top up at fal.ai/dashboard/billing.");

    default:
      throw new Error(`Unknown output_type: ${outputType}`);
  }
}

export interface AiGeneration {
  id: string;
  prompt: string;
  mediaUrl: string | null;
  model: string;
  outputType: string;
  isDraft: boolean;
  createdAt: string;
  requestId?: string;
  status?: string;
  fallbackNote?: string;
}

const generationHistory: AiGeneration[] = [];

export function addGeneration(gen: Omit<AiGeneration, "id" | "createdAt">): AiGeneration {
  const entry: AiGeneration = {
    ...gen,
    id: Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
  };
  generationHistory.unshift(entry);
  if (generationHistory.length > 50) generationHistory.pop();
  return entry;
}

export function updateGeneration(id: string, updates: Partial<AiGeneration>) {
  const idx = generationHistory.findIndex(g => g.id === id);
  if (idx !== -1) Object.assign(generationHistory[idx], updates);
}

export function getHistory(): AiGeneration[] {
  return generationHistory.slice(0, 20);
}

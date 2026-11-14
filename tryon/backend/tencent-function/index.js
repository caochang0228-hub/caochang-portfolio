"use strict";

const API_BASE = "https://api.fashn.ai/v1";
const API_KEY = process.env.FASHN_API_KEY || "";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://u2zqev.com.cn,https://www.u2zqev.com.cn")
  .split(",").map(item => item.trim()).filter(Boolean);

function cors(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };
}

function reply(statusCode, payload, origin) {
  return { statusCode, headers: cors(origin), body: JSON.stringify(payload) };
}

function validateDataUrl(value, label) {
  const match = /^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value || "");
  if (!match) throw new Error(`${label}_INVALID`);
  const bytes = Buffer.byteLength(match[1], "base64");
  if (bytes < 10 * 1024 || bytes > 5.5 * 1024 * 1024) throw new Error(`${label}_SIZE_INVALID`);
  return value;
}

function pathOf(event) {
  return event.rawPath || event.path || event.requestContext?.http?.path || "/";
}

function bodyOf(event) {
  if (!event.body) return {};
  const text = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return typeof text === "string" ? JSON.parse(text) : text;
}

async function fashn(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error?.message || data.message || `FASHN_HTTP_${response.status}`);
      error.code = data.error?.name || data.code || `FASHN_HTTP_${response.status}`;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function categoryOf(type) {
  return {
    "Upper-body": "tops",
    "Lower-body": "bottoms",
    "Dress": "one-pieces"
  }[type] || "auto";
}

async function generateTryOn(payload) {
  if (!API_KEY) throw new Error("FASHN_API_KEY_MISSING");
  if (payload.consent !== true) throw new Error("CONSENT_REQUIRED");
  const modelImage = validateDataUrl(payload.modelImage, "MODEL_IMAGE");
  const garmentImage = validateDataUrl(payload.clothesImage, "CLOTHES_IMAGE");

  const started = await fashn("/run", {
    method: "POST",
    body: JSON.stringify({
      model_name: "tryon-v1.6",
      inputs: {
        model_image: modelImage,
        garment_image: garmentImage,
        category: categoryOf(payload.clothesType),
        garment_photo_type: "auto",
        segmentation_free: true,
        moderation_level: "conservative",
        mode: "balanced",
        num_samples: 1,
        output_format: "jpeg",
        return_base64: true
      }
    })
  });

  if (!started.id) throw new Error("FASHN_JOB_NOT_CREATED");
  for (let attempt = 0; attempt < 35; attempt += 1) {
    await delay(attempt === 0 ? 1500 : 2500);
    const status = await fashn(`/status/${encodeURIComponent(started.id)}`, { method: "GET" });
    if (status.status === "completed") {
      const image = Array.isArray(status.output) ? status.output[0] : status.output;
      if (!image || !String(image).startsWith("data:image/")) throw new Error("FASHN_RESULT_INVALID");
      return { image, requestId: started.id, provider: "fashn-tryon-v1.6" };
    }
    if (!["starting", "in_queue", "processing"].includes(status.status)) {
      const error = new Error(status.error?.message || status.error || "FASHN_GENERATION_FAILED");
      error.code = status.error?.name || "FASHN_GENERATION_FAILED";
      throw error;
    }
  }
  throw new Error("FASHN_TIMEOUT");
}

exports.main_handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const method = event.requestContext?.http?.method || event.httpMethod || event.requestContext?.httpMethod || "GET";
  if (method === "OPTIONS") return reply(204, {}, origin);
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return reply(403, { code: "ORIGIN_DENIED", message: "来源域名未授权" }, origin);
  if (method === "GET" && pathOf(event).endsWith("/health")) {
    return reply(200, { ok: true, service: "tryon-fashn", storage: "none" }, origin);
  }
  if (method !== "POST" || !pathOf(event).endsWith("/tryon")) {
    return reply(404, { code: "NOT_FOUND", message: "接口不存在" }, origin);
  }
  try {
    return reply(200, await generateTryOn(bodyOf(event)), origin);
  } catch (error) {
    console.error("tryon_error", { message: error.message, code: error.code });
    const code = error.code || error.message || "GENERATION_FAILED";
    const safeMessages = {
      CONSENT_REQUIRED: "需要图片处理授权",
      MODEL_IMAGE_INVALID: "人物照片格式不正确",
      CLOTHES_IMAGE_INVALID: "商品图片格式不正确",
      MODEL_IMAGE_SIZE_INVALID: "人物照片大小不符合要求",
      CLOTHES_IMAGE_SIZE_INVALID: "商品图片大小不符合要求",
      FASHN_API_KEY_MISSING: "AI 服务密钥尚未配置",
      FASHN_TIMEOUT: "AI 生成超时，请稍后重试",
      PoseError: "未能识别人物姿势，请上传清晰正面全身照"
    };
    return reply(500, { code, message: safeMessages[code] || "AI 未完成本次生成，请稍后重试" }, origin);
  }
};

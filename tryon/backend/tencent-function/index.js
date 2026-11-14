"use strict";

const tencentcloud = require("tencentcloud-sdk-nodejs");
const COS = require("cos-nodejs-sdk-v5");

const REGION = process.env.TENCENT_REGION || "ap-guangzhou";
const BUCKET = process.env.COS_BUCKET || "";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://u2zqev.com.cn,https://www.u2zqev.com.cn")
  .split(",").map(item => item.trim()).filter(Boolean);

function credentials() {
  const secretId = process.env.TENCENTCLOUD_SECRETID || process.env.SECRET_ID;
  const secretKey = process.env.TENCENTCLOUD_SECRETKEY || process.env.SECRET_KEY;
  const token = process.env.TENCENTCLOUD_SESSIONTOKEN || process.env.TOKEN;
  if (!secretId || !secretKey) throw new Error("SCF_ROLE_CREDENTIALS_MISSING");
  return { secretId, secretKey, token };
}

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

function parseDataUrl(value, label) {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value || "");
  if (!match) throw new Error(`${label}_INVALID`);
  const body = Buffer.from(match[2], "base64");
  if (body.length < 10 * 1024 || body.length > 5.5 * 1024 * 1024) throw new Error(`${label}_SIZE_INVALID`);
  return { body, contentType: match[1].replace("image/jpg", "image/jpeg") };
}

function putObject(cos, key, image) {
  return new Promise((resolve, reject) => cos.putObject({
    Bucket: BUCKET,
    Region: REGION,
    Key: key,
    Body: image.body,
    ContentType: image.contentType,
    CacheControl: "no-store"
  }, (error, data) => error ? reject(error) : resolve(data)));
}

function signedUrl(cos, key) {
  return new Promise((resolve, reject) => cos.getObjectUrl({
    Bucket: BUCKET,
    Region: REGION,
    Key: key,
    Sign: true,
    Expires: 900
  }, (error, data) => error ? reject(error) : resolve(data.Url)));
}

function deleteObject(cos, key) {
  return new Promise(resolve => cos.deleteObject({ Bucket: BUCKET, Region: REGION, Key: key }, () => resolve()));
}

function pathOf(event) {
  return event.rawPath || event.path || event.requestContext?.http?.path || "/";
}

function bodyOf(event) {
  if (!event.body) return {};
  const text = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return typeof text === "string" ? JSON.parse(text) : text;
}

async function generateTryOn(payload) {
  if (!BUCKET) throw new Error("COS_BUCKET_MISSING");
  if (payload.consent !== true) throw new Error("CONSENT_REQUIRED");
  const model = parseDataUrl(payload.modelImage, "MODEL_IMAGE");
  const clothes = parseDataUrl(payload.clothesImage, "CLOTHES_IMAGE");
  const type = ["Upper-body", "Lower-body", "Dress"].includes(payload.clothesType) ? payload.clothesType : "Upper-body";
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const modelKey = `tryon-temp/${id}/model.jpg`;
  const clothesKey = `tryon-temp/${id}/clothes.jpg`;
  const credential = credentials();
  const cos = new COS({ SecretId: credential.secretId, SecretKey: credential.secretKey, SecurityToken: credential.token });
  try {
    await Promise.all([putObject(cos, modelKey, model), putObject(cos, clothesKey, clothes)]);
    const [modelUrl, clothesUrl] = await Promise.all([signedUrl(cos, modelKey), signedUrl(cos, clothesKey)]);
    const Client = tencentcloud.aiart.v20221229.Client;
    const client = new Client({
      credential,
      region: REGION,
      profile: { httpProfile: { endpoint: "aiart.tencentcloudapi.com", reqTimeout: 120 } }
    });
    const result = await client.ChangeClothes({
      ModelUrl: modelUrl,
      ClothesUrl: clothesUrl,
      ClothesType: type,
      LogoAdd: 1,
      RspImgType: "base64"
    });
    return {
      image: `data:image/jpeg;base64,${result.ResultImage}`,
      requestId: result.RequestId,
      provider: "tencent-aiart"
    };
  } finally {
    await Promise.all([deleteObject(cos, modelKey), deleteObject(cos, clothesKey)]);
  }
}

exports.main_handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const method = event.requestContext?.http?.method || event.httpMethod || event.requestContext?.httpMethod || "GET";
  if (method === "OPTIONS") return reply(204, {}, origin);
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return reply(403, { code: "ORIGIN_DENIED", message: "来源域名未授权" }, origin);
  if (method === "GET" && pathOf(event).endsWith("/health")) return reply(200, { ok: true, service: "tryon-tencent-aiart", region: REGION }, origin);
  if (method !== "POST" || !pathOf(event).endsWith("/tryon")) return reply(404, { code: "NOT_FOUND", message: "接口不存在" }, origin);
  try {
    const result = await generateTryOn(bodyOf(event));
    return reply(200, result, origin);
  } catch (error) {
    console.error("tryon_error", { message: error.message, code: error.code, requestId: error.requestId });
    const requestId = error.requestId || error.RequestId || error.requestId;
    const code = error.code || error.message || "GENERATION_FAILED";
    const safeMessages = {
      CONSENT_REQUIRED: "需要图片处理授权",
      MODEL_IMAGE_INVALID: "人物照片格式不正确",
      CLOTHES_IMAGE_INVALID: "商品图片格式不正确",
      MODEL_IMAGE_SIZE_INVALID: "人物照片大小不符合要求",
      CLOTHES_IMAGE_SIZE_INVALID: "商品图片大小不符合要求",
      COS_BUCKET_MISSING: "后端存储尚未配置",
      SCF_ROLE_CREDENTIALS_MISSING: "云函数角色权限尚未配置"
    };
    return reply(500, { code, message: safeMessages[code] || "腾讯云未完成本次生成，请稍后重试", requestId }, origin);
  }
};


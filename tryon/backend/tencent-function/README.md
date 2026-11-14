# TRY ON 无 COS 云函数

此函数接收前端压缩后的全身照与服装图，以 Base64 直接调用 FASHN Virtual Try-On v1.6，并把 Base64 结果返回给前端。它不创建 COS 对象，也不把照片写入本地文件。

## 环境变量

- `FASHN_API_KEY`：FASHN Developer API 密钥。
- `ALLOWED_ORIGINS`：逗号分隔，例如 `https://u2zqev.com.cn,https://www.u2zqev.com.cn`。

不要把 API key 写入 GitHub 仓库或前端代码。应把密钥配置在云函数或其他 Serverless 平台的加密环境变量中。

## 路由

- `GET /health`：健康检查。
- `POST /tryon`：真实 AI 换装。

发布函数 URL 后，将前端 `config.js` 中的 `apiBase` 修改为公开 HTTPS 地址，并为接口设置 CORS、单 IP 限流和费用告警。

## 隐私说明

- 人物照和服装图以 Base64 发送，不会上传到 COS。
- FASHN 文档说明：Base64 输入仅用于当次处理，任务完成后删除临时处理副本，并设置最长一天的自动清理兜底。
- `return_base64: true` 时，输出仅在状态接口保留 60 分钟。

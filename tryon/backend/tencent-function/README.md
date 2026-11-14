# TRY ON 腾讯云函数

此函数接收前端压缩后的全身照与服装图，临时上传到私有 COS，调用腾讯云 `ChangeClothes`，返回带有“图片由 AI 生成”标识的 Base64 结果，并在请求结束后删除两张临时源图。

## 环境变量

- `TENCENT_REGION`：例如 `ap-guangzhou`
- `COS_BUCKET`：已创建的私有 COS Bucket 完整名称
- `ALLOWED_ORIGINS`：逗号分隔，例如 `https://u2zqev.com.cn,https://www.u2zqev.com.cn`

不要把永久 SecretId 或 SecretKey 写入代码。云函数应绑定具备最小权限的运行角色，授权临时 COS 对象读写、删除及 `aiart:ChangeClothes`。

## 路由

- `GET /health`：健康检查
- `POST /tryon`：真实 AI 换装

发布函数 URL 后，将 `tryon/config.js` 中的 `apiBase` 修改为函数公开 HTTPS 地址，并在网关设置 CORS、单 IP 限流和费用告警。

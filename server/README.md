# 图片识别服务

`server/index.js` 是供小程序图片识别页调用的 Node.js 服务，提供 `GET /health` 和 `POST /pet-recognize`。支持火山方舟和 DashScope 的视觉模型接口；上传图片时使用 multipart 字段 `file`，也支持 JSON 中的 `imageBase64`。

## 启动后端

在 `server/` 目录中安装依赖，并将 `.env.example` 复制为 `.env`：

```sh
cd server
npm ci
cp .env.example .env
```

Windows PowerShell 下将最后一行改为 `Copy-Item .env.example .env`。按实际使用的服务商填写配置：

| 服务商 | 必填环境变量 | 可调整配置 |
| --- | --- | --- |
| 火山方舟 | `MODEL_PROVIDER=ark`、`ARK_API_KEY` | `ARK_BASE_URL`、`ARK_MODEL` |
| DashScope | `MODEL_PROVIDER=qwen`、`QWEN_API_KEY` | `QWEN_BASE_URL`、`QWEN_MODEL` |

示例文件里的模型名称是开发时配置，运行前需确认自己的账号可以调用。端口默认 `3007`，可通过 `PORT` 调整。填好后启动：

```sh
npm start
```

访问 `http://localhost:3007/health` 检查服务响应。健康检查用于确认服务进程和配置状态，不代替一次实际图片识别请求。

## 接到小程序

前端入口为 [`utils/identify-api.js`](../utils/identify-api.js)，包含 HTTP、云函数和云托管三种接入方式：

- HTTP 地址在 `API_BASE_URLS` 中配置，也可以通过本地存储键 `identifyApiBaseUrl` 补充。代码会先尝试列表中的原地址，换环境时应替换旧地址。
- 当前代码会过滤 `localhost` 和 `127.0.0.1`。本机后端独立启动后，若要连接小程序，需配置可访问的局域网地址或部署后的 HTTPS 地址；真机无法通过 `localhost` 访问电脑上的服务。
- 使用云托管时，替换 `CLOUD_ENV` 和 `CLOUD_CONTAINER_SERVICE`。
- 使用 `recognizePet` 云函数时，部署 [`cloudfunctions/recognizePet`](../cloudfunctions/recognizePet/)，在云端配置 `ARK_API_KEY`，按需配置 `ARK_BASE_URL`、`ARK_MODEL`。该云函数使用火山方舟接口。

健康检查按云函数、云托管、HTTP 的顺序尝试；上传识别时会优先使用可用的 HTTP 目标。不要只修改后端端口而遗漏前端地址。正式设备访问还需配置小程序对应的 request / uploadFile 合法域名。

`.env` 已在 `.gitignore` 中排除。API Key 只放在后端或云函数的环境变量中。

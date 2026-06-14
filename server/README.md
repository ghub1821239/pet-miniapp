# 识别服务

这是给微信小程序 `pages/identify` 用的本地后端，支持火山方舟豆包视觉模型和 DashScope / Qwen-VL。

## 1. 安装依赖

```powershell
cd server
npm install
```

## 2. 配置环境变量

复制一份 `.env.example` 改名为 `.env`：

```powershell
copy .env.example .env
```

然后填写对应服务商的 Key。

火山方舟豆包推荐：

```env
MODEL_PROVIDER=ark
ARK_API_KEY=你的火山方舟APIKey
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_MODEL=doubao-seed-2-0-pro-260215
PORT=3007
CORS_ORIGIN=*
```

DashScope / Qwen-VL：

```env
MODEL_PROVIDER=qwen
QWEN_API_KEY=你的DashScope APIKey
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-vl-max-latest
PORT=3007
CORS_ORIGIN=*
```

## 3. 启动服务

```powershell
npm run dev
```

默认地址：

```text
http://localhost:3007
```

健康检查：

```text
GET /health
```

识别接口：

```text
POST /pet-recognize
```

上传字段名：

```text
file
```

## 4. 前端地址

打开：

`/utils/identify-api.js`

本地联调：

```js
var API_BASE_URL = 'http://localhost:3007'
```

真机调试时，把 `localhost` 换成你电脑局域网 IP。

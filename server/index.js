import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import multer from 'multer'
import OpenAI from 'openai'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

var __filename = fileURLToPath(import.meta.url)
var __dirname = path.dirname(__filename)

dotenv.config({
  path: path.join(__dirname, '.env')
})

var app = express()
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
})

var port = Number(process.env.PORT || 3007)
var provider = process.env.MODEL_PROVIDER || 'qwen'
var model = process.env.QWEN_MODEL || 'qwen-vl-max-latest'
var baseURL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
var apiKey = process.env.QWEN_API_KEY || ''
var client = apiKey ? new OpenAI({
  apiKey: apiKey,
  baseURL: baseURL
}) : null

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}))

app.use(express.json())

app.get('/health', function (req, res) {
  res.json({
    ok: true,
    service: 'pet-recognize',
    provider: provider,
    model: model
  })
})

app.post('/pet-recognize', upload.single('file'), async function (req, res) {
  try {
    if (!apiKey || !client) {
      res.status(500).json({
        code: 500,
        message: '服务端未配置 QWEN_API_KEY'
      })
      return
    }

    if (!req.file) {
      res.status(400).json({
        code: 400,
        message: '请上传宠物图片'
      })
      return
    }

    var mimeType = req.file.mimetype || 'image/jpeg'
    var base64Image = req.file.buffer.toString('base64')
    var dataUrl = 'data:' + mimeType + ';base64,' + base64Image

    var completion = await client.chat.completions.create({
      model: model,
      temperature: 0.2,
      response_format: {
        type: 'json_object'
      },
      messages: [
        {
          role: 'system',
          content: [
            '你是一个宠物识别助手。',
            '请根据用户上传的图片判断宠物种类与可能品种。',
            '识别范围包括：狗狗、猫咪、异宠、鸟类、爬宠、啮齿类以及其他常见家庭宠物。',
            '你的任务顺序是：先判断大类，再判断是否能识别到具体品种，最后再给出饲养建议。',
            '只能依据图片里真实可见的外观特征判断，不要臆测血统、年龄、性格或名字。',
            '如果图片只能判断到大类，不能强行编造具体品种。',
            '如果无法高把握确认品种，breed 请输出“疑似xxx”或“长毛家猫/短毛家猫/混血犬/待确认品种”这类更稳妥结果。',
            '只有当图片特征非常典型时，才输出明确品种名。',
            'confidence 必须与把握程度匹配：大类明显但品种不确定时，不要给过高分。',
            '请优先关注这些有区分度的特征：脸型、耳朵形状、口鼻长度、毛发长度与颜色分布、体型轮廓、尾巴形态。',
            '饲养建议要基于识别结果给出，简短、实用、通俗，不要空泛。',
            '所有输出必须是简体中文。',
            '只返回 JSON，不要返回任何额外解释。',
            'JSON 字段固定为：petName、species、breed、confidence、features、advice。'
          ].join('')
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                '请识别这只宠物。',
                'petName 如果无法判断名字，请输出“未知宠物”。',
                'species 请输出：猫咪、狗狗、异宠、鸟类、爬宠、啮齿类、其他 中最合适的一项。',
                'breed 请先判断是否真的能识别到具体品种；如果证据不足，请用“疑似xxx”或“长毛家猫/短毛家猫/混血犬/待确认品种”。',
                'confidence 输出 0-100 之间的数字。',
                'features 输出 3 到 5 个真正能从图里看到的外观特征，使用字符串数组。',
                'advice 输出 1 段饲养建议。',
                '不要为了看起来专业而过度细分品种。',
                '如果识别对象更像宠物猫常见混血或家猫，请明确写得保守一些。'
              ].join('')
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ]
    })

    var rawText = (((completion || {}).choices || [])[0] || {}).message
    rawText = rawText && rawText.content ? rawText.content : '{}'

    var result = safeParseRecognitionResult(rawText)
    var createdAt = formatNow()

    res.json({
      code: 0,
      data: {
        petName: result.petName || '未知宠物',
        species: result.species || '其他',
        breed: result.breed || '待确认品种',
        confidence: normalizeConfidence(result.confidence),
        features: normalizeFeatures(result.features),
        advice: result.advice || '建议结合日常表现继续观察。',
        createdAt: createdAt
      }
    })
  } catch (error) {
    console.error('pet-recognize error:', error)
    res.status(500).json({
      code: 500,
      message: '识别失败，请稍后重试',
      detail: error.message
    })
  }
})

app.listen(port, function () {
  console.log('pet identify server running at http://localhost:' + port)
})

function safeParseRecognitionResult(rawText) {
  try {
    return JSON.parse(rawText)
  } catch (error) {
    var matched = String(rawText || '').match(/\{[\s\S]*\}/)
    if (!matched) {
      throw error
    }

    return JSON.parse(matched[0])
  }
}

function normalizeFeatures(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(function (item) {
      return String(item || '').trim()
    })
    .filter(Boolean)
    .slice(0, 5)
}

function normalizeConfidence(value) {
  var num = Number(value || 0)

  if (Number.isNaN(num)) {
    return 0
  }

  if (num < 0) {
    return 0
  }

  if (num > 100) {
    return 100
  }

  return Math.round(num)
}

function formatNow() {
  var date = new Date()
  var year = date.getFullYear()
  var month = pad(date.getMonth() + 1)
  var day = pad(date.getDate())
  var hour = pad(date.getHours())
  var minute = pad(date.getMinutes())

  return year + '-' + month + '-' + day + ' ' + hour + ':' + minute
}

function pad(num) {
  return num < 10 ? '0' + num : String(num)
}

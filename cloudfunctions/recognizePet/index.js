const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const DEFAULT_MODEL = 'doubao-seed-2-0-pro-260215'

exports.main = async (event = {}) => {
  if (event.action === 'health') {
    return {
      ok: true,
      service: 'pet-recognize',
      provider: 'ark',
      model: getModel()
    }
  }

  try {
    const apiKey = process.env.ARK_API_KEY || ''

    if (!apiKey) {
      return {
        code: 500,
        message: '云函数未配置 ARK_API_KEY'
      }
    }

    const rawBase64 = String(event.imageBase64 || event.base64 || '').trim()

    if (!rawBase64) {
      return {
        code: 400,
        message: '请上传宠物图片'
      }
    }

    const mimeType = String(event.mimeType || 'image/jpeg').trim() || 'image/jpeg'
    const dataUrl = /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(rawBase64)
      ? rawBase64
      : `data:${mimeType};base64,${rawBase64}`
    const result = await recognizeWithArk(dataUrl, apiKey)

    return {
      code: 0,
      data: {
        petName: result.petName || '未知宠物',
        species: result.species || '其他',
        breed: result.breed || '待确认品种',
        confidence: normalizeConfidence(result.confidence),
        features: normalizeFeatures(result.features),
        advice: result.advice || '建议结合日常表现继续观察。',
        createdAt: formatNow(),
        source: 'api',
        provider: 'ark',
        model: getModel()
      }
    }
  } catch (error) {
    console.error('recognizePet error:', error)
    return {
      code: 500,
      message: '识别失败，请稍后重试',
      detail: error.message || String(error)
    }
  }
}

async function recognizeWithArk(dataUrl, apiKey) {
  const payload = await requestJson({
    url: `${getBaseUrl().replace(/\/+$/, '')}/responses`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: {
      model: getModel(),
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: dataUrl
            },
            {
              type: 'input_text',
              text: buildRecognitionPrompt()
            }
          ]
        }
      ]
    }
  })
  const rawText = extractArkOutputText(payload)

  if (!rawText) {
    throw new Error('Ark API 未返回可解析的识别文本')
  }

  return safeParseRecognitionResult(rawText)
}

function requestJson(options) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url)
    const bodyText = JSON.stringify(options.body || {})
    const req = https.request({
      method: options.method || 'GET',
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: Object.assign({
        'Content-Length': Buffer.byteLength(bodyText)
      }, options.headers || {}),
      timeout: 60000
    }, (res) => {
      const chunks = []

      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')

        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Ark API 请求失败：${res.statusCode} ${text.slice(0, 500)}`))
          return
        }

        try {
          resolve(JSON.parse(text))
        } catch (error) {
          reject(new Error(`Ark API 返回不是合法 JSON：${text.slice(0, 300)}`))
        }
      })
    })

    req.on('timeout', () => {
      req.destroy(new Error('Ark API 请求超时'))
    })
    req.on('error', reject)
    req.write(bodyText)
    req.end()
  })
}

function buildRecognitionPrompt() {
  return [
    '你是一个宠物识别助手。请根据图片判断宠物种类与可能品种。',
    '识别范围包括：狗狗、猫咪、异宠、鸟类、爬宠、啮齿类以及其他常见家庭宠物。',
    '只能依据图片里真实可见的外观特征判断，不要臆测血统、年龄、性格或名字。',
    '如果图片只能判断到大类，不能强行编造具体品种。',
    '如果无法高把握确认品种，breed 请输出“疑似xxx”或“长毛家猫/短毛家猫/混血犬/待确认品种”。',
    'confidence 必须与把握程度匹配：大类明显但品种不确定时，不要给过高分。',
    'features 输出 3 到 5 个真正能从图里看到的外观特征，使用字符串数组。',
    'advice 输出 1 段简短、实用、通俗的饲养建议。',
    '所有输出必须是简体中文。',
    '只返回 JSON，不要返回 Markdown，不要返回任何额外解释。',
    'JSON 字段固定为：petName、species、breed、confidence、features、advice。',
    'petName 如果无法判断名字，请输出“未知宠物”。',
    'species 请输出：猫咪、狗狗、异宠、鸟类、爬宠、啮齿类、其他 中最合适的一项。'
  ].join('')
}

function extractArkOutputText(payload) {
  if (payload && typeof payload.output_text === 'string') {
    return payload.output_text
  }

  const output = payload && Array.isArray(payload.output) ? payload.output : []
  const texts = []

  for (let i = 0; i < output.length; i += 1) {
    const content = Array.isArray(output[i].content) ? output[i].content : []

    for (let j = 0; j < content.length; j += 1) {
      if (typeof content[j].text === 'string') {
        texts.push(content[j].text)
      } else if (typeof content[j].content === 'string') {
        texts.push(content[j].content)
      }
    }
  }

  return texts.join('\n').trim()
}

function safeParseRecognitionResult(rawText) {
  try {
    return JSON.parse(rawText)
  } catch (error) {
    const matched = String(rawText || '').match(/\{[\s\S]*\}/)

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
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 5)
}

function normalizeConfidence(value) {
  const num = Number(value || 0)

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
  const date = new Date()
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())

  return `${year}-${month}-${day} ${hour}:${minute}`
}

function pad(num) {
  return num < 10 ? `0${num}` : String(num)
}

function getBaseUrl() {
  return process.env.ARK_BASE_URL || DEFAULT_BASE_URL
}

function getModel() {
  return process.env.ARK_MODEL || DEFAULT_MODEL
}

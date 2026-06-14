const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const WX_APPID = process.env.WX_APPID || 'wxc1fd60e6fd64f60b'
const WX_APP_SECRET = process.env.WX_APP_SECRET || ''
let cachedAccessToken = ''
let cachedAccessTokenExpiresAt = 0

function pad(num) {
  return num < 10 ? '0' + num : '' + num
}

function formatDate(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function formatTime(date) {
  return pad(date.getHours()) + ':' + pad(date.getMinutes())
}

function parseDateTime(dateText, timeText) {
  return new Date((dateText + ' ' + timeText + ':00').replace(/-/g, '/'))
}

function getAdvanceOffset(advanceType) {
  const map = {
    onTime: 0,
    '5m': 5 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '2d': 2 * 24 * 60 * 60 * 1000
  }
  return map[advanceType] || 0
}

function addDays(date, days) {
  const next = new Date(date.getTime())
  next.setDate(next.getDate() + days)
  return next
}

function getNextDate(item) {
  const rule = item.repeatRule || 'none'
  const base = parseDateTime(item.reminderDate, item.reminderTime)
  let next = new Date(base.getTime())

  if (rule === 'none') return null
  if (rule === 'daily') {
    next = addDays(base, 1)
  } else if (rule === 'workday') {
    next = addDays(base, 1)
    while (next.getDay() === 0 || next.getDay() === 6) {
      next = addDays(next, 1)
    }
  } else if (rule === 'weekly') {
    next = addDays(base, 7)
  } else if (rule === 'monthly') {
    next.setMonth(next.getMonth() + 1)
  } else if (rule === 'yearly') {
    next.setFullYear(next.getFullYear() + 1)
  } else {
    return null
  }

  return next
}

function formatSubscribeData(item) {
  // Template "日程提醒":
  // 提醒内容 {{thing2.DATA}}, 提醒时间 {{time30.DATA}},
  // 日程类别 {{short_thing19.DATA}}, 备注 {{thing11.DATA}}.
  return {
    thing2: {
      value: String(item.title || item.content || '宠物照护提醒').slice(0, 20)
    },
    time30: {
      value: String((item.reminderDate || '') + ' ' + (item.reminderTime || '')).trim()
    },
    short_thing19: {
      value: String(item.reminderTypeText || '照护提醒').slice(0, 20)
    },
    thing11: {
      value: String(item.note || item.petName || '记得按时完成照护安排').slice(0, 20)
    }
  }
}

function requestJson(url, options = {}, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let raw = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        raw += chunk
      })
      res.on('end', () => {
        try {
          resolve(raw ? JSON.parse(raw) : {})
        } catch (err) {
          reject(err)
        }
      })
    })

    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function getWxAccessToken() {
  const now = Date.now()
  if (cachedAccessToken && cachedAccessTokenExpiresAt > now + 60 * 1000) {
    return cachedAccessToken
  }

  if (!WX_APP_SECRET) {
    throw new Error('WX_APP_SECRET is not configured')
  }

  const url = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential'
    + '&appid=' + encodeURIComponent(WX_APPID)
    + '&secret=' + encodeURIComponent(WX_APP_SECRET)
  const res = await requestJson(url)

  if (!res.access_token) {
    throw new Error('getAccessToken failed: ' + JSON.stringify(res))
  }

  cachedAccessToken = res.access_token
  cachedAccessTokenExpiresAt = now + ((res.expires_in || 7200) - 300) * 1000
  return cachedAccessToken
}

async function sendSubscribeMessageByHttp(item) {
  const accessToken = await getWxAccessToken()
  const payload = JSON.stringify({
    touser: item.openid,
    template_id: item.templateId,
    page: 'pages/reminder-manage/index',
    data: formatSubscribeData(item),
    miniprogram_state: 'developer',
    lang: 'zh_CN'
  })
  const res = await requestJson(
    'https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=' + encodeURIComponent(accessToken),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    },
    payload
  )

  if (res.errcode && res.errcode !== 0) {
    throw new Error('subscribeMessage.httpSend failed: ' + JSON.stringify(res))
  }

  return res
}

async function sendSubscribeMessage(item) {
  try {
    return await cloud.openapi.subscribeMessage.send({
      touser: item.openid,
      templateId: item.templateId,
      page: `/pages/reminder-manage/index`,
      data: formatSubscribeData(item),
      miniprogramState: 'developer',
      lang: 'zh_CN'
    })
  } catch (err) {
    const message = err.errMsg || err.message || String(err)
    const canFallback = message.indexOf('INVALID_WX_ACCESS_TOKEN') >= 0
      || message.indexOf('invalid wx openapi access_token') >= 0
      || message.indexOf('missing wxCloudApiToken') >= 0

    if (!canFallback) throw err
    return sendSubscribeMessageByHttp(item)
  }
}

async function createNextStationReminder(item, now) {
  const next = getNextDate(item)
  if (!next) return ''

  const reminderDate = formatDate(next)
  const reminderTime = formatTime(next)
  const remindAt = next.getTime() - getAdvanceOffset(item.advanceType)
  const data = Object.assign({}, item, {
    _id: undefined,
    id: 'plan_' + now + '_' + Math.floor(Math.random() * 10000),
    reminderDate,
    reminderTime,
    date: reminderDate,
    time: reminderTime,
    remindAt,
    channel: 'station',
    channelText: '站内提醒',
    subscribeStatus: 'none',
    status: 'need_resubscribe',
    statusText: '需重新授权',
    sentAt: null,
    failReason: '',
    createdAt: now,
    updatedAt: now
  })

  delete data._id

  const res = await db.collection('reminderList').add({ data })
  return res._id
}

function getSkipReason(item, now) {
  const reasons = []
  if (item.status !== 'pending') reasons.push('status不是pending')
  if (item.channel !== 'wechat') reasons.push('channel不是wechat')
  if (item.subscribeStatus !== 'accepted') reasons.push('subscribeStatus不是accepted')
  if (typeof item.remindAt !== 'number') {
    reasons.push('remindAt不是数字')
  } else if (item.remindAt > now) {
    reasons.push('remindAt还没到时间')
  }

  return reasons.join('；') || '符合发送条件'
}

exports.main = async (event = {}) => {
  const now = Date.now()
  if (event.dryRun) {
    const pendingQuery = await db.collection('reminderList')
      .where({
        status: 'pending'
      })
      .orderBy('remindAt', 'asc')
      .limit(20)
      .get()

    const rows = (pendingQuery.data || []).map((item) => ({
      id: item._id,
      title: item.title || item.content || '',
      petName: item.petName || '',
      channel: item.channel,
      subscribeStatus: item.subscribeStatus,
      status: item.status,
      remindAt: item.remindAt,
      reminderDate: item.reminderDate,
      reminderTime: item.reminderTime,
      templateId: item.templateId,
      reason: getSkipReason(item, now)
    }))

    return {
      success: true,
      dryRun: true,
      now,
      nowText: new Date(now).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      pendingCount: rows.length,
      rows
    }
  }

  const query = await db.collection('reminderList')
    .where({
      status: 'pending',
      channel: 'wechat',
      subscribeStatus: 'accepted',
      remindAt: _.lte(now)
    })
    .limit(50)
    .get()

  const reminders = query.data || []
  const results = []

  for (const item of reminders) {
    try {
      await sendSubscribeMessage(item)

      const nextId = await createNextStationReminder(item, now)

      await db.collection('reminderList').doc(item._id).update({
        data: {
          status: 'sent',
          statusText: '已发送',
          sentAt: now,
          nextReminderId: nextId,
          updatedAt: now
        }
      })

      results.push({
        id: item._id,
        success: true,
        nextReminderId: nextId
      })
    } catch (err) {
      const message = err.errMsg || err.message || String(err)
      await db.collection('reminderList').doc(item._id).update({
        data: {
          status: 'send_failed',
          statusText: '发送失败',
          failReason: message,
          updatedAt: now
        }
      })

      results.push({
        id: item._id,
        success: false,
        error: message
      })
    }
  }

  return {
    success: true,
    checkedAt: now,
    count: reminders.length,
    results
  }
}

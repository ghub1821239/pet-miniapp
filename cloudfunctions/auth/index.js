const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const USERS_COLLECTION = 'users'
const COUNTERS_COLLECTION = 'counters'
const PASSWORD_SALT = 'pet-miniapp-auth-v1'
const ACCOUNT_PREFIX = 'mp'

exports.main = async function (event) {
  const action = event && event.action

  try {
    if (action === 'getCurrentUser') {
      return await getCurrentUserByOpenId()
    }
    if (action === 'register') {
      return await register(event)
    }
    if (action === 'login') {
      return await login(event)
    }
    if (action === 'recoverPassword') {
      return await recoverPassword(event)
    }
    if (action === 'changePassword') {
      return await changePassword(event)
    }
    if (action === 'updateProfile') {
      return await updateProfile(event)
    }
    return fail('UNKNOWN_ACTION', '未知账号操作')
  } catch (error) {
    console.error('auth cloud function error:', error)
    return fail('SERVER_ERROR', '账号服务暂不可用，请稍后再试')
  }
}

async function getCurrentUserByOpenId() {
  const wxOpenId = getWxOpenId()

  if (!wxOpenId) {
    return fail('NO_OPENID', '暂时无法识别当前微信身份')
  }

  const user = await findUserByOpenId(wxOpenId)
  if (!user) {
    return fail('USER_NOT_FOUND', '当前微信尚未绑定账号')
  }

  await touchUser(user._id)

  return ok({
    user: sanitizeUser(user),
    session: buildSession(user)
  })
}

async function register(event) {
  const nickname = trimText(event.nickname)
  const password = String(event.password || '')
  const wxOpenId = getWxOpenId()
  const now = db.serverDate()

  if (!nickname) {
    return fail('INVALID_NICKNAME', '请填写昵称')
  }
  if (!isValidPassword(password)) {
    return fail('INVALID_PASSWORD', '密码至少需要 6 位')
  }
  if (!wxOpenId) {
    return fail('NO_OPENID', '暂时无法识别当前微信身份')
  }

  const account = await generateNextAccount()

  const payload = {
    account: account,
    nickname: nickname,
    passwordHash: hashPassword(password),
    wxOpenId: wxOpenId,
    createdAt: now,
    updatedAt: now
  }

  const addRes = await db.collection(USERS_COLLECTION).add({
    data: payload
  })
  const user = Object.assign({}, payload, {
    _id: addRes._id
  })

  return ok({
    user: sanitizeUser(user),
    session: buildSession(user),
    generatedAccount: account
  })
}

async function login(event) {
  const account = normalizeAccount(event.account)
  const password = String(event.password || '')

  if (!account || !password) {
    return fail('INVALID_LOGIN', '请填写账号和密码')
  }

  const user = await findUserByAccount(account)
  if (!user || user.passwordHash !== hashPassword(password)) {
    return fail('LOGIN_FAILED', '账号或密码不正确')
  }

  await touchUser(user._id)

  return ok({
    user: sanitizeUser(user),
    session: buildSession(user)
  })
}

async function recoverPassword(event) {
  const account = normalizeAccount(event.account)
  const password = String(event.password || '')
  const wxOpenId = getWxOpenId()

  if (!account) {
    return fail('INVALID_RECOVER', '请填写账号')
  }
  if (!isValidPassword(password)) {
    return fail('INVALID_PASSWORD', '新密码至少需要 6 位')
  }
  if (!wxOpenId) {
    return fail('NO_OPENID', '暂时无法识别当前微信身份')
  }

  const user = await findUserByAccount(account)
  if (!user) {
    return fail('ACCOUNT_NOT_FOUND', '账号不存在')
  }
  if (user.wxOpenId !== wxOpenId) {
    return fail('WX_IDENTITY_NOT_MATCH', '当前微信与该账号绑定信息不匹配')
  }

  await db.collection(USERS_COLLECTION).doc(user._id).update({
    data: {
      passwordHash: hashPassword(password),
      updatedAt: db.serverDate()
    }
  })

  return ok({
    user: sanitizeUser(user)
  })
}

async function changePassword(event) {
  const userId = String(event.userId || '')
  const currentPassword = String(event.currentPassword || '')
  const nextPassword = String(event.nextPassword || '')

  if (!userId) {
    return fail('NOT_LOGGED_IN', '请先登录账号')
  }
  if (!currentPassword) {
    return fail('INVALID_PASSWORD', '请输入当前密码')
  }
  if (!isValidPassword(nextPassword)) {
    return fail('INVALID_PASSWORD', '新密码至少需要 6 位')
  }

  const userRes = await db.collection(USERS_COLLECTION).doc(userId).get()
  const user = userRes && userRes.data ? userRes.data : null

  if (!user) {
    return fail('ACCOUNT_NOT_FOUND', '账号不存在')
  }
  if (user.passwordHash !== hashPassword(currentPassword)) {
    return fail('PASSWORD_NOT_MATCH', '当前密码不正确')
  }

  await db.collection(USERS_COLLECTION).doc(userId).update({
    data: {
      passwordHash: hashPassword(nextPassword),
      updatedAt: db.serverDate()
    }
  })

  return ok({
    user: sanitizeUser(user)
  })
}

async function updateProfile(event) {
  const userId = String(event.userId || '')
  const nickname = trimText(event.nickname)

  if (!userId) {
    return fail('NOT_LOGGED_IN', '请先登录账号')
  }
  if (!nickname) {
    return fail('INVALID_NICKNAME', '请填写昵称')
  }

  await db.collection(USERS_COLLECTION).doc(userId).update({
    data: {
      nickname: nickname,
      updatedAt: db.serverDate()
    }
  })

  const userRes = await db.collection(USERS_COLLECTION).doc(userId).get()
  const user = userRes && userRes.data ? userRes.data : null

  if (!user) {
    return fail('ACCOUNT_NOT_FOUND', '账号不存在')
  }

  return ok({
    user: sanitizeUser(user),
    session: buildSession(user)
  })
}

async function findUserByAccount(account) {
  const res = await db.collection(USERS_COLLECTION)
    .where({
      account: account
    })
    .limit(1)
    .get()

  return res.data && res.data.length ? res.data[0] : null
}

async function findUserByOpenId(wxOpenId) {
  const openId = String(wxOpenId || '').trim()

  if (!openId) {
    return null
  }

  const res = await db.collection(USERS_COLLECTION)
    .where({
      wxOpenId: openId
    })
    .limit(1)
    .get()

  return res.data && res.data.length ? res.data[0] : null
}

async function touchUser(userId) {
  if (!userId) {
    return
  }

  await db.collection(USERS_COLLECTION).doc(userId).update({
    data: {
      updatedAt: db.serverDate()
    }
  }).catch(function () {})
}

async function generateNextAccount() {
  const counterId = 'user_account_seq'
  const collection = db.collection(COUNTERS_COLLECTION)
  const existed = await collection.doc(counterId).get().catch(function () {
    return null
  })

  if (!existed || !existed.data) {
    await collection.doc(counterId).set({
      data: {
        value: 100000,
        updatedAt: db.serverDate()
      }
    }).catch(function () {})
  }

  await collection.doc(counterId).update({
    data: {
      value: _.inc(1),
      updatedAt: db.serverDate()
    }
  })

  const latest = await collection.doc(counterId).get()
  const seq = latest && latest.data ? Number(latest.data.value || 100001) : 100001
  return ACCOUNT_PREFIX + String(seq)
}

function ok(data) {
  return Object.assign({
    success: true
  }, data || {})
}

function fail(code, message) {
  return {
    success: false,
    code: code,
    message: message
  }
}

function sanitizeUser(user) {
  return {
    id: user && user._id ? user._id : '',
    account: user && user.account ? user.account : '',
    nickname: user && user.nickname ? user.nickname : '',
    wxOpenIdBound: !!(user && user.wxOpenId)
  }
}

function buildSession(user) {
  return {
    userId: user && user._id ? user._id : '',
    account: user && user.account ? user.account : '',
    loginAt: Date.now()
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256')
    .update(PASSWORD_SALT + ':' + String(password || ''))
    .digest('hex')
}

function isValidPassword(password) {
  return String(password || '').length >= 6
}

function normalizeAccount(value) {
  return trimText(value).toLowerCase()
}

function trimText(value) {
  return String(value || '').replace(/\s+/g, '').trim()
}

function getWxOpenId() {
  const wxContext = cloud.getWXContext()
  return wxContext && wxContext.OPENID ? String(wxContext.OPENID) : ''
}

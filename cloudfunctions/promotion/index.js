const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const POSTS_COLLECTION = 'posts'
const ORDERS_COLLECTION = 'promotionOrders'
const USERS_COLLECTION = 'users'
const CODES_COLLECTION = 'promotionCodes'

const PACKAGES = {
  day: {
    id: 'day',
    title: '轻推 24 小时',
    amount: 600,
    durationHours: 24,
    level: 1,
    boost: 0.08
  },
  three_days: {
    id: 'three_days',
    title: '加热 72 小时',
    amount: 1200,
    durationHours: 72,
    level: 2,
    boost: 0.14
  },
  week: {
    id: 'week',
    title: '热门 7 天',
    amount: 3000,
    durationHours: 168,
    level: 3,
    boost: 0.22
  }
}

exports.main = async function (event) {
  const action = event && event.action

  try {
    if (action === 'createOrder') {
      return await createOrder(event)
    }
    if (action === 'redeemOrder') {
      return await redeemOrder(event)
    }
    if (action === 'getPostPromotion') {
      return await getPostPromotion(event)
    }
    return fail('UNKNOWN_ACTION', '未知推流操作')
  } catch (error) {
    console.error('promotion cloud function error:', error)
    return fail('SERVER_ERROR', error && error.message ? error.message : '推流服务暂不可用')
  }
}

async function createOrder(event) {
  const userId = String(event.userId || '')
  const postId = String(event.postId || '')
  const packageId = String(event.packageId || '')
  const pack = PACKAGES[packageId]

  if (!userId) {
    return fail('NOT_LOGGED_IN', '请先登录后再购买推流')
  }
  if (!postId) {
    return fail('INVALID_POST', '帖子信息不完整')
  }
  if (!pack) {
    return fail('INVALID_PACKAGE', '请选择有效的推流套餐')
  }

  const post = await findPostByBusinessId(postId)
  const user = await findUserById(userId)
  if (!post) {
    return fail('POST_NOT_FOUND', '没有找到这条帖子')
  }
  if (!user) {
    return fail('NOT_LOGGED_IN', '请先登录后再购买推流')
  }
  if (!isPostOwner(post, user)) {
    return fail('NOT_OWNER', '只能给自己的帖子购买推流')
  }

  await patchPostOwnerIfMissing(post, user)

  const outTradeNo = buildOrderNo(userId)
  const orderPayload = {
    outTradeNo: outTradeNo,
    userId: userId,
    postId: post.id || post._id,
    postCloudId: post._id || '',
    packageId: pack.id,
    packageTitle: pack.title,
    amount: pack.amount,
    durationHours: pack.durationHours,
    promotionLevel: pack.level,
    status: 'created',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
    paidAt: null
  }

  await db.collection(ORDERS_COLLECTION).add({
    data: orderPayload
  })

  const payment = await createPayment(outTradeNo, pack)
  if (!payment.success) {
    await updateOrderStatus(outTradeNo, 'pay_unavailable')
    return fail(payment.code, payment.message)
  }

  return ok({
    order: sanitizeOrder(orderPayload)
  })
}

async function redeemOrder(event) {
  const userId = String(event.userId || '')
  const outTradeNo = String(event.outTradeNo || '')
  const redeemCode = normalizeCode(event.redeemCode)

  if (!userId || !outTradeNo) {
    return fail('INVALID_ORDER', '订单信息不完整')
  }
  if (!redeemCode) {
    return fail('INVALID_CODE', '请输入优惠码或兑换密钥')
  }

  const order = await findOrder(outTradeNo)
  if (!order || order.userId !== userId) {
    return fail('ORDER_NOT_FOUND', '没有找到这笔推流订单')
  }
  if (order.status !== 'created') {
    return fail('ORDER_STATUS_INVALID', '订单状态不可确认')
  }

  const redeemed = await consumeRedeemCode(order, redeemCode)
  if (!redeemed.success) {
    return fail(redeemed.code, redeemed.message)
  }

  const now = Date.now()
  const endedAt = new Date(now + Number(order.durationHours || 0) * 3600000)
  const patch = {
    promotionActive: true,
    promotionLevel: Number(order.promotionLevel || 0),
    promotionAmount: Number(order.amount || 0),
    promotionStartedAt: formatDate(new Date(now)),
    promotionEndedAt: formatDate(endedAt),
    promotionOrderId: outTradeNo
  }

  await updatePostPromotion(order, patch)
  return ok({
    promotion: patch
  })
}

async function getPostPromotion(event) {
  const postId = String(event.postId || '')
  if (!postId) {
    return fail('INVALID_POST', '帖子信息不完整')
  }

  const post = await findPostByBusinessId(postId)
  if (!post) {
    return fail('POST_NOT_FOUND', '没有找到这条帖子')
  }

  return ok({
    promotion: {
      promotionActive: !!post.promotionActive,
      promotionLevel: Number(post.promotionLevel || 0),
      promotionAmount: Number(post.promotionAmount || 0),
      promotionStartedAt: post.promotionStartedAt || '',
      promotionEndedAt: post.promotionEndedAt || '',
      promotionOrderId: post.promotionOrderId || ''
    }
  })
}

async function createPayment(outTradeNo, pack) {
  return ok({
    mockPayment: true,
    outTradeNo: outTradeNo,
    packageId: pack.id
  })
}

async function findPostByBusinessId(postId) {
  const res = await db.collection(POSTS_COLLECTION)
    .where(_.or([
      { id: postId },
      { _id: postId }
    ]))
    .limit(1)
    .get()

  return res.data && res.data.length ? res.data[0] : null
}

async function findOrder(outTradeNo) {
  const res = await db.collection(ORDERS_COLLECTION)
    .where({
      outTradeNo: outTradeNo
    })
    .limit(1)
    .get()

  return res.data && res.data.length ? res.data[0] : null
}

async function findRedeemCodeDoc(code) {
  const res = await db.collection(CODES_COLLECTION)
    .where({
      code: code
    })
    .limit(1)
    .get()

  return res.data && res.data.length ? res.data[0] : null
}

async function consumeRedeemCode(order, redeemCode) {
  const codeDoc = await findRedeemCodeDoc(redeemCode)
  const supportedPackageIds = Array.isArray(codeDoc && codeDoc.packageIds) ? codeDoc.packageIds : []

  if (!codeDoc) {
    return fail('CODE_NOT_FOUND', '优惠码或密钥无效')
  }
  if (codeDoc.packageId && codeDoc.packageId !== order.packageId) {
    return fail('CODE_PACKAGE_MISMATCH', '该密钥不能用于当前推流套餐')
  }
  if (supportedPackageIds.length && supportedPackageIds.indexOf(order.packageId) === -1) {
    return fail('CODE_PACKAGE_MISMATCH', '该密钥不能用于当前推流套餐')
  }

  if (db.runTransaction) {
    try {
      await db.runTransaction(async transaction => {
        const latestCode = await transaction.collection(CODES_COLLECTION).doc(codeDoc._id).get()
        if (!latestCode.data) {
          throw new Error('CODE_ALREADY_USED')
        }
        await transaction.collection(CODES_COLLECTION).doc(codeDoc._id).remove()
        await transaction.collection(ORDERS_COLLECTION).doc(order._id).update({
          data: {
            status: 'paid',
            paidAt: db.serverDate(),
            updatedAt: db.serverDate(),
            redeemedCodeLabel: maskCode(redeemCode)
          }
        })
      })
      return ok()
    } catch (error) {
      if (error && error.message === 'CODE_ALREADY_USED') {
        return fail('CODE_ALREADY_USED', '该密钥已被使用')
      }
      console.error('consume redeem code transaction failed:', error)
      return fail('CODE_CONSUME_FAILED', '密钥核销失败，请稍后重试')
    }
  }

  try {
    await db.collection(CODES_COLLECTION).doc(codeDoc._id).remove()
    await db.collection(ORDERS_COLLECTION).doc(order._id).update({
      data: {
        status: 'paid',
        paidAt: db.serverDate(),
        updatedAt: db.serverDate(),
        redeemedCodeLabel: maskCode(redeemCode)
      }
    })
    return ok()
  } catch (error) {
    if (error && /remove/i.test(String(error.message || ''))) {
      return fail('CODE_ALREADY_USED', '该密钥已被使用')
    }
    console.error('consume redeem code fallback failed:', error)
    return fail('CODE_CONSUME_FAILED', '密钥核销失败，请稍后重试')
  }
}

async function updatePostPromotion(order, patch) {
  if (order.postCloudId) {
    return db.collection(POSTS_COLLECTION).doc(order.postCloudId).update({
      data: patch
    })
  }

  return db.collection(POSTS_COLLECTION).where({
    id: order.postId
  }).update({
    data: patch
  })
}

async function updateOrderStatus(outTradeNo, status) {
  return db.collection(ORDERS_COLLECTION).where({
    outTradeNo: outTradeNo
  }).update({
    data: {
      status: status,
      updatedAt: db.serverDate()
    }
  }).catch(function () {})
}

async function findUserById(userId) {
  if (!userId) {
    return null
  }

  const res = await db.collection(USERS_COLLECTION).doc(userId).get().catch(function () {
    return null
  })
  return res && res.data ? res.data : null
}

async function patchPostOwnerIfMissing(post, user) {
  const userId = String(user && user._id ? user._id : '')
  const author = post.author || {}
  const postUserId = String(author.userId || post.userId || '')

  if (postUserId || !userId || !post._id) {
    return
  }

  await db.collection(POSTS_COLLECTION).doc(post._id).update({
    data: {
      userId: userId,
      author: Object.assign({}, author, {
        userId: userId
      })
    }
  }).catch(function () {})
}

function isPostOwner(post, user) {
  const author = post.author || {}
  const userId = String(user && user._id ? user._id : '')
  const nickname = normalizeName(user && user.nickname)
  const account = normalizeName(user && user.account)
  const postUserId = String(author.userId || post.userId || '')
  const authorName = normalizeName(author.name || post.userName || post.author)

  return postUserId === userId ||
    (nickname && authorName && nickname === authorName) ||
    (account && authorName && account === authorName) ||
    post.author === '我' ||
    post.userName === '我'
}

function sanitizeOrder(order) {
  return {
    outTradeNo: order.outTradeNo,
    postId: order.postId,
    packageId: order.packageId,
    packageTitle: order.packageTitle,
    amount: order.amount,
    durationHours: order.durationHours,
    status: order.status
  }
}

function buildOrderNo(userId) {
  return 'PROMO' + Date.now() + String(userId || '').slice(-6) + Math.floor(Math.random() * 10000)
}

function formatDate(date) {
  const pad = function (num) {
    return num < 10 ? '0' + num : String(num)
  }
  return date.getFullYear() + '-' +
    pad(date.getMonth() + 1) + '-' +
    pad(date.getDate()) + ' ' +
    pad(date.getHours()) + ':' +
    pad(date.getMinutes()) + ':00'
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

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase()
}

function maskCode(code) {
  const safe = normalizeCode(code)
  if (safe.length <= 4) {
    return safe
  }
  return safe.slice(0, 2) + '***' + safe.slice(-2)
}

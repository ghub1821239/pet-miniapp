var auth = require('./auth')
var postStorage = require('./post-storage')

var PROMOTION_FUNCTION_NAME = 'promotion'

var PROMOTION_PACKAGES = [
  {
    id: 'day',
    title: '轻推 24 小时',
    desc: '适合新帖冷启动',
    price: 6,
    amount: 600,
    durationHours: 24,
    level: 1,
    boost: 0.08
  },
  {
    id: 'three_days',
    title: '加热 72 小时',
    desc: '持续获得推荐曝光',
    price: 12,
    amount: 1200,
    durationHours: 72,
    level: 2,
    boost: 0.14
  },
  {
    id: 'week',
    title: '热门 7 天',
    desc: '长周期社区推流',
    price: 30,
    amount: 3000,
    durationHours: 168,
    level: 3,
    boost: 0.22
  }
]

function isCloudReady() {
  return typeof wx !== 'undefined' && wx.cloud && wx.cloud.callFunction
}

function callPromotion(action, data) {
  if (!isCloudReady()) {
    return Promise.reject(new Error('推流服务暂不可用'))
  }

  return wx.cloud.callFunction({
    name: PROMOTION_FUNCTION_NAME,
    data: Object.assign({
      action: action
    }, data || {})
  }).then(function (res) {
    var result = res && res.result ? res.result : {}
    if (!result.success) {
      throw new Error(result.message || '推流服务暂不可用')
    }
    return result
  })
}

function createOrder(post, packageId) {
  var user = auth.getCurrentUser() || {}
  return callPromotion('createOrder', {
    userId: user.id,
    postId: post && post.id,
    packageId: packageId
  })
}

function redeemOrder(outTradeNo, redeemCode) {
  var user = auth.getCurrentUser() || {}
  return callPromotion('redeemOrder', {
    userId: user.id,
    outTradeNo: outTradeNo,
    redeemCode: redeemCode
  }).then(function (res) {
    return res.promotion || {}
  })
}

function getPostPromotion(postId) {
  return callPromotion('getPostPromotion', {
    postId: postId
  })
}

function purchasePromotion(post, packageId, redeemCode) {
  var order
  return createOrder(post, packageId).then(function (res) {
    order = res.order
    return redeemOrder(order.outTradeNo, redeemCode)
  }).then(function (promotionPatch) {
    syncPostPromotion(post.id, promotionPatch)
    return promotionPatch
  })
}

function syncPostPromotion(postId, patch) {
  var posts = postStorage.getPostList()
  var cached = postStorage.getDetailCache()
  var nextPosts

  if (Array.isArray(posts)) {
    nextPosts = patchPostList(posts, postId, patch)
    postStorage.setPostList(nextPosts)
  }

  if (cached && String(cached.id) === String(postId)) {
    postStorage.setDetailCache(Object.assign({}, cached, patch))
  }
}

function patchPostList(list, postId, patch) {
  return list.map(function (item) {
    if (String(item.id) === String(postId)) {
      return Object.assign({}, item, patch)
    }
    return item
  })
}

function findPackage(packageId) {
  var i
  for (i = 0; i < PROMOTION_PACKAGES.length; i++) {
    if (PROMOTION_PACKAGES[i].id === packageId) {
      return PROMOTION_PACKAGES[i]
    }
  }
  return null
}

function getPromotionStatus(post) {
  var endTime = getPromotionEndTime(post)
  var active = !!(post && post.promotionActive && endTime && endTime > Date.now())
  var remainHours = active ? Math.ceil((endTime - Date.now()) / 3600000) : 0

  return {
    active: active,
    remainHours: remainHours,
    text: active ? formatRemainText(remainHours) : '未开启'
  }
}

function getPromotionEndTime(post) {
  var value = post && post.promotionEndedAt
  var time
  if (!value) {
    return 0
  }
  time = new Date(String(value).replace(/-/g, '/')).getTime()
  return time || 0
}

function isPostOwner(post) {
  var currentUser = auth.getCurrentUser() || {}
  var author = post && post.author ? post.author : {}
  var currentUserId = currentUser.id || ''
  var postUserId = author.userId || post.userId || ''
  var currentAccount = String(currentUser.account || '').trim().toLowerCase()
  var currentNickname = String(currentUser.nickname || '').trim().toLowerCase()
  var postUserName = String(post.userName || author.name || post.author || '').trim().toLowerCase()
  return !!(
    post &&
    (
      (currentUserId && postUserId && String(postUserId) === String(currentUserId)) ||
      (currentAccount && postUserName && currentAccount === postUserName) ||
      (currentNickname && postUserName && currentNickname === postUserName) ||
      post.author === '我' ||
      post.userName === '我'
    )
  )
}

function formatRemainText(remainHours) {
  if (remainHours >= 24) {
    return '剩余约 ' + Math.ceil(remainHours / 24) + ' 天'
  }
  return '剩余约 ' + remainHours + ' 小时'
}

module.exports = {
  PROMOTION_PACKAGES: PROMOTION_PACKAGES,
  createOrder: createOrder,
  redeemOrder: redeemOrder,
  getPostPromotion: getPostPromotion,
  purchasePromotion: purchasePromotion,
  syncPostPromotion: syncPostPromotion,
  findPackage: findPackage,
  getPromotionStatus: getPromotionStatus,
  isPostOwner: isPostOwner
}

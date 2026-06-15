var cloudPosts = require('../../utils/cloudPosts')
var postStorage = require('../../utils/post-storage')
var promotion = require('../../utils/promotion')
var socialState = require('../../utils/social-state')
var userPostState = require('../../utils/user-post-state')
var CAT_IMAGE = '/assets/mock/pets/pet-maohaizi.jpg.jpg'
var DOG_IMAGE = '/assets/mock/pets/pet-buding.jpg.jpg'
var FALLBACK_POST_IMAGE = DOG_IMAGE

var FALLBACK_POST = {
  id: 'fallback',
  title: '草地上这张笑脸我能看一天',
  content: '风吹过来的时候它一直眯着眼笑，趴在草里像一团会发光的小云。',
  author: '布丁铲屎官',
  petName: '布丁',
  breed: '萨摩耶',
  tag: '推荐',
  likes: 36,
  coverImage: FALLBACK_POST_IMAGE,
  avatarImage: DOG_IMAGE,
  isLiked: false,
  isFollowing: true
}

var COMMENT_NAMES = [
  '春日猫册',
  '布丁家长',
  '毛孩子观察员',
  '河西猫友',
  '小太阳日记',
  '奶盖同学',
  '团子妈妈',
  '豆包家长',
  '芝麻小窝',
  '萌宠路人'
]

var COMMENT_TEXTS = [
  '这也太可爱了，已经反复看了好几遍。',
  '状态看起来很不错，家长照顾得真细心。',
  '同款毛孩子也有类似情况，蹲一个后续。',
  '照片拍得好温柔，氛围感满满。',
  '这个经验很有用，先收藏起来慢慢看。',
  '看描述感觉处理得很稳，辛苦啦。',
  '希望小家伙每天都健康开心。',
  '这个角度太会拍了，表情好生动。',
  '我家也遇到过，慢慢调整会好很多。',
  '谢谢分享，给新手家长很多参考。'
]

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function hashCommentText(text) {
  var safe = String(text || '')
  var hash = 0
  var i

  for (i = 0; i < safe.length; i++) {
    hash = (hash * 31 + safe.charCodeAt(i)) % 9973
  }

  return hash
}

function normalizeComment(item, index) {
  var userName = item.userName || item.nickname || (item.author && item.author.name) || COMMENT_NAMES[index % COMMENT_NAMES.length]
  return {
    id: item.id || ('comment_' + index),
    userName: userName,
    avatarText: (item.avatarText || userName.slice(0, 1) || '评').slice(0, 1),
    content: item.content || COMMENT_TEXTS[index % COMMENT_TEXTS.length],
    time: String(item.time || item.createdAt || '').trim() || ((index + 1) + '小时前'),
    likes: Number(item.likes || item.likeCount || 0),
    liked: !!(item.liked || item.isLiked)
  }
}

function buildGeneratedComment(post, index) {
  var seed = hashCommentText((post && (post.id || post.title || post.content)) || 'post') + index
  var name = COMMENT_NAMES[seed % COMMENT_NAMES.length]
  var text = COMMENT_TEXTS[(seed + index) % COMMENT_TEXTS.length]
  var petName = post && post.petName ? post.petName : ''

  if (petName && index % 4 === 0) {
    text = petName + '真的太乖了，想看更多日常。'
  }

  return {
    id: 'mock_comment_' + (post && (post.id || post._id) ? post.id || post._id : 'post') + '_' + index,
    userName: name,
    avatarText: name.slice(0, 1),
    content: text,
    time: index < 3 ? '刚刚' : (index + 1) + '小时前',
    likes: (seed + index * 3) % 18,
    liked: false
  }
}

function ensurePostComments(post, minCount) {
  var source = Array.isArray(post && post.comments) ? post.comments : []
  var targetCount = Math.max(Number(minCount || 10), Number(post && post.commentCount || 0), source.length)
  var comments = source.map(normalizeComment).filter(function (item) {
    return !!item.content
  })
  var i = comments.length

  while (comments.length < targetCount) {
    comments.push(buildGeneratedComment(post, i))
    i++
  }

  return comments
}

function getCoverMeta(type) {
  var map = {
    cat: { emoji: '猫', avatar: CAT_IMAGE },
    dog: { emoji: '狗', avatar: DOG_IMAGE },
    paw: { emoji: '宠', avatar: FALLBACK_POST_IMAGE },
    cake: { emoji: '糕', avatar: FALLBACK_POST_IMAGE },
    health: { emoji: '诊', avatar: FALLBACK_POST_IMAGE },
    walk: { emoji: '游', avatar: FALLBACK_POST_IMAGE },
    guide: { emoji: '记', avatar: FALLBACK_POST_IMAGE },
    help: { emoji: '问', avatar: FALLBACK_POST_IMAGE }
  }
  return map[type] || map.paw
}

function isCloudFileId(value) {
  return /^cloud:\/\//.test(String(value || ''))
}

function getPostCover(post) {
  if (post._tempImageUrls && post._tempImageUrls.length) {
    return post._tempImageUrls[0]
  }
  if (post.coverImage && !isCloudFileId(post.coverImage)) {
    return post.coverImage
  }
  if (post.cover && !isCloudFileId(post.cover)) {
    return post.cover
  }
  if (post.gallery && post.gallery.length) {
    return post.gallery[0]
  }
  if (post.images && post.images.length) {
    return post.images[0]
  }
  return FALLBACK_POST_IMAGE
}

function buildGallery(post) {
  var gallery = []
  var i

  if (Array.isArray(post._tempImageUrls) && post._tempImageUrls.length) {
    for (i = 0; i < post._tempImageUrls.length; i++) {
      if (post._tempImageUrls[i]) {
        gallery.push(post._tempImageUrls[i])
      }
    }
  }

  if (Array.isArray(post.gallery) && post.gallery.length) {
    for (i = 0; i < post.gallery.length; i++) {
      if (post.gallery[i] && !isCloudFileId(post.gallery[i])) {
        gallery.push(post.gallery[i])
      }
    }
  }

  if (Array.isArray(post.images) && post.images.length) {
    for (i = 0; i < post.images.length; i++) {
      if (post.images[i] && !isCloudFileId(post.images[i])) {
        gallery.push(post.images[i])
      }
    }
  }

  if (!gallery.length) {
    gallery.push(getPostCover(post))
  }

  return gallery
}

function buildTopicTags(post) {
  var tags = []
  var sourceTags = post.tags || []
  var i

  if (Array.isArray(sourceTags)) {
    for (i = 0; i < sourceTags.length; i++) {
      if (sourceTags[i] && tags.indexOf(sourceTags[i]) === -1) {
        tags.push(sourceTags[i])
      }
    }
  }

  return tags.slice(0, 5)
}

function formatPublishTime(post) {
  var value = post.publishTime || post.createdAt || ''
  var safe = String(value || '').trim()

  if (!safe) {
    return ''
  }

  if (safe.length >= 16) {
    return safe.slice(0, 16)
  }

  return safe
}

function normalizeComments(post) {
  return ensurePostComments(post, 10)
}

function normalizePost(post) {
  var coverMeta = getCoverMeta(post.coverType)
  var userName = post.userName || (post.author && post.author.name) || post.author || '萌宠用户'
  var petName = post.petName === '小布丁' ? '布丁' : (post.petName || '毛孩子')
  var cover = getPostCover(post)
  var comments = normalizeComments(post)

  return {
    id: post.id || 'post_detail',
    _cloudId: post._cloudId || '',
    userId: post.userId || (post.author && post.author.userId) || '',
    title: post.title || '萌宠日常分享',
    content: post.content || '',
    userName: userName,
    avatarText: userName.slice(0, 1),
    avatarImage: post.avatarImage || post.avatarUrl || (post.author && (post.author.avatar || post.author.avatarFileId)) || (petName === '布丁' ? DOG_IMAGE : post.coverType === 'cat' ? CAT_IMAGE : coverMeta.avatar),
    petName: petName,
    breed: petName === '毛孩子' ? '蓝金渐层长毛猫' : petName === '布丁' ? '萨摩耶' : (post.breed || ''),
    channel: post.channel || post.tag || post.category || '推荐',
    gallery: buildGallery(post),
    likeCount: Number(post.likeCount || post.likes || 0),
    favoriteCount: Number(post.favoriteCount || post.favorites || post.collectCount || 0),
    commentCount: comments.length,
    liked: !!(post.liked || post.isLiked),
    favorited: !!(post.favorited || post.isFavorited),
    isFollowing: !!post.isFollowing,
    promotionActive: !!post.promotionActive,
    promotionLevel: Number(post.promotionLevel || 0),
    promotionAmount: Number(post.promotionAmount || 0),
    promotionStartedAt: post.promotionStartedAt || '',
    promotionEndedAt: post.promotionEndedAt || '',
    promotionOrderId: post.promotionOrderId || '',
    author: post.author || {
      name: userName,
      userId: post.userId || ''
    },
    publishTime: formatPublishTime(post),
    location: post.location || '',
    topics: buildTopicTags(post),
    comments: comments
  }
}

function getPromotionCoinCount(post) {
  var amount = Number(post && post.promotionAmount || 0)
  if (amount > 0) {
    return Math.round(amount / 100)
  }
  return Number(post && post.promotionLevel || 0)
}

Page({
  data: {
    postId: '',
    post: normalizePost(FALLBACK_POST),
    comments: [],
    currentImage: 0,
    commentText: '',
    isOwnPost: false,
    promotionStatus: {
      active: false,
      remainHours: 0,
      text: '未开启'
    },
    promotionPackages: promotion.PROMOTION_PACKAGES,
    selectedPromotionPackageId: '',
    promotionSheetVisible: false,
    promotionPaying: false,
    promotionCode: '',
    promotionCoinCount: 0
  },

  onLoad: function (options) {
    this.setData({
      postId: options.id || ''
    })
    this.loadPost(options.id)
  },

  onShow: function () {
    if (this.data.postId) {
      this.loadPost(this.data.postId)
    }
  },

  noop: function () {},

  loadPost: function (id) {
    var cached = postStorage.getDetailCache()
    var sourceList = postStorage.getPostList()
    var target = null
    var i

    if (cached && String(cached.id) === String(id)) {
      target = cached
    }

    if (!target && Array.isArray(sourceList)) {
      for (i = 0; i < sourceList.length; i++) {
        if (String(sourceList[i].id) === String(id)) {
          target = sourceList[i]
          break
        }
      }
    }

    var normalizedPost = userPostState.applyStateToPost(normalizePost(target || FALLBACK_POST))
    var nextComments = Array.isArray(normalizedPost.comments) ? clone(normalizedPost.comments) : []

    this.setData({
      post: normalizedPost,
      comments: nextComments,
      currentImage: 0,
      isOwnPost: promotion.isPostOwner(normalizedPost),
      promotionStatus: promotion.getPromotionStatus(normalizedPost),
      promotionCoinCount: getPromotionCoinCount(normalizedPost)
    })
  },

  goBack: function () {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
      return
    }

    wx.redirectTo({
      url: '/pages/forum/index'
    })
  },

  handleSwiperChange: function (e) {
    this.setData({
      currentImage: e.detail.current
    })
  },

  toggleFollow: function () {
    var nextFollow = !this.data.post.isFollowing
    var post = this.data.post
    var targetUserId = socialState.resolveUserKeyFromPost(post)

    if (!targetUserId) {
      return
    }

    socialState.saveProfileSnapshot(socialState.getCurrentProfileSnapshot())

    if (nextFollow) {
      socialState.followUser(socialState.saveProfileSnapshotFromPost(post) || {
        id: targetUserId,
        nickname: post.userName,
        avatar: post.avatarImage,
        cover: post.gallery && post.gallery.length ? post.gallery[0] : '',
        location: post.location || ''
      })
    } else {
      socialState.unfollowUser(targetUserId)
    }

    this.setData({
      'post.isFollowing': nextFollow
    })
    this.persistFollowStateByAuthor(targetUserId, nextFollow)
  },

  toggleLike: function () {
    var post = this.data.post
    var liked = !post.liked
    var nextCount = post.likeCount + (liked ? 1 : -1)

    if (nextCount < 0) {
      nextCount = 0
    }

    this.setData({
      'post.liked': liked,
      'post.likeCount': nextCount
    })
    userPostState.setLiked(post.id, liked)
    this.persistPostAction({
      isLiked: liked,
      liked: liked,
      likes: nextCount,
      likeCount: nextCount
    })
  },

  toggleFavorite: function () {
    var post = this.data.post
    var favorited = !post.favorited
    var nextCount = post.favoriteCount + (favorited ? 1 : -1)

    if (nextCount < 0) {
      nextCount = 0
    }

    this.setData({
      'post.favorited': favorited,
      'post.favoriteCount': nextCount
    })
    userPostState.setFavorited(post.id, favorited)
    this.persistPostAction({
      isFavorited: favorited,
      favorited: favorited,
      favorites: nextCount,
      favoriteCount: nextCount,
      collectCount: nextCount
    })
  },

  bindCommentInput: function (e) {
    this.setData({
      commentText: e.detail.value
    })
  },

  submitComment: function () {
    var text = String(this.data.commentText || '').trim()
    var comments
    var nextCommentCount

    if (!text) {
      wx.showToast({
        title: '先写点想说的吧',
        icon: 'none'
      })
      return
    }

    comments = this.data.comments.slice()
    comments.unshift({
      id: 'comment_' + Date.now(),
      userName: '我',
      avatarText: '我',
      content: text,
      time: '刚刚',
      likes: 0,
      liked: false
    })
    nextCommentCount = comments.length

    this.setData({
      comments: comments,
      commentText: '',
      'post.commentCount': nextCommentCount,
      'post.comments': comments
    })
    this.persistPostAction({
      commentCount: nextCommentCount,
      comments: comments
    })
  },

  toggleCommentLike: function (e) {
    var id = e.currentTarget.dataset.id
    var comments = this.data.comments.slice()
    var changed = false
    var i

    for (i = 0; i < comments.length; i++) {
      if (comments[i].id === id) {
        comments[i].liked = !comments[i].liked
        comments[i].likes += comments[i].liked ? 1 : -1
        if (comments[i].likes < 0) {
          comments[i].likes = 0
        }
        changed = true
        break
      }
    }

    this.setData({
      comments: comments,
      'post.comments': comments
    })

    if (changed) {
      this.persistPostAction({
        comments: comments
      })
    }
  },

  sharePost: function () {
    wx.showToast({
      title: '已生成分享卡片',
      icon: 'success'
    })
  },

  openPromotionSheet: function () {
    this.setData({
      promotionSheetVisible: true
    })
  },

  closePromotionSheet: function () {
    this.setData({
      promotionSheetVisible: false
    })
  },

  selectPromotionPackage: function (e) {
    this.setData({
      selectedPromotionPackageId: e.currentTarget.dataset.id
    })
  },

  bindPromotionCodeInput: function (e) {
    this.setData({
      promotionCode: e.detail.value
    })
  },

  submitPromotionPayment: function () {
    var packageId = this.data.selectedPromotionPackageId
    var post = this.data.post
    var promotionCode = String(this.data.promotionCode || '').trim()

    if (!packageId) {
      wx.showToast({
        title: '请选择推流套餐',
        icon: 'none'
      })
      return
    }
    if (!promotionCode) {
      wx.showToast({
        title: '请输入优惠码或密钥',
        icon: 'none'
      })
      return
    }

    this.setData({
      promotionPaying: true
    })
    wx.showLoading({
      title: '核销中...'
    })

    promotion.purchasePromotion(post, packageId, promotionCode).then(function (patch) {
      var nextPost = Object.assign({}, this.data.post, patch)
      wx.hideLoading()
      this.setData({
        post: nextPost,
        promotionSheetVisible: false,
        promotionStatus: promotion.getPromotionStatus(nextPost),
        promotionCoinCount: getPromotionCoinCount(nextPost),
        promotionCode: ''
      })
      wx.showToast({
        title: '推流已开启',
        icon: 'success'
      })
    }.bind(this)).catch(function (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '支付未完成，未开启推流',
        icon: 'none'
      })
    }).then(function () {
      this.setData({
        promotionPaying: false
      })
    }.bind(this))
  },

  persistPostAction: function (patch) {
    var sourceList = postStorage.getPostList()
    var nextList
    var i
    var cloudTarget = null

    postStorage.setDetailCache(Object.assign({}, this.data.post, patch))

    if (!Array.isArray(sourceList)) {
      cloudPosts.syncPostPatch(this.data.post, patch).catch(function (err) {
        console.warn('帖子详情云同步失败:', err)
      })
      return
    }

    nextList = sourceList.slice()
    for (i = 0; i < nextList.length; i++) {
      if (String(nextList[i].id) === String(this.data.post.id)) {
        nextList[i] = Object.assign({}, nextList[i], patch)
        cloudTarget = nextList[i]
        break
      }
    }

    postStorage.setPostList(nextList)

    cloudPosts.syncPostPatch(cloudTarget || this.data.post, patch).then(function (syncRes) {
      if (!syncRes || !syncRes.synced) {
        console.warn('帖子详情云同步未完成:', syncRes && syncRes.reason)
      }
    }).catch(function (err) {
      console.warn('帖子详情云同步失败:', err)
    })
  }

  ,

  persistFollowStateByAuthor: function (targetUserId, isFollowing) {
    var sourceList = postStorage.getPostList()
    var nextList
    var i
    var item
    var itemAuthorId

    postStorage.setDetailCache(Object.assign({}, this.data.post, {
      isFollowing: isFollowing
    }))

    if (!Array.isArray(sourceList) || !sourceList.length) {
      return
    }

    nextList = sourceList.slice()
    for (i = 0; i < nextList.length; i++) {
      item = nextList[i]
      itemAuthorId = socialState.resolveUserKeyFromPost(item)
      if (String(itemAuthorId) === String(targetUserId)) {
        nextList[i] = Object.assign({}, item, {
          isFollowing: isFollowing,
          userId: itemAuthorId,
          author: Object.assign({}, item.author || {}, {
            userId: itemAuthorId
          })
        })
      }
    }

    postStorage.setPostList(nextList)
  }
})

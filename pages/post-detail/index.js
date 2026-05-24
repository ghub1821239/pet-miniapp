var POSTS_KEY = 'postList'
var LEGACY_POSTS_KEY = 'forumPosts'
var DETAIL_CACHE_KEY = 'currentPostDetail'
var cloudPosts = require('../../utils/cloudPosts')
var CAT_IMAGE = '/assets/mock/pets/pet-maohaizi.jpg.jpg'
var DOG_IMAGE = '/assets/mock/pets/pet-buding.jpg.jpg'
var FALLBACK_POST_IMAGE = DOG_IMAGE

var COMMENT_LIST = [
  {
    id: 'comment_1',
    userName: '糯米观察员',
    avatarText: '糯',
    content: '这张真的太有生活感了，毛孩子的表情很像在认真营业。',
    time: '刚刚',
    likes: 18,
    liked: false
  },
  {
    id: 'comment_2',
    userName: '布丁铲屎官',
    avatarText: '布',
    content: '同款角度学到了，回头我也试试这样拍。',
    time: '12分钟前',
    likes: 9,
    liked: true
  },
  {
    id: 'comment_3',
    userName: '春日猫猫册',
    avatarText: '春',
    content: '好温柔的一条动态，配图和文字都很治愈。',
    time: '1小时前',
    likes: 6,
    liked: false
  }
]

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

function clone(data) {
  return JSON.parse(JSON.stringify(data))
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
  var channel = post.channel || post.tag || post.category || '推荐'
  var petName = post.petName || '萌宠'
  var i

  if (Array.isArray(sourceTags)) {
    for (i = 0; i < sourceTags.length; i++) {
      if (sourceTags[i] && tags.indexOf(sourceTags[i]) === -1) {
        tags.push(sourceTags[i])
      }
    }
  }

  if (channel && tags.indexOf(channel) === -1) {
    tags.unshift(channel)
  }
  if (petName && tags.indexOf(petName) === -1) {
    tags.push(petName)
  }

  return tags.slice(0, 5)
}

function normalizePost(post) {
  var coverMeta = getCoverMeta(post.coverType)
  var userName = post.userName || (post.author && post.author.name) || post.author || '萌宠用户'
  var petName = post.petName === '小布丁' ? '布丁' : (post.petName || '毛孩子')
  var cover = getPostCover(post)

  return {
    id: post.id || 'post_detail',
    _cloudId: post._cloudId || '',
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
    favoriteCount: Number(post.favoriteCount || post.favorites || Math.max(8, Math.round(Number(post.likes || post.likeCount || 0) * 0.62))),
    commentCount: Number(post.commentCount || 3),
    liked: !!(post.liked || post.isLiked),
    favorited: !!(post.favorited || post.isFavorited),
    isFollowing: !!post.isFollowing,
    publishTime: post.publishTime || '今天 15:31',
    location: post.location || '萌宠广场',
    topics: buildTopicTags(post),
    comments: Array.isArray(post.comments) ? clone(post.comments) : []
  }
}

Page({
  data: {
    postId: '',
    post: normalizePost(FALLBACK_POST),
    comments: clone(COMMENT_LIST),
    currentImage: 0,
    commentText: ''
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

  loadPost: function (id) {
    var cached = wx.getStorageSync(DETAIL_CACHE_KEY)
    var posts = wx.getStorageSync(POSTS_KEY)
    var legacyPosts = wx.getStorageSync(LEGACY_POSTS_KEY)
    var sourceList = Array.isArray(posts) && posts.length ? posts : legacyPosts
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

    var normalizedPost = normalizePost(target || FALLBACK_POST)
    var nextComments = Array.isArray(normalizedPost.comments) && normalizedPost.comments.length
      ? clone(normalizedPost.comments)
      : clone(COMMENT_LIST)

    this.setData({
      post: normalizedPost,
      comments: nextComments,
      currentImage: 0
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
    this.setData({
      'post.isFollowing': nextFollow
    })
    this.persistPostAction({
      isFollowing: nextFollow
    })
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
    nextCommentCount = this.data.post.commentCount + 1
    comments.unshift({
      id: 'comment_' + Date.now(),
      userName: '我',
      avatarText: '我',
      content: text,
      time: '刚刚',
      likes: 0,
      liked: false
    })

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

  persistPostAction: function (patch) {
    var posts = wx.getStorageSync(POSTS_KEY)
    var legacyPosts = wx.getStorageSync(LEGACY_POSTS_KEY)
    var sourceList = Array.isArray(posts) && posts.length ? posts : legacyPosts
    var nextList
    var i
    var cloudTarget = null

    wx.setStorageSync(DETAIL_CACHE_KEY, Object.assign({}, this.data.post, patch))

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

    wx.setStorageSync(POSTS_KEY, nextList)
    wx.setStorageSync(LEGACY_POSTS_KEY, nextList)

    cloudPosts.syncPostPatch(cloudTarget || this.data.post, patch).then(function (syncRes) {
      if (!syncRes || !syncRes.synced) {
        console.warn('帖子详情云同步未完成:', syncRes && syncRes.reason)
      }
    }).catch(function (err) {
      console.warn('帖子详情云同步失败:', err)
    })
  }
})

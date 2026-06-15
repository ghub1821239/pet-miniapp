var postStorage = require('../../utils/post-storage')
var socialState = require('../../utils/social-state')
var userPostState = require('../../utils/user-post-state')

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function getAuthorName(post) {
  if (post.userName) return post.userName
  if (post.author && post.author.name) return post.author.name
  return '萌宠家长'
}

function getCoverImage(post) {
  if (post.coverImage) return post.coverImage
  if (post.cover) return post.cover
  if (Array.isArray(post.images) && post.images.length) return post.images[0]
  if (Array.isArray(post.gallery) && post.gallery.length) return post.gallery[0]
  return '/assets/mock/pets/pet-buding.jpg.jpg'
}

function formatPostDate(text) {
  var raw = String(text || '')
  if (!raw) return '刚刚'
  if (raw.indexOf(' ') > -1) return raw.split(' ')[0]
  return raw
}

function normalizePost(post, interactionText) {
  return {
    id: post.id || 'post_' + Date.now(),
    title: post.title || '萌宠日常分享',
    summary: post.content || '记录和毛孩子有关的日常瞬间。',
    coverImage: getCoverImage(post),
    createdDate: formatPostDate(post.createdAt || post.publishTime),
    category: post.category || post.channel || post.tag || '晒宠日常',
    userName: getAuthorName(post),
    interactionText: interactionText || ''
  }
}

function buildInteractedPosts() {
  var list = postStorage.getPostList()
  var likedMap = {}
  var favoritedMap = {}
  var likedIds = userPostState.getLikedPostIds()
  var favoritedIds = userPostState.getFavoritedPostIds()
  var result = []
  var seen = {}
  var i
  var post
  var key
  var interactionText

  for (i = 0; i < likedIds.length; i++) {
    likedMap[String(likedIds[i])] = true
  }
  for (i = 0; i < favoritedIds.length; i++) {
    favoritedMap[String(favoritedIds[i])] = true
  }

  for (i = 0; i < list.length; i++) {
    post = list[i]
    key = String(post && post.id)
    if (!key || seen[key]) {
      continue
    }
    interactionText = ''
    if (likedMap[key] && favoritedMap[key]) {
      interactionText = '已点赞 · 已收藏'
    } else if (likedMap[key]) {
      interactionText = '已点赞'
    } else if (favoritedMap[key]) {
      interactionText = '已收藏'
    }

    if (interactionText) {
      seen[key] = true
      result.push(normalizePost(post, interactionText))
    }
  }

  return result
}

Page({
  data: {
    title: '',
    mode: 'users',
    users: [],
    posts: []
  },

  onLoad: function (options) {
    this.loadPage(options || {})
  },

  onShow: function () {
    var pages = getCurrentPages()
    var current = pages[pages.length - 1]
    if (current && current.options) {
      this.loadPage(current.options)
    }
  },

  loadPage: function (options) {
    var type = options.type || 'following'
    var userId = socialState.getCurrentProfileId()
    var title = ''

    if (type === 'following') {
      title = '我的关注'
      this.setData({
        title: title,
        mode: 'users',
        users: socialState.getFollowingList(userId),
        posts: []
      })
      return
    }

    if (type === 'followers') {
      title = '关注我的人'
      this.setData({
        title: title,
        mode: 'users',
        users: socialState.getFollowersList(userId),
        posts: []
      })
      return
    }

    title = 'Likes & Saves'
    this.setData({
      title: title,
      mode: 'posts',
      users: [],
      posts: buildInteractedPosts()
    })
  },

  goBack: function () {
    wx.navigateBack()
  },

  handleUserTap: function (e) {
    var userId = e.currentTarget.dataset.id
    if (!userId) {
      return
    }

    wx.navigateTo({
      url: '/pages/user-profile/index?id=' + encodeURIComponent(userId)
    })
  },

  handlePostTap: function (e) {
    var id = e.currentTarget.dataset.id
    var posts = postStorage.getPostList()
    var target = null
    var i

    for (i = 0; i < posts.length; i++) {
      if (String(posts[i].id) === String(id)) {
        target = posts[i]
        break
      }
    }

    if (target) {
      postStorage.setDetailCache(clone(target))
    }

    wx.navigateTo({
      url: '/pages/post-detail/index?id=' + encodeURIComponent(id)
    })
  }
})

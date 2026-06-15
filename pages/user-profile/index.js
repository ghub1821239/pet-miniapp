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

function getAuthorAvatar(post) {
  if (post.avatarImage) return post.avatarImage
  if (post.avatarUrl) return post.avatarUrl
  if (post.author && post.author.avatar) return post.author.avatar
  return '/assets/mock/pets/pet-maohaizi.jpg.jpg'
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

function normalizePost(post) {
  var likeCount = Number(post.likeCount || post.likes || 0)
  var favoriteCount = Number(post.favoriteCount || post.favorites || post.collectCount || 0)
  return {
    id: post.id || 'post_' + Date.now(),
    userId: socialState.resolveUserKeyFromPost(post),
    title: post.title || '萌宠日常分享',
    summary: post.content || '记录和毛孩子有关的日常瞬间。',
    coverImage: getCoverImage(post),
    createdDate: formatPostDate(post.createdAt || post.publishTime),
    category: post.category || post.channel || post.tag || '晒宠日常',
    likeCount: likeCount,
    favoriteCount: favoriteCount,
    commentCount: Number(post.commentCount || 0),
    userName: getAuthorName(post),
    avatarImage: getAuthorAvatar(post)
  }
}

Page({
  data: {
    userId: '',
    profile: null,
    posts: [],
    isFollowing: false,
    followers: 0,
    following: 0
  },

  onLoad: function (options) {
    this.setData({
      userId: options.id || ''
    })
    this.loadPage()
  },

  onShow: function () {
    if (this.data.userId) {
      this.loadPage()
    }
  },

  loadPage: function () {
    var userId = this.data.userId
    var snapshot = socialState.getProfileSnapshot(userId)
    var posts = []
    var sourceList = postStorage.getPostList()
    var counts
    var i
    var normalized

    if (Array.isArray(sourceList)) {
      for (i = 0; i < sourceList.length; i++) {
        normalized = normalizePost(sourceList[i])
        if (String(normalized.userId) === String(userId)) {
          posts.push(normalized)
        }
      }
    }

    counts = socialState.getSocialCounts(userId)

    this.setData({
      profile: snapshot || socialState.buildSnapshot({
        id: userId,
        nickname: '萌宠用户'
      }),
      posts: userPostState.applyStateToPosts(posts),
      isFollowing: socialState.isFollowingUser(userId),
      followers: counts.followers,
      following: counts.following
    })
  },

  goBack: function () {
    wx.navigateBack()
  },

  toggleFollow: function () {
    var profile = this.data.profile || {}
    var userId = this.data.userId
    var nextFollow = !this.data.isFollowing

    if (!userId) {
      return
    }

    if (nextFollow) {
      socialState.followUser(profile)
    } else {
      socialState.unfollowUser(userId)
    }

    this.loadPage()
  },

  handlePostTap: function (e) {
    var id = e.currentTarget.dataset.id
    var posts = this.data.posts || []
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

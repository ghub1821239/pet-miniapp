// pages/forum/index.js
var FORUM_KEY = 'forumPosts'

function getNowText() {
  var d = new Date()
  var y = d.getFullYear()
  var m = d.getMonth() + 1
  var day = d.getDate()
  var h = d.getHours()
  var min = d.getMinutes()

  m = m < 10 ? '0' + m : m
  day = day < 10 ? '0' + day : day
  h = h < 10 ? '0' + h : h
  min = min < 10 ? '0' + min : min

  return y + '-' + m + '-' + day + ' ' + h + ':' + min
}

Page({
  data: {
    sections: ['安利', '日常分享', '交友'],
    sectionIndex: 1,
    form: {
      content: '',
      images: [],
      locationName: ''
    },
    posts: []
  },

  onShow: function () {
    this.loadPosts()
  },

  loadPosts: function () {
    var posts = wx.getStorageSync(FORUM_KEY)

    if (!posts || posts.length === 0) {
      posts = [
        {
          id: 'demo_1',
          user: '萌宠管理员',
          avatar: '🐾',
          section: '安利',
          content: '欢迎来到萌宠论坛！这里可以发图文、带定位、评论互动，后面还可以继续扩展帖子详情页。',
          images: [],
          locationName: '线上社区',
          createdAt: getNowText(),
          liked: false,
          likeCount: 3,
          comments: [
            {
              id: 'c1',
              user: '小可爱',
              text: '好耶，终于有宠物论坛了！'
            }
          ]
        }
      ]
      wx.setStorageSync(FORUM_KEY, posts)
    }

    var i
    for (i = 0; i < posts.length; i++) {
      if (typeof posts[i].commentDraft === 'undefined') {
        posts[i].commentDraft = ''
      }
    }

    this.setData({
      posts: posts
    })
  },

  savePosts: function (posts) {
    var saveList = []
    var i
    var item

    for (i = 0; i < posts.length; i++) {
      item = JSON.parse(JSON.stringify(posts[i]))
      item.commentDraft = ''
      saveList.push(item)
    }

    wx.setStorageSync(FORUM_KEY, saveList)
  },

  bindPostContent: function (e) {
    this.setData({
      'form.content': e.detail.value
    })
  },

  changeSection: function (e) {
    this.setData({
      sectionIndex: Number(e.detail.value)
    })
  },

  choosePostImages: function () {
    var that = this
    wx.chooseImage({
      count: 3,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.setData({
          'form.images': res.tempFilePaths
        })
      }
    })
  },

  chooseLocation: function () {
    var that = this
    wx.chooseLocation({
      success: function (res) {
        that.setData({
          'form.locationName': res.name || res.address || '已选择位置'
        })
      }
    })
  },

  submitPost: function () {
    var form = this.data.form
    var posts = this.data.posts
    var section = this.data.sections[this.data.sectionIndex]

    if (!form.content) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      })
      return
    }

    posts.unshift({
      id: 'post_' + Date.now(),
      user: '我',
      avatar: '🐶',
      section: section,
      content: form.content,
      images: form.images,
      locationName: form.locationName,
      createdAt: getNowText(),
      liked: false,
      likeCount: 0,
      comments: [],
      commentDraft: ''
    })

    this.savePosts(posts)

    this.setData({
      posts: posts,
      sectionIndex: 1,
      form: {
        content: '',
        images: [],
        locationName: ''
      }
    })

    wx.showToast({
      title: '发布成功',
      icon: 'success'
    })
  },

  toggleLike: function (e) {
    var index = e.currentTarget.dataset.index
    var posts = this.data.posts

    posts[index].liked = !posts[index].liked
    if (posts[index].liked) {
      posts[index].likeCount = (posts[index].likeCount || 0) + 1
    } else {
      posts[index].likeCount = (posts[index].likeCount || 1) - 1
    }

    this.setData({
      posts: posts
    })
    this.savePosts(posts)
  },

  inputComment: function (e) {
    var index = e.currentTarget.dataset.index
    var path = 'posts[' + index + '].commentDraft'
    this.setData({
      [path]: e.detail.value
    })
  },

  addComment: function (e) {
    var index = e.currentTarget.dataset.index
    var posts = this.data.posts
    var text = posts[index].commentDraft

    if (!text) {
      wx.showToast({
        title: '评论不能为空',
        icon: 'none'
      })
      return
    }

    posts[index].comments.unshift({
      id: 'comment_' + Date.now(),
      user: '我',
      text: text
    })
    posts[index].commentDraft = ''

    this.setData({
      posts: posts
    })
    this.savePosts(posts)
  }
})
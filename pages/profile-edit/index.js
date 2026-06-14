var auth = require('../../utils/auth')
var profileData = require('../../utils/profile-data')
var userStorage = require('../../utils/user-storage')

Page({
  data: {
    saving: false,
    tagInput: '',
    tags: [],
    form: {
      nickname: '',
      profileId: '',
      location: '',
      bio: '',
      avatar: '',
      cover: ''
    }
  },

  onShow: function () {
    this.loadProfile()
  },

  loadProfile: function () {
    var profile = profileData.normalizeProfile(userStorage.getValue(profileData.PROFILE_KEY), auth.getCurrentUser() || {})
    this.setData({
      form: {
        nickname: profile.nickname,
        profileId: profile.profileId,
        location: profile.location,
        bio: profile.bio,
        avatar: profile.avatar,
        cover: profile.cover
      },
      tags: profile.tags || []
    })
  },

  bindInput: function (e) {
    var field = e.currentTarget.dataset.field
    this.setData({
      ['form.' + field]: e.detail.value
    })
  },

  bindTagInput: function (e) {
    this.setData({
      tagInput: e.detail.value
    })
  },

  addTag: function () {
    var text = String(this.data.tagInput || '').trim()
    var tags = this.data.tags.slice()
    if (!text) return
    if (tags.indexOf(text) === -1 && tags.length < 4) {
      tags.push(text)
    }
    this.setData({
      tags: tags,
      tagInput: ''
    })
  },

  removeTag: function (e) {
    var index = Number(e.currentTarget.dataset.index)
    var tags = this.data.tags.slice()
    tags.splice(index, 1)
    this.setData({
      tags: tags
    })
  },

  chooseAvatar: function () {
    this.chooseImageForField('avatar')
  },

  chooseCover: function () {
    this.chooseImageForField('cover')
  },

  chooseImageForField: function (field) {
    var that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.setData({
          ['form.' + field]: res.tempFilePaths[0]
        })
      }
    })
  },

  saveProfile: function () {
    var that = this
    var form = this.data.form
    var oldProfile = profileData.normalizeProfile(userStorage.getValue(profileData.PROFILE_KEY), auth.getCurrentUser() || {})
    var tags = this.data.tags.length ? this.data.tags : ['养宠记录']

    if (!String(form.nickname || '').trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' })
      return
    }

    this.setData({ saving: true })

    auth.updateProfile({
      nickname: String(form.nickname || '').trim()
    }).then(function (res) {
      var cloudUser = res && res.user ? res.user : (auth.getCurrentUser() || {})
      var profile = profileData.normalizeProfile({
        nickname: cloudUser.nickname || form.nickname,
        profileId: cloudUser.account || oldProfile.profileId,
        location: String(form.location || '').trim() || profileData.DEFAULT_PROFILE.location,
        bio: String(form.bio || '').trim() || profileData.DEFAULT_PROFILE.bio,
        tags: tags,
        avatar: form.avatar || profileData.DEFAULT_PROFILE.avatar,
        cover: form.cover || profileData.DEFAULT_PROFILE.cover,
        following: oldProfile.following,
        followers: oldProfile.followers,
        likesAndSaves: oldProfile.likesAndSaves
      }, cloudUser)

      userStorage.setValue(profileData.PROFILE_KEY, profile)
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(function () {
        wx.navigateBack()
      }, 500)
      that.setData({ saving: false })
    }).catch(function (err) {
      wx.showToast({ title: err && err.message ? err.message : '保存失败', icon: 'none' })
      that.setData({ saving: false })
    })
  }
})

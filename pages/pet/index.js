// pages/pet/index.js
var PETS_KEY = 'pets'
var REMINDER_KEY = 'petReminders'
var COMMUNITY_KEY = 'forumPosts'
var IDENTIFY_KEY = 'identifyHistory'

function getToday() {
  var d = new Date()
  var y = d.getFullYear()
  var m = d.getMonth() + 1
  var day = d.getDate()
  m = m < 10 ? '0' + m : m
  day = day < 10 ? '0' + day : day
  return y + '-' + m + '-' + day
}

function calcAgeText(birthday) {
  if (!birthday) return ''

  var birth = new Date(birthday.replace(/-/g, '/'))
  var now = new Date()

  var years = now.getFullYear() - birth.getFullYear()
  var months = now.getMonth() - birth.getMonth()

  if (now.getDate() < birth.getDate()) {
    months = months - 1
  }

  if (months < 0) {
    years = years - 1
    months = months + 12
  }

  if (years < 0) return ''
  if (years === 0) return months + '个月'
  return years + '岁'
}

function toTagList(text) {
  if (!text) return []
  return text.split(/[,，、\s]+/).filter(Boolean).slice(0, 3)
}

Page({
  data: {
    pets: [],
    expandedId: '',
    showForm: false,
    formMode: 'add',
    defaultAvatars: ['🐶', '🐱', '🐰', '🐹', '🦊', '🐼'],
    overview: {
      petCount: 0,
      reminderCount: 0,
      diaryCount: 0,
      identifyCount: 0
    },
    quickActions: [
      { key: 'add', text: '新增宠物', icon: '➕' },
      { key: 'identify', text: '识别导入', icon: '📷' },
      { key: 'calendar', text: '生日提醒', icon: '📅' },
      { key: 'edit', text: '编辑资料', icon: '✏️' }
    ],
    form: {
      id: '',
      name: '',
      type: '',
      breed: '',
      birthday: '',
      age: '',
      likes: '',
      personality: '',
      avatarType: 'emoji',
      avatarValue: '🐶'
    }
  },

  onShow: function () {
    this.loadPets()
    this.loadOverview()
  },

  loadPets: function () {
    var pets = wx.getStorageSync(PETS_KEY) || []
    var i
    var list = []
    var item

    for (i = 0; i < pets.length; i++) {
      item = JSON.parse(JSON.stringify(pets[i]))
      item.personalityTags = toTagList(item.personality)
      item.likeTags = toTagList(item.likes)
      list.push(item)
    }

    this.setData({
      pets: list
    })
  },

  loadOverview: function () {
    var pets = wx.getStorageSync(PETS_KEY) || []
    var reminders = wx.getStorageSync(REMINDER_KEY) || []
    var posts = wx.getStorageSync(COMMUNITY_KEY) || []
    var identifyHistory = wx.getStorageSync(IDENTIFY_KEY) || []

    this.setData({
      overview: {
        petCount: pets.length,
        reminderCount: reminders.length,
        diaryCount: posts.length,
        identifyCount: identifyHistory.length
      }
    })
  },

  resetForm: function () {
    this.setData({
      form: {
        id: '',
        name: '',
        type: '',
        breed: '',
        birthday: getToday(),
        age: '',
        likes: '',
        personality: '',
        avatarType: 'emoji',
        avatarValue: '🐶'
      }
    })
  },

  openAdd: function () {
    this.resetForm()
    this.setData({
      showForm: true,
      formMode: 'add'
    })
  },

  openEdit: function (e) {
    var id = e.currentTarget.dataset.id
    var pets = this.data.pets
    var i
    var target = null

    for (i = 0; i < pets.length; i++) {
      if (pets[i].id === id) {
        target = JSON.parse(JSON.stringify(pets[i]))
        break
      }
    }

    if (!target) return

    delete target.personalityTags
    delete target.likeTags

    this.setData({
      showForm: true,
      formMode: 'edit',
      form: target
    })
  },

  openPrimaryEdit: function () {
    if (this.data.pets.length > 0) {
      this.openEdit({
        currentTarget: {
          dataset: {
            id: this.data.pets[0].id
          }
        }
      })
      return
    }

    this.openAdd()
  },

  closeForm: function () {
    this.setData({
      showForm: false
    })
  },

  noop: function () {},

  bindInput: function (e) {
    var field = e.currentTarget.dataset.field
    var form = this.data.form
    form[field] = e.detail.value
    this.setData({
      form: form
    })
  },

  changeBirthday: function (e) {
    var value = e.detail.value
    var form = this.data.form
    form.birthday = value
    if (!form.age) {
      form.age = calcAgeText(value)
    }
    this.setData({
      form: form
    })
  },

  chooseDefaultAvatar: function (e) {
    var value = e.currentTarget.dataset.value
    var form = this.data.form
    form.avatarType = 'emoji'
    form.avatarValue = value
    this.setData({
      form: form
    })
  },

  uploadAvatar: function () {
    var that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var form = that.data.form
        form.avatarType = 'image'
        form.avatarValue = res.tempFilePaths[0]
        that.setData({
          form: form
        })
      }
    })
  },

  savePet: function () {
    var form = this.data.form
    var pets = wx.getStorageSync(PETS_KEY) || []
    var i

    if (!form.name) {
      wx.showToast({
        title: '请先填写宠物名称',
        icon: 'none'
      })
      return
    }

    if (!form.age && form.birthday) {
      form.age = calcAgeText(form.birthday)
    }

    if (this.data.formMode === 'add') {
      form.id = 'pet_' + Date.now()
      pets.unshift(form)
    } else {
      for (i = 0; i < pets.length; i++) {
        if (pets[i].id === form.id) {
          pets[i] = form
          break
        }
      }
    }

    wx.setStorageSync(PETS_KEY, pets)

    this.setData({
      showForm: false
    })

    this.loadPets()
    this.loadOverview()

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })
  },

  toggleDetail: function (e) {
    var id = e.currentTarget.dataset.id
    this.setData({
      expandedId: this.data.expandedId === id ? '' : id
    })
  },

  deletePet: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var pets = wx.getStorageSync(PETS_KEY) || []
    var newPets = []
    var i

    wx.showModal({
      title: '提示',
      content: '确定删除这只宠物吗？',
      success: function (res) {
        if (res.confirm) {
          for (i = 0; i < pets.length; i++) {
            if (pets[i].id !== id) {
              newPets.push(pets[i])
            }
          }

          wx.setStorageSync(PETS_KEY, newPets)
          that.setData({
            expandedId: ''
          })
          that.loadPets()
          that.loadOverview()
        }
      }
    })
  },

  handleQuickAction: function (e) {
    var key = e.currentTarget.dataset.key

    if (key === 'add') {
      this.openAdd()
      return
    }

    if (key === 'identify') {
      wx.navigateTo({
        url: '/pages/identify/index'
      })
      return
    }

    if (key === 'calendar') {
      wx.navigateTo({
        url: '/pages/calendar/index'
      })
      return
    }

    this.openPrimaryEdit()
  },

  importByIdentify: function () {
    wx.navigateTo({
      url: '/pages/identify/index'
    })
  }
})

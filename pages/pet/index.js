// pages/pet/index.js
var PETS_KEY = 'pets'

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

Page({
  data: {
    pets: [],
    expandedId: '',
    showForm: false,
    formMode: 'add',
    defaultAvatars: ['🐶', '🐱', '🐰', '🐹', '🦊', '🐼'],
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
  },

  loadPets: function () {
    var pets = wx.getStorageSync(PETS_KEY) || []
    this.setData({
      pets: pets
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

    this.setData({
      showForm: true,
      formMode: 'edit',
      form: target
    })
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
        }
      }
    })
  }
})
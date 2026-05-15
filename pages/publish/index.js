var COMMUNITY_KEY = 'forumPosts'
var PETS_KEY = 'pets'

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
    sections: ['日常分享', '找玩伴', '求助', '同城', '周边'],
    sectionIndex: 0,
    tagOptions: ['柴犬', '猫猫', '同城', '找玩伴', '遛狗', '日常', '求助', '拍照打卡'],
    pets: [],
    petNames: ['暂不关联'],
    petIndex: 0,
    form: {
      title: '',
      content: '',
      images: [],
      videoCover: '',
      mediaType: 'image',
      petName: '',
      breed: '',
      city: '天津',
      distance: '同城',
      tagsText: '',
      showLocation: true
    }
  },

  onLoad: function () {
    this.loadPets()
  },

  loadPets: function () {
    var pets = wx.getStorageSync(PETS_KEY) || []
    var petNames = ['暂不关联']
    var i

    for (i = 0; i < pets.length; i++) {
      petNames.push(pets[i].name)
    }

    this.setData({
      pets: pets,
      petNames: petNames
    })
  },

  bindInput: function (e) {
    var field = e.currentTarget.dataset.field
    this.setData({
      ['form.' + field]: e.detail.value
    })
  },

  chooseImages: function () {
    var that = this
    wx.chooseImage({
      count: 3,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.setData({
          'form.images': res.tempFilePaths,
          'form.mediaType': 'image',
          'form.videoCover': ''
        })
      }
    })
  },

  chooseVideo: function () {
    var that = this
    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      compressed: true,
      success: function (res) {
        that.setData({
          'form.videoCover': res.thumbTempFilePath || '',
          'form.images': [],
          'form.mediaType': 'video'
        })
      }
    })
  },

  changeSection: function (e) {
    this.setData({
      sectionIndex: Number(e.detail.value)
    })
  },

  changePet: function (e) {
    var index = Number(e.detail.value)
    var pets = this.data.pets
    var selectedPet = index > 0 ? pets[index - 1] : null

    this.setData({
      petIndex: index,
      'form.petName': selectedPet ? selectedPet.name : '',
      'form.breed': selectedPet ? selectedPet.breed : ''
    })
  },

  switchLocation: function (e) {
    this.setData({
      'form.showLocation': e.detail.value
    })
  },

  submitPost: function () {
    var form = this.data.form
    var list = wx.getStorageSync(COMMUNITY_KEY) || []
    var section = this.data.sections[this.data.sectionIndex]
    var tags = []

    if (!form.title) {
      wx.showToast({
        title: '请填写标题',
        icon: 'none'
      })
      return
    }

    if (!form.content) {
      wx.showToast({
        title: '请填写正文',
        icon: 'none'
      })
      return
    }

    if (form.tagsText) {
      tags = form.tagsText.split(/[,，\s]+/).filter(Boolean)
    }

    if (tags.length === 0) {
      tags.push(section)
    }

    list.unshift({
      id: 'community_' + Date.now(),
      title: form.title,
      content: form.content,
      images: form.images,
      videoCover: form.videoCover,
      mediaType: form.mediaType,
      userName: '我',
      avatar: '🐾',
      petName: form.petName || '我家宝贝',
      breed: form.breed || '萌宠',
      city: form.showLocation ? form.city : '同城宠友',
      distance: form.showLocation ? form.distance : '同城',
      tags: tags,
      channel: section,
      createdAt: getNowText(),
      likeCount: 0,
      liked: false,
      isFollowing: false,
      petCard: {
        age: '',
        personality: '亲人',
        activity: section === '找玩伴' ? '遛弯交友' : '日常分享'
      }
    })

    wx.setStorageSync(COMMUNITY_KEY, list)

    wx.showToast({
      title: '发布成功',
      icon: 'success'
    })

    setTimeout(function () {
      wx.navigateBack()
    }, 600)
  }
})

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
    tagOptions: ['日常分享', '找玩伴', '求助', '周边', '晒宠', '猫猫', '狗狗', '拍照打卡'],
    pets: [],
    petNames: ['暂不关联'],
    petIndex: 0,
    selectedTags: [],
    form: {
      title: '',
      content: '',
      images: [],
      videoCover: '',
      mediaType: 'image',
      petName: '',
      breed: '',
      city: '天津',
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

  chooseAlbumMedia: function () {
    this.pickMedia(['album'])
  },

  chooseCameraMedia: function () {
    this.pickMedia(['camera'])
  },

  pickMedia: function (sourceType) {
    var that = this

    if (!wx.chooseMedia) {
      wx.showToast({
        title: '当前基础库暂不支持',
        icon: 'none'
      })
      return
    }

    wx.chooseMedia({
      count: 3,
      mediaType: ['image', 'video'],
      sourceType: sourceType,
      maxDuration: 30,
      sizeType: ['compressed'],
      success: function (res) {
        var files = res.tempFiles || []
        var firstVideo = files.find(function (item) {
          return item.fileType === 'video'
        })

        if (firstVideo) {
          that.setData({
            'form.videoCover': firstVideo.thumbTempFilePath || '',
            'form.images': [],
            'form.mediaType': 'video'
          })
          return
        }

        that.setData({
          'form.images': files.map(function (item) {
            return item.tempFilePath
          }),
          'form.mediaType': 'image',
          'form.videoCover': ''
        })
      }
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

  handleTagTap: function (e) {
    var tag = e.currentTarget.dataset.tag
    var selectedTags = this.data.selectedTags.slice()
    var index = selectedTags.indexOf(tag)

    if (index > -1) {
      selectedTags.splice(index, 1)
    } else {
      selectedTags.push(tag)
    }

    this.setData({
      selectedTags: selectedTags
    })
  },

  submitPost: function () {
    var form = this.data.form
    var list = wx.getStorageSync(COMMUNITY_KEY) || []
    var customTags = []
    var selectedTags = this.data.selectedTags || []
    var tags = []
    var channel = '日常分享'
    var distanceText = '同城'

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
      customTags = form.tagsText.split(/[,，\s]+/).filter(Boolean)
    }

    tags = selectedTags.concat(customTags).filter(Boolean)

    if (tags.length === 0) {
      tags = ['日常分享']
    }

    if (tags.indexOf('找玩伴') > -1) {
      channel = '找玩伴'
    } else if (tags.indexOf('求助') > -1) {
      channel = '求助'
    } else if (tags.indexOf('周边') > -1) {
      channel = '周边'
    } else {
      channel = '推荐'
    }

    distanceText = channel === '周边' ? '约 2km' : channel === '找玩伴' ? '同城玩伴' : '同城'

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
      distance: form.showLocation ? distanceText : '同城',
      tags: tags,
      channel: channel,
      createdAt: getNowText(),
      likeCount: 0,
      liked: false,
      isFollowing: false,
      petCard: {
        age: '',
        personality: '亲人',
        activity: channel === '找玩伴' ? '遛弯交友' : '日常分享'
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

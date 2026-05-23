var POSTS_KEY = 'postList'
var LEGACY_POSTS_KEY = 'forumPosts'
var DIARY_KEY = 'diaryList'
var PETS_KEY = 'petList'
var LEGACY_PETS_KEY = 'pets'
var DEFAULT_CAT_IMAGE = '/assets/mock/pets/pet-maohaizi.jpg.jpg'
var DEFAULT_DOG_IMAGE = '/assets/mock/pets/pet-buding.jpg.jpg'

Page({
  data: {
    pageTitle: '记录这一刻',
    pageSubtitle: '分享宠物日常、找玩伴或求助内容',
    submitButtonText: '发布动态',
    entryMode: 'community',
    visibility: 'public',
    pets: [],
    petNames: ['暂不关联'],
    petIndex: 0,
    selectedTags: [],
    tagOptions: ['日常分享', '找玩伴', '求助', '周边', '晒宠', '猫猫', '狗狗', '拍照打卡'],
    form: {
      title: '',
      content: '',
      images: [],
      videoCover: '',
      mediaType: 'image',
      petName: '',
      breed: '',
      tagsText: '',
      showLocation: true
    }
  },

  onLoad: function (options) {
    var entryMode = options.from === 'diary' ? 'diary' : 'community'
    var visibility = options.visibility === 'private' ? 'private' : 'public'

    this.setData({
      entryMode: entryMode,
      visibility: visibility,
      pageTitle: entryMode === 'diary' ? '写一篇日记' : '发布动态',
      pageSubtitle: entryMode === 'diary'
        ? (visibility === 'public' ? '这篇记录会同步到社区，也会保存在日记里' : '这篇记录只会保存在日记里')
        : '发布到社区的内容，也会同步收进日记里',
      submitButtonText: entryMode === 'diary'
        ? (visibility === 'public' ? '保存并同步' : '保存日记')
        : '发布动态'
    })

    this.loadPets()
  },

  loadPets: function () {
    var storedPets = wx.getStorageSync(PETS_KEY)
    var legacyPets = wx.getStorageSync(LEGACY_PETS_KEY)
    var pets = Array.isArray(storedPets) && storedPets.length ? storedPets : legacyPets
    var petNames = ['暂不关联']
    var i

    pets = Array.isArray(pets) ? pets : []

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
    var entryMode = this.data.entryMode
    var visibility = this.data.visibility
    var selectedPet = this.getSelectedPet()
    var tags = this.collectTags()
    var diaryList
    var postList
    var diaryEntry
    var communityPost
    var shouldSyncCommunity = entryMode === 'community' || visibility === 'public'
    var shouldSaveDiary = entryMode === 'diary' || shouldSyncCommunity

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

    if (shouldSaveDiary) {
      diaryList = this.readStorageList(DIARY_KEY)
      diaryEntry = this.buildDiaryEntry(form, tags, selectedPet, shouldSyncCommunity)
      diaryList.unshift(diaryEntry)
      wx.setStorageSync(DIARY_KEY, diaryList)
    }

    if (shouldSyncCommunity) {
      postList = this.readStorageList(POSTS_KEY)
      communityPost = this.buildCommunityPost(form, tags, selectedPet)
      postList.unshift(communityPost)
      wx.setStorageSync(POSTS_KEY, postList)
      wx.setStorageSync(LEGACY_POSTS_KEY, postList)
    }

    wx.showToast({
      title: entryMode === 'community'
        ? '已发布并存入日记'
        : (visibility === 'public' ? '已同步社区' : '日记已保存'),
      icon: 'success'
    })

    setTimeout(function () {
      wx.navigateBack()
    }, 500)
  },

  readStorageList: function (key) {
    var list = wx.getStorageSync(key)
    return Array.isArray(list) ? list.slice() : []
  },

  collectTags: function () {
    var customTags = []
    var selectedTags = this.data.selectedTags || []
    var tags = []
    var text = this.data.form.tagsText

    if (text) {
      customTags = text.split(/[,，\s]+/).filter(Boolean)
    }

    tags = selectedTags.concat(customTags).filter(Boolean)

    if (!tags.length) {
      tags = this.data.entryMode === 'diary' ? ['温暖日常'] : ['日常分享']
    }

    return tags
  },

  getSelectedPet: function () {
    var pets = this.data.pets
    var petIndex = Number(this.data.petIndex)
    return petIndex > 0 ? pets[petIndex - 1] : null
  },

  buildDiaryEntry: function (form, tags, pet, isPublic) {
    var now = new Date()
    var date = formatDate(now)
    return {
      id: 'diary_' + now.getTime(),
      petId: pet ? pet.id : '',
      petName: pet ? pet.name : (form.petName || '毛孩子'),
      title: form.title,
      content: form.content,
      images: this.getEntryImages(form, pet),
      tags: tags,
      date: date,
      displayDate: buildDisplayDate(now),
      time: formatTime(now),
      mood: tags[0] || '温暖',
      isPublic: !!isPublic
    }
  },

  buildCommunityPost: function (form, tags, pet) {
    var now = Date.now()
    var cover = this.getPrimaryMedia(form, pet)
    var coverHeight = this.estimateCoverHeight(form, pet, tags)
    return {
      id: 'community_' + now,
      title: form.title,
      content: form.content,
      author: '我',
      petName: pet ? pet.name : (form.petName || '我家宝贝'),
      breed: pet ? pet.breed : (form.breed || inferBreedByPetName(form.petName)),
      tag: inferCommunityChannel(tags),
      likes: 0,
      cover: cover,
      coverImage: cover,
      avatarImage: pet && pet.avatar ? pet.avatar : cover,
      coverHeight: coverHeight,
      coverType: inferCoverType(pet, form),
      isLiked: false,
      isFollowing: false
    }
  },

  getPrimaryMedia: function (form, pet) {
    if (form.mediaType === 'video' && form.videoCover) {
      return form.videoCover
    }

    if (Array.isArray(form.images) && form.images.length) {
      return form.images[0]
    }

    if (pet && pet.avatar) {
      return pet.avatar
    }

    return form.petName === '布丁' ? DEFAULT_DOG_IMAGE : DEFAULT_CAT_IMAGE
  },

  getEntryImages: function (form, pet) {
    if (form.mediaType === 'video' && form.videoCover) {
      return [form.videoCover]
    }

    if (Array.isArray(form.images) && form.images.length) {
      return form.images.slice()
    }

    return [pet && pet.avatar ? pet.avatar : (form.petName === '布丁' ? DEFAULT_DOG_IMAGE : DEFAULT_CAT_IMAGE)]
  },

  estimateCoverHeight: function (form, pet, tags) {
    var base = form.mediaType === 'video' ? 380 : 320
    var titleLength = String(form.title || '').length
    var tagCount = Array.isArray(tags) ? tags.length : 0
    var petName = pet && pet.name ? pet.name : form.petName

    if (titleLength > 10) {
      base += 12
    }

    if (titleLength > 18) {
      base += 10
    }

    if (tagCount >= 3) {
      base += 8
    }

    if (petName === '毛孩子') {
      base += 18
    }

    if (petName === '布丁') {
      base += 4
    }

    if (base > 390) {
      base = 390
    }

    return base
  }
})

function inferCommunityChannel(tags) {
  if (tags.indexOf('找玩伴') > -1) {
    return '找玩伴'
  }
  if (tags.indexOf('求助') > -1) {
    return '求助'
  }
  if (tags.indexOf('周边') > -1) {
    return '周边'
  }
  if (tags.indexOf('关注') > -1) {
    return '关注'
  }
  return '推荐'
}

function inferBreedByPetName(name) {
  if (name === '布丁') {
    return '萨摩耶'
  }
  if (name === '毛孩子') {
    return '蓝金渐层长毛猫'
  }
  return '萌宠'
}

function inferCoverType(pet, form) {
  var breed = pet && pet.breed ? pet.breed : form.breed
  var petName = pet && pet.name ? pet.name : form.petName
  var text = [breed, petName].join(' ')

  if (/猫|渐层|布偶|英短|波斯/.test(text)) {
    return 'cat'
  }

  if (/狗|萨摩耶|柯基|柴犬|比熊|金毛/.test(text)) {
    return 'dog'
  }

  return 'paw'
}

function formatDate(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function formatTime(date) {
  return pad(date.getHours()) + ':' + pad(date.getMinutes())
}

function buildDisplayDate(date) {
  var today = new Date()
  var targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  var todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  var diffDays = Math.round((todayStart - targetStart) / 86400000)
  var base = date.getMonth() + 1 + '月' + date.getDate() + '日'

  if (diffDays === 0) {
    return base + ' 今天'
  }
  if (diffDays === 1) {
    return base + ' 昨天'
  }
  return base
}

function pad(num) {
  return num < 10 ? '0' + num : String(num)
}

var POSTS_KEY = 'postList'
var cloudPosts = require('../../utils/cloudPosts')
var LEGACY_POSTS_KEY = 'forumPosts'
var DIARY_KEY = 'diaryList'
var PETS_KEY = 'petList'
var LEGACY_PETS_KEY = 'pets'
var DEFAULT_CAT_IMAGE = '/assets/mock/pets/pet-maohaizi.jpg.jpg'
var DEFAULT_DOG_IMAGE = '/assets/mock/pets/pet-buding.jpg.jpg'
var DEFAULT_CITY = '天津'
var CATEGORY_OPTIONS = ['晒宠日常', '交友约玩', '就医问诊', '养宠经验', '寻宠求助', '领养救助', '好物分享', '宠物活动']
var CITY_GEO_BOXES = [
  { city: '北京市', minLat: 39.4, maxLat: 41.1, minLng: 115.4, maxLng: 117.6 },
  { city: '天津市', minLat: 38.4, maxLat: 40.4, minLng: 116.7, maxLng: 118.3 },
  { city: '上海市', minLat: 30.7, maxLat: 31.9, minLng: 120.8, maxLng: 122.2 },
  { city: '重庆市', minLat: 28.1, maxLat: 32.3, minLng: 105.2, maxLng: 110.2 }
]

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
    categoryOptions: CATEGORY_OPTIONS,
    categoryIndex: 0,
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
      category: CATEGORY_OPTIONS[0],
      tagsText: '',
      showLocation: true,
      locationText: '',
      city: '',
      latitude: 0,
      longitude: 0
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

  changeCategory: function (e) {
    var index = Number(e.detail.value || 0)
    var category = CATEGORY_OPTIONS[index] || CATEGORY_OPTIONS[0]
    this.setData({
      categoryIndex: index,
      'form.category': category
    })
  },

  switchLocation: function (e) {
    this.setData({
      'form.showLocation': e.detail.value
    })
  },

  chooseLocation: function () {
    var that = this
    wx.chooseLocation({
      success: function (res) {
        var city = resolveCityFromText((res.address || '') + ' ' + (res.name || '')) || inferCityByLocation({
          latitude: res.latitude,
          longitude: res.longitude
        }) || DEFAULT_CITY
        city = normalizeCityName(city)
        var locationText = resolveLocationText(res.name, res.address, city)
        that.setData({
          'form.locationText': locationText,
          'form.city': city,
          'form.latitude': Number(res.latitude || 0),
          'form.longitude': Number(res.longitude || 0)
        })
      }
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

    wx.showLoading({
      title: '发布中...'
    })

    this.resolvePostLocation(form).then(function (locationPayload) {
      var cloudResult = {
        success: false,
        error: null,
        post: null
      }

      if (shouldSyncCommunity) {
        communityPost = this.buildCommunityPost(form, tags, selectedPet, locationPayload)
      }

      return Promise.resolve().then(function () {
        if (!shouldSyncCommunity) {
          return cloudResult
        }
        return cloudPosts.createPost(communityPost).then(function (cloudPost) {
          return {
            success: true,
            error: null,
            post: cloudPost
          }
        }).catch(function (err) {
          console.warn('社区帖子云端发布失败，将回退本地保存:', err)
          return {
            success: false,
            error: err,
            post: communityPost
          }
        })
      }.bind(this)).then(function (result) {
        cloudResult = result

        if (shouldSyncCommunity) {
          postList = this.readStorageList(POSTS_KEY)
          communityPost = cloudResult.post || communityPost
          postList.unshift(communityPost)
          wx.setStorageSync(POSTS_KEY, postList)
          wx.setStorageSync(LEGACY_POSTS_KEY, postList)
        }

      if (shouldSaveDiary) {
        diaryList = this.readStorageList(DIARY_KEY)
        diaryEntry = this.buildDiaryEntry(form, tags, selectedPet, shouldSyncCommunity, locationPayload)
        diaryList.unshift(diaryEntry)
        wx.setStorageSync(DIARY_KEY, diaryList)
      }
        wx.hideLoading()
        if (shouldSyncCommunity && !cloudResult.success) {
          wx.showToast({
            title: '云端发布失败，已存本地',
            icon: 'none'
          })
          return
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
      }.bind(this))
    }.bind(this)).catch(function (err) {
      wx.hideLoading()
      console.warn('发布失败:', err)
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none'
      })
    }.bind(this))
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

  buildDiaryEntry: function (form, tags, pet, isPublic, locationPayload) {
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
      isPublic: !!isPublic,
      city: locationPayload.city || '',
      location: locationPayload.locationText || '',
      latitude: locationPayload.latitude || 0,
      longitude: locationPayload.longitude || 0
    }
  },

  buildCommunityPost: function (form, tags, pet, locationPayload) {
    var now = Date.now()
    var createdAt = formatDateTime(new Date(now))
    var cover = this.getPrimaryMedia(form, pet)
    var coverHeight = this.estimateCoverHeight(form, pet, tags)
    return {
      id: 'community_' + now,
      title: form.title,
      content: form.content,
      author: '我',
      petName: pet ? pet.name : (form.petName || '我家宝贝'),
      breed: pet ? pet.breed : (form.breed || inferBreedByPetName(form.petName)),
      category: form.category || CATEGORY_OPTIONS[0],
      city: locationPayload.city || '',
      location: locationPayload.locationText || '',
      latitude: locationPayload.latitude || 0,
      longitude: locationPayload.longitude || 0,
      createdAt: createdAt,
      commentCount: 0,
      collectCount: 0,
      viewCount: 0,
      isSolved: shouldDefaultSolved(form.category),
      urgency: '普通',
      tags: tags,
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

  resolvePostLocation: function (form) {
    var currentCity = normalizeCityName(form.city)
    var locationText = String(form.locationText || '').trim()

    if (!form.showLocation) {
      return Promise.resolve({
        city: '',
        locationText: '',
        latitude: 0,
        longitude: 0
      })
    }

    if (locationText || currentCity) {
      return Promise.resolve({
        city: currentCity || DEFAULT_CITY,
        locationText: locationText || ((currentCity || DEFAULT_CITY) + ' · 附近'),
        latitude: Number(form.latitude || 0),
        longitude: Number(form.longitude || 0)
      })
    }

    return new Promise(function (resolve) {
      wx.getLocation({
        type: 'gcj02',
        success: function (res) {
          var city = normalizeCityName(inferCityByLocation({
            latitude: res.latitude,
            longitude: res.longitude
          }) || DEFAULT_CITY)
          resolve({
            city: city,
            locationText: city + ' · 附近',
            latitude: Number(res.latitude || 0),
            longitude: Number(res.longitude || 0)
          })
        },
        fail: function () {
          resolve({
            city: DEFAULT_CITY,
            locationText: DEFAULT_CITY + ' · 附近',
            latitude: 0,
            longitude: 0
          })
        }
      })
    })
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

function shouldDefaultSolved(category) {
  var value = String(category || '')
  return !(value === '就医问诊' || value === '养宠经验' || value === '寻宠求助' || value === '领养救助')
}

function trimCityText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeCityName(value) {
  var city = trimCityText(value)
  if (!city) {
    return ''
  }
  city = city.replace(/(特别行政区|自治州|地区|盟)$/g, '')
  city = city.replace(/(省|市)$/g, '')
  return city
}

function resolveLocationText(name, address, city) {
  var safeName = String(name || '').trim()
  var safeAddress = String(address || '').trim()
  if (safeName && safeAddress && safeAddress.indexOf(safeName) === -1) {
    return safeName + ' · ' + safeAddress
  }
  if (safeAddress) {
    return safeAddress
  }
  if (safeName) {
    return safeName
  }
  return (city || DEFAULT_CITY) + ' · 附近'
}

function resolveCityFromText(text) {
  var safe = String(text || '')
  var match = safe.match(/([\u4e00-\u9fa5]{2,10}(?:市|地区|自治州|盟))/)
  return match ? match[1] : ''
}

function inferCityByLocation(location) {
  var lat = Number(location && location.latitude)
  var lng = Number(location && location.longitude)
  var i
  var box
  if (!lat || !lng) {
    return ''
  }
  for (i = 0; i < CITY_GEO_BOXES.length; i += 1) {
    box = CITY_GEO_BOXES[i]
    if (lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng) {
      return box.city
    }
  }
  return ''
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

function formatDateTime(date) {
  return formatDate(date) + ' ' + formatTime(date) + ':00'
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

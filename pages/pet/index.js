var PETS_KEY = 'petList'
var LEGACY_PETS_KEY = 'pets'
var REMINDER_KEY = 'calendarPlans'
var LEGACY_REMINDER_KEY = 'petReminders'
var IDENTIFY_KEY = 'identifyRecords'
var LEGACY_IDENTIFY_KEY = 'identifyHistory'
var CAT_IMAGE = '/assets/mock/pets/pet-maohaizi.jpg.jpg'
var DOG_IMAGE = '/assets/mock/pets/pet-buding.jpg.jpg'

var MOCK_PETS = [
  {
    id: 'pet_mock_1',
    name: '毛孩子',
    type: '猫咪',
    species: '猫咪',
    breed: '蓝金渐层长毛猫',
    gender: '妹妹',
    birthday: '2024-08-12',
    age: '1岁9个月',
    weight: '4.2kg',
    avatarType: 'image',
    avatarValue: CAT_IMAGE,
    color: '#9CAF88',
    likes: '喜欢罐头',
    personality: '温顺，爱睡觉',
    tags: ['温顺', '爱睡觉', '喜欢罐头'],
    nextReminder: '5月20日 驱虫提醒',
    diaryCount: 6,
    identifyCount: 3
  },
  {
    id: 'pet_mock_2',
    name: '布丁',
    type: '狗狗',
    species: '狗狗',
    breed: '萨摩耶',
    gender: '弟弟',
    birthday: '2023-11-03',
    age: '2岁6个月',
    weight: '18.5kg',
    avatarType: 'image',
    avatarValue: DOG_IMAGE,
    color: '#FADA7A',
    likes: '爱散步，亲人',
    personality: '活泼',
    tags: ['活泼', '爱散步', '亲人'],
    nextReminder: '5月25日 洗澡提醒',
    diaryCount: 4,
    identifyCount: 1
  }
]

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
  if (months <= 0) return years + '岁'
  return years + '岁' + months + '个月'
}

function toTagList(text) {
  if (!text) return []
  return text.split(/[,，、\s]+/).filter(Boolean).slice(0, 3)
}

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function nameEquals(a, b) {
  return normalizeName(a) === normalizeName(b)
}

function normalizeBreedByName(name, breed) {
  return breed || '未填品种'
}

function isImageRef(value) {
  var text = String(value || '')
  return /^(\/assets\/|wxfile:|cloud:\/\/|https?:\/\/|data:image\/|file:|\/private\/|\/var\/|\/Users\/)/.test(text)
}

function normalizePet(item) {
  var name = item.name === '小布丁' ? '布丁' : (item.name || '毛孩子')
  var ageText = item.age || item.ageText || calcAgeText(item.birthday)
  var tags = Array.isArray(item.tags) && item.tags.length ? item.tags.slice(0, 3) : []
  var personalityTags = toTagList(item.personality)
  var likeTags = toTagList(item.likes)
  var color = item.color || '#9CAF88'
  var fallbackAvatar = name === '布丁' ? DOG_IMAGE : CAT_IMAGE
  var avatarValue = item.avatarValue || item.avatar || ''
  var avatarType = item.avatarType || (isImageRef(avatarValue) ? 'image' : 'emoji')

  if (avatarType === 'image' && !avatarValue) {
    avatarValue = fallbackAvatar
  }
  if (avatarType !== 'image' && !avatarValue) {
    avatarType = 'emoji'
    avatarValue = '🐾'
  }

  if (!tags.length) {
    tags = personalityTags.concat(likeTags).slice(0, 3)
  }

  return {
    id: item.id || 'pet_' + Date.now(),
    name: name,
    type: item.type || item.species || '宠物',
    species: item.species || item.type || '宠物',
    breed: normalizeBreedByName(name, item.breed),
    gender: item.gender || '未填写',
    birthday: item.birthday || '',
    age: item.age || '',
    ageText: ageText || '未填写',
    weight: item.weight || '未填写',
    avatarType: avatarType,
    avatarValue: avatarValue,
    color: color,
    softColor: color + '22',
    likes: item.likes || '',
    personality: item.personality || '',
    tags: tags,
    personalityTags: personalityTags,
    likeTags: likeTags,
    nextReminder: item.nextReminder || '暂时没有提醒',
    diaryCount: Number(item.diaryCount || 0),
    identifyCount: Number(item.identifyCount || 0),
    initial: name.slice(0, 1)
  }
}

Page({
  data: {
    petList: [],
    currentPetId: '',
    currentPet: null,
    showForm: false,
    formMode: 'add',
    defaultAvatars: ['😺', '🐶', '🐰', '🦊', '🐻', '🐼'],
    overviewList: [],
    form: {
      id: '',
      name: '',
      type: '',
      species: '',
      breed: '',
      gender: '',
      birthday: '',
      age: '',
      weight: '',
      likes: '',
      personality: '',
      avatarType: 'image',
      avatarValue: CAT_IMAGE,
      color: '#9CAF88',
      nextReminder: '',
      diaryCount: 0,
      identifyCount: 0
    }
  },

  onShow: function () {
    this.loadPets()
  },

  loadPets: function () {
    var storedPets = wx.getStorageSync(PETS_KEY)
    var legacyPets = wx.getStorageSync(LEGACY_PETS_KEY)
    var hasStoredPets = Array.isArray(storedPets) && storedPets.length > 0
    var sourceList = hasStoredPets ? storedPets : legacyPets
    var currentPetId = this.data.currentPetId
    var petList = []
    var found = false
    var i

    if (!Array.isArray(sourceList) || !sourceList.length) {
      sourceList = clone(MOCK_PETS)
      wx.setStorageSync(PETS_KEY, sourceList)
      wx.setStorageSync(LEGACY_PETS_KEY, sourceList)
    } else {
      sourceList = sourceList.map(function (item) {
        var normalized = normalizePet(item)
        return {
          id: normalized.id,
          name: normalized.name,
          type: normalized.type,
          species: normalized.species,
          breed: normalized.breed,
          gender: normalized.gender,
          birthday: normalized.birthday,
          age: normalized.age || normalized.ageText,
          weight: normalized.weight,
          avatarType: normalized.avatarType,
          avatarValue: normalized.avatarValue,
          color: normalized.color,
          likes: normalized.likes,
          personality: normalized.personality,
          tags: normalized.tags,
          nextReminder: normalized.nextReminder,
          diaryCount: normalized.diaryCount,
          identifyCount: normalized.identifyCount
        }
      })
      wx.setStorageSync(PETS_KEY, sourceList)
      wx.setStorageSync(LEGACY_PETS_KEY, sourceList)
    }

    petList = sourceList.map(normalizePet)

    for (i = 0; i < petList.length; i++) {
      if (petList[i].id === currentPetId) {
        found = true
        break
      }
    }

    if (!found) {
      currentPetId = petList.length ? petList[0].id : ''
    }

    this.setData({
      petList: petList,
      currentPetId: currentPetId,
      currentPet: this.findPetById(petList, currentPetId),
      overviewList: this.buildOverviewList(petList)
    })
  },

  buildOverviewList: function (petList) {
    var reminders = wx.getStorageSync(REMINDER_KEY)
    var legacyReminders = wx.getStorageSync(LEGACY_REMINDER_KEY)
    var identifyHistory = wx.getStorageSync(IDENTIFY_KEY)
    var legacyIdentify = wx.getStorageSync(LEGACY_IDENTIFY_KEY)
    var today = getToday()
    var reminderCount = 1
    var identifyCount = 0
    var diaryCount = 0
    var i

    if (!Array.isArray(reminders) || !reminders.length) {
      reminders = legacyReminders
    }
    if (!Array.isArray(identifyHistory) || !identifyHistory.length) {
      identifyHistory = legacyIdentify
    }

    if (Array.isArray(reminders) && reminders.length) {
      reminderCount = 0
      for (i = 0; i < reminders.length; i++) {
        if (reminders[i].date === today) {
          reminderCount++
        }
      }
      if (reminderCount === 0) {
        reminderCount = 1
      }
    }

    for (i = 0; i < petList.length; i++) {
      diaryCount += Number(petList[i].diaryCount || 0)
      identifyCount += Number(petList[i].identifyCount || 0)
    }

    if (Array.isArray(identifyHistory) && identifyHistory.length > identifyCount) {
      identifyCount = identifyHistory.length
    }

    return [
      { key: 'pets', label: '已添加宠物', value: petList.length },
      { key: 'reminders', label: '今日提醒', value: reminderCount },
      { key: 'diary', label: '成长日记', value: diaryCount },
      { key: 'identify', label: '识别记录', value: identifyCount }
    ]
  },

  findPetById: function (petList, id) {
    var i
    for (i = 0; i < petList.length; i++) {
      if (petList[i].id === id) {
        return petList[i]
      }
    }
    return petList.length ? petList[0] : null
  },

  resetForm: function () {
    this.setData({
      form: {
        id: '',
        name: '',
        type: '',
        species: '',
        breed: '',
        gender: '',
        birthday: getToday(),
        age: '',
        weight: '',
        likes: '',
        personality: '',
        avatarType: 'image',
        avatarValue: CAT_IMAGE,
        color: '#9CAF88',
        nextReminder: '',
        diaryCount: 0,
        identifyCount: 0
      }
    })
  },

  handleAddPet: function () {
    this.resetForm()
    this.setData({
      showForm: true,
      formMode: 'add'
    })
  },

  handleImportFromIdentify: function () {
    wx.navigateTo({
      url: '/pages/identify/index'
    })
  },

  handleBirthdayReminder: function () {
    wx.navigateTo({
      url: '/pages/calendar/index'
    })
  },

  handleEditProfile: function (e) {
    var id = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.id : ''
    var targetId = id || this.data.currentPetId
    var target = this.findPetById(this.data.petList, targetId)

    if (!target) {
      wx.showToast({
        title: '请先新增宠物',
        icon: 'none'
      })
      return
    }

    this.setData({
      showForm: true,
      formMode: 'edit',
      form: {
        id: target.id,
        name: target.name,
        type: target.type,
        species: target.species,
        breed: target.breed === '未填品种' ? '' : target.breed,
        gender: target.gender === '未填写' ? '' : target.gender,
        birthday: target.birthday,
        age: target.age || target.ageText,
        weight: target.weight === '未填写' ? '' : target.weight,
        likes: target.likes,
        personality: target.personality,
        avatarType: target.avatarType,
        avatarValue: target.avatarValue,
        color: target.color,
        nextReminder: target.nextReminder === '暂时没有提醒' ? '' : target.nextReminder,
        diaryCount: target.diaryCount,
        identifyCount: target.identifyCount
      }
    })
  },

  handlePetTap: function (e) {
    var id = e.currentTarget.dataset.id
    var pet = this.findPetById(this.data.petList, id)
    if (!pet) return

    this.setData({
      currentPetId: id,
      currentPet: pet
    })
  },

  handleCreateFirstPet: function () {
    this.handleAddPet()
  },

  closeForm: function () {
    this.setData({
      showForm: false
    })
  },

  noop: function () {},

  bindInput: function (e) {
    var field = e.currentTarget.dataset.field
    var form = clone(this.data.form)
    form[field] = e.detail.value
    this.setData({
      form: form
    })
  },

  changeBirthday: function (e) {
    var form = clone(this.data.form)
    form.birthday = e.detail.value
    form.age = calcAgeText(form.birthday)
    this.setData({
      form: form
    })
  },

  chooseDefaultAvatar: function (e) {
    var form = clone(this.data.form)
    form.avatarType = 'emoji'
    form.avatarValue = e.currentTarget.dataset.value
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
        var form = clone(that.data.form)
        form.avatarType = 'image'
        form.avatarValue = res.tempFilePaths[0]
        that.setData({
          form: form
        })
      }
    })
  },

  syncIdentifyRecordsByPet: function (pet, previousPet) {
    var records = wx.getStorageSync(IDENTIFY_KEY)
    var legacyRecords = wx.getStorageSync(LEGACY_IDENTIFY_KEY)
    var source = Array.isArray(records) && records.length ? records : legacyRecords
    var list = Array.isArray(source) ? clone(source) : []
    var changed = false
    var i

    if (!pet || !pet.id || !list.length) {
      return
    }

    for (i = 0; i < list.length; i++) {
      var record = list[i] || {}
      var boundById = record.petId && String(record.petId) === String(pet.id)
      var canBindByLegacyName = !record.petId && previousPet && (nameEquals(record.petName, previousPet.name) || nameEquals(record.result, previousPet.breed))

      if (boundById || canBindByLegacyName) {
        if (String(record.petId || '') !== String(pet.id)) {
          record.petId = pet.id
          changed = true
        }
        if (record.petName !== pet.name) {
          record.petName = pet.name
          changed = true
        }
        if (pet.breed && record.result !== pet.breed) {
          record.result = pet.breed
          changed = true
        }
      }
    }

    if (changed) {
      wx.setStorageSync(IDENTIFY_KEY, list)
      wx.setStorageSync(LEGACY_IDENTIFY_KEY, list)
    }
  },

  savePet: function () {
    var form = clone(this.data.form)
    var storedPets = wx.getStorageSync(PETS_KEY)
    var legacyPets = wx.getStorageSync(LEGACY_PETS_KEY)
    var pets = Array.isArray(storedPets) && storedPets.length ? clone(storedPets) : legacyPets
    var previousPet = null
    var i

    pets = Array.isArray(pets) && pets.length ? clone(pets) : clone(MOCK_PETS)

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

    form.species = form.species || form.type
    form.type = form.type || form.species
    form.breed = normalizeBreedByName(form.name, form.breed)

    if (this.data.formMode === 'add') {
      form.id = 'pet_' + Date.now()
      form.diaryCount = Number(form.diaryCount || 0)
      form.identifyCount = Number(form.identifyCount || 0)
      pets.unshift(form)
    } else {
      for (i = 0; i < pets.length; i++) {
        if (pets[i].id === form.id) {
          previousPet = clone(pets[i])
          pets[i] = form
          break
        }
      }
    }

    wx.setStorageSync(PETS_KEY, pets)
    wx.setStorageSync(LEGACY_PETS_KEY, pets)
    this.syncIdentifyRecordsByPet(form, previousPet)

    this.setData({
      showForm: false,
      currentPetId: form.id
    })

    this.loadPets()

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })
  },

  deletePet: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var storedPets = wx.getStorageSync(PETS_KEY)
    var legacyPets = wx.getStorageSync(LEGACY_PETS_KEY)
    var pets = Array.isArray(storedPets) && storedPets.length ? storedPets : legacyPets
    var newPets = []
    var i

    pets = Array.isArray(pets) && pets.length ? pets : clone(MOCK_PETS)

    wx.showModal({
      title: '提示',
      content: '确定删除这只宠物吗？',
      success: function (res) {
        if (!res.confirm) return

        for (i = 0; i < pets.length; i++) {
          if (pets[i].id !== id) {
            newPets.push(pets[i])
          }
        }

        wx.setStorageSync(PETS_KEY, newPets)
        wx.setStorageSync(LEGACY_PETS_KEY, newPets)
        that.setData({
          currentPetId: '',
          showForm: false
        })
        that.loadPets()
      }
    })
  }
})

var identifyApi = require('../../utils/identify-api')
var IDENTIFY_KEY = 'identifyRecords'
var LEGACY_IDENTIFY_KEY = 'identifyHistory'
var PETS_KEY = 'petList'
var LEGACY_PETS_KEY = 'pets'
var CAT_IMAGE = '/assets/mock/pets/pet-maohaizi.jpg.jpg'
var DOG_IMAGE = '/assets/mock/pets/pet-buding.jpg.jpg'

var DEMO_IDENTIFY_RESULT = {
  petName: '毛孩子',
  species: '猫咪',
  breed: '蓝金渐层长毛猫',
  confidence: 88,
  image: CAT_IMAGE,
  features: ['长毛', '蓝金渐层', '圆脸', '毛量丰富', '性格温顺'],
  advice: '长毛猫需要定期梳毛，注意毛结和换毛期护理；同时建议控制零食摄入，定期记录体重变化。',
  createdAt: '2026-05-16 16:20'
}

var DEFAULT_IDENTIFY_RECORDS = [
  {
    id: 1,
    petName: '毛孩子',
    result: '蓝金渐层长毛猫',
    confidence: 88,
    image: CAT_IMAGE,
    date: '2026-05-16',
    action: '已保存到档案'
  },
  {
    id: 2,
    petName: '布丁',
    result: '萨摩耶',
    confidence: 91,
    image: DOG_IMAGE,
    date: '2026-05-12',
    action: '已生成日记'
  }
]

var RECOGNIZE_POOL = [
  {
    petName: '毛孩子',
    species: '猫咪',
    breed: '蓝金渐层长毛猫',
    confidence: 88,
    image: CAT_IMAGE,
    features: ['长毛', '蓝金渐层', '圆脸', '毛量丰富', '性格温顺'],
    advice: '长毛猫需要定期梳毛，注意毛结和换毛期护理；同时建议控制零食摄入，定期记录体重变化。'
  },
  {
    petName: '布丁',
    species: '狗狗',
    breed: '萨摩耶',
    confidence: 91,
    image: DOG_IMAGE,
    features: ['白色毛发', '笑脸', '毛量丰厚', '亲人活泼'],
    advice: '萨摩耶毛量大，洗护后要彻底吹干，同时要维持规律运动，避免夏天过热。'
  },
  {
    petName: '糯米',
    species: '异宠',
    breed: '垂耳兔',
    confidence: 82,
    image: DOG_IMAGE,
    features: ['长耳朵', '体型小', '毛发柔软', '性格安静'],
    advice: '异宠识别建议结合日常习性判断，注意饮食、环境温度和应激反应，必要时咨询专业异宠医生。'
  }
]

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function normalizeRecord(item) {
  var petName = item.petName === '小布丁' ? '布丁' : (item.petName || '毛孩子')
  var image = item.image || (petName === '布丁' ? DOG_IMAGE : CAT_IMAGE)
  var result = item.result || item.breed || '待识别'

  return {
    id: item.id || 'record_' + Date.now(),
    petId: item.petId || '',
    petName: petName,
    result: result,
    confidence: Number(item.confidence || 0),
    image: image,
    date: item.date || '2026-05-16',
    updatedAt: item.updatedAt || '',
    action: item.action || '待确认'
  }
}

function formatNow() {
  var date = new Date()
  var y = date.getFullYear()
  var m = date.getMonth() + 1
  var d = date.getDate()
  var h = date.getHours()
  var mm = date.getMinutes()

  return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d) + ' ' + (h < 10 ? '0' + h : h) + ':' + (mm < 10 ? '0' + mm : mm)
}

function formatDateOnly(dateTime) {
  return (dateTime || '').split(' ')[0] || '2026-05-16'
}

function formatTimeOnly(dateTime) {
  var parts = String(dateTime || '').split(' ')
  if (parts.length < 2) return ''
  return parts[1].slice(0, 5)
}

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

function normalizeName(name) {
  return (name || '').trim()
}

function textEquals(a, b) {
  return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase()
}

function isEmptyValue(value) {
  return value === undefined || value === null || value === ''
}

function shouldFill(value, placeholders) {
  var normalized = normalizeName(value)
  if (!normalized) {
    return true
  }

  if (!Array.isArray(placeholders) || !placeholders.length) {
    return false
  }

  return placeholders.indexOf(normalized) > -1
}

function inferSpeciesFromBreed(breed) {
  var text = normalizeName(breed)
  if (!text) return '宠物'

  if (/(猫|英短|美短|布偶|渐层|缅因|家猫)/.test(text)) return '猫咪'
  if (/(犬|狗|萨摩耶|金毛|柯基|柴犬|边牧|哈士奇)/.test(text)) return '狗狗'
  if (/(兔|仓鼠|龙猫|荷兰猪)/.test(text)) return '啮齿类'
  if (/(鹦鹉|鸟)/.test(text)) return '鸟类'
  if (/(龟|蛇|蜥蜴)/.test(text)) return '爬宠'
  return '异宠'
}

Page({
  data: {
    imageUrl: '',
    loading: false,
    hasRecognizedResult: false,
    serviceReady: false,
    serviceStatusText: '正在检测识别服务...',
    serviceModeText: '未连接',
    result: DEMO_IDENTIFY_RESULT,
    identifyRecords: [],
    showArchiveForm: false,
    pendingIdentifyResultId: '',
    genderOptions: ['未填写', '弟弟', '妹妹'],
    speciesOptions: ['宠物', '猫咪', '狗狗', '异宠', '鸟类', '爬宠', '啮齿类', '其他'],
    genderIndex: 0,
    speciesIndex: 0,
    archiveForm: {
      name: '',
      gender: '未填写',
      birthday: '',
      weight: '',
      notes: '',
      species: '',
      breed: '',
      avatar: ''
    }
  },

  onLoad: function () {
    this.ensureMockRecords()
    this.checkIdentifyService()
  },

  onShow: function () {
    this.loadIdentifyRecords()
  },

  noop: function () {},

  checkIdentifyService: function () {
    var that = this

    if (!identifyApi.hasRemoteIdentifyApi()) {
      this.setData({
        serviceReady: false,
        serviceStatusText: '当前未配置识别服务地址。可用 wx.setStorageSync("identifyApiBaseUrl", "https://你的域名") 注入线上地址。',
        serviceModeText: '示例模式'
      })
      return
    }

    identifyApi.checkIdentifyApi().then(function (status) {
      that.setData({
        serviceReady: true,
        serviceStatusText: '识别服务已连接，可直接上传图片识别',
        serviceModeText: '已连接'
      })
      console.log('identify service ready:', status)
    }).catch(function (err) {
      console.error('identify health check failed:', err)
      var reason = (err && err.message) ? err.message : '健康检查失败'
      that.setData({
        serviceReady: false,
        serviceStatusText: '当前未连上识别服务：' + reason,
        serviceModeText: '示例模式'
      })
    })
  },

  ensureMockRecords: function () {
    var records = wx.getStorageSync(IDENTIFY_KEY)
    var legacyRecords = wx.getStorageSync(LEGACY_IDENTIFY_KEY)

    if ((!Array.isArray(records) || !records.length) && (!Array.isArray(legacyRecords) || !legacyRecords.length)) {
      wx.setStorageSync(IDENTIFY_KEY, clone(DEFAULT_IDENTIFY_RECORDS))
      wx.setStorageSync(LEGACY_IDENTIFY_KEY, clone(DEFAULT_IDENTIFY_RECORDS))
      return
    }

    if (Array.isArray(records) && records.length) {
      wx.setStorageSync(IDENTIFY_KEY, records.map(normalizeRecord))
    }
  },

  loadIdentifyRecords: function () {
    var records = wx.getStorageSync(IDENTIFY_KEY)
    var legacyRecords = wx.getStorageSync(LEGACY_IDENTIFY_KEY)
    var sourceList = Array.isArray(records) && records.length ? records : legacyRecords
    var pets = this.getStoredPets()
    var petsById = {}
    var normalized = []
    var changed = false
    var i
    var j

    if (!Array.isArray(sourceList) || !sourceList.length) {
      sourceList = clone(DEFAULT_IDENTIFY_RECORDS)
    }

    for (i = 0; i < pets.length; i++) {
      if (pets[i] && pets[i].id) {
        petsById[String(pets[i].id)] = pets[i]
      }
    }

    for (i = 0; i < sourceList.length; i++) {
      var record = normalizeRecord(sourceList[i])
      var petRef = null
      if (!record.petId) {
        j = this.findMergeTargetIndex(pets, record.petName, record.result)
        if (j > -1 && pets[j] && pets[j].id) {
          record.petId = pets[j].id
          changed = true
        }
      }

      if (record.petId && petsById[String(record.petId)]) {
        petRef = petsById[String(record.petId)]
        if (petRef.name && record.petName !== petRef.name) {
          record.petName = petRef.name
          changed = true
        }
      }

      record.updatedTimeText = formatTimeOnly(record.updatedAt)
      normalized.push(record)
    }

    if (changed) {
      wx.setStorageSync(IDENTIFY_KEY, normalized)
      wx.setStorageSync(LEGACY_IDENTIFY_KEY, normalized)
    }

    this.setData({
      identifyRecords: normalized
    })
  },

  appendIdentifyRecord: function (result) {
    var records = wx.getStorageSync(IDENTIFY_KEY)
    var legacyRecords = wx.getStorageSync(LEGACY_IDENTIFY_KEY)
    var sourceList = Array.isArray(records) && records.length ? records : legacyRecords
    var list = Array.isArray(sourceList) ? sourceList.slice() : []
    var createdAt = result.createdAt || formatNow()
    var nextRecord = normalizeRecord({
      id: 'record_' + Date.now(),
      petId: result.petId || '',
      petName: result.petName,
      result: result.breed,
      confidence: result.confidence,
      image: result.image,
      date: formatDateOnly(createdAt),
      updatedAt: createdAt,
      action: '待确认'
    })

    list.unshift(nextRecord)
    wx.setStorageSync(IDENTIFY_KEY, list)
    wx.setStorageSync(LEGACY_IDENTIFY_KEY, list)
    this.loadIdentifyRecords()
    return nextRecord.id
  },

  updateIdentifyRecord: function (recordId, patch, moveToTop) {
    var records = wx.getStorageSync(IDENTIFY_KEY)
    var legacyRecords = wx.getStorageSync(LEGACY_IDENTIFY_KEY)
    var sourceList = Array.isArray(records) && records.length ? records : legacyRecords
    var list = Array.isArray(sourceList) ? sourceList.slice() : []
    var target = null
    var nextList = []
    var shouldMoveTop = moveToTop !== false
    var i

    if (!recordId || !list.length) {
      return
    }

    for (i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(recordId)) {
        target = normalizeRecord(Object.assign({}, list[i], patch || {}))
        break
      }
    }

    if (!target) {
      return
    }

    for (i = 0; i < list.length; i++) {
      if (String(list[i].id) !== String(recordId)) {
        nextList.push(list[i])
      }
    }

    if (shouldMoveTop) {
      nextList.unshift(target)
    } else {
      nextList.push(target)
    }

    wx.setStorageSync(IDENTIFY_KEY, nextList)
    wx.setStorageSync(LEGACY_IDENTIFY_KEY, nextList)
    this.loadIdentifyRecords()
  },

  findRecordById: function (recordId) {
    var list = this.data.identifyRecords || []
    var i
    for (i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(recordId)) {
        return list[i]
      }
    }
    return null
  },

  getStoredPets: function () {
    var storedPets = wx.getStorageSync(PETS_KEY)
    var legacyPets = wx.getStorageSync(LEGACY_PETS_KEY)
    var source = Array.isArray(storedPets) && storedPets.length ? storedPets : legacyPets

    if (!Array.isArray(source)) {
      return []
    }

    return clone(source)
  },

  savePets: function (pets) {
    wx.setStorageSync(PETS_KEY, pets)
    wx.setStorageSync(LEGACY_PETS_KEY, pets)
  },

  findMergeTargetIndex: function (pets, name, breed) {
    var nameHits = []
    var normalizedName = normalizeName(name)
    var normalizedBreed = normalizeName(breed)
    var i

    for (i = 0; i < pets.length; i++) {
      if (textEquals(pets[i].name, normalizedName)) {
        nameHits.push(i)
      }
    }

    if (nameHits.length === 1) {
      return nameHits[0]
    }

    if (nameHits.length > 1) {
      if (!normalizedBreed) {
        return nameHits[0]
      }

      for (i = 0; i < nameHits.length; i++) {
        if (textEquals(pets[nameHits[i]].breed, normalizedBreed)) {
          return nameHits[i]
        }
      }

      return nameHits[0]
    }

    if (normalizedBreed) {
      for (i = 0; i < pets.length; i++) {
        if (textEquals(pets[i].breed, normalizedBreed) && !normalizeName(pets[i].name)) {
          return i
        }
      }
    }

    return -1
  },

  mergePetConservatively: function (target, form) {
    var next = clone(target)

    if (shouldFill(next.type, ['宠物']) && normalizeName(form.species)) {
      next.type = normalizeName(form.species)
    }
    if (shouldFill(next.species, ['宠物']) && normalizeName(form.species)) {
      next.species = normalizeName(form.species)
    }
    if (shouldFill(next.breed, ['未填品种']) && normalizeName(form.breed)) {
      next.breed = normalizeName(form.breed)
    }
    if (shouldFill(next.gender, ['未填写']) && normalizeName(form.gender) && form.gender !== '未填写') {
      next.gender = form.gender
    }
    if (shouldFill(next.birthday, []) && normalizeName(form.birthday)) {
      next.birthday = form.birthday
      next.age = calcAgeText(form.birthday)
    }
    if (shouldFill(next.weight, ['未填写']) && normalizeName(form.weight)) {
      next.weight = normalizeName(form.weight)
    }
    if (isEmptyValue(next.avatarValue) && normalizeName(form.avatar)) {
      next.avatarType = 'image'
      next.avatarValue = form.avatar
    }
    if (isEmptyValue(next.personality) && normalizeName(form.notes)) {
      next.personality = normalizeName(form.notes)
    }

    next.identifyCount = Number(next.identifyCount || 0) + 1
    return next
  },

  buildNewPetFromForm: function (form) {
    var species = normalizeName(form.species) || '宠物'
    var breed = normalizeName(form.breed) || '未填品种'
    var birthday = normalizeName(form.birthday)
    var avatar = normalizeName(form.avatar) || CAT_IMAGE
    var color = species === '狗狗' ? '#FADA7A' : '#9CAF88'

    return {
      id: 'pet_' + Date.now(),
      name: normalizeName(form.name),
      type: species,
      species: species,
      breed: breed,
      gender: normalizeName(form.gender) && form.gender !== '未填写' ? form.gender : '未填写',
      birthday: birthday,
      age: birthday ? calcAgeText(birthday) : '',
      weight: normalizeName(form.weight) || '未填写',
      avatarType: 'image',
      avatarValue: avatar,
      color: color,
      likes: '',
      personality: normalizeName(form.notes),
      tags: [],
      nextReminder: '暂时没有提醒',
      diaryCount: 0,
      identifyCount: 1
    }
  },

  openArchiveForm: function (result, recordId) {
    var species = normalizeName(result.species) || inferSpeciesFromBreed(result.breed)
    var breed = normalizeName(result.breed) || '未填品种'
    var name = normalizeName(result.petName) || ''
    var avatar = normalizeName(result.image) || normalizeName(this.data.imageUrl) || CAT_IMAGE
    var speciesOptions = this.data.speciesOptions || []
    var speciesIndex = speciesOptions.indexOf(species)
    if (speciesIndex < 0) {
      speciesIndex = 0
    }

    this.setData({
      showArchiveForm: true,
      pendingIdentifyResultId: recordId || this.data.pendingIdentifyResultId || '',
      speciesIndex: speciesIndex,
      genderIndex: 0,
      archiveForm: {
        name: name,
        gender: '未填写',
        birthday: '',
        weight: '',
        notes: '',
        species: species,
        breed: breed,
        avatar: avatar
      }
    })
  },

  closeArchiveForm: function () {
    this.setData({
      showArchiveForm: false
    })
  },

  bindArchiveInput: function (e) {
    var field = e.currentTarget.dataset.field
    var archiveForm = clone(this.data.archiveForm)
    archiveForm[field] = e.detail.value
    this.setData({
      archiveForm: archiveForm
    })
  },

  changeArchiveGender: function (e) {
    var idx = Number(e.detail.value || 0)
    var archiveForm = clone(this.data.archiveForm)
    var genderOptions = this.data.genderOptions

    archiveForm.gender = genderOptions[idx] || '未填写'
    this.setData({
      genderIndex: idx,
      archiveForm: archiveForm
    })
  },

  changeArchiveSpecies: function (e) {
    var idx = Number(e.detail.value || 0)
    var archiveForm = clone(this.data.archiveForm)
    var speciesOptions = this.data.speciesOptions

    archiveForm.species = speciesOptions[idx] || '宠物'
    this.setData({
      speciesIndex: idx,
      archiveForm: archiveForm
    })
  },

  changeArchiveBirthday: function (e) {
    var archiveForm = clone(this.data.archiveForm)
    archiveForm.birthday = e.detail.value
    this.setData({
      archiveForm: archiveForm
    })
  },

  saveToArchive: function () {
    var archiveForm = clone(this.data.archiveForm)
    var pets = this.getStoredPets()
    var mergedIndex = this.findMergeTargetIndex(pets, archiveForm.name, archiveForm.breed)
    var merged = mergedIndex > -1
    var targetId = ''
    var pendingRecord = this.findRecordById(this.data.pendingIdentifyResultId)
    var nowText = formatNow()
    var i

    archiveForm.name = normalizeName(archiveForm.name)
    archiveForm.species = normalizeName(archiveForm.species) || '宠物'
    archiveForm.breed = normalizeName(archiveForm.breed) || '未填品种'
    archiveForm.weight = normalizeName(archiveForm.weight)
    archiveForm.notes = normalizeName(archiveForm.notes)

    if (!archiveForm.name) {
      wx.showToast({
        title: '请先填写名字',
        icon: 'none'
      })
      return
    }

    if (pendingRecord && pendingRecord.petId) {
      for (i = 0; i < pets.length; i++) {
        if (String(pets[i].id) === String(pendingRecord.petId)) {
          mergedIndex = i
          merged = true
          break
        }
      }
    }

    if (merged) {
      pets[mergedIndex] = this.mergePetConservatively(pets[mergedIndex], archiveForm)
      targetId = pets[mergedIndex].id
    } else {
      var newPet = this.buildNewPetFromForm(archiveForm)
      pets.unshift(newPet)
      targetId = newPet.id
    }

    this.savePets(pets)
    this.updateIdentifyRecord(this.data.pendingIdentifyResultId, {
      petId: targetId,
      petName: archiveForm.name,
      result: archiveForm.breed,
      updatedAt: nowText,
      date: formatDateOnly(nowText),
      action: '已保存到档案'
    }, true)

    this.setData({
      showArchiveForm: false,
      pendingIdentifyResultId: ''
    })

    wx.showToast({
      title: merged ? '已合并到现有档案' : '已加入宠物档案',
      icon: 'success'
    })

    console.log('archive saved pet id:', targetId)
  },

  handleRecordActionTap: function (e) {
    var data = (e && e.currentTarget && e.currentTarget.dataset) || {}
    var recordId = data.id
    var action = data.action
    var recordResult = {
      petName: data.name || '',
      species: inferSpeciesFromBreed(data.breed),
      breed: data.breed || '未填品种',
      image: data.image || '',
      createdAt: ''
    }

    this.openArchiveForm(recordResult, recordId)

    if (action && action !== '待确认') {
      wx.showToast({
        title: '可在这里修正后重新保存',
        icon: 'none'
      })
    }
  },

  handleTakePhoto: function () {
    this.chooseImage(['camera'])
  },

  handleChooseImage: function () {
    this.chooseImage(['album', 'camera'])
  },

  chooseImage: function (sourceType) {
    var that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: sourceType,
      success: function (res) {
        that.setData({
          imageUrl: res.tempFilePaths[0]
        })
        that.recognizePet()
      }
    })
  },

  recognizePet: function () {
    var that = this
    var randomIndex = Math.floor(Math.random() * RECOGNIZE_POOL.length)
    var item = clone(RECOGNIZE_POOL[randomIndex])
    var imageUrl = this.data.imageUrl

    this.setData({
      loading: true
    })

    if (identifyApi.hasRemoteIdentifyApi() && imageUrl) {
      identifyApi.recognizePetByApi(imageUrl).then(function (result) {
        var nextResult = {
          petName: result.petName || '未知宠物',
          species: result.species || '待识别',
          breed: result.breed || '待确认品种',
          confidence: result.confidence || 0,
          image: result.image || imageUrl,
          features: Array.isArray(result.features) ? result.features : [],
          advice: result.advice || '暂未生成养护建议',
          createdAt: result.createdAt || formatNow()
        }

        that.setData({
          loading: false,
          hasRecognizedResult: true,
          result: nextResult
        }, function () {
          var recordId = that.appendIdentifyRecord(nextResult)
          that.openArchiveForm(nextResult, recordId)
          wx.showToast({
            title: '识别完成，请补充档案',
            icon: 'none'
          })
        })
      }).catch(function (err) {
        console.error('identify remote error:', err)
        that.fallbackRecognize(item, imageUrl, true)
      })
      return
    }

    this.fallbackRecognize(item, imageUrl, false)
  },

  fallbackRecognize: function (item, imageUrl, apiFailed) {
    var that = this

    setTimeout(function () {
      item.image = imageUrl || item.image
      item.createdAt = formatNow()
      that.setData({
        loading: false,
        hasRecognizedResult: true,
        result: item
      }, function () {
        var recordId = that.appendIdentifyRecord(item)
        that.openArchiveForm(item, recordId)
        wx.showToast({
          title: apiFailed ? '识别完成（示例结果），请补充档案' : '识别完成，请补充档案',
          icon: 'none'
        })
      })
    }, 700)
  },

  handleSaveToArchive: function () {
    if (!this.data.hasRecognizedResult) {
      wx.showToast({
        title: '请先上传识别图片',
        icon: 'none'
      })
      return
    }

    this.openArchiveForm(this.data.result, this.data.pendingIdentifyResultId)
  },

  handleGenerateDiary: function () {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  handleAddReminder: function () {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  }
})

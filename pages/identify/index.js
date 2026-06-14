var identifyApi = require('../../utils/identify-api')
var userStorage = require('../../utils/user-storage')
var IDENTIFY_KEY = 'identifyRecords'
var LEGACY_IDENTIFY_KEY = 'identifyHistory'
var PETS_KEY = 'petList'
var LEGACY_PETS_KEY = 'pets'
var IDENTIFY_PET_DRAFT_KEY = 'identifyPetDraft'
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
  var species = item.species || inferSpeciesFromBreed(result)
  var displayName = petName

  if (!displayName || displayName === '未知宠物' || displayName === '毛孩子') {
    displayName = species || result || '宠物'
  }

  return {
    id: item.id || 'record_' + Date.now(),
    petId: item.petId || '',
    petName: petName,
    displayName: displayName,
    species: species,
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

function formatIdentifyError(err) {
  var message = (err && (err.errMsg || err.message)) ? (err.errMsg || err.message) : String(err || '未知错误')

  if (message.length > 260) {
    message = message.slice(0, 260) + '...'
  }

  return message || '识别服务暂时不可用，请稍后重试'
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

var PET_KNOWLEDGE_MAP = {
  cat: {
    difficulty: '入门友好',
    lifespan: '12-18年',
    size: '小型到中型',
    activeTime: '清晨与傍晚更活跃',
    beginner: '适合新手，但需要稳定照护',
    care: [
      { title: '环境', items: ['准备安静、安全的休息区和猫砂盆。', '高处空间、抓板和玩具能帮助消耗精力。'] },
      { title: '喂养', items: ['以猫粮或主食罐为主，注意饮水量。', '零食控制频率，避免体重增长过快。'] },
      { title: '互动', items: ['每天安排短时间逗猫互动。', '观察食欲、排便和精神状态变化。'] },
      { title: '日常照护', items: ['定期梳毛、剪指甲，长毛猫更要防毛结。', '按需做疫苗、驱虫和体检。'] }
    ],
    cautions: ['突然拒食、频繁呕吐或精神差需要及时观察。', '换粮要循序渐进，避免肠胃不适。', '窗户和阳台要做好防护。']
  },
  dog: {
    difficulty: '需要规律陪伴',
    lifespan: '10-15年',
    size: '因品种差异较大',
    activeTime: '白天与外出时更活跃',
    beginner: '适合愿意规律遛狗的家庭',
    care: [
      { title: '环境', items: ['准备固定睡眠区、牵引用品和饮水区。', '幼犬或活跃犬需要更安全的活动空间。'] },
      { title: '喂养', items: ['选择适龄犬粮，避免长期喂高盐人食。', '根据体型和运动量调整食量。'] },
      { title: '互动', items: ['每天保持散步和基础训练。', '用奖励强化召回、等待等基础习惯。'] },
      { title: '日常照护', items: ['定期驱虫、疫苗和洗护。', '长毛或双层毛犬需要更频繁梳毛。'] }
    ],
    cautions: ['外出请牵引，避免误食或走失。', '夏天注意防暑，冬天注意保暖。', '持续腹泻、咳嗽或精神差建议就医。']
  },
  reptile: {
    difficulty: '入门友好',
    lifespan: '8-20年',
    size: '小型到中型',
    activeTime: '多在傍晚或夜间活跃',
    beginner: '适合愿意学习温湿度管理的新手',
    care: [
      { title: '环境', items: ['需要干燥、通风、温度稳定的饲养环境。', '建议准备躲避屋、加热垫和温区。'] },
      { title: '喂养', items: ['以蟋蟀、面包虫等活体饲料为主。', '定期补充钙粉和维生素。'] },
      { title: '互动', items: ['互动以短时间、低压力接触为主。', '避免频繁抓握，尤其是刚到新环境时。'] },
      { title: '日常照护', items: ['定期清理垫材、食盆和水盆。', '观察脱皮、排便和进食情况。'] }
    ],
    cautions: ['对温度较敏感，避免低温饲养。', '脱皮期需注意湿度和皮肤状态。', '如出现拒食、精神差等情况，建议及时观察或就医。']
  },
  bird: {
    difficulty: '需要耐心陪伴',
    lifespan: '5-30年',
    size: '小型到中型',
    activeTime: '白天活跃',
    beginner: '适合能提供陪伴和安静环境的家庭',
    care: [
      { title: '环境', items: ['鸟笼需通风、避风，远离厨房油烟。', '提供站杆、玩具和安全放飞空间。'] },
      { title: '喂养', items: ['主食搭配谷物、颗粒粮和少量蔬果。', '保证清洁饮水，避免高油高盐食物。'] },
      { title: '互动', items: ['每天温和互动，建立信任。', '避免突然惊吓和过度追逐。'] },
      { title: '日常照护', items: ['定期清理笼底和食水容器。', '观察羽毛、粪便和呼吸状态。'] }
    ],
    cautions: ['对烟雾、香薰和油烟较敏感。', '放飞时关闭门窗并避开危险物。', '炸毛、闭眼、呼吸异常需要重视。']
  },
  rodent: {
    difficulty: '入门友好',
    lifespan: '2-8年',
    size: '小型',
    activeTime: '夜间或傍晚更活跃',
    beginner: '适合空间有限但能稳定照护的新手',
    care: [
      { title: '环境', items: ['准备通风、干燥、可躲藏的饲养箱。', '垫材要定期更换，避免粉尘过大。'] },
      { title: '喂养', items: ['以专用粮为主，少量搭配安全蔬果。', '注意磨牙需求，提供合适啃咬物。'] },
      { title: '互动', items: ['先让它熟悉气味，再逐步上手互动。', '互动时间不宜过长，避免应激。'] },
      { title: '日常照护', items: ['定期清理食盆、水壶和垫材。', '观察牙齿、毛发和体重变化。'] }
    ],
    cautions: ['避免高温、潮湿和强烈噪音。', '不同种类不一定适合混养。', '拒食、掉毛严重或行动异常需关注。']
  },
  other: {
    difficulty: '视品类而定',
    lifespan: '因品类差异较大',
    size: '需结合具体品种判断',
    activeTime: '需继续观察生活习性',
    beginner: '建议先了解具体饲养需求',
    care: [
      { title: '环境', items: ['先确认温度、湿度、空间和安全需求。', '新到家时保持安静，减少频繁打扰。'] },
      { title: '喂养', items: ['根据具体品种选择主食。', '不确定食物安全性时不要随意喂食。'] },
      { title: '互动', items: ['先观察状态，再逐步建立互动。', '出现应激表现时减少接触。'] },
      { title: '日常照护', items: ['记录进食、排便、精神状态。', '必要时咨询专业宠物医生。'] }
    ],
    cautions: ['不要仅凭一次识别结果决定全部饲养方式。', '如果识别不确定，建议结合更多照片确认。', '异常状态请及时就医或咨询专业人士。']
  }
}

var BREED_KNOWLEDGE_MAP = {
  '豹纹守宫': {
    difficulty: '入门友好',
    lifespan: '10-20年',
    size: '小型爬宠',
    activeTime: '夜行性，傍晚后更活跃',
    beginner: '适合认真管理温区的新手'
  },
  '萨摩耶': {
    difficulty: '中等，需要运动和梳毛',
    lifespan: '12-14年',
    size: '中大型犬',
    activeTime: '白天外出时更活跃',
    beginner: '适合有遛狗和洗护时间的家庭'
  },
  '蓝金渐层长毛猫': {
    difficulty: '入门友好，注意梳毛',
    lifespan: '12-18年',
    size: '中型猫',
    activeTime: '清晨与傍晚更活跃',
    beginner: '适合新手，但长毛需要护理'
  }
}

function getSpeciesKey(species, breed) {
  var text = normalizeName((species || '') + ' ' + (breed || ''))
  if (/(猫咪|猫|英短|美短|布偶|渐层|缅因|家猫)/.test(text)) return 'cat'
  if (/(狗狗|狗|犬|萨摩耶|金毛|柯基|柴犬|边牧|哈士奇)/.test(text)) return 'dog'
  if (/(爬宠|龟|蛇|蜥蜴|守宫|鬃狮|豹纹守宫)/.test(text)) return 'reptile'
  if (/(鸟类|鸟|鹦鹉)/.test(text)) return 'bird'
  if (/(啮齿|兔|仓鼠|龙猫|荷兰猪)/.test(text)) return 'rodent'
  return 'other'
}

function buildKnowledge(species, breed) {
  var key = getSpeciesKey(species, breed)
  var base = clone(PET_KNOWLEDGE_MAP[key] || PET_KNOWLEDGE_MAP.other)
  var breedInfo = BREED_KNOWLEDGE_MAP[normalizeName(breed)] || null

  if (breedInfo) {
    base.difficulty = breedInfo.difficulty || base.difficulty
    base.lifespan = breedInfo.lifespan || base.lifespan
    base.size = breedInfo.size || base.size
    base.activeTime = breedInfo.activeTime || base.activeTime
    base.beginner = breedInfo.beginner || base.beginner
  }

  return {
    rows: [
      { label: '宠物种类', value: species || '待确认' },
      { label: '识别品种', value: breed || '待确认品种' },
      { label: '饲养难度', value: base.difficulty },
      { label: '寿命参考', value: base.lifespan },
      { label: '体型参考', value: base.size },
      { label: '活跃时间', value: base.activeTime },
      { label: '是否适合新手', value: base.beginner }
    ],
    care: base.care,
    cautions: base.cautions
  }
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
      avatar: '',
      confidence: 0,
      source: '',
      knowledgeRows: [],
      careSections: [],
      cautions: []
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
    var records = userStorage.getValue(IDENTIFY_KEY)

    if (!Array.isArray(records)) {
      userStorage.setValue(IDENTIFY_KEY, [])
      return
    }

    if (records.length) {
      userStorage.setValue(IDENTIFY_KEY, records.map(normalizeRecord))
    }
  },

  loadIdentifyRecords: function () {
    var records = userStorage.getValue(IDENTIFY_KEY)
    var sourceList = Array.isArray(records) ? records : []
    var pets = this.getStoredPets()
    var petsById = {}
    var normalized = []
    var changed = false
    var i
    var j

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
      userStorage.setValue(IDENTIFY_KEY, normalized)
    }

    this.setData({
      identifyRecords: normalized
    })
  },

  appendIdentifyRecord: function (result) {
    var records = userStorage.getValue(IDENTIFY_KEY)
    var sourceList = Array.isArray(records) ? records : []
    var list = Array.isArray(sourceList) ? sourceList.slice() : []
    var createdAt = result.createdAt || formatNow()
    var nextRecord = normalizeRecord({
      id: 'record_' + Date.now(),
      petId: result.petId || '',
      petName: result.petName,
      species: result.species,
      result: result.breed,
      confidence: result.confidence,
      image: result.image,
      date: formatDateOnly(createdAt),
      updatedAt: createdAt,
      action: '待确认'
    })

    list.unshift(nextRecord)
    userStorage.setValue(IDENTIFY_KEY, list)
    this.loadIdentifyRecords()
    return nextRecord.id
  },

  updateIdentifyRecord: function (recordId, patch, moveToTop) {
    var records = userStorage.getValue(IDENTIFY_KEY)
    var sourceList = Array.isArray(records) ? records : []
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

    userStorage.setValue(IDENTIFY_KEY, nextList)
    this.loadIdentifyRecords()
  },

  deleteIdentifyRecord: function (recordId) {
    var records = userStorage.getValue(IDENTIFY_KEY)
    var sourceList = Array.isArray(records) ? records : []
    var list = Array.isArray(sourceList) ? sourceList.slice() : []
    var nextList = []
    var removed = false
    var i

    if (!recordId || !list.length) {
      return false
    }

    for (i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(recordId)) {
        removed = true
      } else {
        nextList.push(list[i])
      }
    }

    if (!removed) {
      return false
    }

    userStorage.setValue(IDENTIFY_KEY, nextList)
    if (String(this.data.pendingIdentifyResultId || '') === String(recordId)) {
      this.setData({
        pendingIdentifyResultId: ''
      })
    }
    this.loadIdentifyRecords()
    return true
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
    var storedPets = userStorage.getValue(PETS_KEY)
    var source = Array.isArray(storedPets) && storedPets.length ? storedPets : []

    if (!Array.isArray(source)) {
      return []
    }

    return clone(source)
  },

  savePets: function (pets) {
    userStorage.setValue(PETS_KEY, pets)
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
        avatar: avatar,
        confidence: Number(result.confidence || 0),
        source: result.source || '',
        knowledgeRows: buildKnowledge(species, breed).rows,
        careSections: buildKnowledge(species, breed).care,
        cautions: buildKnowledge(species, breed).cautions
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

    archiveForm.species = normalizeName(archiveForm.species) || '宠物'
    archiveForm.breed = normalizeName(archiveForm.breed) || '未填品种'

    userStorage.setValue(IDENTIFY_PET_DRAFT_KEY, {
      recordId: this.data.pendingIdentifyResultId || '',
      avatar: archiveForm.avatar || this.data.imageUrl || CAT_IMAGE,
      species: archiveForm.species,
      breed: archiveForm.breed,
      confidence: Number(archiveForm.confidence || 0),
      source: archiveForm.source || '',
      createdAt: formatNow()
    })

    this.setData({
      showArchiveForm: false,
      pendingIdentifyResultId: ''
    })

    wx.navigateTo({
      url: '/pages/pet-edit/index?mode=create&fromIdentify=1'
    })
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

  handleDeleteRecord: function (e) {
    var that = this
    var recordId = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.id : ''
    var record = this.findRecordById(recordId)
    var recordName = record && record.petName ? record.petName : '这条记录'

    if (!recordId || !record) {
      wx.showToast({
        title: '未找到该记录',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '提示',
      content: '确定删除“' + recordName + '”的识别记录吗？',
      success: function (res) {
        if (!res.confirm) {
          return
        }

        if (that.deleteIdentifyRecord(recordId)) {
          wx.showToast({
            title: '已删除识别记录',
            icon: 'success'
          })
        }
      }
    })
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
          createdAt: result.createdAt || formatNow(),
          source: result.source || 'api',
          provider: result.provider || '',
          model: result.model || ''
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
        that.setData({
          loading: false
        })
        wx.showModal({
          title: '识别失败',
          content: formatIdentifyError(err),
          showCancel: false
        })
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
      item.source = apiFailed ? 'demo' : 'local'
      item.provider = ''
      item.model = ''
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

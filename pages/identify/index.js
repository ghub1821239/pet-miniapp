var identifyApi = require('../../utils/identify-api')
var IDENTIFY_KEY = 'identifyRecords'
var LEGACY_IDENTIFY_KEY = 'identifyHistory'
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
  if (petName === '毛孩子') {
    result = '蓝金渐层长毛猫'
  }
  if (petName === '布丁') {
    result = '萨摩耶'
  }

  return {
    id: item.id || 'record_' + Date.now(),
    petName: petName,
    result: result,
    confidence: Number(item.confidence || 0),
    image: image,
    date: item.date || '2026-05-16',
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

Page({
  data: {
    imageUrl: '',
    loading: false,
    hasRecognizedResult: false,
    serviceReady: false,
    serviceStatusText: '正在检测识别服务...',
    serviceModeText: '未连接',
    result: DEMO_IDENTIFY_RESULT,
    identifyRecords: []
  },

  onLoad: function () {
    this.ensureMockRecords()
    this.checkIdentifyService()
  },

  onShow: function () {
    this.loadIdentifyRecords()
  },

  checkIdentifyService: function () {
    var that = this

    if (!identifyApi.hasRemoteIdentifyApi()) {
      this.setData({
        serviceReady: false,
        serviceStatusText: '当前未配置识别服务，将展示示例结果',
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
      that.setData({
        serviceReady: false,
        serviceStatusText: '当前未连上识别服务，将先展示示例结果',
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
    var normalized = []
    var i

    if (!Array.isArray(sourceList) || !sourceList.length) {
      sourceList = clone(DEFAULT_IDENTIFY_RECORDS)
    }

    for (i = 0; i < sourceList.length; i++) {
      normalized.push(normalizeRecord(sourceList[i]))
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
      petName: result.petName,
      result: result.breed,
      confidence: result.confidence,
      image: result.image,
      date: formatDateOnly(createdAt),
      action: '待确认'
    })

    list.unshift(nextRecord)
    wx.setStorageSync(IDENTIFY_KEY, list)
    wx.setStorageSync(LEGACY_IDENTIFY_KEY, list)
    this.loadIdentifyRecords()
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
        })
        that.appendIdentifyRecord(nextResult)
        wx.showToast({
          title: '识别完成',
          icon: 'success'
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
      })
      that.appendIdentifyRecord(item)
      wx.showToast({
        title: apiFailed ? '当前未连上识别服务，先展示示例结果' : '未配接口，先展示示例结果',
        icon: 'none'
      })
    }, 700)
  },

  handleSaveToArchive: function () {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
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

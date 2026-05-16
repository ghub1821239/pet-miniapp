var IDENTIFY_KEY = 'identifyRecords'
var LEGACY_IDENTIFY_KEY = 'identifyHistory'
var CAT_IMAGE = '/assets/mock/identify/identify-cat-demo.jpg.jpg'
var DOG_IMAGE = '/assets/mock/pets/pet-buding.jpg.jpg'

var IDENTIFY_ACTIONS = [
  { id: 'camera', icon: '📷', title: '拍照识别', desc: '现场拍摄宠物照片' },
  { id: 'album', icon: '🖼️', title: '相册上传', desc: '从相册选择宠物图片' },
  { id: 'record', icon: '🐾', title: '识别记录', desc: '查看历史识别结果' }
]

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

Page({
  data: {
    imageUrl: '',
    loading: false,
    identifyActions: IDENTIFY_ACTIONS,
    result: DEMO_IDENTIFY_RESULT,
    identifyRecords: []
  },

  onLoad: function () {
    this.ensureMockRecords()
  },

  onShow: function () {
    this.loadIdentifyRecords()
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

  handleActionTap: function (e) {
    var id = e.currentTarget.dataset.id
    if (id === 'camera') {
      this.handleTakePhoto()
      return
    }
    if (id === 'album') {
      this.handleChooseImage()
      return
    }
    wx.showToast({
      title: '识别记录功能开发中',
      icon: 'none'
    })
  },

  recognizePet: function () {
    var that = this
    var randomIndex = Math.floor(Math.random() * RECOGNIZE_POOL.length)
    var item = clone(RECOGNIZE_POOL[randomIndex])

    this.setData({
      loading: true
    })

    setTimeout(function () {
      item.createdAt = '2026-05-16 16:20'
      that.setData({
        loading: false,
        result: item
      })
      wx.showToast({
        title: '识别完成',
        icon: 'success'
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

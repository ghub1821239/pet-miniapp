// pages/identify/index.js
var demoResults = [
  {
    species: '猫',
    breed: '英短蓝猫',
    tip: '英短蓝猫体型圆润，容易发腮和发胖。喂养时要注意控制体重，定期梳毛，并关注泌尿系统健康。'
  },
  {
    species: '猫',
    breed: '布偶猫',
    tip: '布偶猫性格温顺，毛发较长，需注意毛球管理和肠胃敏感问题，建议定期梳毛并观察食欲变化。'
  },
  {
    species: '狗',
    breed: '金毛',
    tip: '金毛属于中大型犬，运动量需求较高，要关注髋关节、皮肤和耳道健康，日常需要充足活动。'
  },
  {
    species: '狗',
    breed: '柯基',
    tip: '柯基腿短背长，注意控制体重，减少频繁上下跳跃，避免脊柱和关节压力过大。'
  },
  {
    species: '兔',
    breed: '垂耳兔',
    tip: '兔子要重点关注牙齿过长、消化系统和环境卫生，饮食上以干草为主，蔬菜和零食适量。'
  }
]

Page({
  data: {
    imageUrl: '',
    loading: false,
    result: {
      species: '',
      breed: '',
      confidence: ''
    },
    tips: ''
  },

  chooseImage: function () {
    var that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.setData({
          imageUrl: res.tempFilePaths[0],
          result: {
            species: '',
            breed: '',
            confidence: ''
          },
          tips: ''
        })
      }
    })
  },

  recognizePet: function () {
    var that = this
    var randomIndex
    var item
    var confidence

    if (!this.data.imageUrl) {
      wx.showToast({
        title: '请先上传图片',
        icon: 'none'
      })
      return
    }

    this.setData({
      loading: true
    })

    setTimeout(function () {
      randomIndex = Math.floor(Math.random() * demoResults.length)
      item = demoResults[randomIndex]
      confidence = 88 + Math.floor(Math.random() * 10)

      that.setData({
        loading: false,
        result: {
          species: item.species,
          breed: item.breed,
          confidence: confidence + '%'
        },
        tips: item.tip
      })

      wx.showToast({
        title: '识别完成',
        icon: 'success'
      })
    }, 1000)
  },

  bindResultInput: function (e) {
    var field = e.currentTarget.dataset.field
    this.setData({
      ['result.' + field]: e.detail.value
    })
  },

  generateTips: function () {
    var breed = this.data.result.breed
    var i
    var text = ''

    if (!breed) {
      wx.showToast({
        title: '请先填写品种',
        icon: 'none'
      })
      return
    }

    for (i = 0; i < demoResults.length; i++) {
      if (demoResults[i].breed === breed) {
        text = demoResults[i].tip
        break
      }
    }

    if (!text) {
      text = '该品种的小贴士暂未配置。后续你可以把这里改成调用后端识别接口和 LLM 接口，返回疾病风险、喂养建议、洗护建议等内容。'
    }

    this.setData({
      tips: text
    })
  }
})
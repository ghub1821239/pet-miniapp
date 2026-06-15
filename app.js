var auth = require('./utils/auth')

var LOGIN_PAGE = 'pages/login/index'

App({
  onLaunch: function () {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d1gr7sg6s8ba1f7b5',
        traceUser: true
      })
    } else {
      console.warn('当前基础库不支持云开发，请升级微信开发者工具或基础库')
    }

    console.log('萌宠日记启动成功')
  },

  onShow: function () {
    var pages = getCurrentPages()
    var currentPage = pages && pages.length ? pages[pages.length - 1] : null
    var route = currentPage && currentPage.route ? currentPage.route : ''

    if (route === LOGIN_PAGE) {
      return
    }

    if (!auth.ensureValidAuth()) {
      wx.reLaunch({
        url: '/' + LOGIN_PAGE
      })
    }
  }
})

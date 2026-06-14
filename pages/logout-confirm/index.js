var auth = require('../../utils/auth')

Page({
  cancel: function () {
    wx.navigateBack()
  },

  confirmLogout: function () {
    auth.logout()
    wx.reLaunch({
      url: '/pages/login/index'
    })
  }
})

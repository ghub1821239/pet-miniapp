var profileData = require('../../utils/profile-data')

Page({
  data: {
    id: '',
    pet: {}
  },

  onLoad: function (options) {
    this.setData({
      id: options.id || ''
    })
  },

  onShow: function () {
    var pet = profileData.findPet(this.data.id)
    if (!pet) {
      wx.showToast({ title: '未找到该宠物', icon: 'none' })
      return
    }
    this.setData({ pet: pet })
  },

  editPet: function () {
    wx.navigateTo({ url: '/pages/pet-edit/index?mode=edit&id=' + encodeURIComponent(this.data.id) })
  }
})

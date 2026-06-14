var profileData = require('../../utils/profile-data')

Page({
  data: {
    petList: []
  },

  onShow: function () {
    this.loadPets()
  },

  loadPets: function () {
    this.setData({
      petList: profileData.readPets()
    })
  },

  addPet: function () {
    wx.navigateTo({ url: '/pages/pet-edit/index?mode=create' })
  },

  viewPet: function (e) {
    wx.navigateTo({ url: '/pages/pet-detail/index?id=' + encodeURIComponent(e.currentTarget.dataset.id) })
  },

  editPet: function (e) {
    wx.navigateTo({ url: '/pages/pet-edit/index?mode=edit&id=' + encodeURIComponent(e.currentTarget.dataset.id) })
  },

  deletePet: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var pets = profileData.readPets()
    var target = null
    var nextPets = []
    var i

    for (i = 0; i < pets.length; i++) {
      if (String(pets[i].id) === String(id)) {
        target = pets[i]
      } else {
        nextPets.push(pets[i])
      }
    }

    if (!target) {
      wx.showToast({ title: '未找到该宠物', icon: 'none' })
      return
    }

    wx.showModal({
      title: '删除档案',
      content: '删除后不会删除历史识别记录，但会解除该宠物与识别记录的绑定。',
      confirmText: '删除',
      confirmColor: '#B56A53',
      success: function (res) {
        if (!res.confirm) return
        profileData.writePets(nextPets)
        profileData.unbindIdentifyRecordsByPetId(id)
        profileData.unbindRemindersByPetId(id)
        that.loadPets()
        wx.showToast({ title: '已删除宠物档案', icon: 'success' })
      }
    })
  }
})

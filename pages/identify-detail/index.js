var profileData = require('../../utils/profile-data')

Page({
  data: {
    id: '',
    record: {}
  },

  onLoad: function (options) {
    this.setData({ id: options.id || '' })
  },

  onShow: function () {
    this.loadRecord()
  },

  loadRecord: function () {
    var records = profileData.readIdentifyRecords()
    var i
    for (i = 0; i < records.length; i++) {
      if (String(records[i].id) === String(this.data.id)) {
        this.setData({ record: records[i] })
        return
      }
    }
    wx.showToast({ title: '未找到识别记录', icon: 'none' })
  },

  associatePet: function () {
    var that = this
    var pets = profileData.readPets()
    if (!pets.length) {
      wx.showToast({ title: '请先创建宠物档案', icon: 'none' })
      return
    }
    wx.showActionSheet({
      itemList: pets.map(function (pet) { return pet.name }),
      success: function (res) {
        var pet = pets[res.tapIndex]
        var records = profileData.readIdentifyRecords()
        var i
        for (i = 0; i < records.length; i++) {
          if (String(records[i].id) === String(that.data.id)) {
            records[i].petId = pet.id
            records[i].petName = pet.name
            records[i].action = '已关联宠物'
            break
          }
        }
        profileData.writeIdentifyRecords(records)
        that.loadRecord()
      }
    })
  },

  unbindPet: function () {
    var records = profileData.readIdentifyRecords()
    var i
    for (i = 0; i < records.length; i++) {
      if (String(records[i].id) === String(this.data.id)) {
        records[i].petId = ''
        records[i].petName = ''
        records[i].action = '待确认'
        break
      }
    }
    profileData.writeIdentifyRecords(records)
    this.loadRecord()
  },

  createPet: function () {
    wx.navigateTo({ url: '/pages/pet-edit/index?mode=create&recordId=' + encodeURIComponent(this.data.id) })
  }
})

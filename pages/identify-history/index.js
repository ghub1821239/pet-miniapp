var profileData = require('../../utils/profile-data')

Page({
  data: {
    activeTab: 'all',
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'linked', label: '已关联宠物' },
      { key: 'unlinked', label: '未关联宠物' }
    ],
    records: [],
    groups: []
  },

  onShow: function () {
    this.loadRecords()
  },

  loadRecords: function () {
    var records = profileData.readIdentifyRecords()
    this.setData({ records: records })
    this.buildGroups()
  },

  changeTab: function (e) {
    this.setData({ activeTab: e.currentTarget.dataset.key })
    this.buildGroups()
  },

  buildGroups: function () {
    var tab = this.data.activeTab
    var records = this.data.records.filter(function (item) {
      if (tab === 'linked') return !!item.petId
      if (tab === 'unlinked') return !item.petId
      return true
    })
    var map = {}
    var groups = []
    var i

    records.sort(function (a, b) {
      return String(b.date + ' ' + b.time).localeCompare(String(a.date + ' ' + a.time))
    })

    for (i = 0; i < records.length; i++) {
      if (!map[records[i].date]) {
        map[records[i].date] = {
          date: records[i].date,
          records: []
        }
        groups.push(map[records[i].date])
      }
      map[records[i].date].records.push(records[i])
    }

    this.setData({ groups: groups })
  },

  viewDetail: function (e) {
    wx.navigateTo({ url: '/pages/identify-detail/index?id=' + encodeURIComponent(e.currentTarget.dataset.id) })
  },

  createPet: function (e) {
    wx.navigateTo({ url: '/pages/pet-edit/index?mode=create&recordId=' + encodeURIComponent(e.currentTarget.dataset.id) })
  },

  unbindPet: function (e) {
    var id = e.currentTarget.dataset.id
    var records = profileData.readIdentifyRecords()
    var i
    for (i = 0; i < records.length; i++) {
      if (String(records[i].id) === String(id)) {
        records[i].petId = ''
        records[i].petName = ''
        break
      }
    }
    profileData.writeIdentifyRecords(records)
    this.loadRecords()
  },

  associatePet: function (e) {
    var that = this
    var recordId = e.currentTarget.dataset.id
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
          if (String(records[i].id) === String(recordId)) {
            records[i].petId = pet.id
            records[i].petName = pet.name
            records[i].action = '已关联宠物'
            break
          }
        }
        profileData.writeIdentifyRecords(records)
        that.loadRecords()
      }
    })
  }
})

var profileData = require('../../utils/profile-data')
var subscribeConfig = require('../../utils/subscribeConfig')

Page({
  data: {
    activeTab: 'all',
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待发送' },
      { key: 'sent', label: '已发送' },
      { key: 'send_failed', label: '发送失败' },
      { key: 'need_resubscribe', label: '需重新授权' },
      { key: 'closed', label: '已关闭' }
    ],
    dueStationCount: 0,
    reminders: [],
    filteredList: []
  },

  onShow: function () {
    this.loadReminders()
  },

  loadReminders: function () {
    var list = profileData.readReminders().sort(function (a, b) {
      return Number(a.remindAt || 0) - Number(b.remindAt || 0)
    })
    var now = Date.now()
    var dueStationCount = list.filter(function (item) {
      return item.channel === 'station' && item.status === 'pending' && Number(item.remindAt || 0) <= now
    }).length

    list = list.map(function (item) {
      item.channelText = profileData.getChannelText(item.channel)
      item.statusText = profileData.getStatusText(item.status)
      item.displayTime = (item.reminderDate || item.date) + ' ' + (item.reminderTime || item.time)
      return item
    })
    this.setData({
      reminders: list,
      dueStationCount: dueStationCount
    })
    this.applyFilter()
  },

  applyFilter: function () {
    var tab = this.data.activeTab
    var list = this.data.reminders
    var filtered = tab === 'all' ? list : list.filter(function (item) {
      return item.status === tab || (tab === 'pending' && item.status === 'pending')
    })
    this.setData({ filteredList: filtered })
  },

  changeTab: function (e) {
    this.setData({ activeTab: e.currentTarget.dataset.key })
    this.applyFilter()
  },

  addReminder: function () {
    wx.navigateTo({ url: '/pages/reminder-edit/index?mode=create' })
  },

  editReminder: function (e) {
    wx.navigateTo({ url: '/pages/reminder-edit/index?mode=edit&id=' + encodeURIComponent(e.currentTarget.dataset.id) })
  },

  markDone: function (e) {
    var id = e.currentTarget.dataset.id
    var list = profileData.readReminders()
    var i
    for (i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(id)) {
        list[i].done = true
        list[i].closed = false
        list[i].status = 'completed'
        break
      }
    }
    profileData.writeReminders(list)
    this.loadReminders()
  },

  renewSubscribe: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var templateId = subscribeConfig.SUBSCRIBE_TEMPLATE_IDS.PET_REMINDER

    if (!templateId || templateId.indexOf('请替换') === 0) {
      wx.showToast({ title: '请先配置订阅模板ID', icon: 'none' })
      return
    }

    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: function (res) {
        if (res[templateId] !== 'accept') {
          wx.showToast({ title: '未授权微信通知', icon: 'none' })
          return
        }
        that.updateReminderSubscribe(id, templateId)
      },
      fail: function () {
        wx.showToast({ title: '订阅授权失败', icon: 'none' })
      }
    })
  },

  updateReminderSubscribe: function (id, templateId) {
    var list = profileData.readReminders()
    var reminder = null
    var i
    for (i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(id)) {
        list[i].channel = 'wechat'
        list[i].channelText = '微信服务通知'
        list[i].templateId = templateId
        list[i].subscribeStatus = 'accepted'
        list[i].status = 'pending'
        list[i].statusText = '待发送'
        list[i].failReason = ''
        reminder = list[i]
        break
      }
    }
    profileData.writeReminders(list)
    this.saveReminderToCloud(reminder)
    this.loadReminders()
    wx.showToast({ title: '已重新开启微信通知', icon: 'success' })
  },

  saveReminderToCloud: function (reminder) {
    if (!reminder || !wx.cloud || !wx.cloud.callFunction) return
    wx.cloud.callFunction({
      name: 'saveReminder',
      data: { reminder: reminder }
    })
  }
})

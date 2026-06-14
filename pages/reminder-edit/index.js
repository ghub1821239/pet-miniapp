var profileData = require('../../utils/profile-data')
var subscribeConfig = require('../../utils/subscribeConfig')

var TYPE_RULE_MAP = {
  '生日提醒': 'birthday',
  '疫苗提醒': 'vaccine',
  '驱虫提醒': 'deworm',
  '洗澡美容': 'grooming',
  '复诊提醒': 'recheck',
  '体重记录': 'weight',
  '其他': 'other'
}

Page({
  data: {
    mode: 'create',
    saving: false,
    petOptions: [],
    petIndex: 0,
    typeOptions: ['生日提醒', '疫苗提醒', '驱虫提醒', '洗澡美容', '复诊提醒', '体重记录', '其他'],
    typeIndex: 0,
    channelOptions: profileData.CHANNEL_OPTIONS,
    channelIndex: 1,
    advanceOptions: profileData.ADVANCE_OPTIONS,
    advanceIndex: 0,
    repeatOptions: profileData.REPEAT_OPTIONS,
    repeatIndex: 0,
    subtaskInput: '',
    statusOptions: [
      { key: 'pending', label: '待发送' },
      { key: 'sent', label: '已发送' },
      { key: 'send_failed', label: '发送失败' },
      { key: 'need_resubscribe', label: '需重新授权' },
      { key: 'closed', label: '已关闭' }
    ],
    statusIndex: 0,
    form: {
      id: '',
      petId: '',
      petName: '暂不关联',
      type: '生日提醒',
      title: '',
      date: '',
      time: '08:00',
      channel: 'station',
      channelText: '站内提醒',
      advanceType: 'onTime',
      advanceText: '准时提醒',
      repeatRule: 'none',
      repeatText: '不重复',
      note: '',
      status: 'pending',
      statusText: '待发送',
      done: false,
      closed: false,
      subtasks: []
    }
  },

  onLoad: function (options) {
    var mode = options && options.mode === 'edit' ? 'edit' : 'create'
    var pets = profileData.readPets()
    var petOptions = pets.length ? pets : [{ id: '', name: '暂不关联' }]
    var form = this.data.form
    form.date = profileData.getToday()

    if (mode === 'edit') {
      var reminders = profileData.readReminders()
      var i
      for (i = 0; i < reminders.length; i++) {
        if (String(reminders[i].id) === String(options.id)) {
          form = reminders[i]
          break
        }
      }
    } else if (petOptions[0]) {
      form.petId = petOptions[0].id
      form.petName = petOptions[0].name
    }

    this.setData({
      mode: mode,
      petOptions: petOptions,
      form: form
    })
    this.syncIndexes()
  },

  syncIndexes: function () {
    var form = this.data.form
    var petIndex = 0
    var i
    for (i = 0; i < this.data.petOptions.length; i++) {
      if (String(this.data.petOptions[i].id) === String(form.petId)) petIndex = i
    }
    this.setData({
      petIndex: petIndex,
      typeIndex: Math.max(0, this.data.typeOptions.indexOf(form.type)),
      channelIndex: this.findOptionIndex(this.data.channelOptions, form.channel || 'station'),
      advanceIndex: this.findOptionIndex(this.data.advanceOptions, form.advanceType || form.advanceText || 'onTime'),
      repeatIndex: this.findOptionIndex(this.data.repeatOptions, form.repeatRule || form.repeatText || 'none'),
      statusIndex: this.findStatusIndex(form.status)
    })
  },

  findOptionIndex: function (options, value) {
    var i
    for (i = 0; i < options.length; i++) {
      if (options[i].key === value || options[i].text === value) return i
    }
    return 0
  },

  findStatusIndex: function (status) {
    var i
    for (i = 0; i < this.data.statusOptions.length; i++) {
      if (this.data.statusOptions[i].key === status) return i
    }
    return 0
  },

  bindInput: function (e) {
    this.setData({
      ['form.' + e.currentTarget.dataset.field]: e.detail.value
    })
  },

  bindSubtaskInput: function (e) {
    this.setData({
      subtaskInput: e.detail.value
    })
  },

  addSubtask: function () {
    var text = String(this.data.subtaskInput || '').trim()
    var subtasks = (this.data.form.subtasks || []).slice()
    if (!text) return
    subtasks.push({
      text: text,
      done: false
    })
    this.setData({
      'form.subtasks': subtasks,
      subtaskInput: ''
    })
  },

  removeSubtask: function (e) {
    var index = Number(e.currentTarget.dataset.index)
    var subtasks = (this.data.form.subtasks || []).slice()
    subtasks.splice(index, 1)
    this.setData({
      'form.subtasks': subtasks
    })
  },

  changePet: function (e) {
    var index = Number(e.detail.value)
    var pet = this.data.petOptions[index]
    this.setData({
      petIndex: index,
      'form.petId': pet.id,
      'form.petName': pet.name
    })
  },

  changeType: function (e) {
    var index = Number(e.detail.value)
    this.setData({
      typeIndex: index,
      'form.type': this.data.typeOptions[index]
    })
  },

  changeChannel: function (e) {
    var index = Number(e.detail.value)
    var channel = this.data.channelOptions[index]
    this.setData({
      channelIndex: index,
      'form.channel': channel.key,
      'form.channelText': channel.text
    })
  },

  changeAdvance: function (e) {
    var index = Number(e.detail.value)
    var advance = this.data.advanceOptions[index]
    this.setData({
      advanceIndex: index,
      'form.advanceType': advance.key,
      'form.advanceText': advance.text,
      'form.reminderText': advance.text
    })
  },

  changeDate: function (e) {
    this.setData({ 'form.date': e.detail.value })
  },

  changeTime: function (e) {
    this.setData({ 'form.time': e.detail.value })
  },

  changeRepeat: function (e) {
    var index = Number(e.detail.value)
    var repeat = this.data.repeatOptions[index]
    this.setData({
      repeatIndex: index,
      'form.repeatRule': repeat.key,
      'form.repeatText': repeat.text
    })
  },

  changeStatus: function (e) {
    var index = Number(e.detail.value)
    var status = this.data.statusOptions[index]
    this.setData({
      statusIndex: index,
      'form.status': status.key,
      'form.statusText': status.label,
      'form.done': status.key === 'sent',
      'form.closed': status.key === 'closed'
    })
  },

  saveReminder: function () {
    var reminder = this.buildReminderData()

    if (!reminder.title) {
      wx.showToast({ title: '请填写提醒内容', icon: 'none' })
      return
    }

    if (!reminder.reminderDate || !reminder.reminderTime) {
      wx.showToast({ title: '请选择提醒日期和时间', icon: 'none' })
      return
    }

    if (reminder.channel === 'wechat') {
      this.requestWechatSubscription(reminder)
      return
    }

    this.persistReminder(reminder, '提醒已保存')
  },

  buildReminderData: function () {
    var form = profileData.clone(this.data.form)
    var typeText = form.type || '生日提醒'
    var repeat = profileData.REPEAT_OPTIONS[this.data.repeatIndex] || profileData.REPEAT_OPTIONS[0]
    var advance = profileData.ADVANCE_OPTIONS[this.data.advanceIndex] || profileData.ADVANCE_OPTIONS[0]
    var channel = profileData.CHANNEL_OPTIONS[this.data.channelIndex] || profileData.CHANNEL_OPTIONS[1]
    var status = form.closed ? 'closed' : (form.status || 'pending')

    form.title = String(form.title || '').trim()
    form.content = form.title
    form.id = form.id || 'plan_' + Date.now()
    form.type = typeText
    form.reminderType = TYPE_RULE_MAP[typeText] || 'other'
    form.reminderTypeText = typeText
    form.date = form.date || profileData.getToday()
    form.time = form.time || '08:00'
    form.reminderDate = form.date
    form.reminderTime = form.time
    form.channel = channel.key
    form.channelText = channel.text
    form.advanceType = advance.key
    form.advanceText = advance.text
    form.reminderText = advance.text
    form.repeatRule = repeat.key
    form.repeatText = repeat.text
    form.remindAt = profileData.calculateRemindAt(form.reminderDate, form.reminderTime, form.advanceType)
    form.status = status
    form.statusText = profileData.getStatusText(status)
    form.done = status === 'sent' || status === 'completed'
    form.closed = status === 'closed'
    form.templateId = form.templateId || ''
    form.subscribeStatus = form.subscribeStatus || 'none'
    form.subtasks = Array.isArray(form.subtasks) ? form.subtasks : []
    form.updatedAt = Date.now()
    form.createdAt = form.createdAt || Date.now()
    return form
  },

  requestWechatSubscription: function (reminder) {
    var that = this
    var templateId = subscribeConfig.SUBSCRIBE_TEMPLATE_IDS.PET_REMINDER

    if (!templateId || templateId.indexOf('请替换') === 0) {
      wx.showToast({ title: '请先配置订阅模板ID，已保存为站内提醒', icon: 'none' })
      this.persistReminder(Object.assign({}, reminder, {
        channel: 'station',
        channelText: '站内提醒',
        templateId: templateId,
        subscribeStatus: 'failed',
        status: 'pending',
        statusText: '待发送',
        failReason: '未配置订阅消息模板ID'
      }), '已保存为站内提醒')
      return
    }

    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: function (res) {
        var accepted = res[templateId] === 'accept'
        if (accepted) {
          that.persistReminder(Object.assign({}, reminder, {
            templateId: templateId,
            channel: 'wechat',
            channelText: '微信服务通知',
            subscribeStatus: 'accepted',
            status: 'pending',
            statusText: '待发送',
            failReason: ''
          }), '已开启微信提醒')
        } else {
          that.persistReminder(Object.assign({}, reminder, {
            templateId: templateId,
            channel: 'station',
            channelText: '站内提醒',
            subscribeStatus: 'rejected',
            status: 'pending',
            statusText: '待发送',
            failReason: '用户拒绝订阅授权'
          }), '未授权微信通知，已保存为站内提醒')
        }
      },
      fail: function (err) {
        that.persistReminder(Object.assign({}, reminder, {
          templateId: templateId,
          channel: 'station',
          channelText: '站内提醒',
          subscribeStatus: 'failed',
          status: 'pending',
          statusText: '待发送',
          failReason: err && err.errMsg ? err.errMsg : '订阅授权失败'
        }), '订阅失败，已保存为站内提醒')
      }
    })
  },

  persistReminder: function (reminder, toastTitle) {
    var that = this
    var reminders = profileData.readReminders()
    var i

    this.setData({ saving: true })

    if (this.data.mode === 'edit') {
      for (i = 0; i < reminders.length; i++) {
        if (String(reminders[i].id) === String(reminder.id)) {
          reminders[i] = reminder
          break
        }
      }
    } else {
      reminders.unshift(reminder)
    }

    profileData.writeReminders(reminders)
    this.saveReminderToCloud(reminder).then(function (cloudId) {
      if (cloudId) {
        that.syncLocalCloudId(reminder.id, cloudId)
      }
      wx.showToast({ title: toastTitle || '提醒已保存', icon: reminder.channel === 'wechat' ? 'success' : 'none' })
      setTimeout(function () {
        wx.navigateBack()
      }, 650)
    }).catch(function (err) {
      console.error('saveReminder cloud sync failed:', err)
      wx.showToast({ title: err && err.message ? err.message : '已本地保存，云端同步失败', icon: 'none' })
      setTimeout(function () {
        wx.navigateBack()
      }, 650)
    }).then(function () {
      that.setData({ saving: false })
    })
  },

  saveReminderToCloud: function (reminder) {
    if (!wx.cloud || !wx.cloud.callFunction) {
      return Promise.resolve('')
    }
    return wx.cloud.callFunction({
      name: 'saveReminder',
      data: { reminder: reminder }
    }).then(function (res) {
      var result = res && res.result ? res.result : {}
      if (!result.success) {
        throw new Error(result.message || '云端保存失败')
      }
      return result.id || ''
    })
  },

  syncLocalCloudId: function (localId, cloudId) {
    var reminders = profileData.readReminders()
    var i
    for (i = 0; i < reminders.length; i++) {
      if (String(reminders[i].id) === String(localId)) {
        reminders[i].cloudId = cloudId
        reminders[i]._id = cloudId
        break
      }
    }
    profileData.writeReminders(reminders)
  }
})

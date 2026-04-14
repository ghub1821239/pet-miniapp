// pages/calendar/index.js
var REMINDER_KEY = 'petReminders'

function getToday() {
  var d = new Date()
  var y = d.getFullYear()
  var m = d.getMonth() + 1
  var day = d.getDate()
  m = m < 10 ? '0' + m : m
  day = day < 10 ? '0' + day : day
  return y + '-' + m + '-' + day
}

function sortReminders(list) {
  return list.sort(function (a, b) {
    var aStr = a.date + ' ' + a.time
    var bStr = b.date + ' ' + b.time
    return aStr > bStr ? 1 : -1
  })
}

Page({
  data: {
    categories: ['喂食', '洗澡', '驱虫', '疫苗', '吃药', '遛狗'],
    reminders: [],
    today: '',
    selectedDate: '',
    todayList: [],
    dayList: [],
    showForm: false,
    categoryIndex: 0,
    form: {
      id: '',
      title: '',
      date: '',
      time: '08:00',
      category: '喂食',
      strong: false,
      done: false
    }
  },

  onLoad: function () {
    var today = getToday()
    this.setData({
      today: today,
      selectedDate: today
    })
  },

  onShow: function () {
    this.loadReminders()
    this.checkStrongReminders()
  },

  loadReminders: function () {
    var list = wx.getStorageSync(REMINDER_KEY) || []
    list = sortReminders(list)

    this.setData({
      reminders: list
    })

    this.refreshList()
  },

  refreshList: function () {
    var reminders = this.data.reminders
    var todayList = []
    var dayList = []
    var i

    for (i = 0; i < reminders.length; i++) {
      if (reminders[i].date === this.data.today) {
        todayList.push(reminders[i])
      }
      if (reminders[i].date === this.data.selectedDate) {
        dayList.push(reminders[i])
      }
    }

    this.setData({
      todayList: todayList,
      dayList: dayList
    })
  },

  openAdd: function () {
    this.setData({
      showForm: true,
      categoryIndex: 0,
      form: {
        id: '',
        title: '',
        date: this.data.selectedDate || this.data.today,
        time: '08:00',
        category: this.data.categories[0],
        strong: false,
        done: false
      }
    })
  },

  closeForm: function () {
    this.setData({
      showForm: false
    })
  },

  noop: function () {},

  bindInput: function (e) {
    var field = e.currentTarget.dataset.field
    this.setData({
      ['form.' + field]: e.detail.value
    })
  },

  changeDateFilter: function (e) {
    this.setData({
      selectedDate: e.detail.value
    })
    this.refreshList()
  },

  changeFormDate: function (e) {
    this.setData({
      'form.date': e.detail.value
    })
  },

  changeFormTime: function (e) {
    this.setData({
      'form.time': e.detail.value
    })
  },

  changeCategory: function (e) {
    var index = Number(e.detail.value)
    this.setData({
      categoryIndex: index,
      'form.category': this.data.categories[index]
    })
  },

  switchStrong: function (e) {
    this.setData({
      'form.strong': e.detail.value
    })
  },

  saveReminder: function () {
    var form = this.data.form
    var reminders = wx.getStorageSync(REMINDER_KEY) || []
    var i

    if (!form.title) {
      wx.showToast({
        title: '请填写提醒内容',
        icon: 'none'
      })
      return
    }

    form.id = 'reminder_' + Date.now()
    reminders.unshift(form)
    reminders = sortReminders(reminders)

    wx.setStorageSync(REMINDER_KEY, reminders)

    this.setData({
      showForm: false,
      reminders: reminders
    })
    this.refreshList()

    wx.showToast({
      title: '新增成功',
      icon: 'success'
    })
  },

  toggleDone: function (e) {
    var id = e.currentTarget.dataset.id
    var reminders = wx.getStorageSync(REMINDER_KEY) || []
    var i

    for (i = 0; i < reminders.length; i++) {
      if (reminders[i].id === id) {
        reminders[i].done = !reminders[i].done
        break
      }
    }

    reminders = sortReminders(reminders)
    wx.setStorageSync(REMINDER_KEY, reminders)

    this.setData({
      reminders: reminders
    })
    this.refreshList()
  },

  deleteReminder: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var reminders = wx.getStorageSync(REMINDER_KEY) || []
    var newList = []
    var i

    wx.showModal({
      title: '提示',
      content: '确定删除这条提醒吗？',
      success: function (res) {
        if (res.confirm) {
          for (i = 0; i < reminders.length; i++) {
            if (reminders[i].id !== id) {
              newList.push(reminders[i])
            }
          }

          newList = sortReminders(newList)
          wx.setStorageSync(REMINDER_KEY, newList)

          that.setData({
            reminders: newList
          })
          that.refreshList()
        }
      }
    })
  },

  checkStrongReminders: function () {
    var reminders = wx.getStorageSync(REMINDER_KEY) || []
    var i
    var strongCount = 0

    for (i = 0; i < reminders.length; i++) {
      if (
        reminders[i].date === this.data.today &&
        reminders[i].strong &&
        !reminders[i].done
      ) {
        strongCount++
      }
    }

    if (strongCount > 0) {
      wx.showToast({
        title: '今日有强提醒 ' + strongCount + ' 条',
        icon: 'none'
      })
    }
  }
})
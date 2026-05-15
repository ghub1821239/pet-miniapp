// pages/calendar/index.js
var REMINDER_KEY = 'petReminders'

function pad(num) {
  return num < 10 ? '0' + num : '' + num
}

function getToday() {
  var d = new Date()
  var y = d.getFullYear()
  return formatDate(y, d.getMonth() + 1, d.getDate())
}

function formatDate(year, month, day) {
  return year + '-' + pad(month) + '-' + pad(day)
}

function formatMonth(year, month) {
  return year + '.' + pad(month)
}

function formatMonthTitle(year, month) {
  return year + ' 年 ' + month + ' 月'
}

function parseDate(dateStr) {
  var parts = dateStr.split('-')
  return {
    year: Number(parts[0]),
    month: Number(parts[1]),
    day: Number(parts[2])
  }
}

function getMonthStart(dateStr) {
  var info = parseDate(dateStr)
  return {
    year: info.year,
    month: info.month
  }
}

function getMonthDays(year, month) {
  return new Date(year, month, 0).getDate()
}

function buildMonthGrid(year, month, selectedDate, today, reminders) {
  var firstDay = new Date(year, month - 1, 1).getDay()
  var daysInMonth = getMonthDays(year, month)
  var prevMonth = month === 1 ? 12 : month - 1
  var prevYear = month === 1 ? year - 1 : year
  var daysInPrevMonth = getMonthDays(prevYear, prevMonth)
  var cells = []
  var reminderMap = {}
  var i

  for (i = 0; i < reminders.length; i++) {
    if (!reminderMap[reminders[i].date]) {
      reminderMap[reminders[i].date] = []
    }
    reminderMap[reminders[i].date].push(reminders[i])
  }

  for (i = 0; i < 42; i++) {
    var offset = i - firstDay + 1
    var cellYear = year
    var cellMonth = month
    var cellDay = offset
    var isCurrentMonth = true

    if (offset <= 0) {
      cellMonth = prevMonth
      cellYear = prevYear
      cellDay = daysInPrevMonth + offset
      isCurrentMonth = false
    } else if (offset > daysInMonth) {
      cellMonth = month === 12 ? 1 : month + 1
      cellYear = month === 12 ? year + 1 : year
      cellDay = offset - daysInMonth
      isCurrentMonth = false
    }

    var date = formatDate(cellYear, cellMonth, cellDay)
    var list = reminderMap[date] || []
    var pendingCount = 0
    var hasStrong = false
    var j

    for (j = 0; j < list.length; j++) {
      if (!list[j].done) {
        pendingCount++
      }
      if (list[j].strong && !list[j].done) {
        hasStrong = true
      }
    }

    cells.push({
      date: date,
      day: cellDay,
      isCurrentMonth: isCurrentMonth,
      isToday: date === today,
      isSelected: date === selectedDate,
      hasReminder: list.length > 0,
      hasStrong: hasStrong,
      reminderCount: list.length,
      pendingCount: pendingCount
    })
  }

  return cells
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
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    reminders: [],
    today: '',
    selectedDate: '',
    currentMonth: '',
    currentMonthTitle: '',
    currentYear: 0,
    currentMonthNumber: 0,
    calendarDays: [],
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
    var monthInfo = getMonthStart(today)
    this.setData({
      today: today,
      selectedDate: today,
      currentYear: monthInfo.year,
      currentMonthNumber: monthInfo.month,
      currentMonth: formatMonth(monthInfo.year, monthInfo.month),
      currentMonthTitle: formatMonthTitle(monthInfo.year, monthInfo.month)
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
    var calendarDays = buildMonthGrid(
      this.data.currentYear,
      this.data.currentMonthNumber,
      this.data.selectedDate,
      this.data.today,
      reminders
    )
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
      dayList: dayList,
      calendarDays: calendarDays,
      currentMonth: formatMonth(this.data.currentYear, this.data.currentMonthNumber),
      currentMonthTitle: formatMonthTitle(this.data.currentYear, this.data.currentMonthNumber)
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

  selectDay: function (e) {
    var date = e.currentTarget.dataset.date
    var info = parseDate(date)
    this.setData({
      selectedDate: date,
      currentYear: info.year,
      currentMonthNumber: info.month
    })
    this.refreshList()
  },

  prevMonth: function () {
    var year = this.data.currentYear
    var month = this.data.currentMonthNumber - 1

    if (month < 1) {
      month = 12
      year--
    }

    this.setData({
      currentYear: year,
      currentMonthNumber: month
    })
    this.refreshList()
  },

  nextMonth: function () {
    var year = this.data.currentYear
    var month = this.data.currentMonthNumber + 1

    if (month > 12) {
      month = 1
      year++
    }

    this.setData({
      currentYear: year,
      currentMonthNumber: month
    })
    this.refreshList()
  },

  jumpToToday: function () {
    var monthInfo = getMonthStart(this.data.today)
    this.setData({
      selectedDate: this.data.today,
      currentYear: monthInfo.year,
      currentMonthNumber: monthInfo.month
    })
    this.refreshList()
  },

  changeDateFilter: function (e) {
    var info = parseDate(e.detail.value)
    this.setData({
      selectedDate: e.detail.value,
      currentYear: info.year,
      currentMonthNumber: info.month
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

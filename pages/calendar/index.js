const REMINDER_KEY = 'petReminders'
const COMMON_CATEGORIES = ['洗澡', '驱虫', '散步']

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getTodayInfo() {
  const now = new Date()
  return {
    today: formatDate(now),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate()
  }
}

function getReminderList() {
  const list = wx.getStorageSync(REMINDER_KEY) || []
  const sanitizedList = sanitizeReminderList(list)

  if (sanitizedList.length !== list.length) {
    wx.setStorageSync(REMINDER_KEY, sanitizedList)
  }

  return sanitizedList
}

function sanitizeReminderList(list) {
  const seenCommon = new Set()
  const result = []

  for (let i = list.length - 1; i >= 0; i--) {
    const item = list[i]
    if (COMMON_CATEGORIES.includes(item.category)) {
      const key = `${item.date}_${item.category}`
      if (seenCommon.has(key)) continue
      seenCommon.add(key)
    }
    result.unshift(item)
  }

  return result
}

function saveReminderList(list) {
  wx.setStorageSync(REMINDER_KEY, sanitizeReminderList(list))
}

function getDefaultQuickStatusMap() {
  return {
    '洗澡': '',
    '驱虫': '',
    '散步': ''
  }
}

function buildQuickStatusMap(list, selectedDate) {
  const statusMap = getDefaultQuickStatusMap()

  list.forEach(item => {
    if (COMMON_CATEGORIES.includes(item.category) && item.date === selectedDate) {
      statusMap[item.category] = item.done ? 'done' : 'undo'
    }
  })

  return statusMap
}

Page({
  data: {
    today: '',
    todayYear: 0,
    todayMonth: 0,
    todayDay: 0,
    currentYear: 0,
    currentMonth: 0,
    selectedDate: '',
    monthText: '',
    calendarList: [],
    todayList: [],
    selectedList: [],
    isSelectedToday: true,

    quickStatusMap: getDefaultQuickStatusMap(),

    showFeedPanel: false,
    showCommonPanel: false,
    currentQuickCategory: ''
  },

  onLoad() {
    const info = getTodayInfo()
    this.setData({
      today: info.today,
      todayYear: info.year,
      todayMonth: info.month,
      todayDay: info.day,
      currentYear: info.year,
      currentMonth: info.month,
      selectedDate: info.today
    })
    this.renderCalendar(info.year, info.month)
    this.refreshReminderPanels()
  },

  onShow() {
    this.renderCalendar(this.data.currentYear, this.data.currentMonth)
    this.refreshReminderPanels()
  },

  renderCalendar(year, month) {
    const reminders = getReminderList()
    const reminderDates = reminders.map(item => item.date)
    const firstDayWeek = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()

    const list = []

    for (let i = 0; i < firstDayWeek; i++) {
      list.push({
        empty: true,
        text: '',
        date: ''
      })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      list.push({
        empty: false,
        text: String(day),
        day,
        date,
        isToday:
          year === this.data.todayYear &&
          month === this.data.todayMonth &&
          day === this.data.todayDay,
        isSelected: date === this.data.selectedDate,
        hasReminder: reminderDates.includes(date)
      })
    }

    this.setData({
      currentYear: year,
      currentMonth: month,
      monthText: `${year}年${String(month).padStart(2, '0')}月`,
      calendarList: list
    })
  },

  refreshReminderPanels() {
    const list = getReminderList()
    const isSelectedToday = this.data.selectedDate === this.data.today
    const todayList = list.filter(item => item.date === this.data.today)
    const selectedList = isSelectedToday
      ? []
      : list.filter(item => item.date === this.data.selectedDate)

    this.setData({
      todayList,
      selectedList,
      isSelectedToday,
      quickStatusMap: buildQuickStatusMap(list, this.data.selectedDate)
    })
  },

  prevMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth -= 1
    if (currentMonth < 1) {
      currentMonth = 12
      currentYear -= 1
    }
    this.renderCalendar(currentYear, currentMonth)
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth += 1
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear += 1
    }
    this.renderCalendar(currentYear, currentMonth)
  },

  selectDay(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    this.setData({
      selectedDate: date
    }, () => {
      this.renderCalendar(this.data.currentYear, this.data.currentMonth)
      this.refreshReminderPanels()
    })
  },

  onDateChange(e) {
    const selectedDate = e.detail.value
    const d = new Date(selectedDate.replace(/-/g, '/'))
    this.setData({
      selectedDate
    }, () => {
      this.renderCalendar(d.getFullYear(), d.getMonth() + 1)
      this.refreshReminderPanels()
    })
  },

  openAddModal() {
    wx.showToast({
      title: '后续这里接新增提醒弹窗',
      icon: 'none'
    })
  },

  quickChooseStatus(e) {
    const category = e.currentTarget.dataset.category
    const done = e.currentTarget.dataset.done === 'true'
    const statusText = done ? 'done' : 'undo'
    const list = getReminderList()
    const targetIndex = list.findIndex(item =>
      item.category === category && item.date === this.data.selectedDate
    )

    if (targetIndex > -1) {
      list[targetIndex] = {
        ...list[targetIndex],
        title: category,
        done
      }
    } else {
      list.push({
        id: 'r_' + Date.now(),
        title: category,
        category,
        date: this.data.selectedDate,
        time: '09:00',
        done
      })
    }

    saveReminderList(list)

    this.setData({
      [`quickStatusMap.${category}`]: statusText
    })

    this.renderCalendar(this.data.currentYear, this.data.currentMonth)
    this.refreshReminderPanels()

    wx.showToast({
      title: '已同步状态',
      icon: 'success'
    })
  },
  quickAdd(e) {
    const category = e.currentTarget.dataset.category
    if (category === '喂食') {
      this.setData({
        showFeedPanel: true
      })
    }
  },

  chooseFeed(e) {
    const period = e.currentTarget.dataset.period
    const map = { morning: '早餐', noon: '午餐', evening: '晚餐' }
    const list = getReminderList()
    list.push({
      id: 'r_' + Date.now(),
      title: `喂食（${map[period]}）`,
      category: '喂食',
      date: this.data.selectedDate,
      time: '09:00',
      done: false
    })
    saveReminderList(list)
    this.setData({ showFeedPanel: false }, () => {
      this.renderCalendar(this.data.currentYear, this.data.currentMonth)
      this.refreshReminderPanels()
    })
  },

  chooseCommonStatus(e) {
    const done = e.currentTarget.dataset.done === 'true'
    const category = this.data.currentQuickCategory
    const list = getReminderList()
    list.push({
      id: 'r_' + Date.now(),
      title: category,
      category,
      date: this.data.selectedDate,
      time: '09:00',
      done
    })
    saveReminderList(list)
    this.setData({
      showCommonPanel: false,
      currentQuickCategory: ''
    }, () => {
      this.renderCalendar(this.data.currentYear, this.data.currentMonth)
      this.refreshReminderPanels()
    })
  },

  closePanel() {
    this.setData({
      showFeedPanel: false,
      showCommonPanel: false,
      currentQuickCategory: ''
    })
  }
})

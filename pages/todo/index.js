const REMINDER_KEY = 'petReminders'

function parseDateTime(date, time) {
  return new Date((date + ' ' + (time || '00:00')).replace(/-/g, '/')).getTime()
}

function formatToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function sortList(list) {
  return list.sort((a, b) => parseDateTime(a.date, a.time) - parseDateTime(b.date, b.time))
}

Page({
  data: {
    pendingList: [],
    doneList: [],
    overdueList: [],
    today: ''
  },

  onLoad() {
    this.setData({
      today: formatToday()
    })
  },

  onShow() {
    this.loadTodos()
  },

  loadTodos() {
    let list = wx.getStorageSync(REMINDER_KEY) || []
    list = sortList(list)

    const now = Date.now()
    const pendingList = []
    const doneList = []
    const overdueList = []

    list.forEach(item => {
      const deadline = parseDateTime(item.date, item.time)
      const isDone = !!item.done
      const isOverdue = !isDone && deadline < now

      if (isDone) {
        doneList.push(item)
      } else if (isOverdue) {
        overdueList.push(item)
      } else {
        pendingList.push(item)
      }
    })

    this.setData({
      pendingList,
      doneList,
      overdueList
    })
  },

  toggleDone(e) {
    const id = e.currentTarget.dataset.id
    let list = wx.getStorageSync(REMINDER_KEY) || []

    list = list.map(item => {
      if (item.id === id) {
        item.done = !item.done
      }
      return item
    })

    wx.setStorageSync(REMINDER_KEY, list)
    this.loadTodos()
  },

  addTodo() {
    wx.showToast({
      title: '后续这里做新增待办',
      icon: 'none'
    })
  }
})
var CALENDAR_KEY = 'calendarPlans'
var LEGACY_CALENDAR_KEY = 'petReminders'
var PET_LIST_KEY = 'petList'
var LEGACY_PETS_KEY = 'pets'
var userStorage = require('../../utils/user-storage')
var profileData = require('../../utils/profile-data')
var subscribeConfig = require('../../utils/subscribeConfig')
var CAT_IMAGE = '/assets/mock/pets/pet-maohaizi.jpg.jpg'
var DOG_IMAGE = '/assets/mock/pets/pet-buding.jpg.jpg'

var DEFAULT_CALENDAR_PLANS = [
  {
    id: 1,
    date: '2026-05-16',
    petName: '毛孩子',
    petAvatar: CAT_IMAGE,
    type: '梳毛护理',
    title: '给毛孩子梳毛',
    time: '20:00',
    color: '#9CAF88',
    note: '长毛猫需要定期梳毛，注意耳后和腋下是否打结',
    reminderText: '准时提醒',
    repeatText: '每周（周六）',
    strong: false,
    done: false
  },
  {
    id: 2,
    date: '2026-05-20',
    petName: '毛孩子',
    petAvatar: CAT_IMAGE,
    type: '驱虫提醒',
    title: '体内外驱虫',
    time: '10:00',
    color: '#F0A04B',
    note: '注意观察当天精神状态',
    reminderText: '提前1天',
    repeatText: '每月（20日）',
    strong: true,
    done: false
  },
  {
    id: 3,
    date: '2026-05-25',
    petName: '布丁',
    petAvatar: DOG_IMAGE,
    type: '洗澡护理',
    title: '布丁洗澡和梳毛',
    time: '16:30',
    color: '#FADA7A',
    note: '萨摩耶毛量大，洗完要彻底吹干',
    reminderText: '提前30分钟',
    repeatText: '不重复',
    strong: false,
    done: false
  }
]

var WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']
var REMINDER_OPTIONS = ['不提醒', '准时提醒', '提前5分钟', '提前30分钟', '提前1小时', '提前1天', '提前2天']
var CHANNEL_OPTIONS = ['不提醒', '站内提醒', '微信服务通知']
var ADVANCE_OPTIONS = ['准时提醒', '提前5分钟', '提前30分钟', '提前1小时', '提前1天', '提前2天']
var TYPE_RULE_MAP = {
  '喂食': 'feeding',
  '洗澡': 'grooming',
  '驱虫': 'deworm',
  '疫苗': 'vaccine',
  '吃药': 'medicine',
  '遛狗': 'walk',
  '体重记录': 'weight'
}
var DEFAULT_PETS = [
  {
    id: 1,
    name: '毛孩子',
    breed: '蓝金渐层长毛猫',
    avatar: CAT_IMAGE
  },
  {
    id: 2,
    name: '布丁',
    breed: '萨摩耶',
    avatar: DOG_IMAGE
  }
]

function pad(num) {
  return num < 10 ? '0' + num : '' + num
}

function formatDate(year, month, day) {
  return year + '-' + pad(month) + '-' + pad(day)
}

function getToday() {
  var d = new Date()
  return formatDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
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

function getWeekLabel(dateStr) {
  var info = parseDate(dateStr)
  var day = new Date(info.year, info.month - 1, info.day).getDay()
  return '周' + WEEK_LABELS[day]
}

function getRepeatOptions(dateStr) {
  var info = parseDate(dateStr)
  return [
    '不重复',
    '每天',
    '工作日（周一至周五）',
    '每周（' + getWeekLabel(dateStr) + '）',
    '每月（' + info.day + '日）',
    '每年（' + info.month + '月' + info.day + '日）',
    '自定义'
  ]
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

function normalizePlan(item) {
  var petName = item.petName === '小布丁' ? '布丁' : (item.petName || '毛孩子')
  var normalizedReminder = profileData.normalizeReminder(item)
  var subtasks = Array.isArray(item.subtasks) ? item.subtasks.map(function (subtask) {
    if (typeof subtask === 'string') {
      return {
        text: subtask,
        done: false
      }
    }

    return {
      text: subtask.text || '',
      done: !!subtask.done
    }
  }).filter(function (subtask) {
    return subtask.text
  }) : []
  return {
    id: item.id || 'plan_' + Date.now(),
    date: item.date,
    petName: petName,
    petAvatar: item.petAvatar || (petName === '布丁' ? DOG_IMAGE : CAT_IMAGE),
    type: item.type || item.category || '日常提醒',
    title: item.title || '宠物提醒',
    time: item.time || '08:00',
    color: item.color || '#9CAF88',
    note: item.note || '',
    subtasks: subtasks,
    reminderText: item.reminderText || '准时提醒',
    reminderDate: item.reminderDate || item.date,
    reminderTime: item.reminderTime || item.time || '08:00',
    channel: normalizedReminder.channel,
    channelText: normalizedReminder.channelText,
    advanceType: normalizedReminder.advanceType,
    advanceText: normalizedReminder.advanceText,
    remindAt: normalizedReminder.remindAt,
    subscribeStatus: normalizedReminder.subscribeStatus,
    status: normalizedReminder.status,
    statusText: normalizedReminder.statusText,
    templateId: normalizedReminder.templateId,
    failReason: normalizedReminder.failReason,
    cloudId: item.cloudId || item._id || '',
    _id: item._id || item.cloudId || '',
    repeatText: item.repeatText || '不重复',
    repeatRule: item.repeatRule || getRepeatRule(item.repeatText),
    createdAt: item.createdAt || 0,
    updatedAt: item.updatedAt || 0,
    strong: !!item.strong,
    done: !!item.done
  }
}

function findOptionKey(options, text, fallbackKey) {
  var i
  for (i = 0; i < options.length; i++) {
    if (options[i].text === text || options[i].key === text) return options[i].key
  }
  return fallbackKey
}

function getRepeatRule(text) {
  var raw = String(text || '')
  if (raw === '每天') return 'daily'
  if (raw.indexOf('工作日') > -1) return 'workday'
  if (raw.indexOf('每周') === 0) return 'weekly'
  if (raw.indexOf('每月') === 0) return 'monthly'
  if (raw.indexOf('每年') === 0) return 'yearly'
  return 'none'
}

function normalizePets(source) {
  var list = Array.isArray(source) ? source : []
  return list.map(function (pet, index) {
    var name = pet.name === '小布丁' ? '布丁' : (pet.name || ('萌宠' + (index + 1)))
    return {
      id: pet.id || ('pet_' + index),
      name: name,
      breed: pet.breed || (name === '布丁' ? '萨摩耶' : '蓝金渐层长毛猫'),
      avatar: pet.avatar || pet.image || (name === '布丁' ? DOG_IMAGE : CAT_IMAGE)
    }
  })
}

function getSuggestedSubtasks(form) {
  var keyword = ((form.title || '') + ' ' + (form.note || '') + ' ' + (form.category || '')).toLowerCase()

  if (keyword.indexOf('医院') > -1 || keyword.indexOf('体检') > -1 || keyword.indexOf('检查') > -1) {
    return ['体重测量', '体温检查', '口腔检查', '耳道检查', '皮肤毛发检查', '血常规', '粪便检查', '疫苗记录确认']
  }

  if (form.category === '驱虫') {
    return ['确认体重', '准备驱虫药', '记录驱虫时间', '观察精神状态']
  }

  if (form.category === '洗澡') {
    return ['梳毛开结', '修剪指甲', '清洁耳朵', '吹干脚垫和耳后']
  }

  if (form.category === '疫苗') {
    return ['带上疫苗本', '确认预约时间', '观察接种后状态']
  }

  if (form.category === '体重记录') {
    return ['饭前称重', '记录体重数值', '对比上周变化']
  }

  return ['准备外出用品', '完成后打卡']
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}))
}

function getCategoryIndex(categories, value) {
  var index = categories.indexOf(value)
  return index > -1 ? index : 0
}

function sortPlans(list) {
  return list.sort(function (a, b) {
    return (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time)
  })
}

function buildMonthGrid(year, month, selectedDate, today, plans) {
  var firstDay = new Date(year, month - 1, 1).getDay()
  var daysInMonth = getMonthDays(year, month)
  var prevMonth = month === 1 ? 12 : month - 1
  var prevYear = month === 1 ? year - 1 : year
  var daysInPrevMonth = getMonthDays(prevYear, prevMonth)
  var planMap = {}
  var cells = []
  var i

  for (i = 0; i < plans.length; i++) {
    if (!planMap[plans[i].date]) {
      planMap[plans[i].date] = []
    }
    planMap[plans[i].date].push(plans[i])
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
    var dayPlans = planMap[date] || []
    var hasStrong = false
    var j

    for (j = 0; j < dayPlans.length; j++) {
      if (dayPlans[j].strong && !dayPlans[j].done) {
        hasStrong = true
        break
      }
    }

    cells.push({
      date: date,
      day: cellDay,
      isCurrentMonth: isCurrentMonth,
      isToday: date === today,
      isSelected: date === selectedDate,
      hasReminder: dayPlans.length > 0,
      hasStrong: hasStrong,
      reminderCount: dayPlans.length
    })
  }

  return cells
}

Page({
  data: {
    categories: ['喂食', '洗澡', '驱虫', '疫苗', '吃药', '遛狗', '体重记录'],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    reminders: [],
    petOptions: [],
    today: '',
    selectedDate: '',
    currentMonth: '',
    currentMonthTitle: '',
    currentYear: 0,
    currentMonthNumber: 0,
    calendarDays: [],
    dayList: [],
    showForm: false,
    suggestedSubtasks: [],
    formSubtaskDoneCount: 0,
    optionSheet: {
      visible: false,
      title: '',
      type: '',
      options: [],
      selected: ''
    },
    categoryIndex: 0,
    form: {
      id: '',
      petId: '',
      title: '',
      petName: '毛孩子',
      petAvatar: CAT_IMAGE,
      note: '',
      date: '',
      time: '08:00',
      category: '喂食',
      channel: 'station',
      channelText: '站内提醒',
      advanceType: 'onTime',
      advanceText: '准时提醒',
      reminderText: '准时提醒',
      repeatText: '不重复',
      subscribeStatus: 'none',
      status: 'pending',
      statusText: '待发送',
      templateId: '',
      remindAt: 0,
      strong: false,
      done: false
    }
  },

  onLoad: function () {
    var today = getToday()
    var monthInfo = getMonthStart(today)
    this.ensureMockPlans()
    this.loadPets()
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
    this.loadPets()
    this.loadPlans()
  },

  loadPets: function () {
    var petList = userStorage.getValue(PET_LIST_KEY)
    var source = Array.isArray(petList) && petList.length ? petList : []

    this.setData({
      petOptions: normalizePets(source)
    })
  },

  ensureMockPlans: function () {
    var plans = userStorage.getValue(CALENDAR_KEY)
    if (!Array.isArray(plans)) {
      userStorage.setValue(CALENDAR_KEY, [])
    }
  },

  loadPlans: function () {
    var plans = userStorage.getValue(CALENDAR_KEY)
    var sourceList = Array.isArray(plans) ? plans : []
    var normalized = []
    var i

    for (i = 0; i < sourceList.length; i++) {
      normalized.push(normalizePlan(sourceList[i]))
    }

    normalized = sortPlans(normalized)

    this.setData({
      reminders: normalized
    })

    this.refreshList()
  },

  refreshList: function () {
    var reminders = this.data.reminders
    var selectedDate = this.data.selectedDate
    var dayList = []
    var calendarDays = buildMonthGrid(
      this.data.currentYear,
      this.data.currentMonthNumber,
      selectedDate,
      this.data.today,
      reminders
    )
    var i

    for (i = 0; i < reminders.length; i++) {
      if (reminders[i].date === selectedDate) {
        dayList.push(reminders[i])
      }
    }

    this.setData({
      dayList: dayList,
      calendarDays: calendarDays,
      currentMonth: formatMonth(this.data.currentYear, this.data.currentMonthNumber),
      currentMonthTitle: formatMonthTitle(this.data.currentYear, this.data.currentMonthNumber)
    })
  },

  handleAddPlan: function () {
    var petOptions = this.data.petOptions || []
    var defaultPet = petOptions[0] || {
      id: '',
      name: '暂不关联',
      avatar: CAT_IMAGE
    }
    var initialForm = {
      id: '',
      petId: defaultPet.id,
      title: '',
      petName: defaultPet.name,
      petAvatar: defaultPet.avatar,
      note: '',
      subtaskInput: '',
      subtasks: [],
      date: this.data.selectedDate || this.data.today,
      time: '08:00',
      category: this.data.categories[0],
      channel: 'station',
      channelText: '站内提醒',
      advanceType: 'onTime',
      advanceText: '准时提醒',
      reminderText: '准时提醒',
      repeatText: '不重复',
      subscribeStatus: 'none',
      status: 'pending',
      statusText: '待发送',
      templateId: '',
      remindAt: 0,
      strong: false,
      done: false
    }

    this.setData({
      showForm: true,
      categoryIndex: 0,
      suggestedSubtasks: getSuggestedSubtasks(initialForm),
      form: initialForm,
      formSubtaskDoneCount: 0
    })
  },

  openPlanForm: function (plan) {
    var source = clone(plan)
    var category = source.type || source.category || '喂食'
    var subtasks = Array.isArray(source.subtasks) ? source.subtasks : []
    var form = {
      id: source.id || '',
      cloudId: source.cloudId || source._id || '',
      _id: source._id || source.cloudId || '',
      petId: source.petId || '',
      title: source.title || source.content || '',
      petName: source.petName || '毛孩子',
      petAvatar: source.petAvatar || (source.petName === '布丁' ? DOG_IMAGE : CAT_IMAGE),
      note: source.note || '',
      subtaskInput: '',
      subtasks: subtasks,
      date: source.date || source.reminderDate || this.data.selectedDate || this.data.today,
      time: source.time || source.reminderTime || '08:00',
      category: category,
      channel: source.channel || 'station',
      channelText: source.channelText || profileData.getChannelText(source.channel || 'station'),
      advanceType: source.advanceType || 'onTime',
      advanceText: source.advanceText || source.reminderText || '准时提醒',
      reminderText: source.reminderText || source.advanceText || '准时提醒',
      repeatText: source.repeatText || '不重复',
      repeatRule: source.repeatRule || getRepeatRule(source.repeatText),
      subscribeStatus: source.subscribeStatus || 'none',
      status: source.status || 'pending',
      statusText: source.statusText || profileData.getStatusText(source.status || 'pending'),
      templateId: source.templateId || '',
      remindAt: source.remindAt || 0,
      failReason: source.failReason || '',
      strong: source.channel === 'wechat' || !!source.strong,
      done: !!source.done,
      createdAt: source.createdAt || 0,
      updatedAt: source.updatedAt || 0
    }

    this.setData({
      showForm: true,
      categoryIndex: getCategoryIndex(this.data.categories, category),
      suggestedSubtasks: getSuggestedSubtasks(form),
      form: form
    })
    this.updateFormSubtasks(subtasks)
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

    if (field === 'title' || field === 'note') {
      this.updateSuggestedSubtasks()
    }
  },

  updateSuggestedSubtasks: function () {
    this.setData({
      suggestedSubtasks: getSuggestedSubtasks(this.data.form)
    })
  },

  updateFormSubtasks: function (subtasks) {
    var list = Array.isArray(subtasks) ? subtasks : []
    var doneCount = list.filter(function (item) {
      return !!item.done
    }).length

    this.setData({
      'form.subtasks': list,
      formSubtaskDoneCount: doneCount
    })
  },

  addSubtask: function () {
    var input = (this.data.form.subtaskInput || '').trim()
    var subtasks = (this.data.form.subtasks || []).slice()

    if (!input) {
      return
    }

    if (!subtasks.some(function (item) { return item.text === input })) {
      subtasks.push({
        text: input,
        done: false
      })
    }

    this.updateFormSubtasks(subtasks)
    this.setData({
      'form.subtaskInput': ''
    })
  },

  removeSubtask: function (e) {
    var index = Number(e.currentTarget.dataset.index)
    var subtasks = (this.data.form.subtasks || []).slice()
    subtasks.splice(index, 1)
    this.updateFormSubtasks(subtasks)
  },

  addSuggestedSubtask: function (e) {
    var task = e.currentTarget.dataset.task
    var subtasks = (this.data.form.subtasks || []).slice()

    if (!subtasks.some(function (item) { return item.text === task })) {
      subtasks.push({
        text: task,
        done: false
      })
      this.updateFormSubtasks(subtasks)
    }
  },

  toggleFormSubtaskDone: function (e) {
    var index = Number(e.currentTarget.dataset.index)
    var subtasks = (this.data.form.subtasks || []).slice()

    if (subtasks[index]) {
      subtasks[index].done = !subtasks[index].done
      this.updateFormSubtasks(subtasks)
    }
  },

  selectPetOption: function (e) {
    var id = e.currentTarget.dataset.id
    var petOptions = this.data.petOptions
    var selectedPet = petOptions.find(function (pet) {
      return String(pet.id) === String(id)
    })

    if (!selectedPet) {
      return
    }

    this.setData({
      'form.petId': selectedPet.id,
      'form.petName': selectedPet.name,
      'form.petAvatar': selectedPet.avatar
    })
  },

  handleDateTap: function (e) {
    var date = e.currentTarget.dataset.date
    var info = parseDate(date)
    this.setData({
      selectedDate: date,
      currentYear: info.year,
      currentMonthNumber: info.month
    })
    this.refreshList()
  },

  handlePrevMonth: function () {
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

  handleNextMonth: function () {
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

  changeFormDate: function (e) {
    var date = e.detail.value
    var repeatText = this.data.form.repeatText
    var repeatOptions = getRepeatOptions(date)

    if (repeatText !== '不重复' && repeatText !== '每天' && repeatText !== '工作日（周一至周五）' && repeatText !== '自定义') {
      if (repeatText.indexOf('每周') === 0) {
        repeatText = repeatOptions[3]
      } else if (repeatText.indexOf('每月') === 0) {
        repeatText = repeatOptions[4]
      } else if (repeatText.indexOf('每年') === 0) {
        repeatText = repeatOptions[5]
      }
    }

    this.setData({
      'form.date': date,
      'form.repeatText': repeatText
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
    this.updateSuggestedSubtasks()
  },

  switchStrong: function (e) {
    var checked = e.detail.value
    this.setData({
      'form.strong': checked,
      'form.channel': checked ? 'wechat' : 'station',
      'form.channelText': checked ? '微信服务通知' : '站内提醒'
    })
  },

  chooseChannelOption: function () {
    this.setData({
      'optionSheet.visible': true,
      'optionSheet.title': '提醒渠道',
      'optionSheet.type': 'channel',
      'optionSheet.options': CHANNEL_OPTIONS,
      'optionSheet.selected': this.data.form.channelText || '站内提醒'
    })
  },

  chooseReminderOption: function () {
    this.setData({
      'optionSheet.visible': true,
      'optionSheet.title': '提前时间',
      'optionSheet.type': 'reminder',
      'optionSheet.options': ADVANCE_OPTIONS,
      'optionSheet.selected': this.data.form.advanceText || this.data.form.reminderText || '准时提醒'
    })
  },

  chooseRepeatOption: function () {
    var options = getRepeatOptions(this.data.form.date || this.data.today)
    this.setData({
      'optionSheet.visible': true,
      'optionSheet.title': '重复规则',
      'optionSheet.type': 'repeat',
      'optionSheet.options': options,
      'optionSheet.selected': this.data.form.repeatText
    })
  },

  closeOptionSheet: function () {
    this.setData({
      'optionSheet.visible': false
    })
  },

  selectOptionItem: function (e) {
    this.setData({
      'optionSheet.selected': e.currentTarget.dataset.value
    })
  },

  confirmOptionSheet: function () {
    var type = this.data.optionSheet.type
    var selected = this.data.optionSheet.selected

    if (type === 'channel') {
      var channel = selected === '微信服务通知' ? 'wechat' : selected === '不提醒' ? 'none' : 'station'
      this.setData({
        'form.channel': channel,
        'form.channelText': selected,
        'form.strong': channel === 'wechat',
        'optionSheet.visible': false
      })
      return
    }

    if (type === 'reminder') {
      this.setData({
        'form.advanceType': findOptionKey(profileData.ADVANCE_OPTIONS, selected, 'onTime'),
        'form.advanceText': selected,
        'form.reminderText': selected,
        'optionSheet.visible': false
      })
      return
    }

    this.setData({
      'form.repeatText': selected,
      'optionSheet.visible': false
    })

    if (selected === '自定义') {
      wx.showToast({
        title: '自定义重复开发中',
        icon: 'none'
      })
    }
  },

  saveReminder: function () {
    var form = this.data.form
    var pendingSubtask = (form.subtaskInput || '').trim()
    var subtasks = Array.isArray(form.subtasks) ? form.subtasks.slice() : []
  
    if (!form.title || !form.title.trim()) {
      wx.showToast({
        title: '请填写提醒内容',
        icon: 'none'
      })
      return
    }

    if (!form.date || !form.time) {
      wx.showToast({
        title: '请选择提醒日期和时间',
        icon: 'none'
      })
      return
    }
  
    if (pendingSubtask && !subtasks.some(function (item) { return item.text === pendingSubtask })) {
      subtasks.push({
        text: pendingSubtask,
        done: false
      })
    }
  
    var isEdit = !!form.id
    var reminder = {
      id: form.id || 'plan_' + Date.now(),
      cloudId: form.cloudId || form._id || '',
      _id: form._id || form.cloudId || '',
      date: form.date,
      reminderDate: form.date,
      petName: form.petName || '毛孩子',
      petId: form.petId || '',
      petAvatar: form.petAvatar || (form.petName === '布丁' ? DOG_IMAGE : CAT_IMAGE),
      type: form.category,
      reminderType: TYPE_RULE_MAP[form.category] || 'other',
      reminderTypeText: form.category,
      title: form.title.trim(),
      content: form.title.trim(),
      time: form.time,
      reminderTime: form.time,
      color: form.category === '驱虫' ? '#F0A04B' : form.category === '体重记录' ? '#9CAF88' : '#FADA7A',
      note: form.note || '记得按时完成这条提醒',
      subtasks: subtasks,
      channel: form.channel || 'station',
      channelText: form.channelText || '站内提醒',
      advanceType: form.advanceType || findOptionKey(profileData.ADVANCE_OPTIONS, form.reminderText, 'onTime'),
      advanceText: form.advanceText || form.reminderText || '准时提醒',
      reminderText: form.advanceText || form.reminderText || '准时提醒',
      repeatRule: getRepeatRule(form.repeatText),
      repeatText: form.repeatText || '不重复',
      subscribeStatus: form.channel === 'wechat' ? (form.subscribeStatus || 'none') : 'none',
      status: isEdit ? (form.status || 'pending') : 'pending',
      statusText: isEdit ? (form.statusText || '待发送') : '待发送',
      templateId: form.templateId || '',
      remindAt: profileData.calculateRemindAt(form.date, form.time, form.advanceType || form.reminderText),
      strong: form.strong,
      done: !!form.done,
      failReason: form.failReason || '',
      createdAt: form.createdAt || Date.now(),
      updatedAt: Date.now()
    }

    if (reminder.status === 'sent' || reminder.status === 'send_failed' || reminder.status === 'need_resubscribe') {
      reminder.status = 'pending'
      reminder.statusText = '待发送'
      reminder.done = false
      reminder.failReason = ''
    }

    if (reminder.channel === 'wechat' && reminder.subscribeStatus !== 'accepted') {
      this.requestWechatSubscription(reminder)
      return
    }

    this.persistReminder(reminder, '提醒已保存')
  },

  requestWechatSubscription: function (reminder) {
    var that = this
    var templateId = subscribeConfig.SUBSCRIBE_TEMPLATE_IDS.PET_REMINDER

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
          failReason: err && err.errMsg ? err.errMsg : '订阅授权失败'
        }), '订阅失败，已保存为站内提醒')
      }
    })
  },

  persistReminder: function (reminder, toastTitle) {
    var that = this
    var reminders = this.data.reminders.slice()
    var updated = false
    var i

    for (i = 0; i < reminders.length; i++) {
      if (String(reminders[i].id) === String(reminder.id)) {
        reminders[i] = reminder
        updated = true
        break
      }
    }

    if (!updated) {
      reminders.unshift(reminder)
    }

    reminders = sortPlans(reminders)
    userStorage.setValue(CALENDAR_KEY, reminders)
    this.saveReminderToCloud(reminder).then(function (cloudId) {
      if (cloudId) {
        reminder.cloudId = cloudId
        reminder._id = cloudId
        reminders = reminders.map(function (item) {
          return String(item.id) === String(reminder.id) ? reminder : item
        })
        userStorage.setValue(CALENDAR_KEY, reminders)
        that.setData({
          reminders: reminders
        })
        that.refreshList()
      }
    }).catch(function () {
      console.error('saveReminder cloud sync failed:', arguments[0])
      wx.showToast({
        title: '已本地保存，云端同步失败',
        icon: 'none'
      })
    })

    this.setData({
      showForm: false,
      reminders: reminders,
      'form.subtaskInput': '',
      'form.subtasks': [],
      formSubtaskDoneCount: 0
    })

    this.refreshList()
    wx.showToast({
      title: toastTitle || (updated ? '修改成功' : '新增成功'),
      icon: reminder.channel === 'wechat' ? 'success' : 'none'
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

  togglePlanDone: function (e) {
    var id = e.currentTarget.dataset.id
    var reminders = this.data.reminders.slice()
    var i

    for (i = 0; i < reminders.length; i++) {
      if (reminders[i].id === id) {
        reminders[i].done = !reminders[i].done
        break
      }
    }

    userStorage.setValue(CALENDAR_KEY, reminders)

    this.setData({
      reminders: reminders
    })
    this.refreshList()
  },
  togglePlanSubtaskDone: function (e) {
    var planId = e.currentTarget.dataset.planId
    var subIndex = Number(e.currentTarget.dataset.subIndex)
    var reminders = this.data.reminders.slice()
    var i
  
    for (i = 0; i < reminders.length; i++) {
      if (String(reminders[i].id) === String(planId)) {
        if (!Array.isArray(reminders[i].subtasks)) {
          reminders[i].subtasks = []
        }
  
        if (reminders[i].subtasks[subIndex]) {
          reminders[i].subtasks[subIndex].done = !reminders[i].subtasks[subIndex].done
        }
  
        break
      }
    }
  
    userStorage.setValue(CALENDAR_KEY, reminders)
  
    this.setData({
      reminders: reminders
    })
  
    this.refreshList()
  },
  handlePlanTap: function (e) {
    var id = e.currentTarget.dataset.id
    var reminders = this.data.reminders || []
    var i

    for (i = 0; i < reminders.length; i++) {
      if (String(reminders[i].id) === String(id)) {
        this.openPlanForm(reminders[i])
        return
      }
    }

    wx.showToast({
      title: '没有找到这条提醒',
      icon: 'none'
    })
  }
})

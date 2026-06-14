var userStorage = require('./user-storage')

var PROFILE_KEY = 'userProfile'
var PETS_KEY = 'petList'
var REMINDER_KEY = 'calendarPlans'
var IDENTIFY_KEY = 'identifyRecords'
var CAT_IMAGE = '/assets/mock/pets/pet-maohaizi.jpg.jpg'
var DOG_IMAGE = '/assets/mock/pets/pet-buding.jpg.jpg'

var CHANNEL_OPTIONS = [
  { key: 'none', text: '不提醒' },
  { key: 'station', text: '站内提醒' },
  { key: 'wechat', text: '微信服务通知' }
]

var ADVANCE_OPTIONS = [
  { key: 'onTime', text: '准时提醒', offset: 0 },
  { key: '5m', text: '提前5分钟', offset: 5 * 60 * 1000 },
  { key: '30m', text: '提前30分钟', offset: 30 * 60 * 1000 },
  { key: '1h', text: '提前1小时', offset: 60 * 60 * 1000 },
  { key: '1d', text: '提前1天', offset: 24 * 60 * 60 * 1000 },
  { key: '2d', text: '提前2天', offset: 2 * 24 * 60 * 60 * 1000 }
]

var REPEAT_OPTIONS = [
  { key: 'none', text: '不重复' },
  { key: 'daily', text: '每天' },
  { key: 'workday', text: '工作日' },
  { key: 'weekly', text: '每周' },
  { key: 'monthly', text: '每月' },
  { key: 'yearly', text: '每年' }
]

var DEFAULT_PROFILE = {
  nickname: '布丁和毛孩子',
  profileId: 'petid 1147739177',
  location: '天津',
  bio: '愿每个毛孩子都被认真记录 ✨',
  avatar: CAT_IMAGE,
  cover: DOG_IMAGE,
  following: 0,
  followers: 0,
  likesAndSaves: 0,
  tags: ['养宠记录']
}

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function getToday() {
  var d = new Date()
  var y = d.getFullYear()
  var m = d.getMonth() + 1
  var day = d.getDate()
  return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day)
}

function pad(num) {
  return num < 10 ? '0' + num : '' + num
}

function formatDate(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function formatTime(date) {
  return pad(date.getHours()) + ':' + pad(date.getMinutes())
}

function findOptionByText(options, text, fallbackIndex) {
  var i
  for (i = 0; i < options.length; i++) {
    if (options[i].text === text || options[i].key === text) return options[i]
  }
  return options[fallbackIndex || 0]
}

function getAdvanceOption(value) {
  return findOptionByText(ADVANCE_OPTIONS, value, 0)
}

function getRepeatOption(value) {
  return findOptionByText(REPEAT_OPTIONS, value, 0)
}

function getChannelOption(value) {
  return findOptionByText(CHANNEL_OPTIONS, value, 1)
}

function getStatusText(status) {
  var map = {
    pending: '待发送',
    sent: '已发送',
    send_failed: '发送失败',
    completed: '已完成',
    done: '已完成',
    closed: '已关闭',
    need_resubscribe: '需重新授权'
  }
  return map[status] || '待发送'
}

function getChannelText(channel) {
  return getChannelOption(channel || 'station').text
}

function parseDateTime(dateText, timeText) {
  var date = String(dateText || getToday())
  var time = String(timeText || '08:00')
  return new Date((date + ' ' + time + ':00').replace(/-/g, '/'))
}

function calculateRemindAt(dateText, timeText, advanceType) {
  var base = parseDateTime(dateText, timeText).getTime()
  var advance = getAdvanceOption(advanceType).offset
  return base - advance
}

function addDays(date, days) {
  var next = new Date(date.getTime())
  next.setDate(next.getDate() + days)
  return next
}

function calculateNextReminder(reminder) {
  var repeatRule = reminder.repeatRule || getRepeatOption(reminder.repeatText).key
  var base = parseDateTime(reminder.reminderDate || reminder.date, reminder.reminderTime || reminder.time)
  var next = new Date(base.getTime())

  if (repeatRule === 'none') return null
  if (repeatRule === 'daily') {
    next = addDays(base, 1)
  } else if (repeatRule === 'workday') {
    next = addDays(base, 1)
    while (next.getDay() === 0 || next.getDay() === 6) {
      next = addDays(next, 1)
    }
  } else if (repeatRule === 'weekly') {
    next = addDays(base, 7)
  } else if (repeatRule === 'monthly') {
    next.setMonth(next.getMonth() + 1)
  } else if (repeatRule === 'yearly') {
    next.setFullYear(next.getFullYear() + 1)
  } else {
    return null
  }

  return {
    reminderDate: formatDate(next),
    reminderTime: formatTime(next),
    remindAt: calculateRemindAt(formatDate(next), formatTime(next), reminder.advanceType || reminder.advanceText)
  }
}

function calcAgeText(birthday) {
  if (!birthday) return ''
  var birth = new Date(String(birthday).replace(/-/g, '/'))
  var now = new Date()
  var years = now.getFullYear() - birth.getFullYear()
  var months = now.getMonth() - birth.getMonth()

  if (now.getDate() < birth.getDate()) {
    months--
  }
  if (months < 0) {
    years--
    months += 12
  }
  if (years < 0) return ''
  if (years === 0) return months + '个月'
  if (months <= 0) return years + '岁'
  return years + '岁' + months + '个月'
}

function toTagList(text) {
  if (!text) return []
  return String(text).split(/[,，、\s]+/).filter(Boolean).slice(0, 3)
}

function isImageRef(value) {
  var text = String(value || '')
  return /^(\/assets\/|wxfile:|cloud:\/\/|https?:\/\/|data:image\/|file:|\/private\/|\/var\/|\/Users\/)/.test(text)
}

function normalizeProfile(profile, currentUser) {
  var source = profile || {}
  var user = currentUser || {}
  var tags = source.tags

  if (typeof tags === 'string') {
    tags = tags.split(/[,，、\s]+/).filter(Boolean)
  }
  if (!Array.isArray(tags) || !tags.length) {
    tags = DEFAULT_PROFILE.tags
  }

  return {
    nickname: user.nickname || source.nickname || DEFAULT_PROFILE.nickname,
    profileId: user.account || source.profileId || DEFAULT_PROFILE.profileId,
    location: source.location || DEFAULT_PROFILE.location,
    bio: source.bio || DEFAULT_PROFILE.bio,
    avatar: source.avatar || DEFAULT_PROFILE.avatar,
    cover: source.cover || DEFAULT_PROFILE.cover,
    following: Number(source.following || DEFAULT_PROFILE.following || 0),
    followers: Number(source.followers || DEFAULT_PROFILE.followers || 0),
    likesAndSaves: Number(source.likesAndSaves || DEFAULT_PROFILE.likesAndSaves || 0),
    tags: tags.slice(0, 4)
  }
}

function normalizePet(item) {
  var source = item || {}
  var name = source.name === '小布丁' ? '布丁' : (source.name || '毛孩子')
  var color = source.color || '#9CAF88'
  var fallbackAvatar = name === '布丁' ? DOG_IMAGE : CAT_IMAGE
  var avatarValue = source.avatarValue || source.avatar || ''
  var avatarType = source.avatarType || (isImageRef(avatarValue) ? 'image' : 'emoji')
  var tags = Array.isArray(source.tags) && source.tags.length ? source.tags.slice(0, 3) : []

  if (avatarType === 'image' && !avatarValue) {
    avatarValue = fallbackAvatar
  }
  if (avatarType !== 'image' && !avatarValue) {
    avatarType = 'emoji'
    avatarValue = '🐾'
  }
  if (!tags.length) {
    tags = toTagList(source.personality).concat(toTagList(source.likes)).slice(0, 3)
  }

  return {
    id: source.id || 'pet_' + Date.now(),
    name: name,
    type: source.type || source.species || '宠物',
    species: source.species || source.type || '宠物',
    breed: source.breed || '未填品种',
    gender: source.gender || '未填写',
    birthday: source.birthday || '',
    age: source.age || '',
    ageText: source.age || source.ageText || calcAgeText(source.birthday) || '未填写',
    weight: source.weight || '未填写',
    avatarType: avatarType,
    avatarValue: avatarValue,
    color: color,
    softColor: color + '22',
    likes: source.likes || '',
    personality: source.personality || '',
    nextReminder: source.nextReminder || '暂时没有提醒',
    note: source.note || '',
    tags: tags,
    diaryCount: Number(source.diaryCount || 0),
    identifyCount: Number(source.identifyCount || 0),
    initial: name.slice(0, 1)
  }
}

function readPets() {
  var list = userStorage.getValue(PETS_KEY)
  return Array.isArray(list) ? list.map(normalizePet) : []
}

function writePets(pets) {
  userStorage.setValue(PETS_KEY, Array.isArray(pets) ? pets : [])
}

function findPet(id) {
  var pets = readPets()
  var i
  for (i = 0; i < pets.length; i++) {
    if (String(pets[i].id) === String(id)) {
      return pets[i]
    }
  }
  return null
}

function normalizeReminder(item) {
  var source = item || {}
  var status = source.status || (source.closed ? 'closed' : source.done ? 'done' : 'pending')
  var channel = source.channel || (source.reminderText === '不提醒' ? 'none' : 'station')
  var channelOption = getChannelOption(channel)
  var advanceOption = getAdvanceOption(source.advanceType || source.advanceText || source.reminderText)
  var repeatOption = getRepeatOption(source.repeatRule || source.repeatText)
  var reminderDate = source.reminderDate || source.date || getToday()
  var reminderTime = source.reminderTime || source.time || '08:00'
  var reminderTypeText = source.reminderTypeText || source.type || source.category || '日常提醒'
  return {
    id: source.id || source._id || 'plan_' + Date.now(),
    _id: source._id || '',
    cloudId: source.cloudId || source._id || '',
    openid: source.openid || '',
    petId: source.petId || '',
    petName: source.petName || '宠物已删除',
    type: reminderTypeText,
    title: source.title || source.content || reminderTypeText || '宠物提醒',
    content: source.content || source.title || reminderTypeText || '宠物提醒',
    reminderType: source.reminderType || source.type || source.category || 'other',
    reminderTypeText: reminderTypeText,
    date: reminderDate,
    time: reminderTime,
    reminderDate: reminderDate,
    reminderTime: reminderTime,
    repeatRule: repeatOption.key,
    repeatText: repeatOption.text,
    channel: channelOption.key,
    channelText: channelOption.text,
    advanceType: advanceOption.key,
    advanceText: advanceOption.text,
    reminderText: advanceOption.text,
    remindAt: Number(source.remindAt || calculateRemindAt(reminderDate, reminderTime, advanceOption.key)),
    templateId: source.templateId || '',
    subscribeStatus: source.subscribeStatus || (channelOption.key === 'wechat' ? 'none' : 'none'),
    note: source.note || '',
    subtasks: Array.isArray(source.subtasks) ? source.subtasks : [],
    done: status === 'done' || !!source.done,
    closed: status === 'closed' || !!source.closed,
    status: status,
    statusText: getStatusText(status),
    sentAt: source.sentAt || null,
    failReason: source.failReason || '',
    createdAt: source.createdAt || 0,
    updatedAt: source.updatedAt || 0
  }
}

function readReminders() {
  var list = userStorage.getValue(REMINDER_KEY)
  return Array.isArray(list) ? list.map(normalizeReminder) : []
}

function writeReminders(reminders) {
  userStorage.setValue(REMINDER_KEY, Array.isArray(reminders) ? reminders : [])
}

function normalizeIdentifyRecord(item) {
  var source = item || {}
  var petName = source.petName === '小布丁' ? '布丁' : (source.petName || '')
  var created = source.createdAt || source.updatedAt || source.date || ''
  var parts = String(created).split(' ')
  return {
    id: source.id || 'record_' + Date.now(),
    petId: source.petId || '',
    petName: petName,
    result: source.result || source.breed || '待识别',
    confidence: Number(source.confidence || 0),
    image: source.image || (petName === '布丁' ? DOG_IMAGE : CAT_IMAGE),
    date: parts[0] || '未记录日期',
    time: parts[1] ? parts[1].slice(0, 5) : '',
    note: source.note || source.action || '暂无',
    action: source.action || '待确认'
  }
}

function readIdentifyRecords() {
  var list = userStorage.getValue(IDENTIFY_KEY)
  return Array.isArray(list) ? list.map(normalizeIdentifyRecord) : []
}

function writeIdentifyRecords(records) {
  userStorage.setValue(IDENTIFY_KEY, Array.isArray(records) ? records : [])
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function syncIdentifyRecordsByPet(pet, previousPet) {
  var records = readIdentifyRecords()
  var changed = false
  var i

  if (!pet || !pet.id) return

  for (i = 0; i < records.length; i++) {
    var record = records[i]
    var boundById = record.petId && String(record.petId) === String(pet.id)
    var boundByOldName = previousPet && !record.petId && (normalizeName(record.petName) === normalizeName(previousPet.name) || normalizeName(record.result) === normalizeName(previousPet.breed))
    if (boundById || boundByOldName) {
      record.petId = pet.id
      record.petName = pet.name
      record.result = pet.breed || record.result
      changed = true
    }
  }

  if (changed) {
    writeIdentifyRecords(records)
  }
}

function unbindIdentifyRecordsByPetId(id) {
  var records = readIdentifyRecords()
  var changed = false
  var i

  for (i = 0; i < records.length; i++) {
    if (String(records[i].petId || '') === String(id)) {
      records[i].petId = ''
      changed = true
    }
  }
  if (changed) {
    writeIdentifyRecords(records)
  }
}

function unbindRemindersByPetId(id) {
  var reminders = readReminders()
  var changed = false
  var i

  for (i = 0; i < reminders.length; i++) {
    if (String(reminders[i].petId || '') === String(id)) {
      reminders[i].petId = ''
      changed = true
    }
  }
  if (changed) {
    writeReminders(reminders)
  }
}

function inferSpeciesByBreed(breed) {
  var text = String(breed || '')
  if (text.indexOf('猫') > -1 || text.indexOf('渐层') > -1 || text.indexOf('布偶') > -1) return '猫'
  if (text.indexOf('狗') > -1 || text.indexOf('犬') > -1 || text.indexOf('萨摩耶') > -1) return '狗'
  return '其他'
}

module.exports = {
  PROFILE_KEY: PROFILE_KEY,
  PETS_KEY: PETS_KEY,
  REMINDER_KEY: REMINDER_KEY,
  IDENTIFY_KEY: IDENTIFY_KEY,
  CAT_IMAGE: CAT_IMAGE,
  DOG_IMAGE: DOG_IMAGE,
  DEFAULT_PROFILE: DEFAULT_PROFILE,
  clone: clone,
  getToday: getToday,
  calculateRemindAt: calculateRemindAt,
  calculateNextReminder: calculateNextReminder,
  CHANNEL_OPTIONS: CHANNEL_OPTIONS,
  ADVANCE_OPTIONS: ADVANCE_OPTIONS,
  REPEAT_OPTIONS: REPEAT_OPTIONS,
  getChannelText: getChannelText,
  getStatusText: getStatusText,
  calcAgeText: calcAgeText,
  normalizeProfile: normalizeProfile,
  normalizePet: normalizePet,
  readPets: readPets,
  writePets: writePets,
  findPet: findPet,
  normalizeReminder: normalizeReminder,
  readReminders: readReminders,
  writeReminders: writeReminders,
  normalizeIdentifyRecord: normalizeIdentifyRecord,
  readIdentifyRecords: readIdentifyRecords,
  writeIdentifyRecords: writeIdentifyRecords,
  syncIdentifyRecordsByPet: syncIdentifyRecordsByPet,
  unbindIdentifyRecordsByPetId: unbindIdentifyRecordsByPetId,
  unbindRemindersByPetId: unbindRemindersByPetId,
  inferSpeciesByBreed: inferSpeciesByBreed
}

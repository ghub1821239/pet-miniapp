var profileData = require('../../utils/profile-data')
var userStorage = require('../../utils/user-storage')

var IDENTIFY_PET_DRAFT_KEY = 'identifyPetDraft'

Page({
  data: {
    mode: 'create',
    fromIdentify: false,
    typeOptions: ['猫', '狗', '爬宠', '鸟类', '啮齿类', '异宠', '其他'],
    genderOptions: ['女孩', '男孩', '未填写'],
    typeIndex: 0,
    genderIndex: 2,
    defaultAvatars: ['😺', '🐶', '🐰', '🦊', '🐻', '🐼'],
    identifyRecordId: '',
    form: {
      id: '',
      name: '',
      type: '猫',
      species: '猫',
      breed: '',
      gender: '未填写',
      birthday: '',
      age: '',
      weight: '',
      likes: '',
      personality: '',
      nextReminder: '',
      note: '',
      avatarType: 'image',
      avatarValue: profileData.CAT_IMAGE,
      color: '#9CAF88',
      diaryCount: 0,
      identifyCount: 0
    }
  },

  onLoad: function (options) {
    var mode = options && options.mode === 'edit' ? 'edit' : 'create'
    var fromIdentify = !!(options && options.fromIdentify)
    var recordId = options && options.recordId ? decodeURIComponent(options.recordId) : ''
    var form = this.data.form

    if (mode === 'edit') {
      var pet = profileData.findPet(options.id)
      if (pet) {
        form = profileData.clone(pet)
      }
    } else if (recordId) {
      var records = profileData.readIdentifyRecords()
      var i
      for (i = 0; i < records.length; i++) {
        if (String(records[i].id) === String(recordId)) {
          var species = profileData.inferSpeciesByBreed(records[i].result)
          form.type = species
          form.species = species
          form.breed = records[i].result
          form.avatarType = 'image'
          form.avatarValue = records[i].image
          form.identifyCount = 1
          break
        }
      }
    } else if (fromIdentify) {
      var draft = userStorage.getValue(IDENTIFY_PET_DRAFT_KEY) || {}
      var draftSpecies = this.normalizeType(draft.species || '')
      if (draftSpecies) {
        form.type = draftSpecies
        form.species = draftSpecies
        form.color = draftSpecies === '狗' ? '#FADA7A' : '#9CAF88'
      }
      if (draft.breed) {
        form.breed = draft.breed
      }
      if (draft.avatar) {
        form.avatarType = 'image'
        form.avatarValue = draft.avatar
      }
      if (draft.recordId) {
        recordId = draft.recordId
      }
      form.identifyCount = 1
    }

    this.setData({
      mode: mode,
      fromIdentify: fromIdentify,
      identifyRecordId: recordId,
      form: form
    })
    this.syncPickerIndex()
  },

  syncPickerIndex: function () {
    this.setData({
      typeIndex: Math.max(0, this.data.typeOptions.indexOf(this.data.form.type)),
      genderIndex: Math.max(0, this.data.genderOptions.indexOf(this.data.form.gender))
    })
  },

  normalizeType: function (value) {
    var text = String(value || '')
    if (text.indexOf('猫') > -1) return '猫'
    if (text.indexOf('狗') > -1 || text.indexOf('犬') > -1) return '狗'
    if (text.indexOf('爬') > -1 || text.indexOf('守宫') > -1 || text.indexOf('龟') > -1 || text.indexOf('蛇') > -1 || text.indexOf('蜥蜴') > -1) return '爬宠'
    if (text.indexOf('鸟') > -1 || text.indexOf('鹦鹉') > -1) return '鸟类'
    if (text.indexOf('啮齿') > -1 || text.indexOf('兔') > -1 || text.indexOf('仓鼠') > -1 || text.indexOf('龙猫') > -1) return '啮齿类'
    if (text.indexOf('异') > -1) return '异宠'
    return ''
  },

  bindInput: function (e) {
    var field = e.currentTarget.dataset.field
    this.setData({
      ['form.' + field]: e.detail.value
    })
  },

  changeType: function (e) {
    var type = this.data.typeOptions[Number(e.detail.value)] || '其他'
    this.setData({
      typeIndex: Number(e.detail.value),
      'form.type': type,
      'form.species': type,
      'form.color': type === '狗' ? '#FADA7A' : '#9CAF88'
    })
  },

  changeGender: function (e) {
    var gender = this.data.genderOptions[Number(e.detail.value)] || '未填写'
    this.setData({
      genderIndex: Number(e.detail.value),
      'form.gender': gender
    })
  },

  changeBirthday: function (e) {
    this.setData({
      'form.birthday': e.detail.value,
      'form.age': profileData.calcAgeText(e.detail.value)
    })
  },

  chooseEmoji: function (e) {
    this.setData({
      'form.avatarType': 'emoji',
      'form.avatarValue': e.currentTarget.dataset.value
    })
  },

  chooseAvatar: function () {
    var that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.setData({
          'form.avatarType': 'image',
          'form.avatarValue': res.tempFilePaths[0]
        })
      }
    })
  },

  savePet: function () {
    var form = profileData.clone(this.data.form)
    var pets = profileData.readPets()
    var previousPet = null
    var i

    if (!String(form.name || '').trim()) {
      wx.showToast({ title: '请填写宠物名称', icon: 'none' })
      return
    }

    form.name = String(form.name || '').trim()
    form.breed = String(form.breed || '').trim() || '未填品种'
    form.type = form.type || form.species || '其他'
    form.species = form.species || form.type
    form.age = form.birthday ? profileData.calcAgeText(form.birthday) : form.age
    form.weight = String(form.weight || '').trim() || '未填写'
    form.nextReminder = String(form.nextReminder || '').trim() || '暂时没有提醒'

    if (this.data.mode === 'edit') {
      for (i = 0; i < pets.length; i++) {
        if (String(pets[i].id) === String(form.id)) {
          previousPet = profileData.clone(pets[i])
          pets[i] = form
          break
        }
      }
    } else {
      form.id = 'pet_' + Date.now()
      pets.unshift(form)
    }

    profileData.writePets(pets)
    profileData.syncIdentifyRecordsByPet(form, previousPet)
    this.bindIdentifyRecord(form)
    userStorage.removeValue(IDENTIFY_PET_DRAFT_KEY)

    wx.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(function () {
      wx.navigateBack()
    }, 500)
  },

  bindIdentifyRecord: function (pet) {
    var recordId = this.data.identifyRecordId
    if (!recordId) return
    var records = profileData.readIdentifyRecords()
    var i
    for (i = 0; i < records.length; i++) {
      if (String(records[i].id) === String(recordId)) {
        records[i].petId = pet.id
        records[i].petName = pet.name
        records[i].result = pet.breed
        records[i].action = '已保存到档案'
        break
      }
    }
    profileData.writeIdentifyRecords(records)
  }
})

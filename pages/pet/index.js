var auth = require('../../utils/auth')
var mockData = require('../../data/mockPosts.js')
var postStorage = require('../../utils/post-storage')
var socialState = require('../../utils/social-state')
var userStorage = require('../../utils/user-storage')
var userPostState = require('../../utils/user-post-state')

var PROFILE_KEY = 'userProfile'
var PETS_KEY = 'petList'
var LEGACY_PETS_KEY = 'pets'
var REMINDER_KEY = 'calendarPlans'
var LEGACY_REMINDER_KEY = 'petReminders'
var IDENTIFY_KEY = 'identifyRecords'
var LEGACY_IDENTIFY_KEY = 'identifyHistory'
var CAT_IMAGE = '/assets/mock/pets/pet-maohaizi.jpg.jpg'
var DOG_IMAGE = '/assets/mock/pets/pet-buding.jpg.jpg'

var MOCK_PROFILE = {
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

var MOCK_PETS = [
  {
    id: 'pet_mock_1',
    name: '毛孩子',
    type: '猫咪',
    species: '猫咪',
    breed: '蓝金渐层长毛猫',
    gender: '妹妹',
    birthday: '2024-08-12',
    age: '1岁9个月',
    weight: '4.2kg',
    avatarType: 'image',
    avatarValue: CAT_IMAGE,
    color: '#9CAF88',
    likes: '喜欢罐头',
    personality: '温顺，爱睡觉',
    tags: ['温顺', '爱睡觉', '喜欢罐头'],
    nextReminder: '5月20日 驱虫提醒',
    diaryCount: 6,
    identifyCount: 3
  },
  {
    id: 'pet_mock_2',
    name: '布丁',
    type: '狗狗',
    species: '狗狗',
    breed: '萨摩耶',
    gender: '弟弟',
    birthday: '2023-11-03',
    age: '2岁6个月',
    weight: '18.5kg',
    avatarType: 'image',
    avatarValue: DOG_IMAGE,
    color: '#FADA7A',
    likes: '爱散步，亲人',
    personality: '活泼',
    tags: ['活泼', '爱散步', '亲人'],
    nextReminder: '5月25日 洗澡提醒',
    diaryCount: 4,
    identifyCount: 1
  }
]

function getToday() {
  var d = new Date()
  var y = d.getFullYear()
  var m = d.getMonth() + 1
  var day = d.getDate()
  m = m < 10 ? '0' + m : m
  day = day < 10 ? '0' + day : day
  return y + '-' + m + '-' + day
}

function calcAgeText(birthday) {
  if (!birthday) return ''

  var birth = new Date(birthday.replace(/-/g, '/'))
  var now = new Date()
  var years = now.getFullYear() - birth.getFullYear()
  var months = now.getMonth() - birth.getMonth()

  if (now.getDate() < birth.getDate()) {
    months = months - 1
  }

  if (months < 0) {
    years = years - 1
    months = months + 12
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

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function normalizeProfile(profile) {
  var source = profile || {}
  var base = clone(MOCK_PROFILE)
  var currentUser = auth.getCurrentUser() || {}
  var tags = source.tags

  if (typeof tags === 'string') {
    tags = tags.split(/[,，、\s]+/).filter(Boolean)
  }

  if (!Array.isArray(tags) || !tags.length) {
    tags = base.tags
  }

  return {
    nickname: currentUser.nickname || source.nickname || base.nickname,
    profileId: currentUser.account || source.profileId || base.profileId,
    location: source.location || base.location,
    bio: source.bio || base.bio,
    avatar: source.avatar || base.avatar,
    cover: source.cover || base.cover,
    following: Number(source.following || base.following || 0),
    followers: Number(source.followers || base.followers || 0),
    likesAndSaves: Number(source.likesAndSaves || base.likesAndSaves || 0),
    tags: tags.slice(0, 4)
  }
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function nameEquals(a, b) {
  return normalizeName(a) === normalizeName(b)
}

function normalizeBreedByName(name, breed) {
  return breed || '未填品种'
}

function isImageRef(value) {
  var text = String(value || '')
  return /^(\/assets\/|wxfile:|cloud:\/\/|https?:\/\/|data:image\/|file:|\/private\/|\/var\/|\/Users\/)/.test(text)
}

function normalizePet(item) {
  var name = item.name === '小布丁' ? '布丁' : (item.name || '毛孩子')
  var ageText = item.age || item.ageText || calcAgeText(item.birthday)
  var tags = Array.isArray(item.tags) && item.tags.length ? item.tags.slice(0, 3) : []
  var personalityTags = toTagList(item.personality)
  var likeTags = toTagList(item.likes)
  var color = item.color || '#9CAF88'
  var fallbackAvatar = name === '布丁' ? DOG_IMAGE : CAT_IMAGE
  var avatarValue = item.avatarValue || item.avatar || ''
  var avatarType = item.avatarType || (isImageRef(avatarValue) ? 'image' : 'emoji')

  if (avatarType === 'image' && !avatarValue) {
    avatarValue = fallbackAvatar
  }
  if (avatarType !== 'image' && !avatarValue) {
    avatarType = 'emoji'
    avatarValue = '🐾'
  }

  if (!tags.length) {
    tags = personalityTags.concat(likeTags).slice(0, 3)
  }

  return {
    id: item.id || 'pet_' + Date.now(),
    name: name,
    type: item.type || item.species || '宠物',
    species: item.species || item.type || '宠物',
    breed: normalizeBreedByName(name, item.breed),
    gender: item.gender || '未填写',
    birthday: item.birthday || '',
    age: item.age || '',
    ageText: ageText || '未填写',
    weight: item.weight || '未填写',
    avatarType: avatarType,
    avatarValue: avatarValue,
    color: color,
    softColor: color + '22',
    likes: item.likes || '',
    personality: item.personality || '',
    tags: tags,
    personalityTags: personalityTags,
    likeTags: likeTags,
    nextReminder: item.nextReminder || '暂时没有提醒',
    diaryCount: Number(item.diaryCount || 0),
    identifyCount: Number(item.identifyCount || 0),
    initial: name.slice(0, 1)
  }
}

function getAuthorName(post) {
  if (post.userName) return post.userName
  if (post.author && post.author.name) return post.author.name
  return '萌宠家长'
}

function getAuthorAvatar(post) {
  if (post.avatarImage) return post.avatarImage
  if (post.avatarUrl) return post.avatarUrl
  if (post.author && post.author.avatar) return post.author.avatar
  if (post.author && post.author.avatarFileId) return post.author.avatarFileId
  return post.petName === '布丁' ? DOG_IMAGE : CAT_IMAGE
}

function getCoverImage(post) {
  if (post.coverImage) return post.coverImage
  if (post.cover) return post.cover
  if (Array.isArray(post.images) && post.images.length) return post.images[0]
  if (Array.isArray(post.gallery) && post.gallery.length) return post.gallery[0]
  return post.petName === '布丁' ? DOG_IMAGE : CAT_IMAGE
}

function formatPostDate(text) {
  var raw = String(text || '')
  if (!raw) return '刚刚'
  if (raw.indexOf(' ') > -1) return raw.split(' ')[0]
  return raw
}

function normalizePost(post) {
  var authorName = getAuthorName(post)
  var likeCount = Number(post.likeCount || post.likes || 0)
  var favoriteCount = Number(post.favoriteCount || post.favorites || post.collectCount || Math.max(0, Math.round(likeCount * 0.6)))
  var commentCount = Number(post.commentCount || 0)
  var coverImage = getCoverImage(post)

  return {
    id: post.id || 'post_' + Date.now(),
    _cloudId: post._cloudId || post._id || '',
    userId: post.userId || (post.author && post.author.userId) || '',
    title: post.title || '萌宠日常分享',
    content: post.content || '',
    coverImage: coverImage,
    images: Array.isArray(post.images) && post.images.length ? post.images : [coverImage],
    petName: post.petName || '毛孩子',
    breed: post.breed || '',
    category: post.category || post.channel || post.tag || '晒宠日常',
    city: post.city || post.location || '天津',
    createdAt: post.createdAt || post.publishTime || '刚刚',
    createdDate: formatPostDate(post.createdAt || post.publishTime),
    likeCount: likeCount,
    favoriteCount: favoriteCount,
    favorites: favoriteCount,
    collectCount: Number(post.collectCount || favoriteCount),
    commentCount: commentCount,
    liked: !!(post.liked || post.isLiked),
    isLiked: !!(post.liked || post.isLiked),
    favorited: !!(post.favorited || post.isFavorited),
    isFavorited: !!(post.favorited || post.isFavorited),
    userName: authorName,
    author: post.author || { name: authorName, avatar: getAuthorAvatar(post) },
    avatarImage: getAuthorAvatar(post),
    promotionActive: !!post.promotionActive,
    promotionLevel: Number(post.promotionLevel || 0),
    promotionAmount: Number(post.promotionAmount || 0),
    promotionStartedAt: post.promotionStartedAt || '',
    promotionEndedAt: post.promotionEndedAt || '',
    promotionOrderId: post.promotionOrderId || '',
    tags: Array.isArray(post.tags) ? post.tags.slice(0, 4) : [],
    comments: Array.isArray(post.comments) ? post.comments : [],
    summary: post.content || '记录和毛孩子有关的日常瞬间。'
  }
}

function buildInteractedPosts(likedPosts, favoritePosts) {
  var map = {}
  var result = []
  var i
  var item
  var key

  for (i = 0; i < favoritePosts.length; i++) {
    item = favoritePosts[i]
    key = String(item.id)
    map[key] = Object.assign({}, item, {
      interactionText: '已收藏'
    })
  }

  for (i = 0; i < likedPosts.length; i++) {
    item = likedPosts[i]
    key = String(item.id)
    if (map[key]) {
      map[key].interactionText = '已点赞 · 已收藏'
    } else {
      map[key] = Object.assign({}, item, {
        interactionText: '已点赞'
      })
    }
  }

  for (key in map) {
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      result.push(map[key])
    }
  }

  result.sort(function (a, b) {
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  })

  return result
}

function normalizeReminder(item) {
  return {
    id: item.id || 'reminder_' + Date.now(),
    date: item.date || getToday(),
    petName: item.petName || '毛孩子',
    type: item.type || item.category || '日常提醒',
    title: item.title || '宠物提醒',
    time: item.time || '08:00',
    note: item.note || '',
    done: !!item.done,
    closed: !!item.closed,
    statusText: item.closed ? '已关闭' : item.done ? '已完成' : '未完成'
  }
}

function normalizeIdentifyRecord(item) {
  var petName = item.petName === '小布丁' ? '布丁' : (item.petName || '')
  return {
    id: item.id || 'record_' + Date.now(),
    petId: item.petId || '',
    petName: petName,
    result: item.result || item.breed || '待识别',
    image: item.image || (petName === '布丁' ? DOG_IMAGE : CAT_IMAGE),
    date: item.date || (item.createdAt || item.updatedAt || '').split(' ')[0] || '未记录时间',
    action: item.action || item.note || '待确认',
    confidence: Number(item.confidence || 0)
  }
}

function inferSpeciesByBreed(breed) {
  var text = String(breed || '')
  if (text.indexOf('猫') > -1 || text.indexOf('渐层') > -1 || text.indexOf('布偶') > -1) {
    return '猫咪'
  }
  if (text.indexOf('狗') > -1 || text.indexOf('犬') > -1 || text.indexOf('萨摩耶') > -1) {
    return '狗狗'
  }
  return '宠物'
}

function readStorageList(key) {
  if (key === 'postList') {
    return postStorage.getPostList()
  }
  var list = wx.getStorageSync(key)
  return Array.isArray(list) ? list : []
}

function uniquePosts(list) {
  var seen = {}
  var result = []
  var i
  var post
  for (i = 0; i < list.length; i++) {
    post = list[i]
    if (!post || !post.id || seen[String(post.id)]) continue
    seen[String(post.id)] = true
    result.push(post)
  }
  return result
}

function isOwnPost(post) {
  var currentUser = auth.getCurrentUser() || {}
  var author = post && post.author ? post.author : {}
  var postUserId = post.userId || author.userId || ''
  var currentNickname = normalizeName(currentUser.nickname)
  var currentAccount = normalizeName(currentUser.account)
  var postAuthorName = normalizeName(getAuthorName(post))
  if (currentUser.id && postUserId && String(currentUser.id) === String(postUserId)) {
    return true
  }
  if (currentNickname && postAuthorName && currentNickname === postAuthorName) {
    return true
  }
  if (currentAccount && postAuthorName && currentAccount === postAuthorName) {
    return true
  }
  return post.author === '我' || post.userName === '我'
}

Page({
  data: {
    profile: MOCK_PROFILE,
    showProfileMenu: false,
    petList: [],
    currentPetId: '',
    currentPet: null,
    allPostList: [],
    activeTab: 'posts',
    tabs: [
      { key: 'posts', label: '历史帖子', count: 0 },
      { key: 'favorites', label: '收藏', count: 0 },
      { key: 'likes', label: '点赞', count: 0 }
    ],
    currentTabPosts: []
  },

  onShow: function () {
    this.loadProfile()
    this.loadPets()
    this.loadProfilePosts()
  },

  toggleProfileMenu: function () {
    this.setData({
      showProfileMenu: !this.data.showProfileMenu
    })
  },

  closeProfileMenu: function () {
    this.setData({
      showProfileMenu: false
    })
  },

  handleMenuAction: function (e) {
    var type = e.currentTarget.dataset.type
    var routeMap = {
      editProfile: '/pages/profile-edit/index',
      accountSecurity: '/pages/account-security/index',
      petManage: '/pages/pet-manage/index',
      reminderManage: '/pages/reminder-manage/index',
      identifyHistory: '/pages/identify-history/index',
      logout: '/pages/logout-confirm/index'
    }
    var url = routeMap[type]

    this.closeProfileMenu()

    if (url) {
      wx.navigateTo({
        url: url
      })
    }
  },

  loadProfile: function () {
    var currentUser = auth.getCurrentUser() || {}
    var storedProfile = userStorage.getValue(PROFILE_KEY)
    var profile = normalizeProfile(storedProfile)

    if (currentUser.nickname && currentUser.nickname !== profile.nickname) {
      profile.nickname = currentUser.nickname
    }
    if (currentUser.account) {
      profile.profileId = currentUser.account
    }

    socialState.saveProfileSnapshot({
      id: currentUser.id || '',
      account: currentUser.account || '',
      nickname: profile.nickname,
      avatar: profile.avatar,
      cover: profile.cover,
      bio: profile.bio,
      location: profile.location,
      tags: profile.tags
    })

    userStorage.setValue(PROFILE_KEY, profile)

    this.setData({
      profile: profile
    })
  },
  loadPets: function () {
    var storedPets = userStorage.getValue(PETS_KEY)
    var hasStoredPets = Array.isArray(storedPets) && storedPets.length > 0
    var sourceList = hasStoredPets ? storedPets : []
    var currentPetId = this.data.currentPetId
    var petList = []
    var found = false
    var i

    if (!Array.isArray(sourceList) || !sourceList.length) {
      sourceList = []
      userStorage.setValue(PETS_KEY, sourceList)
    } else {
      sourceList = sourceList.map(function (item) {
        var normalized = normalizePet(item)
        return {
          id: normalized.id,
          name: normalized.name,
          type: normalized.type,
          species: normalized.species,
          breed: normalized.breed,
          gender: normalized.gender,
          birthday: normalized.birthday,
          age: normalized.age || normalized.ageText,
          weight: normalized.weight,
          avatarType: normalized.avatarType,
          avatarValue: normalized.avatarValue,
          color: normalized.color,
          likes: normalized.likes,
          personality: normalized.personality,
          tags: normalized.tags,
          nextReminder: normalized.nextReminder,
          diaryCount: normalized.diaryCount,
          identifyCount: normalized.identifyCount
        }
      })
      userStorage.setValue(PETS_KEY, sourceList)
    }

    petList = sourceList.map(normalizePet)

    for (i = 0; i < petList.length; i++) {
      if (petList[i].id === currentPetId) {
        found = true
        break
      }
    }

    if (!found) {
      currentPetId = petList.length ? petList[0].id : ''
    }

    this.setData({
      petList: petList,
      currentPetId: currentPetId,
      currentPet: this.findPetById(petList, currentPetId)
    })
  },

  loadProfilePosts: function () {
    var combined = userPostState.applyStateToPosts(uniquePosts(postStorage.getPostList()).map(normalizePost))
    var likedIds = userPostState.getLikedPostIds()
    var favoritedIds = userPostState.getFavoritedPostIds()
    var likedMap = {}
    var favoritedMap = {}
    var ownPosts = []
    var favoritePosts = []
    var likedPosts = []
    var interactionPosts
    var socialCounts
    var likesAndSavesCount
    var nextProfile
    var currentSocialId = socialState.getCurrentProfileId()
    var i
    var post

    for (i = 0; i < likedIds.length; i++) {
      likedMap[String(likedIds[i])] = true
    }
    for (i = 0; i < favoritedIds.length; i++) {
      favoritedMap[String(favoritedIds[i])] = true
    }

    for (i = 0; i < combined.length; i++) {
      post = combined[i]
      if (isOwnPost(post)) {
        ownPosts.push(post)
      }
      if (favoritedMap[String(post.id)]) {
        favoritePosts.push(post)
      }
      if (likedMap[String(post.id)]) {
        likedPosts.push(post)
      }
    }

    interactionPosts = buildInteractedPosts(likedPosts, favoritePosts)
    socialCounts = socialState.getSocialCounts(currentSocialId)
    likesAndSavesCount = 0

    for (i = 0; i < ownPosts.length; i++) {
      likesAndSavesCount += Number(ownPosts[i].likeCount || 0)
      likesAndSavesCount += Number(ownPosts[i].favoriteCount || ownPosts[i].collectCount || 0)
    }

    var tabs = [
      { key: 'posts', label: '历史帖子', count: ownPosts.length },
      { key: 'favorites', label: '收藏', count: favoritePosts.length },
      { key: 'likes', label: '点赞', count: likedPosts.length }
    ]

    nextProfile = Object.assign({}, this.data.profile, {
      following: socialCounts.following,
      followers: socialCounts.followers,
      likesAndSaves: likesAndSavesCount
    })

    userStorage.setValue(PROFILE_KEY, nextProfile)

    this.setData({
      profile: nextProfile,
      allPostList: combined,
      profilePostGroups: {
        posts: ownPosts,
        favorites: favoritePosts,
        likes: likedPosts
      },
      interactionPosts: interactionPosts,
      tabs: tabs,
      currentTabPosts: this.getPostsByTab(this.data.activeTab, {
        posts: ownPosts,
        favorites: favoritePosts,
        likes: likedPosts
      })
    })
  },

  loadReminderPreview: function () {
    var reminders = userStorage.getValue(REMINDER_KEY)
    var sourceList = Array.isArray(reminders) ? reminders : []
    var normalized = []
    var stats = {
      pending: 0,
      done: 0,
      closed: 0
    }
    var i

    for (i = 0; i < sourceList.length; i++) {
      var item = normalizeReminder(sourceList[i])
      normalized.push(item)

      if (item.closed) {
        stats.closed++
      } else if (item.done) {
        stats.done++
      } else {
        stats.pending++
      }
    }

    normalized.sort(function (a, b) {
      return (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time)
    })

    this.setData({
      recentReminders: normalized.slice(0, 6),
      reminderStats: stats
    })
  },

  loadIdentifyHistory: function () {
    var records = userStorage.getValue(IDENTIFY_KEY)
    var sourceList = Array.isArray(records) ? records : []
    var normalized = []
    var i

    for (i = 0; i < sourceList.length; i++) {
      normalized.push(normalizeIdentifyRecord(sourceList[i]))
    }

    this.setData({
      identifyHistory: normalized
    })
  },

  getPostsByTab: function (tab, groups) {
    var source = groups || this.data.profilePostGroups || {}
    return source[tab] || []
  },

  findPetById: function (petList, id) {
    var i
    for (i = 0; i < petList.length; i++) {
      if (petList[i].id === id) {
        return petList[i]
      }
    }
    return petList.length ? petList[0] : null
  },

  handleTabTap: function (e) {
    var key = e.currentTarget.dataset.key
    this.setData({
      activeTab: key,
      currentTabPosts: this.getPostsByTab(key)
    })
  },

  handlePostTap: function (e) {
    var id = e.currentTarget.dataset.id
    var list = this.data.allPostList || []
    var target = null
    var i

    for (i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(id)) {
        target = list[i]
        break
      }
    }

    if (target) {
      postStorage.setDetailCache(target)
    }

    wx.navigateTo({
      url: '/pages/post-detail/index?id=' + encodeURIComponent(id)
    })
  },

  openSocialPanel: function (e) {
    var type = e.currentTarget.dataset.type
    wx.navigateTo({
      url: '/pages/social-list/index?type=' + encodeURIComponent(type || 'following')
    })
  },

  noop: function () {}
})

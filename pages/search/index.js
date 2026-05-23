var POSTS_KEY = 'postList'
var LEGACY_POSTS_KEY = 'forumPosts'
var mockData = require('../../data/mockPosts')
var cloudPosts = require('../../utils/cloudPosts')
var PETS_KEY = 'petList'
var LEGACY_PETS_KEY = 'pets'
var SEARCH_HISTORY_KEY = 'communitySearchHistory'
var VIEWED_POSTS_KEY = 'communityViewedPosts'
var DETAIL_CACHE_KEY = 'currentPostDetail'
var CAT_IMAGE = '/assets/mock/pets/pet-maohaizi.jpg.jpg'
var DOG_IMAGE = '/assets/mock/pets/pet-buding.jpg.jpg'
var POST_BUDING_MEADOW = DOG_IMAGE
var POST_MAOHAIZI_HYDRANGEA = CAT_IMAGE
var POST_BUDING_WINDOW = DOG_IMAGE
var POST_BUDING_FLOWERS = DOG_IMAGE
var POST_IMAGE_POOL = [
  POST_BUDING_MEADOW,
  POST_MAOHAIZI_HYDRANGEA,
  POST_BUDING_WINDOW,
  POST_BUDING_FLOWERS
]
var HOT_SEARCH_LIST = [
  { keyword: '520萌宠', heat: '15.2万' },
  { keyword: '找玩伴', heat: '9.8万' },
  { keyword: '猫猫拍照', heat: '7.6万' },
  { keyword: '周边遛狗', heat: '6.4万' },
  { keyword: '宠物求助', heat: '5.1万' },
  { keyword: '萨摩耶', heat: '4.7万' }
]
var DEFAULT_POSTS = [
  {
    id: 1,
    title: '草地上这张笑脸我能看一天',
    content: '风吹过来的时候它一直眯着眼笑，趴在草里像一团会发光的小云。',
    author: '布丁铲屎官',
    petName: '布丁',
    breed: '萨摩耶',
    tag: '周边',
    likes: 36,
    coverImage: POST_BUDING_MEADOW,
    coverType: 'dog',
    isLiked: true,
    isFollowing: true,
    coverHeight: 360
  },
  {
    id: 2,
    title: '绣球花旁边的小白团子太像童话了',
    content: '蓝紫色花海已经很梦幻了，它往边上一站，整个画面直接变成童话书。',
    author: '糯米观察员',
    petName: '糯米',
    breed: '比熊',
    tag: '推荐',
    likes: 42,
    coverImage: POST_MAOHAIZI_HYDRANGEA,
    coverType: 'dog',
    isLiked: false,
    isFollowing: true,
    coverHeight: 392
  },
  {
    id: 3,
    title: '窗台边探头的小柴一秒把人治愈',
    content: '舌头一伸出来就知道今天心情超好，趴在木栏边像在等人夸它可爱。',
    author: '泡芙成长簿',
    petName: '泡芙',
    breed: '柴犬幼犬',
    tag: '推荐',
    likes: 27,
    coverImage: POST_BUDING_WINDOW,
    coverType: 'dog',
    isLiked: false,
    isFollowing: true,
    coverHeight: 360
  }
]

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function normalizeSearchText(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, '')
}

function isCloudFileId(value) {
  return /^cloud:\/\//.test(String(value || ''))
}

function getRenderableImages(post) {
  var source = Array.isArray(post.images) ? post.images : []
  var result = []
  var i

  for (i = 0; i < source.length; i++) {
    if (source[i] && !isCloudFileId(source[i])) {
      result.push(source[i])
    }
  }

  return result
}

function addUnique(list, value) {
  var text = String(value || '').trim()

  if (text && list.indexOf(text) === -1) {
    list.push(text)
  }
}

function getCoverMeta(type) {
  var map = {
    paw: { emoji: '宠', tone: 'gold' },
    cat: { emoji: '猫', tone: 'soft' },
    dog: { emoji: '狗', tone: 'gold' },
    help: { emoji: '问', tone: 'cream' },
    health: { emoji: '诊', tone: 'soft' },
    walk: { emoji: '游', tone: 'gold' },
    guide: { emoji: '记', tone: 'cream' },
    cake: { emoji: '糕', tone: 'cream' }
  }
  return map[type] || map.paw
}

function normalizePost(post, index) {
  var coverMeta = getCoverMeta(post.coverType)
  var sourceTag = post.tag || post.section || post.channel || post.category || '推荐'
  var petName = post.petName === '小布丁' ? '布丁' : (post.petName || '毛孩子')
  var channel = sourceTag === '晒宠' || sourceTag === '攻略' || sourceTag === '经验' ? '推荐' : sourceTag
  var fallbackPostImage = POST_IMAGE_POOL[index % POST_IMAGE_POOL.length]
  var imageFileIds = Array.isArray(post.imageFileIds) ? post.imageFileIds : []
  var images = getRenderableImages(post)
  var authorName = post.userName || (post.author && post.author.name) || post.author || '萌宠用户'
  var coverImage = post.cover || post.coverImage || images[0] || fallbackPostImage

  if (isCloudFileId(coverImage)) {
    coverImage = images[0] || fallbackPostImage
  }

  if (channel === '同城') {
    channel = '周边'
  }

  return {
    id: post.id || 'post_' + index,
    title: post.title || '萌宠日常分享',
    content: post.content || '',
    userName: authorName,
    avatar: post.avatar || coverMeta.emoji,
    avatarImage: post.avatarImage || (post.author && post.author.avatar) || post.cover || post.coverImage || fallbackPostImage,
    petName: petName,
    breed: petName === '毛孩子' ? '蓝金渐层长毛猫' : petName === '布丁' ? '萨摩耶' : (post.breed || ''),
    channel: channel || '推荐',
    category: post.category || channel || '推荐',
    coverEmoji: coverMeta.emoji,
    coverTone: coverMeta.tone,
    coverImage: coverImage,
    images: images,
    imageFileIds: imageFileIds,
    coverHeight: Number(post.coverHeight || 320),
    likeCount: Number(post.likes || post.likeCount || 0),
    liked: !!(post.isLiked || post.liked),
    isFollowing: !!post.isFollowing
  }
}

function getPostSearchText(post) {
  var parts = [
    post.title,
    post.content,
    post.userName,
    post.petName,
    post.breed,
    post.channel,
    post.coverEmoji
  ]

  if (Array.isArray(post.tags)) {
    parts = parts.concat(post.tags)
  }

  return normalizeSearchText(parts.join(' '))
}

function isPostMatched(post, keyword) {
  var target = getPostSearchText(post)
  var query = normalizeSearchText(keyword)
  var i

  if (!query) {
    return false
  }

  if (target.indexOf(query) > -1) {
    return true
  }

  for (i = 0; i < query.length; i++) {
    if (target.indexOf(query.charAt(i)) === -1) {
      return false
    }
  }

  return query.length > 1
}

function estimateCardWeight(post) {
  var base = post.coverHeight || 320
  base += String(post.title || '').length * 4
  return base
}

function buildColumns(list) {
  var left = []
  var right = []
  var leftScore = 0
  var rightScore = 0
  var i
  var item
  var score

  for (i = 0; i < list.length; i++) {
    item = list[i]
    score = estimateCardWeight(item)

    if (leftScore <= rightScore) {
      left.push(item)
      leftScore += score
    } else {
      right.push(item)
      rightScore += score
    }
  }

  return {
    left: left,
    right: right
  }
}

Page({
  data: {
    keyword: '',
    posts: [],
    resultPosts: [],
    leftColumn: [],
    rightColumn: [],
    searchHistory: [],
    guessSearchList: [],
    hotSearchList: HOT_SEARCH_LIST,
    hasSearched: false
  },

  onLoad: function () {
    this.loadPosts()
    this.loadSearchMeta()
  },

  loadPosts: function () {
    var self = this

    cloudPosts.fetchPosts({ limit: 80 })
      .then(function (cloudList) {
        if (cloudList.length) {
          console.log('搜索页云数据库 posts 读取成功:', cloudList.length)
          wx.setStorageSync(POSTS_KEY, clone(cloudList))
          wx.setStorageSync(LEGACY_POSTS_KEY, clone(cloudList))
          self.applyLoadedPosts(cloudList)
          return
        }

        self.loadLocalPosts()
      })
      .catch(function (err) {
        console.warn('搜索页云数据库 posts 读取失败，使用本地数据:', err)
        self.loadLocalPosts()
      })
  },

  loadLocalPosts: function () {
    var posts = wx.getStorageSync(POSTS_KEY)
    var legacyPosts = wx.getStorageSync(LEGACY_POSTS_KEY)
    var sourceList = Array.isArray(posts) && posts.length ? posts : legacyPosts

    if (!Array.isArray(sourceList) || !sourceList.length) {
      sourceList = clone(mockData.mockPosts || DEFAULT_POSTS)
      wx.setStorageSync(POSTS_KEY, clone(sourceList))
      wx.setStorageSync(LEGACY_POSTS_KEY, clone(sourceList))
    }

    this.applyLoadedPosts(sourceList)
  },

  applyLoadedPosts: function (sourceList) {
    var normalized = []
    var i

    for (i = 0; i < sourceList.length; i++) {
      normalized.push(normalizePost(sourceList[i], i))
    }

    this.setData({
      posts: normalized
    })
  },

  loadSearchMeta: function () {
    var history = wx.getStorageSync(SEARCH_HISTORY_KEY)

    this.setData({
      searchHistory: Array.isArray(history) ? history.slice(0, 8) : [],
      guessSearchList: this.buildGuessSearchList()
    })
  },

  buildGuessSearchList: function () {
    var suggestions = []
    var viewedPosts = wx.getStorageSync(VIEWED_POSTS_KEY)
    var storedPets = wx.getStorageSync(PETS_KEY)
    var legacyPets = wx.getStorageSync(LEGACY_PETS_KEY)
    var pets = Array.isArray(storedPets) && storedPets.length ? storedPets : legacyPets
    var i

    if (Array.isArray(viewedPosts)) {
      for (i = 0; i < viewedPosts.length; i++) {
        addUnique(suggestions, viewedPosts[i].petName)
        addUnique(suggestions, viewedPosts[i].breed)
        addUnique(suggestions, viewedPosts[i].channel)
      }
    }

    if (Array.isArray(pets)) {
      for (i = 0; i < pets.length; i++) {
        addUnique(suggestions, pets[i].name)
        addUnique(suggestions, pets[i].breed)
      }
    }

    addUnique(suggestions, '宠物日常')
    addUnique(suggestions, '周边玩伴')
    addUnique(suggestions, '养宠求助')

    return suggestions.slice(0, 8)
  },

  exitSearch: function () {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
      return
    }

    wx.redirectTo({
      url: '/pages/forum/index'
    })
  },

  bindSearchInput: function (e) {
    var keyword = e.detail.value

    this.setData({
      keyword: keyword
    })

    if (String(keyword || '').trim()) {
      this.runSearch(keyword, false)
    } else {
      this.setData({
        resultPosts: [],
        leftColumn: [],
        rightColumn: [],
        hasSearched: false
      })
    }
  },

  submitSearch: function () {
    var keyword = String(this.data.keyword || '').trim()

    if (!keyword) {
      return
    }

    this.runSearch(keyword, true)
  },

  applySearchKeyword: function (e) {
    var keyword = e.currentTarget.dataset.keyword

    this.setData({
      keyword: keyword
    })
    this.runSearch(keyword, true)
  },

  runSearch: function (keyword, shouldSaveHistory) {
    var text = String(keyword || '').trim()
    var posts = this.data.posts
    var result = []
    var columns
    var i

    for (i = 0; i < posts.length; i++) {
      if (isPostMatched(posts[i], text)) {
        result.push(posts[i])
      }
    }

    columns = buildColumns(result)

    if (shouldSaveHistory) {
      this.saveSearchHistory(text)
    }

    this.setData({
      resultPosts: result,
      leftColumn: columns.left,
      rightColumn: columns.right,
      hasSearched: true
    })
  },

  clearKeyword: function () {
    this.setData({
      keyword: '',
      resultPosts: [],
      leftColumn: [],
      rightColumn: [],
      hasSearched: false
    })
  },

  clearSearchHistory: function () {
    wx.removeStorageSync(SEARCH_HISTORY_KEY)
    this.setData({
      searchHistory: []
    })
  },

  saveSearchHistory: function (keyword) {
    var text = String(keyword || '').trim()
    var history = wx.getStorageSync(SEARCH_HISTORY_KEY)
    var nextHistory = []
    var i

    if (!text) {
      return
    }

    history = Array.isArray(history) ? history : []
    nextHistory.push(text)

    for (i = 0; i < history.length; i++) {
      if (history[i] !== text && nextHistory.length < 8) {
        nextHistory.push(history[i])
      }
    }

    wx.setStorageSync(SEARCH_HISTORY_KEY, nextHistory)
    this.setData({
      searchHistory: nextHistory
    })
  },

  handlePostTap: function (e) {
    var id = e.currentTarget.dataset.id
    var posts = this.data.posts
    var target = null
    var i

    for (i = 0; i < posts.length; i++) {
      if (String(posts[i].id) === String(id)) {
        target = posts[i]
        break
      }
    }

    if (target) {
      wx.setStorageSync(DETAIL_CACHE_KEY, target)
      this.saveViewedPost(target)
    }

    wx.navigateTo({
      url: '/pages/post-detail/index?id=' + encodeURIComponent(id)
    })
  },

  saveViewedPost: function (post) {
    var viewedPosts = wx.getStorageSync(VIEWED_POSTS_KEY)
    var nextList = []
    var item
    var i

    viewedPosts = Array.isArray(viewedPosts) ? viewedPosts : []
    nextList.push({
      id: post.id,
      title: post.title,
      petName: post.petName,
      breed: post.breed,
      channel: post.channel
    })

    for (i = 0; i < viewedPosts.length; i++) {
      item = viewedPosts[i]
      if (String(item.id) !== String(post.id) && nextList.length < 10) {
        nextList.push(item)
      }
    }

    wx.setStorageSync(VIEWED_POSTS_KEY, nextList)
  },

  handleLike: function (e) {
    var id = e.currentTarget.dataset.id
    var posts = clone(this.data.posts)
    var resultPosts
    var rawPosts
    var i

    for (i = 0; i < posts.length; i++) {
      if (String(posts[i].id) === String(id)) {
        posts[i].liked = !posts[i].liked
        posts[i].likeCount += posts[i].liked ? 1 : -1
        if (posts[i].likeCount < 0) {
          posts[i].likeCount = 0
        }
        break
      }
    }

    rawPosts = posts.map(function (item) {
      return {
        id: item.id,
        title: item.title,
        content: item.content,
        author: item.userName,
        petName: item.petName,
        breed: item.breed,
        tag: item.channel || '推荐',
        likes: item.likeCount,
        cover: item.coverImage,
        avatarImage: item.avatarImage,
        coverHeight: item.coverHeight,
        coverType: item.coverEmoji === '猫' ? 'cat' : item.coverEmoji === '狗' ? 'dog' : 'paw',
        isLiked: item.liked,
        isFollowing: item.isFollowing
      }
    })

    wx.setStorageSync(POSTS_KEY, rawPosts)
    wx.setStorageSync(LEGACY_POSTS_KEY, rawPosts)

    this.setData({
      posts: posts
    })

    if (this.data.keyword) {
      resultPosts = []
      for (i = 0; i < posts.length; i++) {
        if (isPostMatched(posts[i], this.data.keyword)) {
          resultPosts.push(posts[i])
        }
      }
      var columns = buildColumns(resultPosts)
      this.setData({
        resultPosts: resultPosts,
        leftColumn: columns.left,
        rightColumn: columns.right
      })
    }
  }
})

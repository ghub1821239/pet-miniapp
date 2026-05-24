var mockData = require('../../data/mockPosts')
var topicCluster = require('../../utils/topicCluster')
var recommend = require('../../utils/recommend')
var filterIndex = require('../../utils/filterIndex')
var cloudPosts = require('../../utils/cloudPosts')

var POSTS_KEY = 'postList'
var LEGACY_POSTS_KEY = 'forumPosts'
var DETAIL_CACHE_KEY = 'currentPostDetail'
var VIEWED_POSTS_KEY = 'communityViewedPosts'
var CURRENT_CITY = '天津'

var BANNER_LIST = [
  {
    id: 'banner_1',
    image: '/assets/mock/banners/banner-community-01.jpg.jpg',
    title: '萌宠广场',
    subtitle: '智能推荐你可能关心的萌宠动态'
  },
  {
    id: 'banner_2',
    image: '/assets/mock/banners/banner-community-02.jpg.jpg',
    title: '萌宠社区',
    subtitle: '按日常、交友、求助和经验快速浏览'
  }
]

var CHANNELS = ['推荐', '关注', '周边']
var SHARE_CATEGORIES = {
  '晒宠日常': true,
  '交友约玩': true,
  '好物分享': true,
  '宠物活动': true
}
var QA_CATEGORIES = {
  '就医问诊': true,
  '养宠经验': true
}
var HELP_CATEGORIES = {
  '寻宠求助': true,
  '领养救助': true
}
var FILTER_OPTIONS = [
  { label: '全部', value: '全部', desc: '默认展示所有帖子' },
  { label: '晒宠日常', value: '晒宠日常', desc: '分享宠物照片、视频、趣事' },
  { label: '交友约玩', value: '交友约玩', desc: '找同城宠友、一起遛狗、猫友交流' },
  { label: '寻宠启事', value: '寻宠求助', desc: '宠物走失、捡到宠物、寻主' },
  { label: '就医问诊', value: '就医问诊', desc: '生病症状、医院推荐、护理经验' },
  { label: '养宠经验', value: '养宠经验', desc: '喂养、训练、驱虫、绝育、洗护' },
  { label: '好物分享', value: '好物分享', desc: '猫粮狗粮、玩具、用品、测评' },
  { label: '领养救助', value: '领养救助', desc: '无偿领养、救助流浪动物' },
  { label: '宠物活动', value: '宠物活动', desc: '线下聚会、宠物展、打卡活动' }
]

function buildFilterOptions(selectedCategory) {
  return FILTER_OPTIONS.map(function (item) {
    return Object.assign({}, item, {
      active: item.value === selectedCategory
    })
  })
}

function getCategoryLabel(value) {
  var i
  for (i = 0; i < FILTER_OPTIONS.length; i++) {
    if (FILTER_OPTIONS[i].value === value) {
      return FILTER_OPTIONS[i].label
    }
  }
  return value || '全部'
}

function clone(data) {
  return JSON.parse(JSON.stringify(data))
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

function normalizeLegacyPost(post, index) {
  var authorName = post.author && post.author.name ? post.author.name : (post.author || post.userName || '萌宠用户')
  var imageFileIds = Array.isArray(post.imageFileIds) ? post.imageFileIds : []
  var images = getRenderableImages(post)
  var cover = post.coverImage || post.cover || images[0] || '/assets/mock/pets/pet-buding.jpg.jpg'

  if (isCloudFileId(cover)) {
    cover = images[0] || '/assets/mock/pets/pet-buding.jpg.jpg'
  }

  return Object.assign({}, post, {
    id: post.id || post._id || 'post_' + index,
    _cloudId: post._cloudId || post._id || '',
    title: post.title || '萌宠日常分享',
    content: post.content || '',
    petName: post.petName || '毛孩子',
    petType: post.petType || inferPetType(post),
    breed: post.breed || '萌宠',
    category: post.category || inferCategory(post),
    city: post.city || CURRENT_CITY,
    tags: Array.isArray(post.tags) ? post.tags : [post.tag || '日常'],
    images: images.length ? images : [cover],
    imageFileIds: imageFileIds,
    coverImage: cover,
    createdAt: post.createdAt || '2026-05-22 10:00:00',
    likeCount: Number(post.likeCount || post.likes || 0),
    commentCount: Number(post.commentCount || 0),
    collectCount: Number(post.collectCount || 0),
    viewCount: Number(post.viewCount || 100),
    isSolved: post.isSolved === undefined ? true : !!post.isSolved,
    urgency: post.urgency || '普通',
    isFollowing: !!post.isFollowing,
    author: {
      name: authorName,
      avatar: post.avatarImage || (post.author && (post.author.avatar || post.author.avatarFileId)) || cover
    }
  })
}

function inferPetType(post) {
  var text = [post.petName, post.breed, post.content, post.title].join(' ')
  if (/兔/.test(text)) {
    return '兔子'
  }
  if (/仓鼠/.test(text)) {
    return '仓鼠'
  }
  if (/猫|渐层|布偶|英短/.test(text)) {
    return '猫'
  }
  return '狗'
}

function inferCategory(post) {
  var tag = post.tag || post.channel || ''
  if (tag === '找玩伴' || tag === '周边') {
    return '交友约玩'
  }
  if (tag === '求助') {
    return '寻宠求助'
  }
  if (tag === '攻略' || tag === '经验') {
    return '养宠经验'
  }
  return '晒宠日常'
}

function mergeStoragePosts() {
  var stored = wx.getStorageSync(POSTS_KEY)
  var legacy = wx.getStorageSync(LEGACY_POSTS_KEY)
  var source = Array.isArray(stored) && stored.length ? stored : legacy
  var mockPosts = clone(mockData.mockPosts)
  var ids = {}
  var result = mockPosts.slice()
  var i
  var normalized

  for (i = 0; i < result.length; i++) {
    ids[String(result[i].id)] = true
  }

  if (Array.isArray(source)) {
    for (i = 0; i < source.length; i++) {
      normalized = normalizeLegacyPost(source[i], i)
      if (!ids[String(normalized.id)]) {
        result.push(normalized)
      }
    }
  }

  wx.setStorageSync(POSTS_KEY, result)
  wx.setStorageSync(LEGACY_POSTS_KEY, result)
  return result
}

function mergeInteractionFromLocal(incomingPosts, localPosts) {
  var localMap = {}
  var result = []
  var i
  var incoming
  var local

  if (!Array.isArray(incomingPosts)) {
    return []
  }

  if (Array.isArray(localPosts)) {
    for (i = 0; i < localPosts.length; i++) {
      localMap[String(localPosts[i].id)] = localPosts[i]
    }
  }

  for (i = 0; i < incomingPosts.length; i++) {
    incoming = incomingPosts[i]
    local = localMap[String(incoming.id)]
    if (!local) {
      result.push(incoming)
      continue
    }
    result.push(Object.assign({}, incoming, {
      liked: local.liked !== undefined ? !!local.liked : !!incoming.liked,
      isLiked: local.isLiked !== undefined ? !!local.isLiked : !!incoming.isLiked,
      likeCount: Number(local.likeCount !== undefined ? local.likeCount : incoming.likeCount || incoming.likes || 0),
      likes: Number(local.likes !== undefined ? local.likes : incoming.likes || incoming.likeCount || 0),
      favorited: local.favorited !== undefined ? !!local.favorited : !!incoming.favorited,
      isFavorited: local.isFavorited !== undefined ? !!local.isFavorited : !!incoming.isFavorited,
      favoriteCount: Number(local.favoriteCount !== undefined ? local.favoriteCount : incoming.favoriteCount || incoming.favorites || 0),
      favorites: Number(local.favorites !== undefined ? local.favorites : incoming.favorites || incoming.favoriteCount || 0),
      collectCount: Number(local.collectCount !== undefined ? local.collectCount : incoming.collectCount || incoming.favoriteCount || incoming.favorites || 0),
      commentCount: Number(local.commentCount !== undefined ? local.commentCount : incoming.commentCount || 0),
      isFollowing: local.isFollowing !== undefined ? !!local.isFollowing : !!incoming.isFollowing,
      comments: Array.isArray(local.comments) && local.comments.length ? local.comments.slice() : (Array.isArray(incoming.comments) ? incoming.comments.slice() : [])
    }))
  }

  return result
}

function readLocalPostList() {
  var posts = wx.getStorageSync(POSTS_KEY)
  var legacyPosts = wx.getStorageSync(LEGACY_POSTS_KEY)
  return Array.isArray(posts) && posts.length ? posts : legacyPosts
}

function findPostFromLocalById(id) {
  var list = readLocalPostList()
  var i
  if (!Array.isArray(list)) {
    return null
  }
  for (i = 0; i < list.length; i++) {
    if (String(list[i].id) === String(id)) {
      return list[i]
    }
  }
  return null
}

function formatScore(score) {
  return Math.round(Number(score || 0) * 100)
}

function toSafeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function trimText(text, maxLen) {
  var safe = toSafeText(text)
  if (!safe) {
    return ''
  }
  if (safe.length <= maxLen) {
    return safe
  }
  return safe.slice(0, maxLen) + '...'
}

function resolvePostDisplayType(category) {
  var key = String(category || '')
  if (QA_CATEGORIES[key]) {
    return 'qa'
  }
  if (HELP_CATEGORIES[key]) {
    return 'help'
  }
  if (SHARE_CATEGORIES[key]) {
    return 'share'
  }
  return 'share'
}

function formatPostTime(createdAt) {
  var safe = String(createdAt || '')
  if (!safe) {
    return '刚刚'
  }
  if (safe.length >= 16) {
    return safe.slice(5, 16)
  }
  if (safe.length >= 10) {
    return safe.slice(5, 10)
  }
  return safe
}

function buildDisplaySummary(post, postDisplayType) {
  var title = trimText(post.title, 34)
  var content = trimText(post.content, 46)

  if (postDisplayType === 'qa') {
    return content || title || '点击查看完整问答'
  }
  if (postDisplayType === 'help') {
    return content || title || '点击查看求助详情'
  }
  return title || content || '点击查看详情'
}

function buildStatusMeta(post, postDisplayType) {
  var urgency = toSafeText(post.urgency) || '普通'
  var city = toSafeText(post.city) || CURRENT_CITY
  var timeText = formatPostTime(post.createdAt)

  if (postDisplayType === 'qa') {
    if (post.isSolved) {
      return {
        statusBadge: '已解决',
        statusTone: 'done',
        statusMeta: post.category || '问答'
      }
    }
    return {
      statusBadge: '待解答',
      statusTone: urgency === '紧急' || urgency === '较急' ? 'urgent' : 'pending',
      statusMeta: urgency + ' · ' + city
    }
  }

  if (postDisplayType === 'help') {
    if (post.isSolved) {
      return {
        statusBadge: '已处理',
        statusTone: 'done',
        statusMeta: city + ' · ' + timeText
      }
    }
    return {
      statusBadge: '待扩散',
      statusTone: urgency === '紧急' || urgency === '较急' ? 'urgent' : 'pending',
      statusMeta: urgency + ' · ' + city + ' · ' + timeText
    }
  }

  return {
    statusBadge: post.category || '分享',
    statusTone: 'neutral',
    statusMeta: city + ' · ' + timeText
  }
}

function buildQuickTags(post, postDisplayType) {
  var sourceTags = Array.isArray(post.tags) ? post.tags : []
  var tags = []
  var i

  if (postDisplayType === 'share') {
    if (post.petType) {
      tags.push(post.petType)
    }
    if (post.category) {
      tags.push(post.category)
    }
  } else if (postDisplayType === 'qa') {
    if (post.category) {
      tags.push(post.category)
    }
    for (i = 0; i < sourceTags.length && tags.length < 2; i += 1) {
      if (tags.indexOf(sourceTags[i]) === -1) {
        tags.push(sourceTags[i])
      }
    }
  } else {
    if (post.city) {
      tags.push(post.city)
    }
    if (post.urgency) {
      tags.push(post.urgency)
    }
  }

  for (i = 0; i < sourceTags.length && tags.length < 2; i += 1) {
    if (tags.indexOf(sourceTags[i]) === -1) {
      tags.push(sourceTags[i])
    }
  }

  return tags.slice(0, 2)
}

function estimateCardWeight(post) {
  var type = post.postDisplayType || resolvePostDisplayType(post.category)
  var titleWeight = String(post.title || '').length * 4
  if (type === 'qa') {
    return 280 + titleWeight
  }
  if (type === 'help') {
    return 300 + titleWeight
  }
  return Number(post.coverHeight || 320) + titleWeight
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

function getDisplayPost(post) {
  var postDisplayType = resolvePostDisplayType(post.category)
  var statusMeta = buildStatusMeta(post, postDisplayType)
  return Object.assign({}, post, {
    userName: post.author && post.author.name ? post.author.name : '萌宠用户',
    avatarImage: post.author && post.author.avatar ? post.author.avatar : post.coverImage,
    coverHeight: post.coverHeight || 320,
    postDisplayType: postDisplayType,
    statusBadge: statusMeta.statusBadge,
    statusTone: statusMeta.statusTone,
    statusMeta: statusMeta.statusMeta,
    summaryText: buildDisplaySummary(post, postDisplayType),
    quickTags: buildQuickTags(post, postDisplayType),
    timeText: formatPostTime(post.createdAt)
  })
}

Page({
  data: {
    banners: BANNER_LIST,
    channels: CHANNELS,
    filterOptions: buildFilterOptions('全部'),
    activeChannel: '推荐',
    selectedCategory: '全部',
    allPosts: [],
    recommendedPosts: [],
    filteredPosts: [],
    leftColumn: [],
    rightColumn: [],
    topics: [],
    userProfile: {},
    filterPanelVisible: false,
    activeFilterSummary: [],
    feedTitle: '为你推荐'
  },

  onLoad: function () {
    this.prepareAlgorithmData()
  },

  onShow: function () {
    this.prepareAlgorithmData()
  },

  prepareAlgorithmData: function () {
    var self = this
    var ticket = Date.now()

    this._loadTicket = ticket

    cloudPosts.fetchPosts({ limit: 80 })
      .then(function (cloudList) {
        if (self._loadTicket !== ticket) {
          return
        }

        if (cloudList.length) {
          console.log('云数据库 posts 读取成功:', cloudList.length)
          self.runAlgorithmData(cloudList, 'cloud')
          return
        }

        console.log('云数据库 posts 暂无数据，使用本地 mock 数据')
        self.runAlgorithmData(mergeStoragePosts(), 'mock')
      })
      .catch(function (err) {
        console.warn('云数据库 posts 读取失败，使用本地 mock 数据:', err)
        if (self._loadTicket === ticket) {
          self.runAlgorithmData(mergeStoragePosts(), 'mock')
        }
      })
  },

  runAlgorithmData: function (rawPosts, sourceName) {
    var sourcePosts = rawPosts.map(normalizeLegacyPost)
    var localPosts = readLocalPostList()
    var mergedPosts = mergeInteractionFromLocal(sourcePosts, localPosts)
    var clusterResult = topicCluster.clusterPosts(mergedPosts, { k: 7, iterations: 10 })
    var topics = clusterResult.topics.map(function (topic) {
      return Object.assign({}, topic, {
        keywordsText: topic.keywords.join(' / ')
      })
    })
    var userProfile = recommend.buildUserProfile(clusterResult.posts, recommend.mockUserBehavior)
    var recommendedPosts = recommend.recommendPosts(clusterResult.posts, userProfile)

    wx.setStorageSync(POSTS_KEY, mergedPosts)
    wx.setStorageSync(LEGACY_POSTS_KEY, mergedPosts)

    console.log('社区帖子数据来源:', sourceName)
    console.log('聚类主题结果 topics:', clusterResult.topics)
    console.log('用户画像 userProfile:', userProfile)
    console.log('推荐分最高前5:', recommendedPosts.slice(0, 5).map(function (item) {
      return {
        id: item.id,
        title: item.title,
        recommendScore: item.recommendScore,
        scoreDetail: item.scoreDetail
      }
    }))

    this.setData({
      allPosts: recommendedPosts,
      recommendedPosts: recommendedPosts,
      topics: topics,
      userProfile: userProfile
    })
    this.applyFeed()
  },

  applyFeed: function () {
    var filters = Object.assign({}, this.data.filters)
    var activeChannel = this.data.activeChannel
    var selectedCategory = this.data.selectedCategory
    var basePosts = this.data.recommendedPosts
    var visiblePosts = []
    var index
    var columns
    var i
    var post

    for (i = 0; i < basePosts.length; i++) {
      post = basePosts[i]
      if (activeChannel === '关注' && !post.isFollowing) {
        continue
      }
      if (activeChannel === '周边' && post.city !== CURRENT_CITY) {
        continue
      }
      if (selectedCategory !== '全部' && post.category !== selectedCategory) {
        continue
      }
      visiblePosts.push(post)
    }

    filters.sortType = 'recommend'
    filters.currentCity = CURRENT_CITY

    index = filterIndex.buildFilterIndex(visiblePosts)
    visiblePosts = filterIndex.filterPosts(visiblePosts, filters, index)
    visiblePosts = visiblePosts.map(getDisplayPost)
    columns = buildColumns(visiblePosts)

    console.log('当前筛选条件 filters:', filters)

    this.setData({
      filteredPosts: visiblePosts,
      leftColumn: columns.left,
      rightColumn: columns.right,
      filterOptions: buildFilterOptions(selectedCategory),
      activeFilterSummary: selectedCategory === '全部' ? [] : [getCategoryLabel(selectedCategory)],
      feedTitle: selectedCategory === '全部' ? '为你推荐' : getCategoryLabel(selectedCategory)
    })
  },

  handleChannelChange: function (e) {
    this.setData({
      activeChannel: e.currentTarget.dataset.channel
    })
    this.applyFeed()
  },

  handleCategoryTap: function (e) {
    this.setData({
      selectedCategory: e.currentTarget.dataset.value
    })
    this.applyFeed()
  },

  handleDrawerCategoryTap: function (e) {
    var value = e.currentTarget.dataset.value
    this.setData({
      selectedCategory: value,
      filterPanelVisible: false
    })
    this.applyFeed()
  },

  resetFilters: function () {
    this.setData({
      selectedCategory: '全部',
      filterOptions: buildFilterOptions('全部'),
      filterPanelVisible: false
    })
    this.applyFeed()
  },

  toggleFilterPanel: function () {
    this.setData({
      filterPanelVisible: !this.data.filterPanelVisible
    })
  },

  closeFilterPanel: function () {
    this.setData({
      filterPanelVisible: false
    })
  },

  openSearch: function () {
    wx.navigateTo({
      url: '/pages/search/index'
    })
  },

  handlePublish: function () {
    wx.navigateTo({
      url: '/pages/publish/index?from=community&visibility=public'
    })
  },

  handlePostTap: function (e) {
    var id = e.currentTarget.dataset.id
    var posts = this.data.recommendedPosts
    var target = null
    var latestTarget = null
    var i

    for (i = 0; i < posts.length; i++) {
      if (String(posts[i].id) === String(id)) {
        target = posts[i]
        break
      }
    }

    if (target) {
      latestTarget = findPostFromLocalById(id) || target
      wx.setStorageSync(DETAIL_CACHE_KEY, latestTarget)
      this.saveViewedPost(latestTarget)
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
      channel: post.category
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
    var posts = this.data.recommendedPosts.slice()
    var rawPosts
    var i
    var cloudTarget = null

    for (i = 0; i < posts.length; i++) {
      if (String(posts[i].id) === String(id)) {
        posts[i].liked = !posts[i].liked
        posts[i].likeCount += posts[i].liked ? 1 : -1
        if (posts[i].likeCount < 0) {
          posts[i].likeCount = 0
        }
        cloudTarget = posts[i]
        break
      }
    }

    rawPosts = posts.map(function (item) {
      return Object.assign({}, item, {
        author: item.author,
        likes: item.likeCount,
        isLiked: item.liked
      })
    })

    wx.setStorageSync(POSTS_KEY, rawPosts)
    wx.setStorageSync(LEGACY_POSTS_KEY, rawPosts)

    if (cloudTarget) {
      cloudPosts.syncPostPatch(cloudTarget, {
        likeCount: cloudTarget.likeCount,
        likes: cloudTarget.likeCount,
        liked: !!cloudTarget.liked,
        isLiked: !!cloudTarget.liked
      }).then(function (syncRes) {
        if (!syncRes || !syncRes.synced) {
          console.warn('云数据库点赞同步未完成:', syncRes && syncRes.reason)
        }
      }).catch(function (err) {
        console.warn('云数据库点赞同步失败:', err)
      })
    }

    this.setData({
      recommendedPosts: posts
    })
    this.applyFeed()
  }
})

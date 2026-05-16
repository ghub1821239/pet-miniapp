var POSTS_KEY = 'postList'
var LEGACY_POSTS_KEY = 'forumPosts'
var CAT_IMAGE = '/assets/mock/pets/pet-maohaizi.jpg.jpg'
var DOG_IMAGE = '/assets/mock/pets/pet-buding.jpg.jpg'
var POST_BUDING_MEADOW = '/assets/mock/posts/post-buding-meadow.jpg'
var POST_MAOHAIZI_HYDRANGEA = '/assets/mock/posts/post-maohaizi-hydrangea.jpg'
var POST_BUDING_WINDOW = '/assets/mock/posts/post-buding-window.jpg'
var POST_TWO_PETS_SUNSET = '/assets/mock/posts/post-two-pets-sunset.jpg'
var POST_BUDING_FLOWERS = '/assets/mock/posts/post-buding-flowers.jpg'
var POST_SPRING_COMPANION = '/assets/mock/posts/post-spring-companion.jpg'
var POST_CORGI_BEACH = '/assets/mock/posts/post-corgi-beach.jpg'
var POST_IMAGE_POOL = [
  POST_BUDING_MEADOW,
  POST_MAOHAIZI_HYDRANGEA,
  POST_BUDING_WINDOW,
  POST_TWO_PETS_SUNSET,
  POST_BUDING_FLOWERS,
  POST_SPRING_COMPANION,
  POST_CORGI_BEACH
]
var BANNER_LIST = [
  {
    id: 'banner_1',
    image: '/assets/mock/banners/banner-community-01.jpg.jpg',
    title: '萌宠广场',
    subtitle: '发现有趣宠友和真实养宠日常'
  },
  {
    id: 'banner_2',
    image: '/assets/mock/banners/banner-community-02.jpg.jpg',
    title: '成长日记',
    subtitle: '把毛孩子的每个瞬间认真记录下来'
  }
]

var COMMUNITY_TABS = ['推荐', '关注', '周边', '找玩伴', '求助']

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
  },
  {
    id: 4,
    title: '傍晚门口这束光像电影里的画面',
    content: '金色树影、木门和一路跑来的两只小狗，随手一拍就是很有故事感的一张。',
    author: '街角遛狗日常',
    petName: '奶盖',
    breed: '双宠日常',
    tag: '周边',
    likes: 12,
    coverImage: POST_TWO_PETS_SUNSET,
    coverType: 'dog',
    isLiked: false,
    isFollowing: true,
    coverHeight: 348
  },
  {
    id: 5,
    title: '黄花丛里这张笑脸太犯规了',
    content: '一边吐舌头一边看镜头，整张图都写着“今天真的很开心”。',
    author: '小太阳日记',
    petName: '奶酪',
    breed: '金毛幼犬',
    tag: '晒宠',
    likes: 19,
    coverImage: POST_BUDING_FLOWERS,
    coverType: 'dog',
    isLiked: false,
    isFollowing: false,
    coverHeight: 332
  },
  {
    id: 6,
    title: '春天和猫猫坐在湖边发呆真的很幸福',
    content: '白花、湖水和两只猫的小动作都很轻，像一张会呼吸的春日海报。',
    author: '春日猫猫册',
    petName: '团子',
    breed: '双猫日常',
    tag: '推荐',
    likes: 35,
    coverImage: POST_SPRING_COMPANION,
    coverType: 'cat',
    isLiked: true,
    isFollowing: true,
    coverHeight: 388
  },
  {
    id: 7,
    title: '海边飞奔的小柯基像装了弹簧',
    content: '刚好抓到腾空那一瞬间，耳朵和小短腿一起飞起来，越看越快乐。',
    author: '海边遛狗计划',
    petName: '豆包',
    breed: '柯基幼犬',
    tag: '周边',
    likes: 28,
    coverImage: POST_CORGI_BEACH,
    coverType: 'dog',
    isLiked: false,
    isFollowing: true,
    coverHeight: 286
  },
  {
    id: 8,
    title: '毛孩子抱着苹果发呆的时候像小公主',
    content: '镜头一靠近就安安静静看着你，毛茸茸的一团连发呆都很有镜头感。',
    author: '毛孩子家长',
    petName: '毛孩子',
    breed: '蓝金渐层长毛猫',
    tag: '关注',
    likes: 31,
    coverImage: CAT_IMAGE,
    coverType: 'cat',
    isLiked: true,
    isFollowing: true,
    coverHeight: 300
  },
  {
    id: 9,
    title: '窗台边的泡芙又来探头看风景了',
    content: '每次一听到声音就会趴到木栏边，像一只等人叫名字的小面包。',
    author: '泡芙成长簿',
    petName: '泡芙',
    breed: '柴犬幼犬',
    tag: '关注',
    likes: 54,
    coverImage: POST_BUDING_WINDOW,
    coverType: 'dog',
    isLiked: false,
    isFollowing: true,
    coverHeight: 360
  },
  {
    id: 10,
    title: '花丛里这一眼真的像童话里的小精灵',
    content: '白白软软的一团藏在绣球花边，阳光一照，连空气都像变甜了一点。',
    author: '糯米观察员',
    petName: '糯米',
    breed: '比熊',
    tag: '推荐',
    likes: 47,
    coverImage: POST_MAOHAIZI_HYDRANGEA,
    coverType: 'dog',
    isLiked: true,
    isFollowing: true,
    coverHeight: 392
  },
  {
    id: 11,
    title: '门口那束光刚好落在它们跑来的瞬间',
    content: '明明只是随手拍，结果氛围感直接拉满，像电影里很温柔的一幕。',
    author: '街角遛狗日常',
    petName: '奶盖',
    breed: '双宠日常',
    tag: '推荐',
    likes: 44,
    coverImage: POST_TWO_PETS_SUNSET,
    coverType: 'dog',
    isLiked: true,
    isFollowing: true,
    coverHeight: 348
  },
  {
    id: 12,
    title: '今天在花丛里收获了一张最灿烂的笑脸',
    content: '黄花、阳光和软乎乎的小狗一起出现的时候，心情真的会被瞬间点亮。',
    author: '小太阳日记',
    petName: '奶酪',
    breed: '金毛幼犬',
    tag: '推荐',
    likes: 39,
    coverImage: POST_BUDING_FLOWERS,
    coverType: 'dog',
    isLiked: false,
    isFollowing: true,
    coverHeight: 332
  },
  {
    id: 13,
    title: '草地上这张笑脸真的会让人想立刻出门',
    content: '云很低，风很轻，布丁趴在草里眯眼笑的时候，整片草地都像亮起来了。',
    author: '布丁铲屎官',
    petName: '布丁',
    breed: '萨摩耶',
    tag: '推荐',
    likes: 33,
    coverImage: POST_BUDING_MEADOW,
    coverType: 'dog',
    isLiked: false,
    isFollowing: true,
    coverHeight: 360
  },
  {
    id: 14,
    title: '春天的湖边真的很适合和猫猫一起发呆',
    content: '白色花枝垂下来的一瞬间，两只小猫刚好对视，画面温柔得不像话。',
    author: '春日猫猫册',
    petName: '团子',
    breed: '双猫日常',
    tag: '推荐',
    likes: 29,
    coverImage: POST_SPRING_COMPANION,
    coverType: 'cat',
    isLiked: false,
    isFollowing: true,
    coverHeight: 388
  }
]

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function isPostsAsset(path) {
  return typeof path === 'string' && path.indexOf('/assets/mock/posts/') === 0
}

function getDefaultPostMap() {
  var map = {}
  var i

  for (i = 0; i < DEFAULT_POSTS.length; i++) {
    map[String(DEFAULT_POSTS[i].id)] = DEFAULT_POSTS[i]
  }

  return map
}

function getCoverMeta(type) {
  var map = {
    paw: { emoji: '🐾', tone: 'gold' },
    cat: { emoji: '🐱', tone: 'soft' },
    help: { emoji: '💬', tone: 'cream' },
    dog: { emoji: '🐶', tone: 'gold' },
    cake: { emoji: '🎂', tone: 'cream' },
    health: { emoji: '🩺', tone: 'soft' },
    walk: { emoji: '🌿', tone: 'gold' },
    guide: { emoji: '📒', tone: 'cream' }
  }
  return map[type] || map.paw
}

function normalizePost(post, index) {
  var coverMeta = getCoverMeta(post.coverType)
  var sourceTag = post.tag || post.section || '推荐'
  var petName = post.petName === '小布丁' ? '布丁' : (post.petName || '毛孩子')
  var channel = sourceTag === '晒宠' || sourceTag === '攻略' || sourceTag === '经验' || sourceTag === '推荐'
    ? '推荐'
    : sourceTag
  var fallbackPostImage = POST_IMAGE_POOL[index % POST_IMAGE_POOL.length]

  if (channel === '同城') {
    channel = '周边'
  }

  return {
    id: post.id || 'post_' + index,
    title: post.title || '萌宠日常分享',
    content: post.content || '',
    userName: post.author || post.userName || '萌宠用户',
    avatar: post.avatar || coverMeta.emoji,
    avatarImage: post.avatarImage || post.cover || post.coverImage || fallbackPostImage,
    petName: petName,
    breed: petName === '毛孩子' ? '蓝金渐层长毛猫' : petName === '布丁' ? '萨摩耶' : (post.breed || ''),
    channel: channel || '推荐',
    coverEmoji: coverMeta.emoji,
    coverTone: coverMeta.tone,
    mediaType: 'image',
    coverImage: post.cover || post.coverImage || fallbackPostImage,
    coverHeight: Number(post.coverHeight || 320),
    likeCount: Number(post.likes || post.likeCount || 0),
    liked: !!(post.isLiked || post.liked),
    isFollowing: !!post.isFollowing
  }
}

function estimateCardWeight(post) {
  var base = post.coverHeight || 320
  base += post.title.length * 4
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

function mergeWithDefaultPosts(sourceList) {
  var merged = clone(DEFAULT_POSTS)
  var idMap = {}
  var defaultMap = getDefaultPostMap()
  var i
  var current
  var baseItem
  var mergedItem
  var replaced = false

  for (i = 0; i < merged.length; i++) {
    idMap[String(merged[i].id)] = i
  }

  if (!Array.isArray(sourceList)) {
    return merged
  }

  for (i = 0; i < sourceList.length; i++) {
    current = sourceList[i]
    if (current && current.id != null && idMap[String(current.id)] != null) {
      baseItem = merged[idMap[String(current.id)]]
      mergedItem = Object.assign({}, baseItem, current)

      if (!isPostsAsset(mergedItem.cover) && !isPostsAsset(mergedItem.coverImage)) {
        mergedItem.cover = baseItem.coverImage
        mergedItem.coverImage = baseItem.coverImage
      }

      if (!mergedItem.coverHeight && baseItem.coverHeight) {
        mergedItem.coverHeight = baseItem.coverHeight
      }

      if (!isPostsAsset(mergedItem.avatarImage) && defaultMap[String(current.id)] && isPostsAsset(defaultMap[String(current.id)].coverImage)) {
        mergedItem.avatarImage = defaultMap[String(current.id)].coverImage
      }

      merged[idMap[String(current.id)]] = mergedItem
      replaced = true
    } else if (current) {
      if (!isPostsAsset(current.cover) && !isPostsAsset(current.coverImage)) {
        current.cover = POST_IMAGE_POOL[i % POST_IMAGE_POOL.length]
        current.coverImage = current.cover
      }
      if (!isPostsAsset(current.avatarImage)) {
        current.avatarImage = current.coverImage || current.cover
      }
      merged.push(current)
      replaced = true
    }
  }

  return replaced ? merged : clone(DEFAULT_POSTS)
}

Page({
  data: {
    banners: BANNER_LIST,
    channels: COMMUNITY_TABS,
    activeChannel: '推荐',
    posts: [],
    filteredPosts: [],
    leftColumn: [],
    rightColumn: []
  },

  onLoad: function () {
    this.ensureMockPosts()
  },

  onShow: function () {
    this.loadPosts()
  },

  ensureMockPosts: function () {
    var posts = wx.getStorageSync(POSTS_KEY)
    var legacyPosts = wx.getStorageSync(LEGACY_POSTS_KEY)
    var merged

    if ((!Array.isArray(posts) || !posts.length) && (!Array.isArray(legacyPosts) || !legacyPosts.length)) {
      wx.setStorageSync(POSTS_KEY, clone(DEFAULT_POSTS))
      wx.setStorageSync(LEGACY_POSTS_KEY, clone(DEFAULT_POSTS))
      return
    }

    merged = mergeWithDefaultPosts(Array.isArray(posts) && posts.length ? posts : legacyPosts)
    wx.setStorageSync(POSTS_KEY, clone(merged))
    wx.setStorageSync(LEGACY_POSTS_KEY, clone(merged))
  },

  loadPosts: function () {
    var posts = wx.getStorageSync(POSTS_KEY)
    var legacyPosts = wx.getStorageSync(LEGACY_POSTS_KEY)
    var sourceList = Array.isArray(posts) && posts.length ? posts : legacyPosts
    var normalized = []
    var i

    if (!Array.isArray(sourceList) || !sourceList.length) {
      sourceList = clone(DEFAULT_POSTS)
    }

    sourceList = mergeWithDefaultPosts(sourceList)
    wx.setStorageSync(POSTS_KEY, clone(sourceList))
    wx.setStorageSync(LEGACY_POSTS_KEY, clone(sourceList))

    for (i = 0; i < sourceList.length; i++) {
      normalized.push(normalizePost(sourceList[i], i))
    }

    this.setData({
      posts: normalized
    })

    this.applyChannel()
  },

  applyChannel: function () {
    var activeChannel = this.data.activeChannel
    var posts = this.data.posts
    var filtered = []
    var i

    for (i = 0; i < posts.length; i++) {
      if (
        activeChannel === '推荐' ||
        (activeChannel === '关注' && posts[i].isFollowing) ||
        posts[i].channel === activeChannel
      ) {
        filtered.push(posts[i])
      }
    }

    var columns = buildColumns(filtered)

    this.setData({
      filteredPosts: filtered,
      leftColumn: columns.left,
      rightColumn: columns.right
    })
  },

  handleTabChange: function (e) {
    this.setData({
      activeChannel: e.currentTarget.dataset.channel
    })
    this.applyChannel()
  },

  handlePublish: function () {
    wx.navigateTo({
      url: '/pages/publish/index'
    })
  },

  handlePostTap: function () {
    wx.showToast({
      title: '帖子详情开发中',
      icon: 'none'
    })
  },

  handleLike: function (e) {
    var id = e.currentTarget.dataset.id
    var posts = clone(this.data.posts)
    var i
    var rawPosts

    for (i = 0; i < posts.length; i++) {
      if (posts[i].id === id) {
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
        coverType: item.coverEmoji === '🐱' ? 'cat' : item.coverEmoji === '🐶' ? 'dog' : item.coverEmoji === '🎂' ? 'cake' : item.coverEmoji === '🩺' ? 'health' : item.coverEmoji === '🌿' ? 'walk' : item.coverEmoji === '📒' ? 'guide' : item.coverEmoji === '💬' ? 'help' : 'paw',
        isLiked: item.liked,
        isFollowing: item.isFollowing
      }
    })

    wx.setStorageSync(POSTS_KEY, rawPosts)
    wx.setStorageSync(LEGACY_POSTS_KEY, rawPosts)

    this.setData({
      posts: posts
    })
    this.applyChannel()
  },

  openSearch: function () {
    wx.showToast({
      title: '搜索功能开发中',
      icon: 'none'
    })
  }
})

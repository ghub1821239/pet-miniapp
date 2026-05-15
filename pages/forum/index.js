var COMMUNITY_KEY = 'forumPosts'

function getNowText() {
  var d = new Date()
  var y = d.getFullYear()
  var m = d.getMonth() + 1
  var day = d.getDate()
  var h = d.getHours()
  var min = d.getMinutes()

  m = m < 10 ? '0' + m : m
  day = day < 10 ? '0' + day : day
  h = h < 10 ? '0' + h : h
  min = min < 10 ? '0' + min : min

  return y + '-' + m + '-' + day + ' ' + h + ':' + min
}

function getDefaultPosts() {
  return [
    {
      id: 'community_1',
      title: '周末带奶糖去海河边晒太阳',
      content: '第一次坐宠物推车出门，居然全程都很乖，还认识了一只同城小柯基。',
      images: [],
      mediaType: 'image',
      coverEmoji: '🐶',
      coverTone: 'gold',
      userName: '小椰子',
      avatar: '🐶',
      petName: '奶糖',
      breed: '比熊',
      city: '天津',
      distance: '约 1.2km',
      tags: ['日常', '同城', '遛狗', '拍照打卡'],
      channel: '同城',
      createdAt: '今天 10:28',
      likeCount: 86,
      liked: false,
      isFollowing: true,
      petCard: {
        age: '2岁',
        personality: '亲人',
        activity: '遛弯'
      }
    },
    {
      id: 'community_2',
      title: '想给柴犬找一起散步的玩伴',
      content: '我家元宝性格活泼，平时最爱公园草坪打滚，想找同城小伙伴周末一起遛弯。',
      images: [],
      mediaType: 'image',
      coverEmoji: '🐕',
      coverTone: 'cream',
      userName: '橘子汽水',
      avatar: '🐕',
      petName: '元宝',
      breed: '柴犬',
      city: '天津',
      distance: '约 2.4km',
      tags: ['找玩伴', '柴犬', '同品种交流', '活泼'],
      channel: '找玩伴',
      createdAt: '今天 09:16',
      likeCount: 54,
      liked: false,
      isFollowing: false,
      petCard: {
        age: '1岁半',
        personality: '活泼',
        activity: '公园玩耍'
      }
    },
    {
      id: 'community_3',
      title: '新手养猫，驱虫前后要注意什么？',
      content: '刚接回家的小猫三个月，准备做第一次体内外驱虫，有没有比较温和的流程建议？',
      images: [],
      mediaType: 'image',
      coverEmoji: '🐱',
      coverTone: 'soft',
      userName: '晚安团子',
      avatar: '🐱',
      petName: '团子',
      breed: '银渐层',
      city: '北京',
      distance: '同城',
      tags: ['求助', '新手养宠', '驱虫', '猫猫'],
      channel: '求助',
      createdAt: '今天 08:42',
      likeCount: 39,
      liked: false,
      isFollowing: true,
      petCard: {
        age: '3个月',
        personality: '胆小',
        activity: '养宠交流'
      }
    },
    {
      id: 'community_4',
      title: '附近新开的宠物友好公园也太适合拍照了',
      content: '草坪很干净，还有饮水点和宠物便袋，周边遛狗体验真的不错。',
      images: [],
      mediaType: 'image',
      coverEmoji: '🌳',
      coverTone: 'gold',
      userName: '糯米卷',
      avatar: '🐾',
      petName: '可乐',
      breed: '柯基',
      city: '天津',
      distance: '约 800m',
      tags: ['周边', '遛狗', '拍照打卡', '公园玩耍'],
      channel: '周边',
      createdAt: '昨天 18:30',
      likeCount: 112,
      liked: true,
      isFollowing: false,
      petCard: {
        age: '4岁',
        personality: '爱运动',
        activity: '拍照打卡'
      }
    },
    {
      id: 'community_5',
      title: '今天帮奶黄剪完指甲，奖励一条零食小鱼',
      content: '记录一下本周护理打卡，慢慢适应之后真的比想象中顺利很多。',
      images: [],
      mediaType: 'image',
      coverEmoji: '🐈',
      coverTone: 'cream',
      userName: '七七的设计日记',
      avatar: '🐈',
      petName: '奶黄',
      breed: '田园猫',
      city: '杭州',
      distance: '同城',
      tags: ['推荐', '日常', '护理', '粘人'],
      channel: '推荐',
      createdAt: '昨天 14:05',
      likeCount: 73,
      liked: false,
      isFollowing: true,
      petCard: {
        age: '11个月',
        personality: '粘人',
        activity: '居家日常'
      }
    },
    {
      id: 'community_6',
      title: '找附近猫友一起交流增肥经验',
      content: '家里小布偶胃口一直一般，想约同城猫友线下聊聊喂养心得，顺便给猫咪认识新朋友。',
      images: [],
      mediaType: 'video',
      videoCover: '',
      coverEmoji: '🎥',
      coverTone: 'soft',
      userName: '奶油泡芙',
      avatar: '🎥',
      petName: '布丁',
      breed: '布偶猫',
      city: '上海',
      distance: '约 3km',
      tags: ['找玩伴', '猫友交流', '布偶', '安静'],
      channel: '找玩伴',
      createdAt: '昨天 11:20',
      likeCount: 61,
      liked: false,
      isFollowing: false,
      petCard: {
        age: '2岁',
        personality: '安静',
        activity: '养宠交流'
      }
    }
  ]
}

function mapLegacySection(section) {
  if (section === '交友') return '找玩伴'
  if (section === '安利') return '推荐'
  return '推荐'
}

function normalizePost(post, index) {
  var imageList = post.images || []
  var firstImage = imageList[0] || post.videoCover || ''
  var title = post.title || post.content || '萌宠日常分享'
  title = title.length > 24 ? title.slice(0, 24) + '...' : title

  return {
    id: post.id || 'post_' + index,
    title: title,
    content: post.content || '',
    images: imageList,
    mediaType: post.mediaType || (post.videoCover ? 'video' : 'image'),
    videoCover: post.videoCover || '',
    coverImage: firstImage,
    coverEmoji: post.coverEmoji || '🐾',
    coverTone: post.coverTone || 'gold',
    userName: post.userName || post.user || '萌宠用户',
    avatar: post.avatar || '🐾',
    petName: post.petName || '毛孩子',
    breed: post.breed || '',
    city: post.city || post.locationName || '同城宠友',
    distance: post.distance || (post.locationName ? '附近' : '同城'),
    tags: post.tags || [post.section || '日常'],
    channel: post.channel || mapLegacySection(post.section),
    createdAt: post.createdAt || getNowText(),
    likeCount: typeof post.likeCount === 'number' ? post.likeCount : 0,
    liked: !!post.liked,
    isFollowing: !!post.isFollowing,
    petCard: post.petCard || {
      age: post.age || '',
      personality: post.personality || '亲人',
      activity: post.activity || '养宠交流'
    }
  }
}

function estimateCardWeight(post) {
  var base = 240
  base += (post.title || '').length * 2
  base += (post.content || '').length
  base += (post.tags || []).length * 16
  if (post.coverImage) {
    base += post.mediaType === 'video' ? 180 : 210
  }
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
    channels: ['推荐', '关注', '同城', '周边', '找玩伴', '求助'],
    activeChannel: '推荐',
    posts: [],
    filteredPosts: [],
    leftColumn: [],
    rightColumn: []
  },

  onShow: function () {
    this.loadPosts()
  },

  loadPosts: function () {
    var posts = wx.getStorageSync(COMMUNITY_KEY)
    var normalized = []
    var i

    if (!posts || posts.length === 0) {
      posts = getDefaultPosts()
      wx.setStorageSync(COMMUNITY_KEY, posts)
    }

    for (i = 0; i < posts.length; i++) {
      normalized.push(normalizePost(posts[i], i))
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

  switchChannel: function (e) {
    this.setData({
      activeChannel: e.currentTarget.dataset.channel
    })
    this.applyChannel()
  },

  openSearch: function () {
    wx.showToast({
      title: '搜索功能待接入',
      icon: 'none'
    })
  },

  goPublish: function () {
    wx.navigateTo({
      url: '/pages/publish/index'
    })
  },

  toggleLike: function (e) {
    var id = e.currentTarget.dataset.id
    var posts = this.data.posts
    var i

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

    wx.setStorageSync(COMMUNITY_KEY, posts)
    this.setData({
      posts: posts
    })
    this.applyChannel()
  }
})

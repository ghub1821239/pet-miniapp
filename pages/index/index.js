var DIARY_KEY = 'diaryList'
var CAT_IMAGE = '/assets/mock/pets/pet-maohaizi.jpg.jpg'
var DOG_IMAGE = '/assets/mock/pets/pet-buding.jpg.jpg'

var DEFAULT_DIARY_STATS = {
  total: 6,
  month: 3,
  streak: 4
}

var DEFAULT_DIARY_LIST = [
  {
    id: 1,
    petId: 1,
    petName: '毛孩子',
    title: '窗边晒太阳的一天',
    content: '毛孩子今天窝在窗边睡了好久，蓝金色的毛在阳光下特别柔和。',
    images: [CAT_IMAGE],
    tags: ['温暖日常', '晒太阳', '可爱瞬间'],
    date: '2026-05-16',
    displayDate: '5月16日 今天',
    time: '18:30',
    mood: '放松',
    isPublic: false
  },
  {
    id: 2,
    petId: 2,
    petName: '布丁',
    title: '布丁的公园散步日',
    content: '今天带布丁去公园散步，萨摩耶真的像一颗会走路的小太阳。',
    images: [DOG_IMAGE],
    tags: ['外出', '运动', '同城'],
    date: '2026-05-15',
    displayDate: '5月15日 昨天',
    time: '17:20',
    mood: '开心',
    isPublic: true
  },
  {
    id: 3,
    petId: 2,
    petName: '布丁',
    title: '洗完澡像一朵小白云',
    content: '布丁今天洗澡特别乖，吹干以后整只狗都蓬蓬松松。',
    images: [DOG_IMAGE],
    tags: ['护理', '洗澡', '可爱日常'],
    date: '2026-05-12',
    displayDate: '5月12日',
    time: '20:10',
    mood: '乖巧',
    isPublic: false
  },
  {
    id: 4,
    petId: 1,
    petName: '毛孩子',
    title: '体重记录：4.2kg',
    content: '最近零食吃得有点多，准备开始减少罐头频率。',
    images: [CAT_IMAGE],
    tags: ['健康记录', '体重', '饮食'],
    date: '2026-05-10',
    displayDate: '5月10日',
    time: '09:40',
    mood: '关注',
    isPublic: false
  },
  {
    id: 5,
    petId: 2,
    petName: '布丁',
    title: '新玩具到家第一天',
    content: '追着小球跑了一整晚，最后抱着玩具睡着了。',
    images: [DOG_IMAGE],
    tags: ['玩具', '居家', '开心'],
    date: '2026-04-28',
    displayDate: '4月28日',
    time: '21:05',
    mood: '兴奋',
    isPublic: true
  },
  {
    id: 6,
    petId: 1,
    petName: '毛孩子',
    title: '第一次剪指甲成功',
    content: '比想象中配合，剪完奖励了最爱的小鱼干。',
    images: [CAT_IMAGE],
    tags: ['护理', '剪指甲', '奖励'],
    date: '2026-04-18',
    displayDate: '4月18日',
    time: '19:00',
    mood: '轻松',
    isPublic: false
  }
]

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function normalizeDiary(item) {
  var petName = item.petName === '小布丁' ? '布丁' : (item.petName || '毛孩子')
  var defaultImage = petName === '布丁' ? DOG_IMAGE : CAT_IMAGE
  var images = Array.isArray(item.images) && item.images.length ? item.images : [defaultImage]
  return {
    id: item.id,
    petId: item.petId || '',
    petName: petName,
    petInitial: petName.slice(0, 1),
    title: item.title || '萌宠日常',
    content: item.content || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    images: images,
    date: item.date,
    dateLabel: item.displayDate || item.date,
    time: item.time || '',
    mood: item.mood || '',
    isPublic: !!item.isPublic,
    visibilityText: item.isPublic ? '已同步社区' : '私密记录',
    coverText: '今日没有上传照片'
  }
}

Page({
  data: {
    hero: {
      title: '今日记录',
      subtitle: '把毛孩子今天的可爱瞬间保存下来吧',
      description: '成长不是一天完成的，但每一天都值得记住',
      tags: ['成长瞬间', '温暖日常', '健康记录']
    },
    overview: [
      { key: 'total', label: '总日记', value: 0, suffix: '' },
      { key: 'month', label: '本月记录', value: 0, suffix: '' },
      { key: 'streak', label: '连续记录', value: 0, suffix: '天' }
    ],
    diaryList: []
  },

  onLoad: function () {
    this.ensureMockDiary()
  },

  onShow: function () {
    this.loadDiaryList()
  },

  ensureMockDiary: function () {
    var diaryList = wx.getStorageSync(DIARY_KEY)
    if (!Array.isArray(diaryList) || !diaryList.length) {
      wx.setStorageSync(DIARY_KEY, clone(DEFAULT_DIARY_LIST))
    }
  },

  loadDiaryList: function () {
    var localDiaryList = wx.getStorageSync(DIARY_KEY)
    var sourceList = Array.isArray(localDiaryList) && localDiaryList.length ? localDiaryList : clone(DEFAULT_DIARY_LIST)
    var diaryList = sourceList
      .slice()
      .sort(function (a, b) {
        return (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time)
      })
      .map(normalizeDiary)

    this.setData({
      diaryList: diaryList,
      overview: [
        { key: 'total', label: '总日记', value: DEFAULT_DIARY_STATS.total, suffix: '' },
        { key: 'month', label: '本月记录', value: DEFAULT_DIARY_STATS.month, suffix: '' },
        { key: 'streak', label: '连续记录', value: DEFAULT_DIARY_STATS.streak, suffix: '天' }
      ]
    })
  },

  handleAddDiary: function () {
    wx.showActionSheet({
      itemList: ['同步到社区', '私密记录'],
      success: function (res) {
        var isPublic = res.tapIndex === 0
        wx.navigateTo({
          url: '/pages/publish/index?from=diary&visibility=' + (isPublic ? 'public' : 'private')
        })
      }
    })
  },

  handleDiaryTap: function (event) {
    wx.showToast({
      title: '日记详情开发中',
      icon: 'none'
    })
  }
})

// components/tabbar/index.js
Component({
  properties: {
    current: {
      type: String,
      value: 'community'
    }
  },

  data: {
    leftItems: [
      {
        key: 'community',
        text: '社区',
        icon: '🏘️',
        url: '/pages/forum/index'
      },
      {
        key: 'diary',
        text: '日记',
        icon: '📖',
        url: '/pages/index/index'
      }
    ],
    centerItem: {
      key: 'identify',
      text: '识别',
      icon: '📷',
      url: '/pages/identify/index',
      isCenter: true
    },
    rightItems: [
      {
        key: 'calendar',
        text: '日历',
        icon: '📅',
        url: '/pages/calendar/index'
      },
      {
        key: 'pet',
        text: '档案',
        icon: '🐾',
        url: '/pages/pet/index'
      }
    ]
  },

  methods: {
    goPage: function (e) {
      var key = e.currentTarget.dataset.key
      var url = e.currentTarget.dataset.url

      if (key === this.data.current) {
        return
      }

      wx.redirectTo({
        url: url
      })
    }
  }
})

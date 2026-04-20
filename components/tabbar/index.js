// components/tabbar/index.js
Component({
  properties: {
    current: {
      type: String,
      value: 'pet'
    }
  },

  data: {
    items: [
      {
        key: 'pet',
        text: '档案',
        icon: '🐾',
        url: '/pages/pet/index'
      },
      {
        key: 'forum',
        text: '论坛',
        icon: '💬',
        url: '/pages/forum/index'
      },
      {
        key: 'identify',
        text: '识别',
        icon: '📷',
        url: '/pages/identify/index'
      },
      {
        key: 'calendar',
        text: '日历',
        icon: '📅',
        url: '/pages/calendar/index'
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
// app.js
App({
  onLaunch: function () {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d1gr7sg6s8ba1f7b5',
        traceUser: true
      })
    } else {
      console.warn('当前基础库不支持云开发，请升级微信开发者工具或基础库')
    }

    console.log('萌宠日记启动成功')
  }
})

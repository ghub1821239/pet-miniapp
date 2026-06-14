var auth = require('../../utils/auth')

Page({
  data: {
    saving: false,
    showPassword: false,
    form: {
      currentPassword: '',
      nextPassword: '',
      confirmPassword: ''
    }
  },

  bindInput: function (e) {
    var field = e.currentTarget.dataset.field
    this.setData({
      ['form.' + field]: e.detail.value
    })
  },

  togglePassword: function () {
    this.setData({
      showPassword: !this.data.showPassword
    })
  },

  submitPasswordChange: function () {
    var that = this
    var form = this.data.form

    if (!String(form.currentPassword || '')) {
      wx.showToast({ title: '请输入当前密码', icon: 'none' })
      return
    }
    if (String(form.nextPassword || '').length < 6) {
      wx.showToast({ title: '新密码至少 6 位', icon: 'none' })
      return
    }
    if (String(form.nextPassword) !== String(form.confirmPassword)) {
      wx.showToast({ title: '两次新密码不一致', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    auth.changePassword({
      currentPassword: form.currentPassword,
      nextPassword: form.nextPassword
    }).then(function () {
      wx.showToast({ title: '密码修改成功', icon: 'success' })
      setTimeout(function () {
        wx.navigateBack()
      }, 500)
      that.setData({ saving: false })
    }).catch(function (err) {
      wx.showToast({ title: err && err.message ? err.message : '修改失败', icon: 'none' })
      that.setData({ saving: false })
    })
  }
})

var auth = require('../../utils/auth')

var DEFAULT_MODE_META = {
  login: {
    title: '欢迎回来',
    subtitle: '登录后继续记录毛孩子的日常',
    buttonText: '登录',
    helperText: '还没有账号？',
    helperAction: '去注册'
  },
  register: {
    title: '创建账号',
    subtitle: '为你和毛孩子准备一本专属手账',
    buttonText: '注册并继续',
    helperText: '已经有账号？',
    helperAction: '去登录'
  },
  recover: {
    title: '恢复密码',
    subtitle: '使用当前微信身份验证后重置密码',
    buttonText: '重置密码',
    helperText: '想起密码了？',
    helperAction: '返回登录'
  }
}

Page({
  data: {
    mode: 'login',
    modeMeta: DEFAULT_MODE_META.login,
    loading: false,
    activeUser: null,
    loginForm: {
      account: '',
      password: ''
    },
    registerForm: {
      nickname: '',
      password: '',
      confirmPassword: ''
    },
    recoverForm: {
      account: '',
      password: '',
      confirmPassword: ''
    }
  },

  onLoad: function () {
    var user = auth.getCurrentUser()

    if (user && user.id) {
      this.enterApp()
    }
  },

  noop: function () {},

  switchMode: function (mode) {
    var nextMode = DEFAULT_MODE_META[mode] ? mode : 'login'
    this.setData({
      mode: nextMode,
      modeMeta: DEFAULT_MODE_META[nextMode]
    })
  },

  handleModeTap: function (e) {
    this.switchMode(e.currentTarget.dataset.mode)
  },

  toggleHelperMode: function () {
    var mode = this.data.mode
    if (mode === 'login') {
      this.switchMode('register')
      return
    }
    this.switchMode('login')
  },

  openRecover: function () {
    this.switchMode('recover')
  },

  bindLoginInput: function (e) {
    this.setData({
      ['loginForm.' + e.currentTarget.dataset.field]: e.detail.value
    })
  },

  bindRegisterInput: function (e) {
    this.setData({
      ['registerForm.' + e.currentTarget.dataset.field]: e.detail.value
    })
  },

  bindRecoverInput: function (e) {
    this.setData({
      ['recoverForm.' + e.currentTarget.dataset.field]: e.detail.value
    })
  },

  submitCurrentForm: function () {
    if (this.data.mode === 'login') {
      this.submitLogin()
      return
    }
    if (this.data.mode === 'register') {
      this.submitRegister()
      return
    }
    if (this.data.mode === 'recover') {
      this.submitRecover()
    }
  },

  submitLogin: function () {
    var form = this.data.loginForm

    if (!this.ensureAccountPassword(form.account, form.password)) {
      return
    }

    this.setLoading(true)
    auth.clearAutoLoginDisabled()
    auth.login({
      account: form.account,
      password: form.password
    }).then(function (res) {
      this.setLoading(false)
      this.afterAuthed(res.user)
    }.bind(this)).catch(function (err) {
      this.setLoading(false)
      this.showError(err)
    }.bind(this))
  },

  submitRegister: function () {
    var form = this.data.registerForm

    if (!String(form.nickname || '').trim()) {
      this.showToast('请填写昵称')
      return
    }
    if (!this.isPasswordValid(form.password)) {
      this.showToast('密码至少需要 6 位')
      return
    }
    if (String(form.password || '') !== String(form.confirmPassword || '')) {
      this.showToast('两次密码不一致')
      return
    }

    this.setLoading(true)
    auth.clearAutoLoginDisabled()
    auth.register({
      nickname: form.nickname,
      password: form.password
    }).then(function (res) {
      this.setLoading(false)
      var account = res && res.generatedAccount ? res.generatedAccount : (res.user && res.user.account) || ''
      wx.showModal({
        title: '注册成功',
        content: account ? ('系统已为你分配账号：' + account + '，请妥善保存。') : '账号已创建成功。',
        showCancel: false,
        success: function () {
          this.afterAuthed(res.user)
        }.bind(this)
      })
    }.bind(this)).catch(function (err) {
      this.setLoading(false)
      this.showError(err)
    }.bind(this))
  },

  submitRecover: function () {
    var form = this.data.recoverForm

    if (!String(form.account || '').trim()) {
      this.showToast('请填写账号')
      return
    }
    if (!this.isPasswordValid(form.password)) {
      this.showToast('新密码至少需要 6 位')
      return
    }
    if (form.password !== form.confirmPassword) {
      this.showToast('两次密码不一致')
      return
    }

    this.setLoading(true)
    auth.recoverPassword({
      account: form.account,
      password: form.password
    }).then(function () {
      this.setLoading(false)
      wx.showToast({
        title: '密码已重置',
        icon: 'success'
      })
      this.setData({
        'loginForm.account': form.account,
        'loginForm.password': '',
        recoverForm: {
          account: form.account,
          password: '',
          confirmPassword: ''
        }
      })
      this.switchMode('login')
    }.bind(this)).catch(function (err) {
      this.setLoading(false)
      this.showError(err)
    }.bind(this))
  },

  afterAuthed: function (user) {
    this.setData({
      activeUser: user
    })
    this.enterApp()
  },

  enterApp: function () {
    wx.redirectTo({
      url: '/pages/forum/index'
    })
  },

  setLoading: function (loading) {
    this.setData({
      loading: !!loading
    })
  },

  ensureAccountPassword: function (account, password) {
    if (!String(account || '').trim()) {
      this.showToast('请填写账号')
      return false
    }
    if (!this.isPasswordValid(password)) {
      this.showToast('密码至少需要 6 位')
      return false
    }
    return true
  },

  isPasswordValid: function (password) {
    return String(password || '').length >= 6
  },

  showError: function (err) {
    this.showToast(err && err.message ? err.message : '账号服务暂不可用，请稍后再试')
  },

  showToast: function (title) {
    wx.showToast({
      title: title,
      icon: 'none'
    })
  }
})

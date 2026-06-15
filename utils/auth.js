var AUTH_SESSION_KEY = 'authSession'
var CURRENT_USER_KEY = 'currentUser'
var AUTH_FUNCTION_NAME = 'auth'
var AUTO_LOGIN_DISABLED_KEY = 'authAutoLoginDisabled'

function isCloudReady() {
  return typeof wx !== 'undefined' && wx.cloud && wx.cloud.callFunction
}

function callAuth(action, data) {
  if (!isCloudReady()) {
    return Promise.reject(new Error('账号服务暂不可用，请稍后再试'))
  }

  return wx.cloud.callFunction({
    name: AUTH_FUNCTION_NAME,
    data: Object.assign({
      action: action
    }, data || {})
  }).then(function (res) {
    var result = res && res.result ? res.result : {}

    if (!result.success) {
      throw new Error(result.message || '账号服务暂不可用，请稍后再试')
    }

    if (result.user) {
      wx.setStorageSync(CURRENT_USER_KEY, result.user)
    }
    if (result.session) {
      wx.setStorageSync(AUTH_SESSION_KEY, result.session)
    }
    wx.removeStorageSync(AUTO_LOGIN_DISABLED_KEY)

    return result
  }).catch(function (err) {
    var message = err && err.message ? err.message : '账号服务暂不可用，请稍后再试'
    throw new Error(message)
  })
}

function login(payload) {
  return callAuth('login', payload)
}

function register(payload) {
  return callAuth('register', payload)
}

function getCurrentUserFromCloud() {
  return callAuth('getCurrentUser')
}

function recoverPassword(payload) {
  return callAuth('recoverPassword', payload)
}

function changePassword(payload) {
  var session = getSession()
  return callAuth('changePassword', Object.assign({}, payload || {}, {
    userId: payload && payload.userId ? payload.userId : session.userId
  }))
}

function updateProfile(payload) {
  var session = getSession()
  return callAuth('updateProfile', Object.assign({}, payload || {}, {
    userId: payload && payload.userId ? payload.userId : session.userId
  }))
}

function logout() {
  wx.removeStorageSync(AUTH_SESSION_KEY)
  wx.removeStorageSync(CURRENT_USER_KEY)
  wx.setStorageSync(AUTO_LOGIN_DISABLED_KEY, true)
}

function clearLocalAuth() {
  wx.removeStorageSync(AUTH_SESSION_KEY)
  wx.removeStorageSync(CURRENT_USER_KEY)
}

function getCurrentUser() {
  return wx.getStorageSync(CURRENT_USER_KEY) || null
}

function getSession() {
  return wx.getStorageSync(AUTH_SESSION_KEY) || {}
}

function isLoggedIn() {
  var session = getSession()
  var user = getCurrentUser()
  return !!(session.userId && user && user.id && String(session.userId) === String(user.id))
}

function ensureValidAuth() {
  if (isLoggedIn()) {
    return true
  }

  clearLocalAuth()
  return false
}

function isAutoLoginDisabled() {
  return !!wx.getStorageSync(AUTO_LOGIN_DISABLED_KEY)
}

function clearAutoLoginDisabled() {
  wx.removeStorageSync(AUTO_LOGIN_DISABLED_KEY)
}

module.exports = {
  AUTH_SESSION_KEY: AUTH_SESSION_KEY,
  CURRENT_USER_KEY: CURRENT_USER_KEY,
  AUTO_LOGIN_DISABLED_KEY: AUTO_LOGIN_DISABLED_KEY,
  login: login,
  register: register,
  getCurrentUserFromCloud: getCurrentUserFromCloud,
  recoverPassword: recoverPassword,
  changePassword: changePassword,
  updateProfile: updateProfile,
  logout: logout,
  clearLocalAuth: clearLocalAuth,
  getCurrentUser: getCurrentUser,
  getSession: getSession,
  isLoggedIn: isLoggedIn,
  ensureValidAuth: ensureValidAuth,
  isAutoLoginDisabled: isAutoLoginDisabled,
  clearAutoLoginDisabled: clearAutoLoginDisabled
}

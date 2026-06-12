var auth = require('./auth')

function getUserId() {
  var user = auth.getCurrentUser() || {}
  return String(user.id || 'guest')
}

function getScopedKey(baseKey) {
  return baseKey + '__' + getUserId()
}

function getArray(baseKey) {
  var list = wx.getStorageSync(getScopedKey(baseKey))
  return Array.isArray(list) ? list : []
}

function getValue(baseKey) {
  return wx.getStorageSync(getScopedKey(baseKey))
}

function setValue(baseKey, value) {
  wx.setStorageSync(getScopedKey(baseKey), value)
}

function removeValue(baseKey) {
  wx.removeStorageSync(getScopedKey(baseKey))
}

module.exports = {
  getUserId: getUserId,
  getScopedKey: getScopedKey,
  getArray: getArray,
  getValue: getValue,
  setValue: setValue,
  removeValue: removeValue
}

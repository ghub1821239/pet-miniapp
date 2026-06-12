var userStorage = require('./user-storage')

var POSTS_KEY = 'postList'
var DETAIL_CACHE_KEY = 'currentPostDetail'

function getPostList() {
  var list = userStorage.getValue(POSTS_KEY)
  return Array.isArray(list) ? list : []
}

function setPostList(list) {
  userStorage.setValue(POSTS_KEY, Array.isArray(list) ? list : [])
}

function getDetailCache() {
  return userStorage.getValue(DETAIL_CACHE_KEY) || null
}

function setDetailCache(post) {
  userStorage.setValue(DETAIL_CACHE_KEY, post || null)
}

function clearDetailCache() {
  userStorage.removeValue(DETAIL_CACHE_KEY)
}

module.exports = {
  POSTS_KEY: POSTS_KEY,
  DETAIL_CACHE_KEY: DETAIL_CACHE_KEY,
  getPostList: getPostList,
  setPostList: setPostList,
  getDetailCache: getDetailCache,
  setDetailCache: setDetailCache,
  clearDetailCache: clearDetailCache
}

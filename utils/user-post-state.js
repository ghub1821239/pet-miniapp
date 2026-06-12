var userStorage = require('./user-storage')

var LIKED_POST_IDS_KEY = 'likedPostIds'
var FAVORITED_POST_IDS_KEY = 'favoritedPostIds'

function getIdList(key) {
  var list = userStorage.getValue(key)
  return Array.isArray(list) ? list.map(function (item) {
    return String(item)
  }) : []
}

function setIdList(key, list) {
  userStorage.setValue(key, Array.isArray(list) ? list.slice() : [])
}

function hasId(key, postId) {
  return getIdList(key).indexOf(String(postId)) > -1
}

function toggleId(key, postId, active) {
  var id = String(postId || '')
  var list = getIdList(key).filter(Boolean)
  var next = []
  var exists = list.indexOf(id) > -1
  var shouldKeep = active === undefined ? !exists : !!active
  var i

  for (i = 0; i < list.length; i++) {
    if (list[i] !== id) {
      next.push(list[i])
    }
  }

  if (shouldKeep && id) {
    next.unshift(id)
  }

  setIdList(key, next)
}

function applyStateToPost(post) {
  var next = Object.assign({}, post)
  var id = next && next.id ? next.id : ''

  if (!id) {
    return next
  }

  next.liked = hasId(LIKED_POST_IDS_KEY, id)
  next.isLiked = next.liked
  next.favorited = hasId(FAVORITED_POST_IDS_KEY, id)
  next.isFavorited = next.favorited
  return next
}

function applyStateToPosts(posts) {
  return Array.isArray(posts) ? posts.map(applyStateToPost) : []
}

module.exports = {
  LIKED_POST_IDS_KEY: LIKED_POST_IDS_KEY,
  FAVORITED_POST_IDS_KEY: FAVORITED_POST_IDS_KEY,
  getLikedPostIds: function () {
    return getIdList(LIKED_POST_IDS_KEY)
  },
  getFavoritedPostIds: function () {
    return getIdList(FAVORITED_POST_IDS_KEY)
  },
  setLiked: function (postId, active) {
    toggleId(LIKED_POST_IDS_KEY, postId, active)
  },
  setFavorited: function (postId, active) {
    toggleId(FAVORITED_POST_IDS_KEY, postId, active)
  },
  applyStateToPost: applyStateToPost,
  applyStateToPosts: applyStateToPosts
}

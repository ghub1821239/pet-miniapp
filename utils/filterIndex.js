function addToIndex(index, field, value, id) {
  var key = String(value)
  if (!index[field]) {
    index[field] = {}
  }
  if (!index[field][key]) {
    index[field][key] = {}
  }
  index[field][key][id] = true
}

function setFromIds(ids) {
  var set = {}
  var i
  for (i = 0; i < ids.length; i++) {
    set[ids[i]] = true
  }
  return set
}

function intersectSet(a, b) {
  var result = {}
  var key
  for (key in a) {
    if (b[key]) {
      result[key] = true
    }
  }
  return result
}

function buildFilterIndex(posts) {
  var index = {}
  var ids = []
  var i
  var post

  for (i = 0; i < posts.length; i++) {
    post = posts[i]
    ids.push(post.id)
    addToIndex(index, 'category', post.category, post.id)
    addToIndex(index, 'clusterId', post.clusterId, post.id)
    addToIndex(index, 'topicName', post.topicName, post.id)
    addToIndex(index, 'petType', post.petType, post.id)
    addToIndex(index, 'city', post.city, post.id)
    addToIndex(index, 'urgency', post.urgency, post.id)
    addToIndex(index, 'isSolved', !!post.isSolved, post.id)
    addToIndex(index, 'hasImage', !!(post.images && post.images.length), post.id)
  }

  index.__all = setFromIds(ids)
  return index
}

function sortPosts(posts, sortType, currentCity) {
  var list = posts.slice()
  var city = currentCity || '天津'

  list.sort(function (a, b) {
    var hotA
    var hotB
    if (sortType === 'latest') {
      return new Date(String(b.createdAt).replace(/-/g, '/')).getTime() - new Date(String(a.createdAt).replace(/-/g, '/')).getTime()
    }
    if (sortType === 'hot') {
      hotA = (a.likeCount || 0) + 2 * (a.commentCount || 0) + 3 * (a.collectCount || 0) + 0.2 * (a.viewCount || 0)
      hotB = (b.likeCount || 0) + 2 * (b.commentCount || 0) + 3 * (b.collectCount || 0) + 0.2 * (b.viewCount || 0)
      return hotB - hotA
    }
    if (sortType === 'distance') {
      return (b.city === city ? 1 : 0) - (a.city === city ? 1 : 0)
    }
    return (b.recommendScore || 0) - (a.recommendScore || 0)
  })

  return list
}

function filterPosts(posts, filters, index) {
  var activeSet = index.__all || {}
  var postMap = {}
  var fields = ['category', 'clusterId', 'topicName', 'petType', 'city', 'urgency', 'isSolved', 'hasImage']
  var i
  var field
  var value
  var result = []

  filters = filters || {}

  for (i = 0; i < posts.length; i++) {
    postMap[posts[i].id] = posts[i]
  }

  // Multi-condition filtering is implemented as inverted-index set intersection.
  for (i = 0; i < fields.length; i++) {
    field = fields[i]
    value = filters[field]
    if (value === undefined || value === null || value === '' || value === '全部') {
      continue
    }
    if (field === 'city' && value === '同城') {
      value = filters.currentCity || '天津'
    }
    activeSet = intersectSet(activeSet, (index[field] && index[field][String(value)]) || {})
  }

  for (field in activeSet) {
    if (postMap[field]) {
      result.push(postMap[field])
    }
  }

  return sortPosts(result, filters.sortType || 'recommend', filters.currentCity)
}

module.exports = {
  buildFilterIndex: buildFilterIndex,
  filterPosts: filterPosts,
  sortPosts: sortPosts
}

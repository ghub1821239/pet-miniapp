var textFeature = require('./textFeature')

var ACTION_WEIGHT = {
  skip: -2,
  view: 1,
  dwell: 2,
  like: 3,
  comment: 4,
  collect: 5,
  share: 6,
  publish: 7
}

var mockUserBehavior = [
  { postId: 'p001', action: 'view', weight: 1 },
  { postId: 'p004', action: 'collect', weight: 5 },
  { postId: 'p008', action: 'like', weight: 3 },
  { postId: 'p016', action: 'comment', weight: 4 },
  { postId: 'p024', action: 'dwell', weight: 2 },
  { postId: 'p007', action: 'view', weight: 1 }
]

function normalizeMap(map) {
  var total = 0
  var key
  for (key in map) {
    total += Math.max(0, map[key])
  }
  if (!total) {
    return map
  }
  for (key in map) {
    map[key] = map[key] / total
  }
  return map
}

function addVector(target, source, weight) {
  var i
  for (i = 0; i < source.length; i++) {
    target[i] = (target[i] || 0) + source[i] * weight
  }
}

function buildUserProfile(posts, behaviors) {
  var vocabulary = textFeature.buildVocabulary(posts)
  var postMap = {}
  var categoryInterest = {}
  var petTypeInterest = {}
  var tagInterest = {}
  var userVector = []
  var i
  var j
  var post
  var behavior
  var weight
  var vector

  behaviors = behaviors || mockUserBehavior

  for (i = 0; i < vocabulary.length; i++) {
    userVector.push(0)
  }

  for (i = 0; i < posts.length; i++) {
    postMap[posts[i].id] = posts[i]
  }

  for (i = 0; i < behaviors.length; i++) {
    behavior = behaviors[i]
    post = postMap[behavior.postId]
    if (!post) {
      continue
    }
    weight = behavior.weight || ACTION_WEIGHT[behavior.action] || 1
    categoryInterest[post.category] = (categoryInterest[post.category] || 0) + weight
    petTypeInterest[post.petType] = (petTypeInterest[post.petType] || 0) + weight
    if (Array.isArray(post.tags)) {
      for (j = 0; j < post.tags.length; j++) {
        tagInterest[post.tags[j]] = (tagInterest[post.tags[j]] || 0) + weight
      }
    }
    vector = textFeature.vectorizePost(post, vocabulary)
    addVector(userVector, vector, weight)
  }

  return {
    categoryInterest: normalizeMap(categoryInterest),
    petTypeInterest: normalizeMap(petTypeInterest),
    tagInterest: normalizeMap(tagInterest),
    userVector: userVector,
    vocabulary: vocabulary
  }
}

function clamp01(value) {
  if (value < 0) {
    return 0
  }
  if (value > 1) {
    return 1
  }
  return value
}

function getHoursDiff(createdAt) {
  var now = new Date('2026/05/22 20:00:00').getTime()
  var created = new Date(String(createdAt).replace(/-/g, '/')).getTime()
  if (!created) {
    return 72
  }
  return Math.max(0, (now - created) / 3600000)
}

function getReason(post) {
  var detail = post.scoreDetail || {}
  if (detail.paidBoost > 0) {
    return '正在推流中'
  }
  if (detail.categoryInterest >= 0.18) {
    return '因为你常看' + post.category
  }
  if (detail.petMatch >= 0.45) {
    return '符合你的' + post.petType + '兴趣'
  }
  if (detail.hot >= 0.72) {
    return '近期热度较高'
  }
  if (detail.freshness >= 0.78) {
    return '新鲜动态优先'
  }
  if (post.city === '天津') {
    return '同城宠友内容'
  }
  if (post.topicName) {
    return post.topicName + '主题'
  }
  return '新内容探索'
}

function getPaidBoost(post) {
  var levelBoost = {
    1: 0.08,
    2: 0.14,
    3: 0.22
  }
  var endTime
  var level

  if (!post || !post.promotionActive || !post.promotionEndedAt) {
    return 0
  }

  endTime = new Date(String(post.promotionEndedAt).replace(/-/g, '/')).getTime()
  if (!endTime || endTime <= Date.now()) {
    return 0
  }

  level = Number(post.promotionLevel || 0)
  return levelBoost[level] || 0
}

function recommendPosts(posts, userProfile, options) {
  var vocabulary = userProfile.vocabulary || textFeature.buildVocabulary(posts)
  var categoryKeys = Object.keys(userProfile.categoryInterest || {})
  var list = []
  var i
  var post
  var vector
  var similarity
  var categoryInterest
  var rawHot
  var hot
  var freshness
  var petMatch
  var explore
  var paidBoost
  var baseScore
  var score
  var result

  options = options || {}

  for (i = 0; i < posts.length; i++) {
    post = posts[i]
    vector = textFeature.vectorizePost(post, vocabulary)
    similarity = textFeature.cosineSimilarity(userProfile.userVector || [], vector)
    categoryInterest = (userProfile.categoryInterest && userProfile.categoryInterest[post.category]) || 0
    rawHot = Math.log(1 + (post.likeCount || 0) + 2 * (post.commentCount || 0) + 3 * (post.collectCount || 0) + 0.2 * (post.viewCount || 0))
    hot = clamp01(rawHot / 7)
    freshness = Math.exp(-getHoursDiff(post.createdAt) / 72)
    petMatch = (userProfile.petTypeInterest && userProfile.petTypeInterest[post.petType]) || 0
    explore = categoryKeys.indexOf(post.category) === -1 ? 1 : Math.max(0.15, 1 - categoryInterest)
    paidBoost = getPaidBoost(post)

    baseScore =
      0.35 * similarity +
      0.20 * categoryInterest +
      0.15 * hot +
      0.15 * freshness +
      0.10 * petMatch +
      0.05 * explore
    score = baseScore + paidBoost

    result = Object.assign({}, post, {
      recommendScore: Number(score.toFixed(4)),
      scoreDetail: {
        similarity: Number(similarity.toFixed(4)),
        categoryInterest: Number(categoryInterest.toFixed(4)),
        hot: Number(hot.toFixed(4)),
        freshness: Number(freshness.toFixed(4)),
        petMatch: Number(petMatch.toFixed(4)),
        explore: Number(explore.toFixed(4)),
        paidBoost: Number(paidBoost.toFixed(4))
      }
    })
    result.recommendReason = getReason(result)
    list.push(result)
  }

  list.sort(function (a, b) {
    return b.recommendScore - a.recommendScore
  })

  return list
}

module.exports = {
  ACTION_WEIGHT: ACTION_WEIGHT,
  mockUserBehavior: mockUserBehavior,
  buildUserProfile: buildUserProfile,
  recommendPosts: recommendPosts
}

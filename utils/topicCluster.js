var textFeature = require('./textFeature')

function emptyVector(length) {
  var vector = []
  var i
  for (i = 0; i < length; i++) {
    vector.push(0)
  }
  return vector
}

function averageVectors(vectors, length) {
  var center = emptyVector(length)
  var i
  var j

  if (!vectors.length) {
    return center
  }

  for (i = 0; i < vectors.length; i++) {
    for (j = 0; j < length; j++) {
      center[j] += vectors[i][j] || 0
    }
  }

  for (j = 0; j < length; j++) {
    center[j] = center[j] / vectors.length
  }

  return center
}

function pickTopicName(keywordMap, categoryMap) {
  function hasAny(words) {
    var i
    for (i = 0; i < words.length; i++) {
      if (keywordMap[words[i]]) {
        return true
      }
    }
    return false
  }

  if (categoryMap['就医问诊'] || hasAny(['呕吐', '医院', '不吃饭', '发烧', '医生'])) {
    return '健康就医'
  }
  if (categoryMap['交友约玩'] || hasAny(['同城', '遛狗', '约玩', '交友'])) {
    return '同城交友'
  }
  if (categoryMap['寻宠求助'] || hasAny(['走失', '寻主', '求扩散', '找猫', '找狗'])) {
    return '寻宠求助'
  }
  if (categoryMap['领养救助'] || hasAny(['领养', '救助', '流浪', '送养'])) {
    return '领养救助'
  }
  if (categoryMap['好物分享'] || hasAny(['猫粮', '狗粮', '玩具', '测评', '牵引绳'])) {
    return '好物分享'
  }
  if (categoryMap['养宠经验'] || hasAny(['训练', '喂养', '护理', '换粮', '新手'])) {
    return '养宠经验'
  }
  if (categoryMap['宠物活动'] || hasAny(['宠物活动', '打卡', '周末'])) {
    return '宠物活动'
  }
  return '晒宠日常'
}

function summarizeCluster(posts) {
  var keywordMap = {}
  var categoryMap = {}
  var keywords = []
  var i
  var j
  var tokens
  var token
  var sorted

  for (i = 0; i < posts.length; i++) {
    categoryMap[posts[i].category] = (categoryMap[posts[i].category] || 0) + 1
    tokens = textFeature.tokenizePetText([
      posts[i].title,
      posts[i].content,
      Array.isArray(posts[i].tags) ? posts[i].tags.join(' ') : '',
      posts[i].category
    ].join(' '))

    for (j = 0; j < tokens.length; j++) {
      token = tokens[j]
      keywordMap[token] = (keywordMap[token] || 0) + 1
    }
  }

  sorted = Object.keys(keywordMap).sort(function (a, b) {
    return keywordMap[b] - keywordMap[a]
  })
  keywords = sorted.slice(0, 5)

  return {
    topicName: pickTopicName(keywordMap, categoryMap),
    keywords: keywords
  }
}

function clusterPosts(posts, options) {
  var k = options && options.k ? options.k : 7
  var iterations = options && options.iterations ? options.iterations : 10
  var vocabulary = textFeature.buildVocabulary(posts)
  var vectors = []
  var centers = []
  var assignments = []
  var clusters = []
  var i
  var j
  var c
  var bestCluster
  var bestScore
  var score
  var clusterVectors
  var postsWithCluster
  var topics = []
  var summary

  if (!posts.length) {
    return { posts: [], topics: [] }
  }

  k = Math.min(k, posts.length)

  for (i = 0; i < posts.length; i++) {
    vectors.push(textFeature.vectorizePost(posts[i], vocabulary))
  }

  // KMeans uses deterministic seed centers so the demo is reproducible.
  for (i = 0; i < k; i++) {
    centers.push(vectors[Math.floor(i * posts.length / k)].slice())
  }

  for (i = 0; i < iterations; i++) {
    for (j = 0; j < posts.length; j++) {
      bestCluster = 0
      bestScore = -1
      for (c = 0; c < k; c++) {
        score = textFeature.cosineSimilarity(vectors[j], centers[c])
        if (score > bestScore) {
          bestScore = score
          bestCluster = c
        }
      }
      assignments[j] = bestCluster
    }

    for (c = 0; c < k; c++) {
      clusterVectors = []
      for (j = 0; j < vectors.length; j++) {
        if (assignments[j] === c) {
          clusterVectors.push(vectors[j])
        }
      }
      if (clusterVectors.length) {
        centers[c] = averageVectors(clusterVectors, vocabulary.length)
      }
    }
  }

  for (c = 0; c < k; c++) {
    clusters[c] = []
  }

  postsWithCluster = posts.map(function (post, index) {
    var clusterId = assignments[index] || 0
    clusters[clusterId].push(post)
    return Object.assign({}, post, { clusterId: clusterId })
  })

  for (c = 0; c < k; c++) {
    if (!clusters[c].length) {
      continue
    }
    summary = summarizeCluster(clusters[c])
    topics.push({
      clusterId: c,
      topicName: summary.topicName,
      count: clusters[c].length,
      keywords: summary.keywords
    })
  }

  postsWithCluster = postsWithCluster.map(function (post) {
    var topicName = '晒宠日常'
    for (i = 0; i < topics.length; i++) {
      if (topics[i].clusterId === post.clusterId) {
        topicName = topics[i].topicName
        break
      }
    }
    return Object.assign({}, post, { topicName: topicName })
  })

  return {
    posts: postsWithCluster,
    topics: topics
  }
}

module.exports = {
  clusterPosts: clusterPosts
}

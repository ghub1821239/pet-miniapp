var KEYWORD_GROUPS = {
  medical: ['呕吐', '不吃饭', '拉稀', '发烧', '精神不好', '医院', '医生', '打针', '绝育', '驱虫', '疫苗', '皮肤病', '咳嗽', '流泪'],
  social: ['同城', '约玩', '遛狗', '交友', '周末', '公园', '一起', '附近', '见面'],
  lost: ['走失', '丢了', '捡到', '寻主', '求扩散', '线索', '失踪', '找猫', '找狗'],
  adoption: ['领养', '送养', '救助', '流浪', '无偿', '找主人', '小奶猫', '小奶狗'],
  product: ['猫粮', '狗粮', '猫砂', '玩具', '梳毛', '牵引绳', '零食', '测评', '推荐'],
  experience: ['新手', '训练', '喂养', '护理', '洗澡', '掉毛', '换粮', '习惯', '教程'],
  daily: ['可爱', '日常', '照片', '视频', '打卡', '睡觉', '撒娇', '拆家', '表情包']
}

var EXTRA_WORDS = ['猫咪', '狗狗', '兔子', '仓鼠', '萨摩耶', '蓝金渐层', '长毛猫', '柯基', '比熊', '天津', '北京', '上海', '宠物活动']

function flattenKeywords() {
  var list = EXTRA_WORDS.slice()
  var key
  var i

  for (key in KEYWORD_GROUPS) {
    for (i = 0; i < KEYWORD_GROUPS[key].length; i++) {
      if (list.indexOf(KEYWORD_GROUPS[key][i]) === -1) {
        list.push(KEYWORD_GROUPS[key][i])
      }
    }
  }

  return list
}

var KEYWORDS = flattenKeywords()

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[，。！？、；：,.!?;:()[\]{}"'“”‘’#/@\\|~`+=*_<>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildPostText(post) {
  var tags = Array.isArray(post.tags) ? post.tags.join(' ') : ''
  return normalizeText([
    post.title,
    post.content,
    tags,
    post.petName,
    post.petType,
    post.breed,
    post.category,
    post.city
  ].join(' '))
}

function tokenizePetText(text) {
  var normalized = normalizeText(text)
  var tokens = []
  var i
  var word
  var chars

  for (i = 0; i < KEYWORDS.length; i++) {
    word = KEYWORDS[i]
    if (normalized.indexOf(word.toLowerCase()) > -1) {
      tokens.push(word)
    }
  }

  chars = normalized.replace(/\s+/g, '')
  for (i = 0; i < chars.length - 1; i++) {
    word = chars.slice(i, i + 2)
    if (/[\u4e00-\u9fa5]{2}/.test(word)) {
      tokens.push(word)
    }
  }

  return tokens
}

function buildVocabulary(posts) {
  var map = {}
  var vocabulary = []
  var i
  var j
  var tokens

  for (i = 0; i < posts.length; i++) {
    tokens = tokenizePetText(buildPostText(posts[i]))
    for (j = 0; j < tokens.length; j++) {
      if (!map[tokens[j]]) {
        map[tokens[j]] = true
        vocabulary.push(tokens[j])
      }
    }
  }

  return vocabulary
}

function getKeywordWeight(token) {
  var group
  for (group in KEYWORD_GROUPS) {
    if (KEYWORD_GROUPS[group].indexOf(token) > -1) {
      return 2.4
    }
  }
  return 1
}

function vectorizePost(post, vocabulary) {
  var tokens = tokenizePetText(buildPostText(post))
  var counts = {}
  var vector = []
  var i
  var token

  for (i = 0; i < tokens.length; i++) {
    token = tokens[i]
    counts[token] = (counts[token] || 0) + 1
  }

  for (i = 0; i < vocabulary.length; i++) {
    token = vocabulary[i]
    vector.push((counts[token] || 0) * getKeywordWeight(token))
  }

  return vector
}

function cosineSimilarity(vecA, vecB) {
  var dot = 0
  var normA = 0
  var normB = 0
  var len = Math.max(vecA.length, vecB.length)
  var a
  var b
  var i

  for (i = 0; i < len; i++) {
    a = vecA[i] || 0
    b = vecB[i] || 0
    dot += a * b
    normA += a * a
    normB += b * b
  }

  if (!normA || !normB) {
    return 0
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

module.exports = {
  KEYWORD_GROUPS: KEYWORD_GROUPS,
  normalizeText: normalizeText,
  tokenizePetText: tokenizePetText,
  buildVocabulary: buildVocabulary,
  vectorizePost: vectorizePost,
  cosineSimilarity: cosineSimilarity
}

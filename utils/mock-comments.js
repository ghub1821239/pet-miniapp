var COMMENT_NAMES = [
  '春日猫册',
  '布丁家长',
  '毛孩子观察员',
  '河西猫友',
  '小太阳日记',
  '奶盖同学',
  '团子妈妈',
  '豆包家长',
  '芝麻小窝',
  '萌宠路人'
]

var COMMENT_TEXTS = [
  '这也太可爱了，已经反复看了好几遍。',
  '状态看起来很不错，家长照顾得真细心。',
  '同款毛孩子也有类似情况，蹲一个后续。',
  '照片拍得好温柔，氛围感满满。',
  '这个经验很有用，先收藏起来慢慢看。',
  '看描述感觉处理得很稳，辛苦啦。',
  '希望小家伙每天都健康开心。',
  '这个角度太会拍了，表情好生动。',
  '我家也遇到过，慢慢调整会好很多。',
  '谢谢分享，给新手家长很多参考。'
]

function hashText(text) {
  var safe = String(text || '')
  var hash = 0
  var i

  for (i = 0; i < safe.length; i++) {
    hash = (hash * 31 + safe.charCodeAt(i)) % 9973
  }

  return hash
}

function normalizeComment(item, index) {
  var userName = item.userName || item.nickname || (item.author && item.author.name) || COMMENT_NAMES[index % COMMENT_NAMES.length]
  return {
    id: item.id || ('comment_' + index),
    userName: userName,
    avatarText: (item.avatarText || userName.slice(0, 1) || '评').slice(0, 1),
    content: item.content || COMMENT_TEXTS[index % COMMENT_TEXTS.length],
    time: String(item.time || item.createdAt || '').trim() || ((index + 1) + '小时前'),
    likes: Number(item.likes || item.likeCount || 0),
    liked: !!(item.liked || item.isLiked)
  }
}

function buildGeneratedComment(post, index) {
  var seed = hashText((post && (post.id || post.title || post.content)) || 'post') + index
  var name = COMMENT_NAMES[seed % COMMENT_NAMES.length]
  var text = COMMENT_TEXTS[(seed + index) % COMMENT_TEXTS.length]
  var petName = post && post.petName ? post.petName : ''

  if (petName && index % 4 === 0) {
    text = petName + '真的太乖了，想看更多日常。'
  }

  return {
    id: 'mock_comment_' + (post && (post.id || post._id) ? post.id || post._id : 'post') + '_' + index,
    userName: name,
    avatarText: name.slice(0, 1),
    content: text,
    time: index < 3 ? '刚刚' : (index + 1) + '小时前',
    likes: (seed + index * 3) % 18,
    liked: false
  }
}

function ensurePostComments(post, minCount) {
  var source = Array.isArray(post && post.comments) ? post.comments : []
  var targetCount = Math.max(Number(minCount || 10), Number(post && post.commentCount || 0), source.length)
  var comments = source.map(normalizeComment).filter(function (item) {
    return !!item.content
  })
  var i = comments.length

  while (comments.length < targetCount) {
    comments.push(buildGeneratedComment(post, i))
    i++
  }

  return comments
}

function applyCommentsToPost(post, minCount) {
  var comments = ensurePostComments(post, minCount)
  return Object.assign({}, post, {
    comments: comments,
    commentCount: comments.length
  })
}

module.exports = {
  ensurePostComments: ensurePostComments,
  applyCommentsToPost: applyCommentsToPost
}

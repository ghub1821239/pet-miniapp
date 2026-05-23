var POSTS_COLLECTION = 'posts'
var DEFAULT_LIMIT = 80
var DEFAULT_TIMEOUT = 8000

function isCloudAvailable() {
  return typeof wx !== 'undefined' && wx.cloud && wx.cloud.database
}

function formatDate(value) {
  var date
  var text
  var month
  var day
  var hour
  var minute

  if (!value) {
    return ''
  }

  text = String(value)
  date = value instanceof Date ? value : new Date(text.replace(/-/g, '/'))
  if (!date || isNaN(date.getTime())) {
    return String(value)
  }

  month = String(date.getMonth() + 1).padStart(2, '0')
  day = String(date.getDate()).padStart(2, '0')
  hour = String(date.getHours()).padStart(2, '0')
  minute = String(date.getMinutes()).padStart(2, '0')

  return date.getFullYear() + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':00'
}

function normalizeCloudPost(record, index) {
  var imageFileIds = Array.isArray(record.imageFileIds) ? record.imageFileIds : []
  var recordImages = Array.isArray(record.images) ? record.images.filter(function (url) {
    return url && !isCloudFileId(url)
  }) : []
  var tempImageUrls = Array.isArray(record._tempImageUrls) ? record._tempImageUrls : []
  var images = recordImages.length ? recordImages : tempImageUrls
  var coverImage = record.coverImage || record.cover || images[0] || ''
  var author = record.author || {}

  if (isCloudFileId(coverImage)) {
    coverImage = images[0] || ''
  }

  return Object.assign({}, record, {
    id: record.id || record._id || 'cloud_post_' + index,
    _cloudId: record._id || record.id || '',
    images: images,
    imageFileIds: imageFileIds,
    coverImage: coverImage,
    createdAt: formatDate(record.createdAt) || '2026-05-23 12:00:00',
    likeCount: Number(record.likeCount || 0),
    commentCount: Number(record.commentCount || 0),
    collectCount: Number(record.collectCount || 0),
    viewCount: Number(record.viewCount || 0),
    isSolved: record.isSolved === undefined ? true : !!record.isSolved,
    urgency: record.urgency || '普通',
    tags: Array.isArray(record.tags) ? record.tags : [],
    author: {
      name: author.name || record.userName || '萌宠用户',
      avatar: record._tempAvatarUrl || author.avatar || coverImage,
      avatarFileId: author.avatarFileId || ''
    }
  })
}

function isCloudFileId(value) {
  return /^cloud:\/\//.test(String(value || ''))
}

function attachTempFileUrls(records) {
  var fileIds = []
  var seen = {}
  var i
  var j
  var record
  var imageFileIds
  var images
  var avatarFileId

  for (i = 0; i < records.length; i++) {
    record = records[i]
    imageFileIds = Array.isArray(record.imageFileIds) ? record.imageFileIds : []
    images = Array.isArray(record.images) ? record.images : []
    for (j = 0; j < imageFileIds.length; j++) {
      if (isCloudFileId(imageFileIds[j]) && !seen[imageFileIds[j]]) {
        seen[imageFileIds[j]] = true
        fileIds.push(imageFileIds[j])
      }
    }
    for (j = 0; j < images.length; j++) {
      if (isCloudFileId(images[j]) && !seen[images[j]]) {
        seen[images[j]] = true
        fileIds.push(images[j])
      }
    }

    avatarFileId = record.author && record.author.avatarFileId
    if (isCloudFileId(avatarFileId) && !seen[avatarFileId]) {
      seen[avatarFileId] = true
      fileIds.push(avatarFileId)
    }
  }

  if (!fileIds.length) {
    return Promise.resolve(records)
  }

  return wx.cloud.getTempFileURL({
    fileList: fileIds
  }).then(function (res) {
    var urlMap = {}
    var fileList = Array.isArray(res.fileList) ? res.fileList : []

    for (i = 0; i < fileList.length; i++) {
      if (fileList[i].fileID && fileList[i].tempFileURL) {
        urlMap[fileList[i].fileID] = fileList[i].tempFileURL
      }
    }

    return records.map(function (item) {
      var next = Object.assign({}, item)
      var nextAuthor = Object.assign({}, item.author)
      var ids = Array.isArray(item.imageFileIds) && item.imageFileIds.length ? item.imageFileIds : (Array.isArray(item.images) ? item.images : [])

      next._tempImageUrls = ids.map(function (id) {
        return urlMap[id] || ''
      }).filter(function (url) {
        return !!url
      })

      if (nextAuthor.avatarFileId) {
        next._tempAvatarUrl = urlMap[nextAuthor.avatarFileId] || ''
      }

      next.author = nextAuthor
      return next
    })
  }).catch(function (err) {
    console.warn('云存储图片临时链接获取失败，将使用本地兜底图:', err)
    return records
  })
}

function fetchPosts(options) {
  var db
  var limit = options && options.limit ? options.limit : DEFAULT_LIMIT
  var timeout = options && options.timeout ? options.timeout : DEFAULT_TIMEOUT
  var timer

  if (!isCloudAvailable()) {
    return Promise.resolve([])
  }

  db = wx.cloud.database()

  return new Promise(function (resolve, reject) {
    timer = setTimeout(function () {
      reject(new Error('cloud posts request timeout'))
    }, timeout)

    db.collection(POSTS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
      .then(function (res) {
        clearTimeout(timer)
        resolve(Array.isArray(res.data) ? res.data : [])
      })
      .catch(function (err) {
        clearTimeout(timer)
        reject(err)
      })
    })
    .then(function (data) {
      return attachTempFileUrls(data)
    })
    .then(function (data) {
      return data.map(normalizeCloudPost)
    })
}

function updatePost(cloudId, patch) {
  var db

  if (!cloudId || !isCloudAvailable()) {
    return Promise.resolve()
  }

  db = wx.cloud.database()

  return db.collection(POSTS_COLLECTION)
    .doc(cloudId)
    .update({
      data: patch
    })
}

module.exports = {
  fetchPosts: fetchPosts,
  updatePost: updatePost,
  normalizeCloudPost: normalizeCloudPost
}

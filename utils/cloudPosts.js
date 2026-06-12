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
    collectCount: Number(record.collectCount || record.favoriteCount || record.favorites || 0),
    favoriteCount: Number(record.favoriteCount || record.favorites || record.collectCount || 0),
    favorites: Number(record.favorites || record.favoriteCount || record.collectCount || 0),
    viewCount: Number(record.viewCount || 0),
    isSolved: record.isSolved === undefined ? true : !!record.isSolved,
    urgency: record.urgency || '普通',
    userId: record.userId || author.userId || '',
    promotionActive: !!record.promotionActive,
    promotionLevel: Number(record.promotionLevel || 0),
    promotionAmount: Number(record.promotionAmount || 0),
    promotionStartedAt: record.promotionStartedAt || '',
    promotionEndedAt: record.promotionEndedAt || '',
    promotionOrderId: record.promotionOrderId || '',
    liked: !!(record.liked || record.isLiked),
    favorited: !!(record.favorited || record.isFavorited),
    isFollowing: !!record.isFollowing,
    tags: Array.isArray(record.tags) ? record.tags : [],
    comments: Array.isArray(record.comments) ? record.comments : [],
    author: {
      name: author.name || record.userName || '萌宠用户',
      userId: author.userId || record.userId || '',
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

function isRemotePath(value) {
  return /^https?:\/\//.test(String(value || ''))
}

function isTempLocalPath(value) {
  var path = String(value || '')
  if (!path) {
    return false
  }
  if (isCloudFileId(path) || isRemotePath(path)) {
    return false
  }
  if (path.indexOf('/assets/') === 0) {
    return false
  }
  return /^(wxfile:|file:|\/private\/|\/var\/|\/tmp\/|\/Users\/)/.test(path)
}

function getFileExt(path) {
  var match = String(path || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  return match ? match[1].toLowerCase() : 'jpg'
}

function uploadFilesToCloud(filePaths, folder) {
  var tasks = (filePaths || []).map(function (filePath, index) {
    var ext = getFileExt(filePath)
    var cloudPath = folder + '/' + Date.now() + '_' + index + '.' + ext

    return wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath
    }).then(function (res) {
      return res && res.fileID ? res.fileID : ''
    }).catch(function (err) {
      console.warn('帖子资源上传失败，已跳过该文件:', err)
      return ''
    })
  })

  if (!tasks.length) {
    return Promise.resolve([])
  }

  return Promise.all(tasks).then(function (fileIds) {
    return fileIds.filter(Boolean)
  })
}

function createPost(post) {
  var db
  var sourceImages
  var localImages
  var createdAt = formatDate(post && post.createdAt ? post.createdAt : new Date())
  var sourceId = post && post.id ? String(post.id) : String(Date.now())
  var folder = 'posts/' + sourceId
  var author = post && post.author
  var authorName = typeof author === 'string' ? author : ((author && author.name) || post.userName || '萌宠用户')

  if (!post) {
    return Promise.reject(new Error('帖子数据不能为空'))
  }

  if (!isCloudAvailable()) {
    return Promise.reject(new Error('当前环境未启用云开发'))
  }

  db = wx.cloud.database()
  sourceImages = Array.isArray(post.images) && post.images.length ? post.images.slice() : []
  if (!sourceImages.length && post.coverImage) {
    sourceImages = [post.coverImage]
  }
  localImages = sourceImages.filter(isTempLocalPath)

  return uploadFilesToCloud(localImages, folder).then(function (uploadedFileIds) {
    var finalImages = uploadedFileIds.length ? uploadedFileIds : sourceImages
    var finalCover = uploadedFileIds[0] || post.coverImage || post.cover || finalImages[0] || ''
    var payload = {
      id: post.id || ('community_' + Date.now()),
      title: post.title || '',
      content: post.content || '',
      userId: post.userId || (post.author && post.author.userId) || '',
      petName: post.petName || '',
      petType: post.petType || '',
      breed: post.breed || '',
      category: post.category || '',
      city: post.city || '',
      location: post.location || '',
      latitude: Number(post.latitude || 0),
      longitude: Number(post.longitude || 0),
      tags: Array.isArray(post.tags) ? post.tags.slice() : [],
      images: finalImages,
      imageFileIds: uploadedFileIds,
      coverImage: finalCover,
      cover: finalCover,
      coverHeight: Number(post.coverHeight || 320),
      coverType: post.coverType || 'paw',
      createdAt: createdAt,
      likeCount: Number(post.likeCount || post.likes || 0),
      commentCount: Number(post.commentCount || 0),
      collectCount: Number(post.collectCount || 0),
      favoriteCount: Number(post.favoriteCount || post.favorites || post.collectCount || 0),
      favorites: Number(post.favorites || post.favoriteCount || post.collectCount || 0),
      viewCount: Number(post.viewCount || 0),
      isSolved: post.isSolved === undefined ? true : !!post.isSolved,
      urgency: post.urgency || '普通',
      promotionActive: !!post.promotionActive,
      promotionLevel: Number(post.promotionLevel || 0),
      promotionAmount: Number(post.promotionAmount || 0),
      promotionStartedAt: post.promotionStartedAt || '',
      promotionEndedAt: post.promotionEndedAt || '',
      promotionOrderId: post.promotionOrderId || '',
      isFollowing: !!post.isFollowing,
      liked: !!(post.liked || post.isLiked),
      favorited: !!(post.favorited || post.isFavorited),
      comments: Array.isArray(post.comments) ? post.comments.slice() : [],
      author: {
        name: authorName,
        userId: post.userId || (author && author.userId) || '',
        avatar: '',
        avatarFileId: ''
      }
    }

    return db.collection(POSTS_COLLECTION).add({
      data: payload
    }).then(function (res) {
      return db.collection(POSTS_COLLECTION).doc(res._id).get().then(function (docRes) {
        var record = (docRes && docRes.data) || payload
        record._id = res._id
        return attachTempFileUrls([record]).then(function (list) {
          return normalizeCloudPost(list[0], 0)
        })
      })
    })
  })
}

function findCloudDocByPostId(postId) {
  var db
  var safeId = String(postId || '')

  if (!safeId || !isCloudAvailable()) {
    return Promise.resolve(null)
  }

  db = wx.cloud.database()

  return db.collection(POSTS_COLLECTION)
    .where({
      id: safeId
    })
    .limit(1)
    .get()
    .then(function (res) {
      var data = Array.isArray(res.data) ? res.data : []
      return data.length ? data[0] : null
    })
    .catch(function () {
      return null
    })
}

function syncPostPatch(postOrRef, patch) {
  var db
  var ref = postOrRef || {}
  var cloudId = ref && ref._cloudId ? String(ref._cloudId) : ''
  var businessId = ref && ref.id ? String(ref.id) : (typeof postOrRef === 'string' ? String(postOrRef) : '')

  if (!isCloudAvailable()) {
    return Promise.resolve({
      synced: false,
      reason: 'cloud_unavailable'
    })
  }

  db = wx.cloud.database()

  function updateByDocId(docId) {
    return db.collection(POSTS_COLLECTION)
      .doc(docId)
      .update({
        data: patch
      })
      .then(function () {
        return {
          synced: true,
          cloudId: docId
        }
      })
  }

  if (cloudId) {
    return updateByDocId(cloudId).catch(function () {
      return findCloudDocByPostId(businessId).then(function (doc) {
        if (!doc || !doc._id) {
          return {
            synced: false,
            reason: 'cloud_doc_not_found'
          }
        }
        return updateByDocId(doc._id)
      })
    })
  }

  return findCloudDocByPostId(businessId).then(function (doc) {
    if (!doc || !doc._id) {
      return {
        synced: false,
        reason: 'cloud_doc_not_found'
      }
    }
    return updateByDocId(doc._id)
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
  createPost: createPost,
  syncPostPatch: syncPostPatch,
  updatePost: updatePost,
  normalizeCloudPost: normalizeCloudPost
}

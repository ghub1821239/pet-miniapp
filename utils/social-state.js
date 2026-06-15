var auth = require('./auth')
var userStorage = require('./user-storage')

var PROFILE_KEY = 'userProfile'
var GRAPH_KEY = 'socialGraphByUser'
var SNAPSHOT_KEY = 'socialProfileSnapshots'
var DEFAULT_AVATAR = '/assets/mock/pets/pet-maohaizi.jpg.jpg'
var DEFAULT_COVER = '/assets/mock/pets/pet-buding.jpg.jpg'

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function getCurrentUser() {
  return auth.getCurrentUser() || {}
}

function pushAlias(list, value, prefix) {
  var text = String(value || '').trim()
  var alias = prefix ? prefix + text : text

  if (!text || list.indexOf(alias) > -1) {
    return
  }

  list.push(alias)
}

function getUserAliases(userId, userName, account) {
  var aliases = []
  var safeName = normalizeName(userName)
  var safeAccount = normalizeName(account)

  pushAlias(aliases, userId)
  pushAlias(aliases, safeAccount, 'account:')
  pushAlias(aliases, safeName, 'name:')
  return aliases
}

function resolveUserKey(userId, userName) {
  var safeId = String(userId || '').trim()
  var safeName = normalizeName(userName)

  if (safeId) {
    return safeId
  }
  if (safeName) {
    return 'name:' + safeName
  }
  return ''
}

function resolveUserKeyFromPost(post) {
  var author = post && post.author ? post.author : {}
  return resolveUserKey(
    post && (post.userId || author.userId),
    post && (post.userName || author.name || post.author)
  )
}

function getGraph() {
  var graph = wx.getStorageSync(GRAPH_KEY)
  return graph && typeof graph === 'object' ? graph : {}
}

function saveGraph(graph) {
  wx.setStorageSync(GRAPH_KEY, graph || {})
}

function getSnapshots() {
  var snapshots = wx.getStorageSync(SNAPSHOT_KEY)
  return snapshots && typeof snapshots === 'object' ? snapshots : {}
}

function saveSnapshots(snapshots) {
  wx.setStorageSync(SNAPSHOT_KEY, snapshots || {})
}

function normalizeNode(node) {
  var source = node && typeof node === 'object' ? node : {}
  return {
    following: source.following && typeof source.following === 'object' ? source.following : {},
    followers: source.followers && typeof source.followers === 'object' ? source.followers : {}
  }
}

function getCurrentProfileSnapshot() {
  var currentUser = getCurrentUser()
  var profile = userStorage.getValue(PROFILE_KEY) || {}
  return buildSnapshot({
    id: currentUser.id || '',
    account: currentUser.account || '',
    nickname: currentUser.nickname || profile.nickname || '',
    avatar: profile.avatar || DEFAULT_AVATAR,
    cover: profile.cover || DEFAULT_COVER,
    bio: profile.bio || '',
    location: profile.location || ''
  })
}

function getCurrentProfileId() {
  var snapshot = getCurrentProfileSnapshot()
  return String(snapshot && snapshot.id || '')
}

function getCurrentProfileAliases() {
  var currentUser = getCurrentUser()
  var profile = userStorage.getValue(PROFILE_KEY) || {}
  return getUserAliases(
    currentUser.id || '',
    currentUser.nickname || profile.nickname || '',
    currentUser.account || profile.profileId || ''
  )
}

function getAliasesFromSnapshot(snapshotLike) {
  var snapshot = buildSnapshot(snapshotLike)
  return getUserAliases(snapshot.id || '', snapshot.nickname || '', snapshot.account || '')
}

function buildSnapshot(source) {
  var snapshot = source || {}
  var nickname = String(snapshot.nickname || snapshot.userName || snapshot.name || '萌宠用户').trim()
  var tags = Array.isArray(snapshot.tags) ? snapshot.tags.filter(Boolean).slice(0, 3) : []
  return {
    id: resolveUserKey(snapshot.id || snapshot.userId, nickname),
    account: String(snapshot.account || '').trim(),
    nickname: nickname || '萌宠用户',
    avatar: snapshot.avatar || snapshot.avatarImage || snapshot.avatarUrl || DEFAULT_AVATAR,
    cover: snapshot.cover || DEFAULT_COVER,
    bio: String(snapshot.bio || '').trim() || '这个家长还没有留下简介。',
    location: String(snapshot.location || snapshot.city || '').trim() || '天津',
    tags: tags
  }
}

function saveProfileSnapshot(snapshotLike) {
  var snapshot = buildSnapshot(snapshotLike)
  var aliases = getAliasesFromSnapshot(snapshot)
  var snapshots
  var i

  if (!snapshot.id) {
    return null
  }

  snapshots = getSnapshots()
  snapshots[snapshot.id] = Object.assign({}, snapshots[snapshot.id] || {}, snapshot)
  for (i = 0; i < aliases.length; i++) {
    snapshots[aliases[i]] = Object.assign({}, snapshots[aliases[i]] || {}, snapshots[snapshot.id], {
      id: snapshot.id
    })
  }
  saveSnapshots(snapshots)
  return snapshots[snapshot.id]
}

function saveProfileSnapshotFromPost(post) {
  var author = post && post.author ? post.author : {}
  return saveProfileSnapshot({
    id: post && (post.userId || author.userId),
    nickname: post && (post.userName || author.name || post.author),
    avatar: post && (post.avatarImage || post.avatarUrl || author.avatar || author.avatarFileId),
    cover: post && (post.coverImage || post.cover),
    bio: '',
    location: post && (post.city || post.location || '')
  })
}

function getProfileSnapshot(userId) {
  var snapshots = getSnapshots()
  var key = String(userId || '')
  var snapshot = snapshots[key]

  if (snapshot) {
    return snapshot
  }

  if (snapshots['account:' + normalizeName(key)]) {
    return snapshots['account:' + normalizeName(key)]
  }
  if (snapshots['name:' + normalizeName(key)]) {
    return snapshots['name:' + normalizeName(key)]
  }
  return null
}

function ensureNode(graph, userId) {
  var key = String(userId || '')
  if (!key) {
    return null
  }
  if (!graph[key]) {
    graph[key] = {
      following: {},
      followers: {}
    }
  }
  if (!graph[key].following) {
    graph[key].following = {}
  }
  if (!graph[key].followers) {
    graph[key].followers = {}
  }
  return graph[key]
}

function mergeNodeInto(graph, targetId, sourceId) {
  var targetKey = String(targetId || '')
  var sourceKey = String(sourceId || '')
  var targetNode
  var sourceNode
  var ids
  var i

  if (!targetKey || !sourceKey || targetKey === sourceKey) {
    return ensureNode(graph, targetKey)
  }

  targetNode = ensureNode(graph, targetKey)
  sourceNode = normalizeNode(graph[sourceKey])
  ids = Object.keys(sourceNode.following)
  for (i = 0; i < ids.length; i++) {
    targetNode.following[ids[i]] = sourceNode.following[ids[i]]
  }

  ids = Object.keys(sourceNode.followers)
  for (i = 0; i < ids.length; i++) {
    targetNode.followers[ids[i]] = sourceNode.followers[ids[i]]
  }

  delete graph[sourceKey]
  return targetNode
}

function getMergedNode(userId, aliases) {
  var graph = getGraph()
  var primaryId = String(userId || '')
  var aliasList = Array.isArray(aliases) ? aliases.slice() : []
  var ids
  var i
  var node

  if (!primaryId && aliasList.length) {
    primaryId = String(aliasList[0] || '')
  }
  if (!primaryId) {
    return {
      id: '',
      node: null,
      graph: graph
    }
  }

  pushAlias(aliasList, primaryId)
  node = ensureNode(graph, primaryId)
  ids = aliasList
  for (i = 0; i < ids.length; i++) {
    if (String(ids[i] || '') && String(ids[i]) !== primaryId && graph[ids[i]]) {
      node = mergeNodeInto(graph, primaryId, ids[i])
    }
  }

  return {
    id: primaryId,
    node: node,
    graph: graph
  }
}

function getAliasesForUserId(userId) {
  var snapshot = getProfileSnapshot(userId)
  if (!snapshot) {
    return [userId]
  }
  return getAliasesFromSnapshot(snapshot)
}

function getListFromNode(map) {
  var source = map && typeof map === 'object' ? map : {}
  var ids = Object.keys(source)
  var list = []
  var snapshots = getSnapshots()
  var seen = {}
  var i
  var item
  var id

  for (i = 0; i < ids.length; i++) {
    id = String(ids[i] || '')
    if (!id || seen[id]) {
      continue
    }
    seen[id] = true
    item = Object.assign({}, source[id] || {}, snapshots[id] || {})
    if (!item.id) {
      item.id = id
    }
    item.tags = Array.isArray(item.tags) ? item.tags.filter(Boolean).slice(0, 3) : []
    item.tagText = item.tags.length ? item.tags.join(' · ') : ''
    list.push(item)
  }

  return list
}

function followUser(targetSnapshotLike) {
  var currentSnapshot = saveProfileSnapshot(getCurrentProfileSnapshot())
  var targetSnapshot = saveProfileSnapshot(targetSnapshotLike)
  var mergedCurrent
  var mergedTarget
  var graph
  var currentNode
  var targetNode

  if (!currentSnapshot || !targetSnapshot || !currentSnapshot.id || !targetSnapshot.id || currentSnapshot.id === targetSnapshot.id) {
    return false
  }

  mergedCurrent = getMergedNode(currentSnapshot.id, getCurrentProfileAliases())
  graph = mergedCurrent.graph
  currentNode = mergedCurrent.node
  mergedTarget = getMergedNode(targetSnapshot.id, getAliasesFromSnapshot(targetSnapshot))
  graph = mergedTarget.graph
  currentNode = ensureNode(graph, currentSnapshot.id)
  targetNode = mergedTarget.node

  currentNode.following[targetSnapshot.id] = targetSnapshot
  targetNode.followers[currentSnapshot.id] = currentSnapshot
  saveGraph(graph)
  return true
}

function unfollowUser(targetUserId) {
  var currentSnapshot = getCurrentProfileSnapshot()
  var mergedCurrent = getMergedNode(currentSnapshot.id, getCurrentProfileAliases())
  var mergedTarget = getMergedNode(targetUserId, getAliasesForUserId(targetUserId))
  var graph = mergedCurrent.graph
  var currentNode = mergedCurrent.node
  var targetNode = mergedTarget.node
  var targetKey = mergedTarget.id || String(targetUserId || '')
  var targetAliases = getAliasesForUserId(targetKey)
  var currentAliases = getCurrentProfileAliases()
  var i

  if (!currentSnapshot.id || !targetKey || !currentNode || !targetNode) {
    return false
  }

  for (i = 0; i < targetAliases.length; i++) {
    delete currentNode.following[String(targetAliases[i])]
  }
  delete currentNode.following[String(targetKey)]

  for (i = 0; i < currentAliases.length; i++) {
    delete targetNode.followers[String(currentAliases[i])]
  }
  delete targetNode.followers[String(currentSnapshot.id)]
  saveGraph(graph)
  return true
}

function isFollowingUser(targetUserId) {
  var currentSnapshot = getCurrentProfileSnapshot()
  var mergedCurrent = getMergedNode(currentSnapshot.id, getCurrentProfileAliases())
  var graph = mergedCurrent.graph
  var node = mergedCurrent.node

  if (!node || !targetUserId) {
    return false
  }

  return !!node.following[String(targetUserId)]
}

function getFollowingList(userId) {
  var aliases = String(userId || '') === getCurrentProfileId() ? getCurrentProfileAliases() : getAliasesForUserId(userId)
  var merged = getMergedNode(userId, aliases)
  var node = merged.node

  if (!node) {
    return []
  }
  saveGraph(merged.graph)
  return getListFromNode(node.following)
}

function getFollowersList(userId) {
  var aliases = String(userId || '') === getCurrentProfileId() ? getCurrentProfileAliases() : getAliasesForUserId(userId)
  var merged = getMergedNode(userId, aliases)
  var node = merged.node

  if (!node) {
    return []
  }
  saveGraph(merged.graph)
  return getListFromNode(node.followers)
}

function getSocialCounts(userId) {
  return {
    following: getFollowingList(userId).length,
    followers: getFollowersList(userId).length
  }
}

function applyFollowingStateToPost(post) {
  var next = Object.assign({}, post)
  var userKey = resolveUserKeyFromPost(post)

  if (!userKey) {
    return next
  }

  next.userId = userKey
  next.isFollowing = isFollowingUser(userKey)
  if (next.author && typeof next.author === 'object') {
    next.author = Object.assign({}, next.author, {
      userId: userKey
    })
  }
  return next
}

module.exports = {
  resolveUserKey: resolveUserKey,
  resolveUserKeyFromPost: resolveUserKeyFromPost,
  buildSnapshot: buildSnapshot,
  getCurrentProfileSnapshot: getCurrentProfileSnapshot,
  getCurrentProfileId: getCurrentProfileId,
  saveProfileSnapshot: saveProfileSnapshot,
  saveProfileSnapshotFromPost: saveProfileSnapshotFromPost,
  getProfileSnapshot: getProfileSnapshot,
  followUser: followUser,
  unfollowUser: unfollowUser,
  isFollowingUser: isFollowingUser,
  getFollowingList: getFollowingList,
  getFollowersList: getFollowersList,
  getSocialCounts: getSocialCounts,
  applyFollowingStateToPost: applyFollowingStateToPost
}

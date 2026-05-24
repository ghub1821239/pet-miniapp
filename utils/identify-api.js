var API_BASE_URLS = [
  'http://127.0.0.1:3007',
  'http://localhost:3007'
]
var RECOGNIZE_ENDPOINT = '/pet-recognize'
var HEALTH_ENDPOINT = '/health'
var BASE_URL_STORAGE_KEY = 'identifyApiBaseUrl'
var activeBaseUrl = ''

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

function getStoredBaseUrls() {
  if (typeof wx === 'undefined' || !wx || typeof wx.getStorageSync !== 'function') {
    return []
  }

  var raw = wx.getStorageSync(BASE_URL_STORAGE_KEY)
  var list = Array.isArray(raw) ? raw : [raw]
  var normalized = []
  var i

  for (i = 0; i < list.length; i++) {
    var item = normalizeBaseUrl(list[i])
    if (item) {
      normalized.push(item)
    }
  }

  return normalized
}

function getRuntimeBaseUrls() {
  var list = []
  var visited = {}
  var stored = getStoredBaseUrls()
  var merged = stored.concat(API_BASE_URLS)
  var i

  for (i = 0; i < merged.length; i++) {
    var item = normalizeBaseUrl(merged[i])
    if (!item || visited[item]) {
      continue
    }
    visited[item] = true
    list.push(item)
  }

  return list
}

function normalizeRemoteResult(data) {
  var payload = data && data.data ? data.data : data

  return {
    petName: payload.petName || '未知宠物',
    species: payload.species || '待识别',
    breed: payload.breed || '待确认品种',
    confidence: Number(payload.confidence || 0),
    image: payload.image || '',
    features: Array.isArray(payload.features) ? payload.features : [],
    advice: payload.advice || '暂未生成养护建议',
    createdAt: payload.createdAt || ''
  }
}

function parseUploadResponse(raw) {
  if (!raw) {
    throw new Error('识别服务没有返回内容')
  }

  var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw

  if (parsed.code && parsed.code !== 0) {
    throw new Error(parsed.message || '识别失败')
  }

  return normalizeRemoteResult(parsed)
}

function hasRemoteIdentifyApi() {
  return !!getRuntimeBaseUrls().length
}

function checkIdentifyApi() {
  return new Promise(function (resolve, reject) {
    var targets = getRuntimeBaseUrls()
    var lastError = ''

    if (!targets.length) {
      reject(new Error('未配置识别接口地址'))
      return
    }

    tryRequest(0)

    function tryRequest(index) {
      wx.request({
        url: targets[index] + HEALTH_ENDPOINT,
        timeout: 5000,
        success: function (res) {
          if (res.statusCode === 200 && res.data && res.data.ok) {
            activeBaseUrl = targets[index]
            resolve({
              ok: true,
              baseUrl: activeBaseUrl,
              provider: res.data.provider || '',
              model: res.data.model || ''
            })
            return
          }

          lastError = '健康检查失败: ' + targets[index] + HEALTH_ENDPOINT + ' status=' + res.statusCode

          if (index < targets.length - 1) {
            tryRequest(index + 1)
            return
          }

          reject(new Error(lastError))
        },
        fail: function (err) {
          lastError = '请求失败: ' + targets[index] + HEALTH_ENDPOINT + ' ' + ((err && err.errMsg) || '')

          if (index < targets.length - 1) {
            tryRequest(index + 1)
            return
          }

          reject(new Error(lastError))
        }
      })
    }
  })
}

function recognizePetByApi(filePath) {
  return new Promise(function (resolve, reject) {
    var targets = getRuntimeBaseUrls()

    if (!targets.length) {
      reject(new Error('未配置识别接口地址'))
      return
    }

    var uploadTargets = activeBaseUrl ? [activeBaseUrl] : targets.slice()
    tryUpload(0, uploadTargets)

    function tryUpload(index, uploadTargets) {
      wx.uploadFile({
        url: uploadTargets[index] + RECOGNIZE_ENDPOINT,
        filePath: filePath,
        name: 'file',
        timeout: 15000,
        formData: {
          scene: 'pet_breed_recognition'
        },
        success: function (res) {
          try {
            if (res.statusCode && res.statusCode !== 200) {
              throw new Error('识别接口状态异常：' + res.statusCode)
            }
            activeBaseUrl = uploadTargets[index]
            resolve(parseUploadResponse(res.data))
          } catch (err) {
            if (index < uploadTargets.length - 1) {
              tryUpload(index + 1, uploadTargets)
              return
            }
            reject(err)
          }
        },
        fail: function (err) {
          if (index < uploadTargets.length - 1) {
            tryUpload(index + 1, uploadTargets)
            return
          }
          reject(err)
        }
      })
    }
  })
}

module.exports = {
  API_BASE_URLS: API_BASE_URLS,
  BASE_URL_STORAGE_KEY: BASE_URL_STORAGE_KEY,
  RECOGNIZE_ENDPOINT: RECOGNIZE_ENDPOINT,
  HEALTH_ENDPOINT: HEALTH_ENDPOINT,
  getRuntimeBaseUrls: getRuntimeBaseUrls,
  hasRemoteIdentifyApi: hasRemoteIdentifyApi,
  checkIdentifyApi: checkIdentifyApi,
  recognizePetByApi: recognizePetByApi
}

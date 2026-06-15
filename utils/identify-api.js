var API_BASE_URLS = [
  'https://pet-identify-server-270515-9-1434048451.sh.run.tcloudbase.com',
  'http://127.0.0.1:3007',
  'http://localhost:3007'
]
var CLOUD_ENV = 'cloud1-d1gr7sg6s8ba1f7b5'
var CLOUD_CONTAINER_SERVICE = 'pet-identify-server'
var CLOUD_FUNCTION_NAME = 'recognizePet'
var RECOGNIZE_ENDPOINT = '/pet-recognize'
var HEALTH_ENDPOINT = '/health'
var BASE_URL_STORAGE_KEY = 'identifyApiBaseUrl'
var MAX_FUNCTION_FILE_SIZE = 350 * 1024
var PREFERRED_UPLOAD_FILE_SIZE = 450 * 1024
var activeBaseUrl = ''
var cloudContainerReady = false
var cloudFunctionReady = false

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

function isLocalhostUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(String(url || ''))
}

function getRuntimeBaseUrls() {
  var list = []
  var visited = {}
  var stored = getStoredBaseUrls()
  var merged = API_BASE_URLS.concat(stored)
  var i

  for (i = 0; i < merged.length; i++) {
    var item = normalizeBaseUrl(merged[i])
    if (!item || visited[item] || isLocalhostUrl(item)) {
      continue
    }
    visited[item] = true
    list.push(item)
  }

  return list
}

function canCallContainer() {
  return typeof wx !== 'undefined' && wx && wx.cloud && typeof wx.cloud.callContainer === 'function'
}

function canCallFunction() {
  return typeof wx !== 'undefined' && wx && wx.cloud && typeof wx.cloud.callFunction === 'function'
}

function callIdentifyFunction(data) {
  return new Promise(function (resolve, reject) {
    if (!canCallFunction()) {
      reject(new Error('当前环境不支持 wx.cloud.callFunction'))
      return
    }

    wx.cloud.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: data || {},
      success: resolve,
      fail: reject
    })
  })
}

function callIdentifyContainer(path, method, data) {
  return new Promise(function (resolve, reject) {
    if (!canCallContainer()) {
      reject(new Error('当前环境不支持 wx.cloud.callContainer'))
      return
    }

    wx.cloud.callContainer({
      config: {
        env: CLOUD_ENV
      },
      path: path,
      method: method || 'GET',
      header: {
        'X-WX-SERVICE': CLOUD_CONTAINER_SERVICE,
        'content-type': 'application/json'
      },
      data: data || {},
      success: resolve,
      fail: reject
    })
  })
}

function readFileAsBase64(filePath) {
  return new Promise(function (resolve, reject) {
    if (typeof wx === 'undefined' || !wx || !wx.getFileSystemManager) {
      reject(new Error('当前环境不支持读取本地图片'))
      return
    }

    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'base64',
      success: function (res) {
        resolve(res.data)
      },
      fail: reject
    })
  })
}

function getFileSize(filePath) {
  return new Promise(function (resolve, reject) {
    if (typeof wx === 'undefined' || !wx || !wx.getFileSystemManager) {
      reject(new Error('当前环境不支持读取文件信息'))
      return
    }

    wx.getFileSystemManager().getFileInfo({
      filePath: filePath,
      success: function (res) {
        resolve(Number(res.size || 0))
      },
      fail: reject
    })
  })
}

function compressImage(filePath, quality) {
  return new Promise(function (resolve, reject) {
    if (typeof wx === 'undefined' || !wx || typeof wx.compressImage !== 'function') {
      resolve(filePath)
      return
    }

    wx.compressImage({
      src: filePath,
      quality: quality,
      success: function (res) {
        resolve(res && res.tempFilePath ? res.tempFilePath : filePath)
      },
      fail: function () {
        resolve(filePath)
      }
    })
  })
}

function optimizeImageForRecognize(filePath) {
  return getFileSize(filePath).then(function (size) {
    if (size <= PREFERRED_UPLOAD_FILE_SIZE) {
      return filePath
    }

    return compressImage(filePath, 60).then(function (compressedPath) {
      if (!compressedPath || compressedPath === filePath) {
        return filePath
      }

      return getFileSize(compressedPath).then(function (compressedSize) {
        if (compressedSize <= PREFERRED_UPLOAD_FILE_SIZE) {
          return compressedPath
        }

        return compressImage(compressedPath, 35)
      }).catch(function () {
        return compressedPath
      })
    })
  }).catch(function () {
    return filePath
  })
}

function guessMimeType(filePath) {
  var value = String(filePath || '').toLowerCase()

  if (value.indexOf('.png') !== -1) {
    return 'image/png'
  }

  if (value.indexOf('.webp') !== -1) {
    return 'image/webp'
  }

  return 'image/jpeg'
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
    createdAt: payload.createdAt || '',
    source: payload.source || 'api',
    provider: payload.provider || '',
    model: payload.model || ''
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
  return canCallFunction() || canCallContainer() || !!getRuntimeBaseUrls().length
}

function checkIdentifyApi() {
  return new Promise(function (resolve, reject) {
    var targets = getRuntimeBaseUrls()
    var lastError = ''

    if (canCallFunction()) {
      callIdentifyFunction({
        action: 'health'
      }).then(function (res) {
        var payload = res && res.result ? res.result : res

        if (payload && payload.ok) {
          cloudFunctionReady = true
          resolve({
            ok: true,
            baseUrl: 'cloud-function:' + CLOUD_FUNCTION_NAME,
            provider: payload.provider || '',
            model: payload.model || ''
          })
          return
        }

        lastError = '云函数健康检查失败'
        checkContainer()
      }).catch(function (err) {
        lastError = '云函数调用失败: ' + getErrorMessage(err)
        checkContainer()
      })
      return
    }

    checkContainer()

    function checkContainer() {
      if (canCallContainer()) {
        callIdentifyContainer(HEALTH_ENDPOINT, 'GET').then(function (res) {
          if (res && res.data && res.data.ok) {
            cloudContainerReady = true
            resolve({
              ok: true,
              baseUrl: 'cloud-container:' + CLOUD_CONTAINER_SERVICE,
              provider: res.data.provider || '',
              model: res.data.model || ''
            })
            return
          }

          lastError = '云托管健康检查失败'
          checkHttpTargets()
        }).catch(function (err) {
          lastError = '云托管调用失败: ' + getErrorMessage(err)
          checkHttpTargets()
        })
        return
      }

      checkHttpTargets()
    }

    function checkHttpTargets() {
      if (!targets.length) {
        reject(new Error(lastError || '未配置识别接口地址'))
        return
      }

      tryRequest(0)
    }

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
  return optimizeImageForRecognize(filePath).then(function (optimizedFilePath) {
    return new Promise(function (resolve, reject) {
    var targets = getRuntimeBaseUrls()
    var errors = []
    var uploadTargets = activeBaseUrl ? [activeBaseUrl] : targets.slice()

    if (uploadTargets.length) {
      tryUpload(0, uploadTargets, optimizedFilePath)
      return
    }

    recognizeByFallbacks(optimizedFilePath)

    function tryUpload(index, uploadTargets, currentFilePath) {
      wx.uploadFile({
        url: uploadTargets[index] + RECOGNIZE_ENDPOINT,
        filePath: currentFilePath,
        name: 'file',
        timeout: 60000,
        formData: {
          scene: 'pet_breed_recognition'
        },
        success: function (res) {
          try {
            if (res.statusCode && res.statusCode !== 200) {
              throw new Error('HTTP ' + res.statusCode + ' ' + String(res.data || '').slice(0, 120))
            }
            activeBaseUrl = uploadTargets[index]
            resolve(parseUploadResponse(res.data))
          } catch (err) {
            errors.push(uploadTargets[index] + '：' + getErrorMessage(err))
            if (index < uploadTargets.length - 1) {
              tryUpload(index + 1, uploadTargets, currentFilePath)
              return
            }
            reject(new Error(errors.join('；')))
          }
        },
        fail: function (err) {
          errors.push(uploadTargets[index] + '：' + getErrorMessage(err))
          if (index < uploadTargets.length - 1) {
            tryUpload(index + 1, uploadTargets, currentFilePath)
            return
          }
          reject(new Error(errors.join('；')))
        }
      })
    }

    function recognizeByFallbacks(currentFilePath) {
      recognizePetByFunction(currentFilePath).then(resolve).catch(function (functionErr) {
        errors.push('云函数调用失败：' + getErrorMessage(functionErr))
        recognizeByContainer(currentFilePath)
      })
    }

    function recognizeByContainer(currentFilePath) {
      if (cloudContainerReady || canCallContainer()) {
        recognizePetByContainer(currentFilePath).then(resolve).catch(function (containerErr) {
          errors.push('云托管调用失败：' + getErrorMessage(containerErr))
          reject(new Error(errors.concat(['未配置可用的直传识别接口地址']).join('；')))
        })
        return
      }

      reject(new Error(errors.concat(['未配置可用的直传识别接口地址']).join('；')))
    }
  })
  })
}

function recognizePetByFunction(filePath) {
  return getFileSize(filePath).then(function (size) {
    if (size > MAX_FUNCTION_FILE_SIZE) {
      throw new Error('图片过大，已跳过云函数直传，请改用文件上传接口')
    }
    return readFileAsBase64(filePath)
  }).then(function (imageBase64) {
    return callIdentifyFunction({
      imageBase64: imageBase64,
      mimeType: guessMimeType(filePath),
      scene: 'pet_breed_recognition'
    })
  }).then(function (res) {
    cloudFunctionReady = true

    if (!res || !res.result) {
      throw new Error('云函数识别没有返回内容')
    }

    return parseUploadResponse(res.result)
  })
}

function recognizePetByContainer(filePath) {
  return getFileSize(filePath).then(function (size) {
    if (size > MAX_FUNCTION_FILE_SIZE) {
      throw new Error('图片过大，已跳过云托管 JSON 直传，请改用文件上传接口')
    }
    return readFileAsBase64(filePath)
  }).then(function (imageBase64) {
    return callIdentifyContainer(RECOGNIZE_ENDPOINT, 'POST', {
      imageBase64: imageBase64,
      mimeType: guessMimeType(filePath),
      scene: 'pet_breed_recognition'
    })
  }).then(function (res) {
    cloudContainerReady = true

    if (!res || !res.data) {
      throw new Error('云托管识别没有返回内容')
    }

    return parseUploadResponse(res.data)
  })
}

function getErrorMessage(err) {
  if (!err) {
    return '未知错误'
  }

  return err.errMsg || err.message || String(err)
}

module.exports = {
  API_BASE_URLS: API_BASE_URLS,
  CLOUD_ENV: CLOUD_ENV,
  CLOUD_CONTAINER_SERVICE: CLOUD_CONTAINER_SERVICE,
  CLOUD_FUNCTION_NAME: CLOUD_FUNCTION_NAME,
  BASE_URL_STORAGE_KEY: BASE_URL_STORAGE_KEY,
  RECOGNIZE_ENDPOINT: RECOGNIZE_ENDPOINT,
  HEALTH_ENDPOINT: HEALTH_ENDPOINT,
  getRuntimeBaseUrls: getRuntimeBaseUrls,
  hasRemoteIdentifyApi: hasRemoteIdentifyApi,
  checkIdentifyApi: checkIdentifyApi,
  recognizePetByApi: recognizePetByApi
}

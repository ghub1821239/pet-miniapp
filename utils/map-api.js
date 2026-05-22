var MAP_BASE_URL = 'https://apis.map.qq.com/ws'
var DEFAULT_PAGE_SIZE = 20
var DEFAULT_RADIUS = 10000
var MAP_KEY = ''
var DEFAULT_HOSPITAL_KEYWORDS = ['宠物医院', '动物医院', '宠物诊所']

function setMapKey(key) {
  MAP_KEY = String(key || '').trim()
}

function hasMapKey() {
  return !!MAP_KEY
}

function request(path, data) {
  return new Promise(function (resolve, reject) {
    if (!MAP_KEY) {
      reject(new Error('未配置腾讯地图 KEY'))
      return
    }

    wx.request({
      url: MAP_BASE_URL + path,
      method: 'GET',
      data: Object.assign({}, data, {
        key: MAP_KEY
      }),
      timeout: 8000,
      success: function (res) {
        var payload = res && res.data
        if (!payload || payload.status !== 0) {
          reject(new Error((payload && payload.message) || '地图服务请求失败'))
          return
        }
        resolve(payload)
      },
      fail: function (err) {
        reject(err)
      }
    })
  })
}

function reverseGeocode(latitude, longitude) {
  return request('/geocoder/v1/', {
    location: latitude + ',' + longitude
  }).then(function (payload) {
    return payload.result || {}
  })
}

function geocodeByAddress(address) {
  return request('/geocoder/v1/', {
    address: address
  }).then(function (payload) {
    var result = payload.result || {}
    return result.location || null
  })
}

function searchHospitalsByNearby(options) {
  var keyword = options.keyword || '宠物医院'
  var radius = Number(options.radius || DEFAULT_RADIUS)
  var pageSize = Number(options.pageSize || DEFAULT_PAGE_SIZE)
  var latitude = Number(options.latitude)
  var longitude = Number(options.longitude)
  var useDefaultKeywords = !options.keyword
  var keywordList = useDefaultKeywords ? DEFAULT_HOSPITAL_KEYWORDS : [keyword]
  var tasks = keywordList.map(function (word) {
    return request('/place/v1/search', {
      keyword: word,
      boundary: 'nearby(' + latitude + ',' + longitude + ',' + radius + ',1)',
      orderby: '_distance',
      page_size: pageSize
    }).then(function (payload) {
      var list = Array.isArray(payload.data) ? payload.data : []
      return {
        failed: false,
        errorMessage: '',
        list: list.map(function (item) {
          return normalizeHospital(item, {
            latitude: latitude,
            longitude: longitude
          })
        })
      }
    }).catch(function (err) {
      return {
        failed: true,
        errorMessage: err && err.message ? String(err.message) : '附近检索失败',
        list: []
      }
    })
  })

  return Promise.all(tasks).then(function (results) {
    var lists = []
    var allFailed = true
    var i
    var firstErrorMessage = ''
    for (i = 0; i < results.length; i += 1) {
      lists.push(results[i].list)
      if (!results[i].failed) {
        allFailed = false
      } else if (!firstErrorMessage && results[i].errorMessage) {
        firstErrorMessage = results[i].errorMessage
      }
    }
    if (allFailed) {
      throw new Error(firstErrorMessage || '附近医院检索失败')
    }
    var merged = mergeHospitalList(lists)
    return enrichHospitalDetails(merged, options.includeDetail !== false)
  })
}

function searchHospitalsByRegion(options) {
  var keyword = options.keyword || '宠物医院'
  var city = options.city || ''
  var pageSize = Number(options.pageSize || DEFAULT_PAGE_SIZE)
  var useDefaultKeywords = !options.keyword
  var keywordList = useDefaultKeywords ? DEFAULT_HOSPITAL_KEYWORDS : [keyword]
  if (!city) {
    return Promise.resolve([])
  }

  return Promise.all(keywordList.map(function (word) {
    return request('/place/v1/search', {
      keyword: word,
      boundary: 'region(' + city + ',1)',
      page_size: pageSize
    }).then(function (payload) {
      var list = Array.isArray(payload.data) ? payload.data : []
      return {
        failed: false,
        errorMessage: '',
        list: list.map(function (item) {
          return normalizeHospital(item, null)
        })
      }
    }).catch(function (err) {
      return {
        failed: true,
        errorMessage: err && err.message ? String(err.message) : '城市检索失败',
        list: []
      }
    })
  })).then(function (results) {
    var lists = []
    var allFailed = true
    var firstErrorMessage = ''
    var i
    for (i = 0; i < results.length; i += 1) {
      lists.push(results[i].list)
      if (!results[i].failed) {
        allFailed = false
      } else if (!firstErrorMessage && results[i].errorMessage) {
        firstErrorMessage = results[i].errorMessage
      }
    }
    if (allFailed) {
      throw new Error(firstErrorMessage || '城市医院检索失败')
    }
    var merged = mergeHospitalList(lists)
    return enrichHospitalDetails(merged, options.includeDetail !== false)
  })
}

function normalizeHospital(item, originLocation) {
  var location = item.location || {}
  var latitude = Number(location.lat || 0)
  var longitude = Number(location.lng || 0)
  var meterDistance = Number(item._distance || 0)
  var distanceText = meterDistance > 0 ? formatDistance(meterDistance) : '暂无'
  var detail = item.detail_info || {}
  var district = item.ad_info && item.ad_info.district ? item.ad_info.district : ''

  if (!meterDistance && originLocation && latitude && longitude) {
    meterDistance = calcDistanceMeters(originLocation.latitude, originLocation.longitude, latitude, longitude)
    distanceText = formatDistance(meterDistance)
  }

  return {
    id: item.id || item.uid || item.title + '_' + latitude + '_' + longitude,
    name: item.title || '未命名医院',
    latitude: latitude,
    longitude: longitude,
    distance: meterDistance,
    distanceText: distanceText,
    rating: detail.overall_rating || detail.rating || '--',
    businessStatus: detail.open_time_desc || detail.open_time || '营业信息待补充',
    address: item.address || '地址信息待补充',
    tel: item.tel || '',
    category: item.category || '',
    city: item.ad_info && item.ad_info.city ? item.ad_info.city : '',
    district: district || '其他商圈'
  }
}

function mergeHospitalList(nestedList) {
  var map = {}
  var merged = []
  var i
  var j
  var list
  var item
  var key
  for (i = 0; i < nestedList.length; i += 1) {
    list = nestedList[i] || []
    for (j = 0; j < list.length; j += 1) {
      item = list[j]
      key = String(item.id || (item.name + '_' + item.latitude + '_' + item.longitude))
      if (!map[key]) {
        map[key] = true
        merged.push(item)
      }
    }
  }
  return merged
}

function enrichHospitalDetails(list, includeDetail) {
  var enriched = (list || []).slice()
  if (!includeDetail || !enriched.length) {
    return Promise.resolve(enriched)
  }

  return Promise.all(enriched.slice(0, 10).map(function (item, index) {
    return request('/place/v1/detail', {
      id: item.id
    }).then(function (payload) {
      var detail = payload.result || {}
      var detailInfo = detail.detail_info || {}
      enriched[index] = Object.assign({}, item, {
        rating: detailInfo.overall_rating || detailInfo.rating || item.rating || '--',
        businessStatus: detailInfo.open_time_desc || detailInfo.open_time || item.businessStatus || '营业信息待补充',
        tel: detail.tel || item.tel || '',
        category: detail.category || item.category || ''
      })
    }).catch(function () {})
  })).then(function () {
    return enriched
  })
}

function formatDistance(distance) {
  var meter = Number(distance || 0)
  if (meter <= 0) {
    return '暂无'
  }
  if (meter < 1000) {
    return meter + 'm'
  }
  return (meter / 1000).toFixed(1) + 'km'
}

function calcDistanceMeters(lat1, lng1, lat2, lng2) {
  var radLat1 = lat1 * Math.PI / 180
  var radLat2 = lat2 * Math.PI / 180
  var a = radLat1 - radLat2
  var b = lng1 * Math.PI / 180 - lng2 * Math.PI / 180
  var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)))
  s = s * 6378137.0
  return Math.round(s)
}

module.exports = {
  setMapKey: setMapKey,
  hasMapKey: hasMapKey,
  reverseGeocode: reverseGeocode,
  geocodeByAddress: geocodeByAddress,
  searchHospitalsByNearby: searchHospitalsByNearby,
  searchHospitalsByRegion: searchHospitalsByRegion
}

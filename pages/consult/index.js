var mapApi = require('../../utils/map-api')

// 在这里填写腾讯位置服务 KEY，也可以通过 wx.setStorageSync('tencentMapKey', '你的KEY') 注入
var MAP_KEY ='UV5BZ-KVU6Z-BEDX5-TDFC4-BYSZ2-P7BSN'
// 可选：微信 map 组件 layer-style（默认 1）
var MAP_LAYER_STYLE = 1
var HOSPITAL_MARKER_ICON = '/assets/icons/hospital-marker.png'
var HOSPITAL_MARKER_ACTIVE_ICON = '/assets/icons/hospital-marker-active.png'
var USER_MARKER_ICON = '/assets/icons/user-marker.png'
var DEFAULT_CITY = '上海市'
var LOADING_CITY_TEXT = '定位中...'
var DISTRICT_ALL_TEXT = '全部商圈'
var CITY_GEO_BOXES = [
  { city: '北京市', minLat: 39.4, maxLat: 41.1, minLng: 115.4, maxLng: 117.6 },
  { city: '天津市', minLat: 38.4, maxLat: 40.4, minLng: 116.7, maxLng: 118.3 },
  { city: '上海市', minLat: 30.7, maxLat: 31.9, minLng: 120.8, maxLng: 122.2 },
  { city: '重庆市', minLat: 28.1, maxLat: 32.3, minLng: 105.2, maxLng: 110.2 }
]

function sortByDistance(list) {
  return list.slice().sort(function (a, b) {
    return Number(a.distance || 0) - Number(b.distance || 0)
  })
}

function getNearestDistance(list) {
  var nearest = 0
  var i
  var distance

  for (i = 0; i < list.length; i += 1) {
    distance = Number(list[i].distance || 0)
    if (distance <= 0) {
      continue
    }
    if (nearest === 0 || distance < nearest) {
      nearest = distance
    }
  }

  return nearest
}

function resolveMapScale(nearestDistance) {
  var distance = Number(nearestDistance || 0)
  if (distance > 0 && distance < 500) {
    return 17
  }
  if (distance >= 500 && distance < 2000) {
    return 15
  }
  if (distance >= 2000 && distance < 5000) {
    return 13
  }
  return 11
}

function resolveMapRangeText(nearestDistance) {
  var distance = Number(nearestDistance || 0)
  if (distance > 0 && distance < 500) {
    return '当前视野约 500m'
  }
  if (distance >= 500 && distance < 2000) {
    return '当前视野约 2km'
  }
  if (distance >= 2000 && distance < 5000) {
    return '当前视野约 5km'
  }
  return '当前视野约 10km'
}

function resolveMapRadius(nearestDistance) {
  var distance = Number(nearestDistance || 0)
  if (distance > 0 && distance < 500) {
    return 500
  }
  if (distance >= 500 && distance < 2000) {
    return 2000
  }
  if (distance >= 2000 && distance < 5000) {
    return 5000
  }
  return 10000
}

function parseRatingValue(value) {
  var num = Number(value)
  if (Number.isNaN(num)) {
    return 0
  }
  return num
}

function sortByRatingThenDistance(list) {
  return list.slice().sort(function (a, b) {
    var aRating = parseRatingValue(a.rating)
    var bRating = parseRatingValue(b.rating)
    var aDistance = Number(a.distance || Number.MAX_SAFE_INTEGER)
    var bDistance = Number(b.distance || Number.MAX_SAFE_INTEGER)

    if (aRating !== bRating) {
      return bRating - aRating
    }
    return aDistance - bDistance
  })
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
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

function formatDistance(distance) {
  var meter = Number(distance || 0)
  if (meter <= 0) return '暂无'
  if (meter < 1000) return meter + 'm'
  return (meter / 1000).toFixed(1) + 'km'
}

function buildFallbackHospitals(center, city, district) {
  var latitude = Number(center.latitude)
  var longitude = Number(center.longitude)
  var fallbackCity = city || DEFAULT_CITY
  var fallbackDistrict = district || '附近商圈'
  var templates = [
    { name: '萌爪宠物医院（示例）', latOffset: 0.0021, lngOffset: 0.0014, district: '附近商圈', rating: '4.7', tel: '400-000-1001' },
    { name: '喵汪动物诊疗中心（示例）', latOffset: -0.0015, lngOffset: 0.0028, district: '附近商圈', rating: '4.6', tel: '400-000-1002' },
    { name: '安宠宠物门诊（示例）', latOffset: 0.0032, lngOffset: -0.0019, district: '附近商圈', rating: '4.5', tel: '400-000-1003' },
    { name: '宠爱宠物诊所（示例）', latOffset: -0.0028, lngOffset: -0.0021, district: '附近商圈', rating: '4.4', tel: '' }
  ]
  return templates.map(function (item, index) {
    var lat = latitude + item.latOffset
    var lng = longitude + item.lngOffset
    var distance = calcDistanceMeters(latitude, longitude, lat, lng)
    return {
      id: 'fallback_' + index,
      name: item.name,
      latitude: lat,
      longitude: lng,
      distance: distance,
      distanceText: formatDistance(distance),
      rating: item.rating,
      businessStatus: '营业中（示例）',
      address: '当前位置周边（示例数据）',
      tel: item.tel,
      category: '宠物医疗',
      city: fallbackCity,
      district: fallbackDistrict || item.district
    }
  })
}

function isStrictPetHospitalKeyword(keyword) {
  return String(keyword || '').trim() === '宠物医院'
}

function isGenericPetKeyword(keyword) {
  return String(keyword || '').trim() === '宠物'
}

function resolveDisplayCity(selectedCity, locationCity) {
  var cityFromSelected = String(selectedCity || '').trim()
  var cityFromLocation = String(locationCity || '').trim()

  if (cityFromSelected && cityFromSelected !== LOADING_CITY_TEXT) {
    return cityFromSelected
  }
  if (cityFromLocation && cityFromLocation !== LOADING_CITY_TEXT) {
    return cityFromLocation
  }
  return LOADING_CITY_TEXT
}

function resolveQueryCity(selectedCity, locationCity) {
  var cityFromSelected = String(selectedCity || '').trim()
  var cityFromLocation = String(locationCity || '').trim()

  if (cityFromSelected && cityFromSelected !== LOADING_CITY_TEXT) {
    return cityFromSelected
  }
  if (cityFromLocation && cityFromLocation !== LOADING_CITY_TEXT) {
    return cityFromLocation
  }
  return DEFAULT_CITY
}

function inferCityByLocation(location) {
  var lat = Number(location && location.latitude)
  var lng = Number(location && location.longitude)
  var i
  var box

  if (!lat || !lng) {
    return ''
  }

  for (i = 0; i < CITY_GEO_BOXES.length; i += 1) {
    box = CITY_GEO_BOXES[i]
    if (lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng) {
      return box.city
    }
  }

  return ''
}

function normalizeDistrictText(district) {
  var districtText = String(district || '').trim()
  return districtText || DISTRICT_ALL_TEXT
}

function isClinicLikeName(name) {
  var text = String(name || '')
  return text.indexOf('诊所') > -1 || text.indexOf('门诊') > -1 || text.indexOf('中心') > -1
}

function matchesPetHospitalOnly(name, category) {
  var safeName = String(name || '')
  var safeCategory = String(category || '')
  if (safeName.indexOf('宠物医院') > -1) {
    return true
  }
  if (safeCategory.indexOf('宠物医院') > -1 && !isClinicLikeName(safeName)) {
    return true
  }
  return false
}

function matchesGenericPetQuery(name, category) {
  if (isClinicLikeName(name)) {
    return false
  }
  return matchesPetHospitalOnly(name, category)
}

function matchHospitalByKeyword(item, keyword) {
  var query = String(keyword || '').trim()
  var name = String(item.name || '')
  var category = String(item.category || '')
  var address = String(item.address || '')

  if (!query) {
    return true
  }

  if (isStrictPetHospitalKeyword(query)) {
    return matchesPetHospitalOnly(name, category)
  }

  // “宠物”关键词统一收敛到“宠物医院”，避免诊所/中心等泛匹配干扰。
  if (isGenericPetKeyword(query)) {
    return matchesGenericPetQuery(name, category)
  }

  return name.indexOf(query) > -1 || category.indexOf(query) > -1 || address.indexOf(query) > -1
}

function pickFirstAreaFromHospitals(list) {
  var i
  var item
  for (i = 0; i < list.length; i += 1) {
    item = list[i]
    if (item && (item.city || item.district)) {
      return {
        city: item.city || '',
        district: item.district || ''
      }
    }
  }
  return null
}

Page({
  data: {
    keyword: '',
    selectedCity: LOADING_CITY_TEXT,
    displayCity: LOADING_CITY_TEXT,
    selectedDistrict: DISTRICT_ALL_TEXT,
    districtOptions: [DISTRICT_ALL_TEXT],
    districtIndex: 0,
    regionValue: ['', '', ''],
    statusText: '正在获取附近宠物医院...',
    mapRangeText: '当前视野约 10km',
    loading: false,
    loadFailed: false,
    mapScale: 12,
    mapLayerStyle: 1,
    mapCenter: {
      latitude: 31.2304,
      longitude: 121.4737
    },
    circles: [],
    polyline: [],
    markers: [],
    selectedHospitalId: '',
    selectedHospital: null,
    hospitals: [],
    filteredHospitals: [],
    currentLocation: null,
    locationCity: '',
    isManualRegionMode: false,
    locationDenied: false
  },

  onLoad: function () {
    var runtimeMapKey = MAP_KEY || wx.getStorageSync('tencentMapKey') || ''
    var runtimeLayerStyle = Number(MAP_LAYER_STYLE || wx.getStorageSync('tencentMapLayerStyle') || 1)
    mapApi.setMapKey(runtimeMapKey)
    this.setData({
      mapLayerStyle: runtimeLayerStyle > 0 ? runtimeLayerStyle : 1
    })
    this.bootstrap()
  },

  bootstrap: function () {
    if (!mapApi.hasMapKey()) {
      this.setData({
        statusText: '未配置地图 KEY，已切换示例数据模式',
        loadFailed: false
      })
      this.loadByLocation()
      return
    }

    this.loadByLocation()
  },

  loadByLocation: function () {
    var that = this
    this.setData({
      loading: true,
      loadFailed: false,
      statusText: '正在定位并检索附近宠物医院...'
    })

    wx.getLocation({
      type: 'gcj02',
      success: function (locationRes) {
        var location = {
          latitude: locationRes.latitude,
          longitude: locationRes.longitude
        }
        that.setData({
          currentLocation: location,
          mapCenter: location
        })

        mapApi.reverseGeocode(location.latitude, location.longitude).then(function (geoInfo) {
          var addressInfo = geoInfo.address_component || {}
          var city = addressInfo.city || inferCityByLocation(location) || resolveQueryCity(that.data.selectedCity, that.data.locationCity)
          var district = normalizeDistrictText(addressInfo.district)
          that.setData({
            selectedCity: city,
            displayCity: city,
            selectedDistrict: district,
            regionValue: [addressInfo.province || '', city, district === DISTRICT_ALL_TEXT ? '' : district],
            locationCity: city,
            isManualRegionMode: false,
            locationDenied: false
          })
          that.queryHospitalsByNearby()
        }).catch(function () {
          var fallbackCity = inferCityByLocation(location) || resolveDisplayCity(that.data.selectedCity, that.data.locationCity)
          that.setData({
            selectedCity: fallbackCity,
            displayCity: fallbackCity,
            locationCity: fallbackCity
          })
          that.queryHospitalsByNearby()
        })
      },
      fail: function () {
        that.setData({
          loading: false,
          statusText: '定位未授权，已切换为城市商圈筛选模式',
          isManualRegionMode: true,
          locationDenied: true
        })
        that.queryHospitalsByRegion()
      }
    })
  },

  queryHospitalsByNearby: function () {
    var that = this
    var location = this.data.currentLocation
    var searchKeyword = (this.data.keyword || '').trim()

    if (!location) {
      this.queryHospitalsByRegion()
      return
    }

    this.setData({
      loading: true,
      loadFailed: false,
      statusText: '正在按距离检索附近宠物医院...'
    })

    mapApi.searchHospitalsByNearby({
      latitude: location.latitude,
      longitude: location.longitude,
      keyword: searchKeyword
    }).then(function (list) {
      var areaInfo
      list = that.filterHospitalsByKeyword(list, searchKeyword)
      areaInfo = pickFirstAreaFromHospitals(list)
      if (areaInfo) {
        var prevRegion = that.data.regionValue || ['', '', '']
        var nextCity = areaInfo.city || inferCityByLocation(location) || resolveQueryCity(that.data.selectedCity, that.data.locationCity)
        var nextDistrict = normalizeDistrictText(areaInfo.district || that.data.selectedDistrict)
        that.setData({
          selectedCity: nextCity,
          displayCity: nextCity,
          selectedDistrict: nextDistrict,
          regionValue: [prevRegion[0] || '', nextCity, nextDistrict === DISTRICT_ALL_TEXT ? '' : nextDistrict],
          locationCity: nextCity
        })
      } else {
        var stableCity = inferCityByLocation(location) || resolveDisplayCity(that.data.selectedCity, that.data.locationCity)
        that.setData({
          selectedCity: stableCity,
          displayCity: stableCity,
          locationCity: stableCity
        })
      }
      that.consumeHospitalList(list, '已按距离为你排序')
    }).catch(function (err) {
      that.handleLoadError(err)
    })
  },

  queryHospitalsByRegion: function () {
    var that = this
    var city = resolveQueryCity(this.data.selectedCity, this.data.locationCity)
    var district = this.data.selectedDistrict
    var searchKeyword = (this.data.keyword || '').trim()

    this.setData({
      loading: true,
      loadFailed: false,
      statusText: '正在检索 ' + city + ' 的宠物医院...'
    })

    mapApi.searchHospitalsByRegion({
      city: city,
      keyword: searchKeyword
    }).then(function (list) {
      list = that.filterHospitalsByKeyword(list, searchKeyword)
      return mapApi.geocodeByAddress(city + (district === DISTRICT_ALL_TEXT ? '' : district)).then(function (cityCenter) {
        if (cityCenter) {
          that.setData({
            mapCenter: {
              latitude: cityCenter.lat,
              longitude: cityCenter.lng
            }
          })
        }
        that.consumeHospitalList(list, '已按城市商圈为你筛选')
      }).catch(function () {
        that.consumeHospitalList(list, '已按城市商圈为你筛选')
      })
    }).catch(function (err) {
      that.handleLoadError(err)
    })
  },

  consumeHospitalList: function (list, statusText) {
    var sorted = sortByDistance(list || [])
    var districtOptions = this.buildDistrictOptions(sorted)
    var selectedDistrict = this.data.selectedDistrict
    var displayCity = inferCityByLocation(this.data.currentLocation) || resolveDisplayCity(this.data.selectedCity, this.data.locationCity)
    var filtered
    var nearestDistance
    var selected
    var radius
    var circleCenter
    var route
    var safeStatusText = statusText
    var query = String(this.data.keyword || '').trim()

    if (districtOptions.indexOf(selectedDistrict) === -1) {
      if (selectedDistrict && selectedDistrict !== DISTRICT_ALL_TEXT) {
        districtOptions.push(selectedDistrict)
      } else {
        selectedDistrict = DISTRICT_ALL_TEXT
      }
    }

    filtered = this.applyDistrictFilter(sorted, selectedDistrict)
    if (!filtered.length && selectedDistrict !== DISTRICT_ALL_TEXT) {
      safeStatusText = statusText + '（当前区域无匹配）'
      filtered = sorted
    }
    if (!query) {
      filtered = this.pickInitialHospitals(filtered)
    }
    nearestDistance = getNearestDistance(filtered)
    selected = filtered.length ? filtered[0] : null
    radius = resolveMapRadius(nearestDistance)
    circleCenter = this.data.currentLocation || (selected ? {
      latitude: selected.latitude,
      longitude: selected.longitude
    } : this.data.mapCenter)
    route = this.buildRoutePolyline(circleCenter, selected)

    this.setData({
      loading: false,
      loadFailed: false,
      statusText: safeStatusText,
      mapRangeText: resolveMapRangeText(nearestDistance),
      selectedCity: displayCity,
      displayCity: displayCity,
      hospitals: sorted,
      filteredHospitals: filtered,
      districtOptions: districtOptions,
      selectedDistrict: selectedDistrict,
      districtIndex: this.resolveDistrictIndex(districtOptions, selectedDistrict),
      selectedHospitalId: selected ? selected.id : '',
      selectedHospital: selected,
      mapScale: resolveMapScale(nearestDistance),
      circles: this.buildRangeCircles(circleCenter, radius),
      polyline: route,
      markers: this.buildMarkers(filtered, selected ? selected.id : ''),
      mapCenter: selected ? { latitude: selected.latitude, longitude: selected.longitude } : this.data.mapCenter
    })
  },

  buildDistrictOptions: function (list) {
    var map = {}
    var options = [DISTRICT_ALL_TEXT]
    var i
    var district
    for (i = 0; i < list.length; i += 1) {
      district = list[i].district || '其他商圈'
      if (!map[district]) {
        map[district] = true
        options.push(district)
      }
    }
    return options
  },

  filterHospitalsByKeyword: function (list, keyword) {
    var source = Array.isArray(list) ? list : []
    var query = String(keyword || '').trim()
    if (!query) {
      return source
    }
    return source.filter(function (item) {
      return matchHospitalByKeyword(item, query)
    })
  },

  pickInitialHospitals: function (list) {
    var sorted = sortByRatingThenDistance(Array.isArray(list) ? list : [])
    return sorted.slice(0, 4)
  },

  resolveDistrictIndex: function (options, district) {
    var index = options.indexOf(district)
    return index > -1 ? index : 0
  },

  applyDistrictFilter: function (list, districtValue) {
    var district = districtValue || this.data.selectedDistrict
    if (!district || district === DISTRICT_ALL_TEXT) {
      return list
    }
    return list.filter(function (item) {
      return item.district === district
    })
  },

  buildMarkers: function (list, selectedId) {
    var markers = []
    var location = this.data.currentLocation
    var i
    var item

    for (i = 0; i < list.length; i += 1) {
      item = list[i]
      markers.push({
        id: i + 1,
        latitude: item.latitude,
        longitude: item.longitude,
        iconPath: item.id === selectedId ? HOSPITAL_MARKER_ACTIVE_ICON : HOSPITAL_MARKER_ICON,
        width: item.id === selectedId ? 28 : 24,
        height: item.id === selectedId ? 35 : 30,
        anchor: {
          x: 0.5,
          y: 0.92
        },
        zIndex: item.id === selectedId ? 99 : 10,
        callout: {
          content: item.name,
          color: item.id === selectedId ? '#51653e' : '#5a4632',
          fontSize: 12,
          bgColor: item.id === selectedId ? '#f5f9ee' : '#fffef8',
          borderRadius: 999,
          padding: 8,
          display: item.id === selectedId ? 'ALWAYS' : 'BYCLICK'
        }
      })
    }

    if (location) {
      markers.push({
        id: 100000,
        latitude: location.latitude,
        longitude: location.longitude,
        iconPath: USER_MARKER_ICON,
        width: 20,
        height: 26,
        anchor: {
          x: 0.5,
          y: 0.92
        },
        zIndex: 88
      })
    }

    return markers
  },

  buildRangeCircles: function (center, radius) {
    if (!center || !center.latitude || !center.longitude) {
      return []
    }
    return [
      {
        latitude: center.latitude,
        longitude: center.longitude,
        radius: Number(radius || 10000),
        color: 'rgba(177,194,158,0.18)',
        fillColor: 'rgba(177,194,158,0.10)',
        strokeWidth: 2
      }
    ]
  },

  buildRoutePolyline: function (center, selectedHospital) {
    if (!center || !selectedHospital) {
      return []
    }
    return [
      {
        points: [
          {
            latitude: center.latitude,
            longitude: center.longitude
          },
          {
            latitude: selectedHospital.latitude,
            longitude: selectedHospital.longitude
          }
        ],
        color: '#96AC7A',
        width: 4,
        dottedLine: true
      }
    ]
  },

  handleLoadError: function (err) {
    var fallbackList
    var location = this.data.currentLocation || this.data.mapCenter
    var searchKeyword = (this.data.keyword || '').trim()
    var city = inferCityByLocation(location) || resolveQueryCity(this.data.selectedCity, this.data.locationCity)
    var district = this.data.selectedDistrict
    var errorMessage = err && err.message ? String(err.message) : '地图服务请求失败'
    console.error('consult page load failed:', err)
    this.setData({
      selectedCity: city,
      displayCity: city,
      locationCity: city
    })
    fallbackList = buildFallbackHospitals(location, city, district)
    fallbackList = this.filterHospitalsByKeyword(fallbackList, searchKeyword)
    if (fallbackList.length) {
      this.consumeHospitalList(fallbackList, '地图服务异常（' + errorMessage + '），已展示附近示例医院')
      wx.showToast({
        title: '已切换示例数据',
        icon: 'none'
      })
      return
    }
    this.setData({
      loading: false,
      loadFailed: true,
      statusText: '加载失败，请检查地图 KEY 或网络后重试'
    })
    wx.showToast({
      title: '加载失败，请重试',
      icon: 'none'
    })
  },

  handleKeywordInput: function (e) {
    this.setData({
      keyword: e.detail.value
    })
  },

  handleKeywordConfirm: function () {
    this.reloadHospitals()
  },

  handleKeywordSearch: function () {
    this.reloadHospitals()
  },

  handleRegionChange: function (e) {
    var value = e.detail.value || []
    var nextCity = value[1] || resolveQueryCity(this.data.selectedCity, this.data.locationCity)
    var nextDistrict = normalizeDistrictText(value[2])
    this.setData({
      regionValue: value,
      selectedCity: nextCity,
      displayCity: nextCity,
      selectedDistrict: nextDistrict,
      districtIndex: 0,
      isManualRegionMode: true
    })
    this.queryHospitalsByRegion()
  },

  handleDistrictChange: function (e) {
    var index = Number(e.detail.value || 0)
    var district = this.data.districtOptions[index] || DISTRICT_ALL_TEXT
    this.setData({
      districtIndex: index,
      selectedDistrict: district
    })
    this.reloadHospitals()
  },

  handleRelocate: function () {
    this.loadByLocation()
  },

  handleRetry: function () {
    this.reloadHospitals()
  },

  handleOpenSetting: function () {
    wx.openSetting({
      success: function () {}
    })
  },

  handleNavigateSelected: function () {
    var hospital = this.data.selectedHospital
    if (!hospital) {
      return
    }
    wx.openLocation({
      latitude: Number(hospital.latitude),
      longitude: Number(hospital.longitude),
      name: hospital.name,
      address: hospital.address || '',
      scale: 16
    })
  },

  handleCallSelected: function () {
    var hospital = this.data.selectedHospital
    var tel
    if (!hospital) {
      return
    }
    tel = String(hospital.tel || '').replace(/\s+/g, '')
    if (!tel) {
      wx.showToast({
        title: '暂无电话信息',
        icon: 'none'
      })
      return
    }
    wx.makePhoneCall({
      phoneNumber: tel,
      fail: function () {
        wx.showToast({
          title: '拨号失败',
          icon: 'none'
        })
      }
    })
  },

  handleMarkerTap: function (e) {
    var markerId = Number(e.detail.markerId)
    var selected
    var list = this.data.filteredHospitals
    if (markerId === 100000) {
      return
    }
    selected = list[markerId - 1]
    if (!selected) {
      return
    }
    this.selectHospital(selected)
  },

  handleHospitalTap: function (e) {
    var id = e.currentTarget.dataset.id
    var list = this.data.filteredHospitals
    var i
    var target = null

    for (i = 0; i < list.length; i += 1) {
      if (list[i].id === id) {
        target = list[i]
        break
      }
    }

    if (!target) {
      return
    }

    this.selectHospital(target)
  },

  handleMapTap: function () {
    var center = this.data.currentLocation || this.data.mapCenter
    var nearestDistance = getNearestDistance(this.data.filteredHospitals)
    this.setData({
      selectedHospital: null,
      selectedHospitalId: '',
      polyline: [],
      circles: this.buildRangeCircles(center, resolveMapRadius(nearestDistance)),
      markers: this.buildMarkers(this.data.filteredHospitals, '')
    })
  },

  selectHospital: function (hospital) {
    if (!hospital) {
      return
    }
    this.setData({
      selectedHospitalId: hospital.id,
      selectedHospital: clone(hospital),
      mapCenter: {
        latitude: hospital.latitude,
        longitude: hospital.longitude
      },
      polyline: this.buildRoutePolyline(this.data.currentLocation || this.data.mapCenter, hospital),
      markers: this.buildMarkers(this.data.filteredHospitals, hospital.id)
    })
  },

  clearFilters: function () {
    var displayCity = inferCityByLocation(this.data.currentLocation) || resolveDisplayCity(this.data.selectedCity, this.data.locationCity)
    this.setData({
      keyword: '',
      selectedCity: displayCity,
      displayCity: displayCity,
      selectedDistrict: DISTRICT_ALL_TEXT,
      districtIndex: 0
    })
    this.reloadHospitals()
  },

  reloadHospitals: function () {
    var useNearby = !!this.data.currentLocation && !this.data.isManualRegionMode
    if (useNearby) {
      this.queryHospitalsByNearby()
      return
    }
    this.queryHospitalsByRegion()
  }
})

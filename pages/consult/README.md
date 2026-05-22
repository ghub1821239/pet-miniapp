# 问诊页接入说明

## 1) 配置腾讯地图 KEY

文件：`pages/consult/index.js`

```js
var MAP_KEY = ''
```

可选两种方式：

1. 直接写在 `MAP_KEY`（本地调试用，不建议提交）。
2. 运行时注入：

```js
wx.setStorageSync('tencentMapKey', '你的KEY')
```

## 2) 配置小程序合法域名

在微信开发者工具里添加 request 合法域名：

- `https://apis.map.qq.com`

否则接口请求会失败并进入示例数据模式。

## 3) 可选地图样式配置

文件：`pages/consult/index.js`

```js
var MAP_LAYER_STYLE = 1
```

也可运行时注入：

```js
wx.setStorageSync('tencentMapLayerStyle', 1)
```

## 4) 当前功能点

- 定位授权后按附近距离检索宠物医院。
- 城市 / 商圈 / 关键词筛选。
- 地图 marker 与下方列表联动。
- 医院详情含评分、营业状态、电话；支持导航与拨号。
- 动态视野分档（500m / 2km / 5km / 10km）及范围圈可视化。
- 接口异常时自动回退示例数据，保证页面可演示。

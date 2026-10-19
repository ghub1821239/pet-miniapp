# Pet Pins 宠物社区小程序

南开大学《算法导论》课程小组项目。我们围绕宠物社区做了一个微信小程序，把帖子聚类、内容推荐和多条件筛选接到实际页面中，同时实现了宠物档案、日历提醒和图片识别等功能。界面中沿用了“萌宠日记”的名称。

这是课程项目的代码与实验原型。推荐部分使用模拟用户行为；账号、图片识别和消息提醒需要配置自己的微信云环境及相关服务。

## 从哪里看起

- **算法实现**：[算法说明](ALGORITHM.md)，以及 [`utils/topicCluster.js`](utils/topicCluster.js)、[`utils/recommend.js`](utils/recommend.js)、[`utils/filterIndex.js`](utils/filterIndex.js)。
- **页面中的调用过程**：[`pages/forum/index.js`](pages/forum/index.js) 的 `runAlgorithmData`，可以看到数据进入聚类、推荐与筛选的过程。
- **账号与数据管理**：[`utils/auth.js`](utils/auth.js)、[`utils/user-storage.js`](utils/user-storage.js)、[`cloudfunctions/auth/index.js`](cloudfunctions/auth/index.js)。
- **图片识别接入**：[`utils/identify-api.js`](utils/identify-api.js)、[`server/`](server/) 和 [`cloudfunctions/recognizePet/`](cloudfunctions/recognizePet/)。

## 算法部分

社区页先读取帖子，再提取文本特征、划分主题，最后结合用户兴趣进行排序。筛选时对不同字段的倒排索引取交集。

| 环节 | 做法 | 代码 |
| --- | --- | --- |
| 文本特征 | 宠物领域关键词与二元切词，按词频和关键词权重生成向量 | [textFeature.js](utils/textFeature.js) |
| 主题聚类 | 使用余弦相似度分配样本、均值更新中心的 KMeans 式迭代；社区页设置 7 个簇、10 轮迭代 | [topicCluster.js](utils/topicCluster.js) |
| 推荐排序 | 综合文本相似度、类别兴趣、热度、时间、宠物偏好和探索项，保留各项得分 | [recommend.js](utils/recommend.js) |
| 条件筛选 | 为类别、主题、宠物类型、城市等字段建倒排索引，通过集合交集筛选 | [filterIndex.js](utils/filterIndex.js) |

算法模块是普通 JavaScript，可以单独运行，不需要微信账号、云环境或模型 API Key：

```sh
git clone https://github.com/ghub1821239/pet-miniapp.git
cd pet-miniapp
node scripts/demo-algorithm.cjs
```

命令会读取仓库中的 24 条示例帖子，输出主题、推荐前五条，以及“天津的猫咪帖子”筛选结果，并检查结果数量、排序和筛选条件。不需要安装 npm 依赖。

## 小程序包含的功能

| 模块 | 主要内容 | 运行条件 |
| --- | --- | --- |
| 社区 | 发帖、浏览、搜索、点赞收藏、聚类与推荐 | 社区页优先读取云端帖子，失败或为空时使用本地示例数据；进入小程序仍需要登录 |
| 账号与档案 | 注册登录、个人资料、宠物档案 | 微信云开发、`auth` 云函数及数据库 |
| 日历提醒 | 日程记录、提醒管理、订阅消息 | 云函数、订阅消息模板及用户授权 |
| 图片识别 | 上传宠物图片，调用视觉模型返回品种和描述 | 识别服务或云函数，以及模型服务商的 API Key |
| 附近医院 | 地图检索、列表与标记联动 | 腾讯地图 Key；接口异常时会显示示例数据 |

## 在微信开发者工具中运行

1. 导入仓库根目录，将 `project.config.json` 中的 AppID 改为自己的小程序 AppID。项目采用原生 JavaScript、WXML、WXSS，云函数目录为 `cloudfunctions/`。
2. 开通自己的云开发环境，修改 `app.js` 中的环境 ID。图片识别还用到 `utils/identify-api.js` 中的环境 ID、云托管服务名和 HTTP 地址，需要一并替换。
3. 若先联调登录与社区，创建 `users`、`counters`、`posts` 集合，并上传部署 `auth` 云函数，安装其依赖。数据库权限需按自己的应用配置。
4. 编译后从登录页注册、登录，再进入社区。示例帖子和图片的准备方式见 [数据导入说明](cloud-import/README.md)。

其余功能可按需配置：

- **图片识别**：见 [识别服务说明](server/README.md)。模型密钥放在服务端环境变量中。
- **日历提醒**：部署 `saveReminder`、`sendDueReminders`，创建 `reminderList` 集合；替换 `utils/subscribeConfig.js` 中的模板 ID，并核对发送函数的模板字段。`sendDueReminders/config.json` 包含定时触发配置。
- **附近医院**：见 [地图接入说明](pages/consult/README.md)。
- **帖子推广**：代码保留了推广订单和兑换码流程，涉及 `promotion` 云函数及 `promotionOrders`、`promotionCodes` 集合；当前实现不能视为已经接通真实支付。

仓库保留了课程开发时的 AppID、环境 ID 和部分云图片地址。这些值只是原环境的配置，克隆后需要替换；仓库不提供可直接使用的公共账号或云服务。

## 目录

```text
pages/           小程序页面
components/      公共组件
utils/           算法、接口封装与本地状态管理
data/            示例帖子
cloudfunctions/  账号、识别、提醒和推广云函数
server/          Node.js 图片识别服务
cloud-import/    示例帖子导入文件
assets/          图标和本地图片
scripts/         可独立运行的算法演示
```

## 当前实现的范围

推荐画像仍由代码中的模拟行为构建，未做真实用户推荐效果评测。聚类初始中心固定，时间衰减也采用固定的演示时间；同城排序按城市匹配，并非真实距离计算。算法演示用于理解实现过程，不代表线上性能或推荐质量。

页面中既有云端数据，也有演示数据和本地缓存。完整运行需要自行配置外部服务；仅运行算法演示不会访问云端。界面设计过程另保留在 [DESIGN.md](DESIGN.md)，其中的设计设想不等同于已完成的功能。

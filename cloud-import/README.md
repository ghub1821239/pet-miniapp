# 云数据库批量导入说明

## 1. 上传图片到云存储

在微信开发者工具的云开发控制台中进入：

```text
存储 > posts
```

如果没有 `posts` 文件夹，先创建一个。

然后把下面目录里的 7 张原始帖子图片全部上传到 `posts` 文件夹：

```text
D:\算法\微信小程序图片\帖子图片
```

图片文件名保持原样，不需要重命名。

## 2. 导入帖子数据

进入：

```text
数据库 > posts
```

如果原来只有测试数据，可以先删除测试记录，避免重复。

然后使用导入功能导入：

```text
cloud-import/posts-import.json
```

如果控制台要求 JSON Lines 格式，则改用：

```text
cloud-import/posts-import.jsonl
```

## 3. 文件说明

- `image-file-map.json`：图片文件名与云存储 fileID 的对应关系。
- `posts-import.json`：数组格式的 24 条帖子数据。
- `posts-import.jsonl`：一行一条记录的 24 条帖子数据。

本次导入数据中的图片地址使用你的云环境：

```text
cloud1-d1gr7sg6s8ba1f7b5
```

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const reminder = event.reminder || {}

  if (!reminder.title && !reminder.content) {
    return {
      success: false,
      message: '提醒内容不能为空'
    }
  }

  if (!reminder.remindAt) {
    return {
      success: false,
      message: '提醒时间不能为空'
    }
  }

  const now = Date.now()
  const cloudId = reminder._id || reminder.cloudId || ''
  const data = Object.assign({}, reminder, {
    openid,
    content: reminder.content || reminder.title,
    status: reminder.status || 'pending',
    updatedAt: now
  })

  delete data._id
  delete data.cloudId

  if (cloudId) {
    await db.collection('reminderList').doc(cloudId).update({
      data
    })

    return {
      success: true,
      id: cloudId,
      updated: true
    }
  }

  data.createdAt = reminder.createdAt || now

  const result = await db.collection('reminderList').add({
    data
  })

  return {
    success: true,
    id: result._id
  }
}

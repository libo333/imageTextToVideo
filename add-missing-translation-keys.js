const fs = require('fs');
const path = require('path');

const missingTranslations = {
  'zh-CN': {
    'messages.uploadError': '❌ 图片上传失败',
    'messages.uploadSuccess': '✅ 图片上传成功',
    'messages.taskCreated': '✅ 任务已创建，请稍候...',
    'messages.taskError': '❌ 任务创建失败',
    'messages.operationFailed': '❌ 操作失败',
    'messages.statusError': '❌ 获取状态失败',
    'messages.t2vError': '❌ 生成视频失败',
    'prompt.cogvideo.default': '一个人在跑步'
  },
  'zh-TW': {
    'messages.uploadError': '❌ 圖片上傳失敗',
    'messages.uploadSuccess': '✅ 圖片上傳成功',
    'messages.taskCreated': '✅ 任務已建立，請稍侯...',
    'messages.taskError': '❌ 任務建立失敗',
    'messages.operationFailed': '❌ 操作失敗',
    'messages.statusError': '❌ 取得狀態失敗',
    'messages.t2vError': '❌ 生成影片失敗',
    'prompt.cogvideo.default': '一個人在跑步'
  },
  'en-US': {
    'messages.uploadError': '❌ Image upload failed',
    'messages.uploadSuccess': '✅ Image uploaded successfully',
    'messages.taskCreated': '✅ Task created, please wait...',
    'messages.taskError': '❌ Failed to create task',
    'messages.operationFailed': '❌ Operation failed',
    'messages.statusError': '❌ Failed to get status',
    'messages.t2vError': '❌ Failed to generate video',
    'prompt.cogvideo.default': 'A person is running'
  },
  'ja-JP': {
    'messages.uploadError': '❌ 画像のアップロードに失敗しました',
    'messages.uploadSuccess': '✅ 画像が正常にアップロードされました',
    'messages.taskCreated': '✅ タスクが作成されました、お待ちください...',
    'messages.taskError': '❌ タスク作成に失敗しました',
    'messages.operationFailed': '❌ 操作に失敗しました',
    'messages.statusError': '❌ ステータスの取得に失敗しました',
    'messages.t2vError': '❌ ビデオの生成に失敗しました',
    'prompt.cogvideo.default': '走っている人'
  }
};

const i18nDir = path.join(__dirname, 'webapp', 'i18n');

Object.entries(missingTranslations).forEach(([lang, newKeys]) => {
  const filePath = path.join(i18nDir, `${lang}.json`);
  
  // 読み込み
  let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // 各キーを追加
  Object.entries(newKeys).forEach(([key, value]) => {
    const keys = key.split('.');
    let current = data;
    
    // 最後の1つ前まで辿る
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    // 最後のキーに値を設定
    current[keys[keys.length - 1]] = value;
  });
  
  // 書き込み
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ ${lang}.json に ${Object.keys(newKeys).length} 個のキーを追加しました`);
});

console.log('\n✨ すべての欠落しているキーを追加しました！');

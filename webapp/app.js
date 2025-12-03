// 初始化 Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // 全屏显示
tg.enableClosingConfirmation(); // 关闭前确认

// 全局工具函数：显示提示信息
function showMessage(messageKey, params = {}) {
    // 支持直接传入翻译 key 或旧的直接文本
    let message = messageKey;
    
    // 如果看起来像翻译 key（包含点号），则尝试翻译
    if (typeof messageKey === 'string' && messageKey.includes('.') && typeof i18n !== 'undefined') {
        message = i18n.t(messageKey, params);
    } else if (typeof messageKey === 'string' && typeof i18n !== 'undefined') {
        // 尝试作为消息 key 翻译
        const translated = i18n.t(`messages.${messageKey}`, params);
        if (translated !== `messages.${messageKey}`) {
            message = translated;
        }
    }
    
    // 尝试使用 Telegram 的 showPopup，如果不支持则使用 alert
    if (tg.showPopup && typeof tg.showPopup === 'function') {
        tg.showPopup({
            title: i18n ? i18n.t('messages.error') : '提示',
            message: message,
            buttons: [{ type: 'ok' }]
        });
    } else if (tg.showAlert && typeof tg.showAlert === 'function') {
        tg.showAlert(message);
    } else {
        // 降级到原生 alert
        alert(message);
    }
}

// 全局状态
let uploadedImage = null;
let selectedTemplate = null;
let selectedEngine = 'svd';  // 默认使用 SVD 引擎
let motionBucketId = 100;     // SVD 运动幅度参数
let cogvideoPrompt = '';      // CogVideoX 提示词

// DOM 元素
const uploadBox = document.getElementById('uploadBox');
const imageUpload = document.getElementById('imageUpload');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImage = document.getElementById('removeImage');
const generateBtn = document.getElementById('generateBtn');
const promptInput = document.getElementById('promptInput');
const charCount = document.getElementById('charCount');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const statusText = document.getElementById('statusText');
const progressPercent = document.getElementById('progressPercent');

// 获取 API 基础 URL（从当前页面 URL 推断）
const API_BASE_URL = window.location.origin;

// 检测是否在 Telegram 内打开（用于开发模式）
const isInTelegram = window.Telegram?.WebApp?.initData && window.Telegram.WebApp.initData.length > 0;

// 开发模式：如果不在 Telegram 内，使用 /dev/api 路由
const API_PREFIX = isInTelegram ? '/api' : '/dev/api';

// ==================== 图片上传 ====================

// 点击上传区域触发文件选择
uploadBox.addEventListener('click', () => {
    if (!imagePreview.style.display || imagePreview.style.display === 'none') {
        imageUpload.click();
    }
});

// 文件选择处理
imageUpload.addEventListener('change', handleFileSelect);

// 拖拽上传
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        showMessage('upload.error.type');
        return;
    }

    // 验证文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
        showMessage('upload.error.size');
        return;
    }

    uploadedImage = file;

    // 预览图片
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        uploadPlaceholder.style.display = 'none';
        imagePreview.style.display = 'block';
        checkFormValid();
    };
    reader.readAsDataURL(file);
}

// 删除图片
removeImage.addEventListener('click', (e) => {
    e.stopPropagation();
    uploadedImage = null;
    previewImg.src = '';
    uploadPlaceholder.style.display = 'block';
    imagePreview.style.display = 'none';
    imageUpload.value = '';
    checkFormValid();
});

// ==================== 模板选择 ====================

document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const template = e.target.dataset.template;

        // 如果点击已选中的模板，则取消选择
        if (selectedTemplate === template) {
            selectedTemplate = null;
            e.target.classList.remove('active');
        } else {
            // 取消其他模板的选择
            document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
            selectedTemplate = template;
            e.target.classList.add('active');
        }
    });
});

// ==================== 引擎选择 ====================

// 引擎选择事件监听
document.querySelectorAll('.engine-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const engine = e.currentTarget.dataset.engine;

        // 取消其他引擎的选择
        document.querySelectorAll('.engine-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        selectedEngine = engine;
        toggleEngineParams(engine);

        // 切换引擎时重新检查表单验证
        checkFormValid();
    });
});

// SVD 运动幅度滑块
const motionBucketSlider = document.getElementById('motionBucket');
const motionBucketValueSpan = document.getElementById('motionBucketValue');

if (motionBucketSlider) {
    motionBucketSlider.addEventListener('input', (e) => {
        motionBucketId = parseInt(e.target.value);
        motionBucketValueSpan.textContent = motionBucketId;
    });
}

// 切换引擎参数显示
function toggleEngineParams(engine) {
    const svdParams = document.getElementById('svdParams');
    const motionEffects = document.getElementById('motionEffects');
    const cogvideoPromptSection = document.getElementById('cogvideoPromptSection');
    const normalPromptSection = document.querySelector('.section:has(#promptInput)');

    if (engine === 'svd') {
        svdParams.style.display = 'block';
        motionEffects.style.display = 'none';
        if (cogvideoPromptSection) cogvideoPromptSection.style.display = 'none';
        if (normalPromptSection) normalPromptSection.style.display = 'block';
        // SVD 不需要选择运动效果，清除选择
        selectedTemplate = null;
        document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
    } else if (engine === 'animatediff') {
        svdParams.style.display = 'none';
        motionEffects.style.display = 'block';
        if (cogvideoPromptSection) cogvideoPromptSection.style.display = 'none';
        if (normalPromptSection) normalPromptSection.style.display = 'block';
    } else if (engine === 'cogvideo') {
        svdParams.style.display = 'none';
        motionEffects.style.display = 'none';
        if (cogvideoPromptSection) cogvideoPromptSection.style.display = 'block';
        if (normalPromptSection) normalPromptSection.style.display = 'none';
        // CogVideoX 不需要选择运动效果，清除选择
        selectedTemplate = null;
        document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
    }
}

// ==================== 提示词字符计数 ====================

promptInput.addEventListener('input', (e) => {
    const length = e.target.value.length;
    charCount.textContent = length;

    // 550字符硬性限制，提供分层提示
    if (length > 450) {
        charCount.style.color = 'var(--danger-color)'; // 接近上限
    } else if (length > 300) {
        charCount.style.color = 'orange'; // 警告色
    } else {
        charCount.style.color = 'var(--tg-theme-hint-color)';
    }

    // 检查表单是否可以提交
    checkFormValid();
});

// CogVideoX 提示词字符计数
const cogvideoPromptInput = document.getElementById('cogvideoPromptInput');
const cogvideoCharCount = document.getElementById('cogvideoCharCount');

if (cogvideoPromptInput && cogvideoCharCount) {
    cogvideoPromptInput.addEventListener('input', (e) => {
        const length = e.target.value.length;
        cogvideoCharCount.textContent = length;
        cogvideoPrompt = e.target.value;

        // 设置合理的提示词长度限制 (550字符)
        if (length > 550) {
            cogvideoCharCount.style.color = 'var(--danger-color)';
        } else if (length > 400) {
            cogvideoCharCount.style.color = 'orange'; // 警告色
        } else {
            cogvideoCharCount.style.color = 'var(--tg-theme-hint-color)';
        }

        // 检查表单是否可以提交
        checkFormValid();
    });
}

// ==================== 表单验证 ====================

function checkFormValid() {
    // 如果有图片,或者有对应引擎的提示词,就可以生成视频
    const hasImage = uploadedImage !== null;

    // 根据选择的引擎检查对应的提示词输入框
    let hasPrompt = false;
    if (selectedEngine === 'cogvideo') {
        // CogVideoX: 检查专用提示词输入框
        hasPrompt = cogvideoPromptInput && cogvideoPromptInput.value.trim().length > 0;
    } else {
        // SVD/AnimateDiff: 检查通用提示词输入框
        hasPrompt = promptInput && promptInput.value.trim().length > 0;
    }

    // CogVideoX支持T2V（纯文字转视频）和I2V（图片转视频）
    // 其他引擎只支持I2V
    if (selectedEngine === 'cogvideo') {
        // CogVideoX: 有图片或有提示词都可以生成
        generateBtn.disabled = !(hasImage || hasPrompt);
    } else {
        // 其他引擎: 必须有图片
        generateBtn.disabled = !hasImage;
    }

    console.log('Form validation:', {
        selectedEngine,
        hasImage,
        hasPrompt,
        normalPrompt: promptInput ? promptInput.value.trim().length : 0,
        cogvideoPrompt: cogvideoPromptInput ? cogvideoPromptInput.value.trim().length : 0,
        disabled: generateBtn.disabled,
        mode: hasImage ? 'I2V' : (hasPrompt ? 'T2V' : 'none')
    });
}

// ==================== 生成视频 ====================

generateBtn.addEventListener('click', async () => {
    const hasImage = uploadedImage !== null;

    // 获取提示词 - 严格根据选择的引擎对应特定的输入框
    let prompt = '';
    if (selectedEngine === 'cogvideo') {
        // CogVideoX: 只从专用的CogVideoX提示词输入框获取
        prompt = cogvideoPrompt || (cogvideoPromptInput ? cogvideoPromptInput.value.trim() : '');
    } else {
        // SVD/AnimateDiff: 只从通用的"视频效果描述"输入框获取
        prompt = promptInput ? promptInput.value.trim() : '';
    }

    console.log('Debug - prompt extraction:', {
        selectedEngine,
        hasImage,
        normalPrompt: promptInput ? promptInput.value.trim() : '',
        cogvideoPrompt: cogvideoPrompt || (cogvideoPromptInput ? cogvideoPromptInput.value.trim() : ''),
        finalPrompt: prompt,
        source: selectedEngine === 'cogvideo' ? 'cogvideo input box' : 'normal input box'
    });

    // 判断生成模式
    let mode = 'i2v';  // 默认图片转视频

    // CogVideoX支持T2V（纯文字转视频）
    if (!hasImage && selectedEngine === 'cogvideo') {
        if (prompt.length > 0) {
            mode = 't2v';  // 纯文字转视频模式
        } else {
            showMessage('selectImage');
            return;
        }
    } else if (!hasImage) {
        // 其他引擎不支持T2V
        showMessage('selectImage');
        return;
    }

    let actualEngine = selectedEngine;
    const modelToUse = actualEngine;

    console.log('Generation mode:', mode, 'Selected:', selectedEngine, 'Actual:', actualEngine, 'Model:', modelToUse, 'Prompt:', prompt);

    try {
        if (mode === 't2v') {
            // T2V模式 - 纯文字转视频（仅CogVideoX支持）
            showProgress(i18n.t('progress.t2v'), 10);
            await generateWithCogVideoT2V(prompt);
        } else {
            // I2V模式 - 图片转视频
            showProgress(i18n.t('progress.uploading'), 10);

            if (actualEngine === 'svd') {
                await generateWithSVD(prompt);
            } else if (actualEngine === 'animatediff') {
                await generateWithAnimateDiff(prompt);
            } else if (actualEngine === 'cogvideo') {
                await generateWithCogVideo();
            }
        }
    } catch (error) {
        console.error('Video generation error:', error);
        hideProgress();
        showMessage(`${i18n.t('messages.operationFailed')}：${error.message}`);
    }
});

// SVD 引擎生成视频
async function generateWithSVD(prompt) {
    // 1. 上传图片
    const formData = new FormData();
    formData.append('image', uploadedImage);
    formData.append('userId', tg.initDataUnsafe?.user?.id || 'unknown');

    const uploadResponse = await fetch(`${API_BASE_URL}${API_PREFIX}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Telegram-Init-Data': tg.initData
        }
    });

    if (!uploadResponse.ok) {
        throw new Error(i18n.t('messages.uploadError'));
    }

    const { imageId } = await uploadResponse.json();
    updateProgress(i18n.t('messages.uploadSuccess'), 30);

    // 2. 创建视频生成任务（使用 SVD）
    const taskResponse = await fetch(`${API_BASE_URL}${API_PREFIX}/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': tg.initData
        },
        body: JSON.stringify({
            imageId,
            model: 'comfyui-svd',  // 使用 SVD 模型
            motionBucketId: motionBucketId,  // SVD 运动幅度
            prompt: prompt || undefined,
            userId: tg.initDataUnsafe?.user?.id || 'unknown'
        })
    });

    if (!taskResponse.ok) {
        throw new Error(i18n.t('messages.taskError'));
    }

    const { taskId } = await taskResponse.json();
    updateProgress(i18n.t('messages.taskCreated'), 40);

    // 3. 轮询任务状态
    pollTaskStatus(taskId);
}

// AnimateDiff 引擎生成视频
async function generateWithAnimateDiff(prompt) {
    const motionType = selectedTemplate || 'zoom-in'; // 默认放大效果

    // 1. 上传图片
    const formData = new FormData();
    formData.append('image', uploadedImage);
    formData.append('userId', tg.initDataUnsafe?.user?.id || 'unknown');

    const uploadResponse = await fetch(`${API_BASE_URL}${API_PREFIX}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Telegram-Init-Data': tg.initData
        }
    });

    if (!uploadResponse.ok) {
        throw new Error(i18n.t('messages.uploadError'));
    }

    const { imageId } = await uploadResponse.json();
    updateProgress(i18n.t('messages.uploadSuccess'), 30);

    // 2. 创建视频生成任务（使用 AnimateDiff）
    const taskResponse = await fetch(`${API_BASE_URL}${API_PREFIX}/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': tg.initData
        },
        body: JSON.stringify({
            imageId,
            model: 'comfyui-animatediff',
            motionType: motionType,  // AnimateDiff 使用 motionType
            prompt: prompt || undefined,
            userId: tg.initDataUnsafe?.user?.id || 'unknown'
        })
    });

    if (!taskResponse.ok) {
        throw new Error(i18n.t('messages.taskError'));
    }

    const { taskId } = await taskResponse.json();
    updateProgress(i18n.t('messages.taskCreated'), 40);

    // 3. 轮询任务状态
    pollTaskStatus(taskId);
}

// CogVideoX 引擎生成视频
async function generateWithCogVideo() {
    // 获取 CogVideoX 提示词
    const prompt = cogvideoPrompt || i18n.t('prompt.cogvideo.default') || '高质量视频，流畅动作，清晰细节';

    // 1. 上传图片
    const formData = new FormData();
    formData.append('image', uploadedImage);
    formData.append('userId', tg.initDataUnsafe?.user?.id || 'unknown');

    const uploadResponse = await fetch(`${API_BASE_URL}${API_PREFIX}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Telegram-Init-Data': tg.initData
        }
    });

    if (!uploadResponse.ok) {
        throw new Error(i18n.t('messages.uploadError'));
    }

    const { imageId } = await uploadResponse.json();
    updateProgress(i18n.t('messages.uploadSuccess'), 30);

    // 2. 创建视频生成任务（使用 CogVideoX）
    const taskResponse = await fetch(`${API_BASE_URL}${API_PREFIX}/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': tg.initData
        },
        body: JSON.stringify({
            imageId,
            model: 'comfyui-cogvideo',  // 使用 CogVideoX 模型
            prompt: prompt,  // CogVideoX 提示词
            userId: tg.initDataUnsafe?.user?.id || 'unknown'
        })
    });

    if (!taskResponse.ok) {
        throw new Error(i18n.t('messages.taskError'));
    }

    const { taskId } = await taskResponse.json();
    updateProgress(i18n.t('progress.cogvideo'), 40);

    // 3. 轮询任务状态（CogVideoX 需要更长时间）
    pollTaskStatus(taskId, 120); // 最多查询 120 次（20 分钟）
}

// CogVideoX 文字转视频引擎生成视频
async function generateWithCogVideoT2V(prompt) {
    console.log('Starting T2V generation with CogVideoX:', { prompt });

    const requestBody = {
        model: 'comfyui-cogvideo-t2v',  // 使用特殊的 T2V 模式
        mode: 't2v',
        prompt: prompt,
        userId: tg.initDataUnsafe?.user?.id || 'unknown'
    };

    console.log('Request body for CogVideoX T2V:', requestBody);
    console.log('Request URL:', `${API_BASE_URL}${API_PREFIX}/generate`);

    // 1. 创建文字转视频任务（使用 CogVideoX 的 T2V 模式）
    const taskResponse = await fetch(`${API_BASE_URL}${API_PREFIX}/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': tg.initData
        },
        body: JSON.stringify(requestBody)
    });

    console.log('Response status:', taskResponse.status);
    console.log('Response headers:', [...taskResponse.headers.entries()]);

    if (!taskResponse.ok) {
        const errorText = await taskResponse.text();
        console.error('Response error text:', errorText);

        try {
            const errorJson = JSON.parse(errorText);
            console.error('Response error JSON:', errorJson);
            throw new Error(errorJson.error || 'CogVideoX 文字转视频任务创建失败');
        } catch (e) {
            throw new Error(`CogVideoX 文字转视频任务创建失败 (${taskResponse.status}): ${errorText}`);
        }
    }

    const response = await taskResponse.json();
    console.log('Successful response:', response);

    const { taskId } = response;
    updateProgress('CogVideoX 文字转视频任务已创建，正在生成视频...（预计5-10分钟）', 40);

    // 2. 轮询任务状态
    pollTaskStatus(taskId, 120); // 最多查询 120 次（20 分钟）
}

// EasyAnimate 文字转视频引擎生成视频
async function generateWithEasyAnimateT2V(prompt) {
    console.log('Starting T2V generation with EasyAnimate:', { prompt });

    // 1. 创建文字转视频任务
    const taskResponse = await fetch(`${API_BASE_URL}${API_PREFIX}/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': tg.initData
        },
        body: JSON.stringify({
            model: 'easyanimate-t2v',
            mode: 't2v',
            prompt: prompt,
            userId: tg.initDataUnsafe?.user?.id || 'unknown'
        })
    });

    if (!taskResponse.ok) {
        throw new Error(i18n.t('messages.t2vError'));
    }

    const { taskId } = await taskResponse.json();
    updateProgress(i18n.t('progress.easyanimate'), 40);

    // 2. 轮询任务状态
    pollTaskStatus(taskId, 120); // 最多查询 120 次（20 分钟）
}

// 轮询任务状态
async function pollTaskStatus(taskId, maxAttempts = 60) {
    const maxAttemptsToUse = maxAttempts; // 最多查询指定次数
    let attempts = 0;

    const poll = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}${API_PREFIX}/task/${taskId}`, {
                headers: {
                    'X-Telegram-Init-Data': tg.initData
                }
            });

            if (!response.ok) {
                throw new Error(i18n.t('messages.statusError'));
            }

            const data = await response.json();

            switch (data.status) {
                case 'PENDING':
                    updateProgress(i18n.t('progress.queue'), 50);
                    break;
                case 'RUNNING':
                    const progress = 50 + (data.progress || 0) * 0.4;
                    updateProgress(i18n.t('progress.generating'), progress);
                    break;
                case 'SUCCEEDED':
                    updateProgress(i18n.t('progress.completed'), 100);
                    setTimeout(() => {
                        hideProgress();
                        // 显示下载按钮，传递视频URL和文件名
                        showDownloadButton(taskId, data.videoUrl, data.filename);
                    }, 1000);
                    return;
                case 'FAILED':
                    hideProgress();
                    showMessage(`${i18n.t('progress.failed')}：${data.error || i18n.t('messages.error')}`);
                    return;
            }

            // 继续轮询
            attempts++;
            if (attempts < maxAttemptsToUse) {
                setTimeout(poll, 10000); // 每 10 秒查询一次
            } else {
                hideProgress();
                showMessage('messages.timeout');
            }

        } catch (error) {
            console.error('Poll error:', error);
            hideProgress();
            showMessage('messages.error');
        }
    };

    poll();
}

// ==================== 进度条控制 ====================

function showProgress(message, percent) {
    progressSection.style.display = 'block';
    updateProgress(message, percent);

    // 创建全屏遮罩层
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 20px;
        `;
        document.body.appendChild(overlay);
    }

    // 将进度条移到遮罩层中
    overlay.innerHTML = '';
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    `;

    progressContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="
                width: 60px;
                height: 60px;
                margin: 0 auto 15px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 20px;">${message}</h3>
            <p style="margin: 0; color: #666; font-size: 24px; font-weight: bold;">${Math.round(percent)}%</p>
        </div>
        <div style="
            width: 100%;
            height: 8px;
            background: #f0f0f0;
            border-radius: 4px;
            overflow: hidden;
        ">
            <div id="overlayProgressBar" style="
                width: ${percent}%;
                height: 100%;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                transition: width 0.3s ease;
            "></div>
        </div>
    `;

    overlay.appendChild(progressContainer);

    // 添加旋转动画
    if (!document.getElementById('spinAnimation')) {
        const style = document.createElement('style');
        style.id = 'spinAnimation';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // 禁用页面滚动
    document.body.style.overflow = 'hidden';
}

function updateProgress(message, percent) {
    // 更新遮罩层中的进度
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        const h3 = overlay.querySelector('h3');
        const p = overlay.querySelector('p');
        const progressBar = overlay.querySelector('#overlayProgressBar');

        if (h3) h3.textContent = message;
        if (p) p.textContent = `${Math.round(percent)}%`;
        if (progressBar) progressBar.style.width = `${percent}%`;
    }

    // 同时更新原来的进度条（如果还在使用）
    statusText.textContent = message;
    progressPercent.textContent = `${Math.round(percent)}%`;
    progressFill.style.width = `${percent}%`;
}

function hideProgress() {
    // 移除遮罩层
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }

    // 恢复页面滚动
    document.body.style.overflow = '';

    // 隐藏原来的进度条
    progressSection.style.display = 'none';
    progressFill.style.width = '0%';
}

// 显示下载按钮
function showDownloadButton(taskId, videoUrl, filename) {
    // 使用本地的下载代理接口（会自动设置下载响应头）
    const downloadUrl = `${API_BASE_URL}${API_PREFIX}/download/${taskId}`;
    const downloadFilename = filename || `${taskId}.mp4`;

    // 移除旧的下载区域（如果存在）
    const oldDownloadSection = document.getElementById('downloadSection');
    if (oldDownloadSection) {
        oldDownloadSection.remove();
    }

    // 创建下载按钮容器
    const downloadSection = document.createElement('div');
    downloadSection.id = 'downloadSection';
    downloadSection.style.cssText = `
        margin-top: 20px;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;

    downloadSection.innerHTML = i18n.translateHTML(`
        <div style="color: white; margin-bottom: 15px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-bottom: 10px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 style="margin: 0 0 10px 0; font-size: 20px;" data-i18n="download.success">视频生成成功！</h3>
            <p style="margin: 0 0 5px 0; opacity: 0.9;" data-i18n="download.hint">点击下方按钮，视频将在新窗口中打开，您可以长按视频保存</p>
            <div id="countdown" style="
                margin-top: 10px;
                padding: 8px 15px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                font-size: 14px;
                display: inline-block;
            ">
                <span data-i18n="download.countdown">⏰ 视频将在</span> <span id="countdownTime" style="font-weight: bold; font-size: 16px;">5:00</span> <span data-i18n="download.countdownEnd">后自动清除</span>
            </div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button id="downloadLinkBtn" data-url="${downloadUrl}" data-taskid="${taskId}" style="
                display: inline-block;
                padding: 12px 30px;
                background: white;
                color: #667eea;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                border: none;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" data-i18n="download.button">
                📥 下载视频
            </button>
            <button id="resetBtn" style="
                padding: 12px 30px;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 2px solid white;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'" data-i18n="download.continue">
                🎬 继续创作
            </button>
        </div>
    `);

    // 插入到创作工具标签页的底部（生成按钮上方）
    const creationTab = document.getElementById('creationTab');
    const actionSection = document.querySelector('.action-section');

    // 插入到action-section之前（生成按钮上方）
    if (actionSection && creationTab) {
        creationTab.insertBefore(downloadSection, actionSection);
    } else if (creationTab) {
        creationTab.appendChild(downloadSection);
    } else {
        // Fallback: 插入到进度条后面
        progressSection.parentNode.insertBefore(downloadSection, progressSection.nextSibling);
    }

    // 绑定下载按钮事件
    const downloadBtn = document.getElementById('downloadLinkBtn');
    downloadBtn.addEventListener('click', function() {
        const videoUrl = this.dataset.url;
        const downloadFilename = filename || `${taskId}.mp4`;

        if (isInTelegram) {
            // 在 Telegram 中，打开新窗口查看视频
            tg.openLink(videoUrl, { try_instant_view: false });
        } else {
            // Web 模式：创建临时下载链接
            const a = document.createElement('a');
            a.href = videoUrl;
            a.download = downloadFilename;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });

    // 绑定重置按钮事件
    document.getElementById('resetBtn').addEventListener('click', resetForm);

    // 启动倒计时（5 分钟 = 300 秒）
    startCountdown(300, taskId);

    console.log('Download button shown for task:', taskId);
}

// 倒计时功能
let countdownInterval = null;
function startCountdown(totalSeconds, taskId) {
    // 清除之前的倒计时
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    let remainingSeconds = totalSeconds;
    const countdownTimeElement = document.getElementById('countdownTime');
    const countdownElement = document.getElementById('countdown');
    const downloadBtn = document.getElementById('downloadLinkBtn');

    const updateCountdown = () => {
        if (remainingSeconds <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;

            // 倒计时结束 - 调用 API 删除视频
            deleteVideo(taskId);

            // 更新 UI
            countdownElement.style.background = 'rgba(255, 59, 48, 0.3)';
            countdownElement.innerHTML = '❌ 视频已清除，请重新生成';

            // 禁用下载按钮
            if (downloadBtn) {
                downloadBtn.style.opacity = '0.5';
                downloadBtn.style.pointerEvents = 'none';
                downloadBtn.style.cursor = 'not-allowed';
                downloadBtn.disabled = true;
            }

            return;
        }

        // 计算分钟和秒
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        countdownTimeElement.textContent = timeString;

        // 最后 1 分钟改变颜色提示
        if (remainingSeconds <= 60 && remainingSeconds > 30) {
            countdownElement.style.background = 'rgba(255, 204, 0, 0.3)';
        } else if (remainingSeconds <= 30) {
            countdownElement.style.background = 'rgba(255, 59, 48, 0.3)';
        }

        remainingSeconds--;
    };

    // 立即执行一次
    updateCountdown();

    // 每秒更新
    countdownInterval = setInterval(updateCountdown, 1000);
}

// 删除视频文件
async function deleteVideo(taskId) {
    try {
        const response = await fetch(`${API_BASE_URL}${API_PREFIX}/delete/${taskId}`, {
            method: 'DELETE',
            headers: {
                'X-Telegram-Init-Data': tg.initData
            }
        });

        if (response.ok) {
            console.log('Video deleted successfully:', taskId);
        } else {
            console.warn('Failed to delete video:', taskId);
        }
    } catch (error) {
        console.error('Error deleting video:', error);
    }
}

// 重置表单，准备下一次创作
function resetForm() {
    // 0. 清除倒计时
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    // 1. 清除上传的图片
    uploadedImage = null;
    imagePreview.style.display = 'none';
    uploadPlaceholder.style.display = 'flex';
    previewImg.src = '';

    // 2. 清除特效选择
    selectedTemplate = null;
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // 3. 清空提示词
    promptInput.value = '';
    charCount.textContent = '0';

    // 4. 禁用生成按钮（需要重新上传图片）
    generateBtn.disabled = true;
    generateBtn.style.opacity = '0.5';
    generateBtn.style.cursor = 'not-allowed';

    // 5. 移除下载区域
    const downloadSection = document.getElementById('downloadSection');
    if (downloadSection) {
        downloadSection.remove();
    }

    // 6. 隐藏进度条
    hideProgress();

    // 7. 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 注意：保留模型选择，用户可能想用同一个模型生成多个视频

    console.log('Form reset, ready for next creation');
}

// ==================== 初始化 ====================

// 应用 Telegram 主题颜色
if (tg.themeParams) {
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
    document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
}

// 通知 Telegram 页面已准备好
tg.ready();

// 初始化表单验证状态
checkFormValid();

console.log('Telegram Web App initialized:', {
    version: tg.version,
    platform: tg.platform,
    userId: tg.initDataUnsafe?.user?.id
});

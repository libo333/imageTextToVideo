const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { getModelConfig } = require('../model-configs');
const UserManager = require('../user-manager');

const router = express.Router();
const userManager = new UserManager();

// 加载 EasyAnimate API
const ComfyUIEasyAnimateAPI = require('../comfyui-easyanimate-api');
const easyAnimateAPI = new ComfyUIEasyAnimateAPI('http://192.168.20.59:8188');

// 任务存储（生产环境应使用数据库）
const tasks = new Map();

// ComfyUI 配置
const COMFYUI_ANIMATEDIFF_API_URL = process.env.COMFYUI_API_URL || 'http://localhost:3001';
const COMFYUI_SVD_API_URL = process.env.SVD_API_URL || 'http://localhost:3002';
const COMFYUI_COGVIDEO_API_URL = process.env.COGVIDEO_API_URL || 'http://localhost:3003';

/**
 * 创建 EasyAnimate 文字转视频任务
 */
async function createEasyAnimateT2VTask(prompt, options = {}) {
    try {
        console.log('[EasyAnimate T2V] Creating task:', { prompt, options });

        // 调用 EasyAnimate API 生成视频
        const result = await easyAnimateAPI.generateTextToVideo(prompt, options);

        console.log('[EasyAnimate T2V] Task created:', result);

        return {
            taskId: result.taskId,
            status: result.status,
            progress: result.progress
        };

    } catch (error) {
        console.error('[EasyAnimate T2V Error]', error.message);
        throw new Error(`EasyAnimate 文字转视频生成失败: ${error.message}`);
    }
}

/**
 * 创建 ComfyUI AnimateDiff 任务
 */
async function createComfyUIAnimateDiffTask(imagePath, motionType, prompt) {
    try {
        console.log('[ComfyUI AnimateDiff] Creating task:', { imagePath, motionType, prompt });

        // 读取图片并转换为 base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

        console.log('[ComfyUI AnimateDiff] Calling API:', COMFYUI_ANIMATEDIFF_API_URL);

        // 调用 ComfyUI AnimateDiff API
        const response = await axios.post(`${COMFYUI_ANIMATEDIFF_API_URL}/generate-video`, {
            image: base64Image,
            prompt: prompt || 'high quality video, smooth motion, cinematic',
            motionType: motionType || 'zoom-in'
        }, {
            timeout: 600000 // 10 分钟超时
        });

        console.log('[ComfyUI AnimateDiff] API response:', response.data);

        if (!response.data.success) {
            throw new Error(response.data.error || 'ComfyUI AnimateDiff 任务创建失败');
        }

        const videoUrl = response.data.videoUrl;
        const filename = response.data.filename;
        const taskId = `comfyui_animatediff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log('[ComfyUI AnimateDiff] Task created:', { taskId, videoUrl, filename });

        return { taskId, videoUrl, filename };

    } catch (error) {
        console.error('[ComfyUI AnimateDiff Error]', error.message);
        if (error.response) {
            console.error('[ComfyUI AnimateDiff Error Response]', error.response.data);
        }
        throw new Error(`ComfyUI AnimateDiff 生成失败: ${error.message}`);
    }
}

/**
 * 创建 ComfyUI SVD 任务
 */
async function createComfyUISVDTask(imagePath, motionBucketId, prompt) {
    try {
        console.log('[ComfyUI SVD] Creating task:', { imagePath, motionBucketId, prompt });

        console.log('[ComfyUI SVD] Calling API:', COMFYUI_SVD_API_URL);

        // 调用 ComfyUI SVD API - 直接传递文件路径
        const response = await axios.post(`${COMFYUI_SVD_API_URL}/generate-video`, {
            imagePath: imagePath,
            motionBucketId: motionBucketId || 100,
            fps: 6,
            augmentationLevel: 0.0
        }, {
            timeout: 600000 // 10 分钟超时
        });

        console.log('[ComfyUI SVD] API response:', response.data);

        if (!response.data.success) {
            throw new Error(response.data.error || 'ComfyUI SVD 任务创建失败');
        }

        const videoUrl = response.data.videoUrl;
        const filename = response.data.filename;
        const taskId = `comfyui_svd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log('[ComfyUI SVD] Task created:', { taskId, videoUrl, filename });

        return { taskId, videoUrl, filename };

    } catch (error) {
        console.error('[ComfyUI SVD Error]', error.message);
        if (error.response) {
            console.error('[ComfyUI SVD Error Response]', error.response.data);
        }
        throw new Error(`ComfyUI SVD 生成失败: ${error.message}`);
    }
}

/**
 * 创建 ComfyUI CogVideoX 任务
 */
async function createComfyUICogVideoTask(imagePath, prompt) {
    try {
        console.log('[ComfyUI CogVideoX] Creating task:', { imagePath, prompt });

        console.log('[ComfyUI CogVideoX] Calling API:', COMFYUI_COGVIDEO_API_URL);

        // 调用 ComfyUI CogVideoX API - 直接传递文件路径
        const response = await axios.post(`${COMFYUI_COGVIDEO_API_URL}/generate-video`, {
            imagePath: imagePath,
            prompt: prompt || '高质量视频，流畅动作，清晰细节',
            fps: 16,
            numFrames: 80  // 5秒视频（快速版本）
        }, {
            timeout: 1200000 // 20分钟超时（快速版本的合理时间）
        });

        console.log('[ComfyUI CogVideoX] API response:', response.data);

        if (!response.data.success) {
            throw new Error(response.data.error || 'ComfyUI CogVideoX 任务创建失败');
        }

        const videoUrl = response.data.videoUrl;
        const filename = response.data.filename;
        const taskId = `comfyui_cogvideo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log('[ComfyUI CogVideoX] Task created:', { taskId, videoUrl, filename });

        return { taskId, videoUrl, filename };

    } catch (error) {
        console.error('[ComfyUI CogVideoX Error]', error.message);
        if (error.response) {
            console.error('[ComfyUI CogVideoX Error Response]', error.response.data);
        }
        throw new Error(`ComfyUI CogVideoX 生成失败: ${error.message}`);
    }
}

/**
 * POST /api/generate
 * 创建视频生成任务（支持图片转视频和文字转视频）
 */
router.post('/generate', async (req, res) => {
    try {
        const { imageId, model, motionType, prompt, userId, mode = 'i2v' } = req.body;

        console.log(`[Task] Request received:`, {
            imageId,
            model,
            motionType,
            prompt: prompt ? prompt.substring(0, 100) + '...' : 'undefined',
            userId,
            mode,
            promptLength: prompt ? prompt.length : 0
        });

        // 判断是文字转视频还是图片转视频
        const isT2V = mode === 't2v' || model === 'easyanimate-t2v' || model === 'comfyui-cogvideo-t2v';
        console.log(`[Task] T2V check:`, {
            mode,
            model,
            isT2V,
            modeMatch: mode === 't2v',
            easyAnimateMatch: model === 'easyanimate-t2v',
            cogvideoMatch: model === 'comfyui-cogvideo-t2v'
        });

        if (isT2V) {
            console.log(`[Task] Entering T2V mode processing...`);

            // 文字转视频模式
            console.log(`[Task] T2V mode detected:`, { mode, model, prompt: prompt?.substring(0, 100) });

            if (!prompt || prompt.trim().length === 0) {
                console.log(`[Task] T2V prompt validation failed:`, {
                    prompt,
                    promptLength: prompt?.length,
                    trimmedLength: prompt?.trim()?.length
                });
                return res.status(400).json({
                    success: false,
                    error: '文字转视频模式需要输入提示词'
                });
            }

            console.log(`[Task] Creating T2V task for user ${userId}:`, {
                prompt: prompt.substring(0, 50) + '...',
                model: model
            });

            // 判断使用哪个 T2V 引擎
            if (model === 'comfyui-cogvideo-t2v') {
                // 使用 CogVideoX 的文字转视频（真正的CogVideoX T2V模型）
                const taskId = 'cogvideo-t2v-' + Date.now() + '-' + Math.random().toString(36).substring(7);

                // 保存任务信息
                tasks.set(taskId, {
                    taskId,
                    userId,
                    model: 'comfyui-cogvideo-t2v',
                    prompt,
                    status: 'PENDING',
                    progress: 0,
                    mode: 't2v',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isComfyUI: true,
                    engine: 'CogVideoX T2V'
                });

                console.log(`[Task] CogVideoX T2V Task created: ${taskId}`);

                // 异步处理CogVideoX T2V任务
                processCogVideoT2VTask(taskId, prompt).catch(error => {
                    console.error(`[CogVideoX T2V Task Error] ${taskId}:`, error);
                    const task = tasks.get(taskId);
                    if (task) {
                        task.status = 'ERROR';
                        task.error = error.message;
                        task.updatedAt = new Date();
                    }
                });

                res.json({
                    success: true,
                    taskId
                });

                return;
            } else {
                // 使用 EasyAnimate 生成文字转视频
                const result = await createEasyAnimateT2VTask(prompt, {
                    aspectRatio: '768:512',
                    numFrames: 80  // EasyAnimate最大49帧，使用48（4的倍数）
                });

                const taskId = result.taskId;

                // 保存任务信息
                tasks.set(taskId, {
                    taskId,
                    userId,
                    model: 'easyanimate-t2v',
                    prompt,
                    status: 'PENDING',
                    progress: 0,
                    mode: 't2v',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isComfyUI: true,
                    engine: 'EasyAnimate T2V'
                });

                console.log(`[Task] T2V Task created successfully: ${taskId}`);

                // 异步处理任务
                processEasyAnimateT2VTask(taskId).catch(error => {
                    console.error(`[T2V Task Error] ${taskId}:`, error);
                });

                res.json({
                    success: true,
                    taskId
                });

                return;
            }
        }

        // 图片转视频模式（原有逻辑）
        if (!imageId) {
            return res.status(400).json({
                success: false,
                error: '图片转视频模式需要上传图片'
            });
        }

        if (!model) {
            return res.status(400).json({
                success: false,
                error: '缺少模型参数'
            });
        }

        // 验证图片文件是否存在
        const imagePath = path.join(__dirname, '../temp', imageId);
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                success: false,
                error: '图片文件不存在'
            });
        }

        console.log(`[Task] Creating I2V task for user ${userId}:`, {
            imageId,
            model,
            motionType,
            prompt: prompt ? prompt.substring(0, 50) + '...' : 'none'
        });

        let taskId;

        // 判断使用哪个 ComfyUI 引擎
        if (model === 'comfyui-animatediff') {
            // 使用 ComfyUI AnimateDiff 生成
            const result = await createComfyUIAnimateDiffTask(imagePath, motionType, prompt);
            taskId = result.taskId;

            // 保存任务信息
            tasks.set(taskId, {
                taskId,
                userId,
                imageId,
                imagePath,
                model,
                motionType,
                prompt,
                status: 'PENDING',
                progress: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                comfyuiVideoUrl: result.videoUrl,
                comfyuiFilename: result.filename,
                isComfyUI: true,
                engine: 'AnimateDiff'
            });
        } else if (model === 'comfyui-svd') {
            // 使用 ComfyUI SVD 生成
            const result = await createComfyUISVDTask(imagePath, req.body.motionBucketId, prompt);
            taskId = result.taskId;

            // 保存任务信息
            tasks.set(taskId, {
                taskId,
                userId,
                imageId,
                imagePath,
                model,
                motionBucketId: req.body.motionBucketId || 100,
                prompt,
                status: 'PENDING',
                progress: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                comfyuiVideoUrl: result.videoUrl,
                comfyuiFilename: result.filename,
                isComfyUI: true,
                engine: 'SVD'
            });
        } else if (model === 'comfyui-cogvideo') {
            // 使用 ComfyUI CogVideoX 生成
            const result = await createComfyUICogVideoTask(imagePath, prompt);
            taskId = result.taskId;

            // 保存任务信息
            tasks.set(taskId, {
                taskId,
                userId,
                imageId,
                imagePath,
                model,
                prompt,
                status: 'PENDING',
                progress: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                comfyuiVideoUrl: result.videoUrl,
                comfyuiFilename: result.filename,
                isComfyUI: true,
                engine: 'CogVideoX'
            });
        } else {
            // 不支持的模型
            throw new Error(`不支持的模型: ${model}. 请使用 comfyui-animatediff, comfyui-svd, 或 comfyui-cogvideo`);
        }

        console.log(`[Task] Task created successfully: ${taskId}`);

        // 异步处理任务
        processTask(taskId, userId, model).catch(error => {
            console.error(`[Task Error] ${taskId}:`, error);
        });

        res.json({
            success: true,
            taskId
        });

    } catch (error) {
        console.error('[Generate Error]', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/task/:taskId
 * 查询任务状态
 */
router.get('/task/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = tasks.get(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: '任务不存在'
            });
        }

        // 如果任务还在处理中，查询最新状态
        if (task.status === 'PENDING' || task.status === 'RUNNING') {
            try {
                // ComfyUI 任务已经同步完成，直接返回
                // 所有任务现在都是 ComfyUI
            } catch (error) {
                console.error('[Status Query Error]', error);
            }
        }

        res.json({
            success: true,
            taskId: task.taskId,
            status: task.status,
            progress: task.progress,
            error: task.error,
            videoUrl: task.comfyuiVideoUrl,  // 添加视频 URL
            filename: task.comfyuiFilename,   // 添加文件名
            engine: task.engine,               // 添加引擎信息
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        });

    } catch (error) {
        console.error('[Task Query Error]', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 异步处理任务
 */
async function processTask(taskId, userId, model) {
    const task = tasks.get(taskId);
    if (!task) return;

    try {
        console.log(`[Process] Starting task ${taskId}`);

        // 更新状态为 RUNNING
        task.status = 'RUNNING';
        task.progress = 30;
        tasks.set(taskId, task);

        let videoUrl, videoPath;

        if (model === 'comfyui-animatediff' || model === 'comfyui-svd' || model === 'comfyui-cogvideo') {
            // ComfyUI 已经同步返回了视频，直接下载
            console.log(`[Process] ComfyUI video ready: ${task.comfyuiVideoUrl}`);

            videoPath = path.join(__dirname, '../temp', `${taskId}.mp4`);

            // 从 ComfyUI 下载视频
            await downloadVideoFromUrl(task.comfyuiVideoUrl, videoPath);

            videoUrl = task.comfyuiVideoUrl;

        } else {
            throw new Error(`不支持的模型: ${model}`);
        }

        console.log(`[Process] Video downloaded: ${videoPath}`);

        // 更新任务状态
        task.status = 'SUCCEEDED';
        task.progress = 100;
        task.videoPath = videoPath;
        task.videoUrl = videoUrl;
        task.updatedAt = new Date();
        tasks.set(taskId, task);

        // 记录用户使用次数
        if (task.userId && task.userId !== 'unknown') {
            userManager.recordUsage(task.userId, {
                taskId: taskId,
                model: task.model,
                motionType: task.motionType,
                timestamp: new Date().toISOString()
            });
            console.log(`[Usage] Recorded usage for user: ${task.userId}`);
        }

        // 发送视频给用户（通过 Bot）- 仅在非 Web 模式下
        if (userId !== 'unknown') {
            await sendVideoToUser(userId, videoPath, task);
            // Telegram 模式：1 分钟后清理
            setTimeout(() => {
                cleanupTask(taskId);
            }, 60000);
        } else {
            // Web 模式：5 分钟后清理，给用户足够时间下载
            setTimeout(() => {
                cleanupTask(taskId);
            }, 300000);
        }

    } catch (error) {
        console.error(`[Process Error] Task ${taskId}:`, error);

        // 更新任务状态为失败
        task.status = 'FAILED';
        task.error = error.message;
        task.updatedAt = new Date();
        tasks.set(taskId, task);
    }
}

/**
 * 从 URL 下载视频
 */
async function downloadVideoFromUrl(url, outputPath) {
    const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
    });

    const writer = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

/**
 * 发送视频给用户
 */
async function sendVideoToUser(userId, videoPath, task) {
    try {
        // 获取 Bot 实例（从 server.js 传入）
        const bot = require('../server').bot;

        if (!bot) {
            console.error('[Send Video] Bot instance not found');
            return;
        }

        // 构建消息标题
        let caption = '您的视频已生成！\n\n';
        caption += `模型: ${task.model}\n`;
        if (task.motionType) {
            caption += `运动效果: ${task.motionType}\n`;
        }
        if (task.prompt) {
            caption += `提示词: ${task.prompt}\n`;
        }

        // 发送视频
        await bot.telegram.sendVideo(userId, {
            source: videoPath
        }, {
            caption: caption
        });

        console.log(`[Send Video] Video sent to user ${userId}`);

    } catch (error) {
        console.error('[Send Video Error]', error);
    }
}

/**
 * 清理任务文件
 */
function cleanupTask(taskId) {
    const task = tasks.get(taskId);
    if (!task) return;

    try {
        // 删除图片文件
        if (task.imagePath && fs.existsSync(task.imagePath)) {
            fs.unlinkSync(task.imagePath);
            console.log(`[Cleanup] Deleted image: ${task.imagePath}`);
        }

        // 删除视频文件
        if (task.videoPath && fs.existsSync(task.videoPath)) {
            fs.unlinkSync(task.videoPath);
            console.log(`[Cleanup] Deleted video: ${task.videoPath}`);
        }

        // 从内存中删除任务记录（保留 1 小时）
        setTimeout(() => {
            tasks.delete(taskId);
            console.log(`[Cleanup] Removed task from memory: ${taskId}`);
        }, 3600000);

    } catch (error) {
        console.error(`[Cleanup Error] Task ${taskId}:`, error);
    }
}

/**
 * 根据状态计算进度百分比
 */
function getProgressFromStatus(status) {
    const progressMap = {
        'PENDING': 30,
        'RUNNING': 60,
        'SUCCEEDED': 100,
        'FAILED': 0
    };
    return progressMap[status] || 0;
}

/**
 * GET /api/download/:taskId
 * 下载生成的视频
 */
router.get('/download/:taskId', (req, res) => {
    try {
        const { taskId } = req.params;
        const task = tasks.get(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: '任务不存在'
            });
        }

        if (task.status !== 'SUCCEEDED') {
            return res.status(400).json({
                success: false,
                error: '视频尚未生成完成'
            });
        }

        if (!task.videoPath || !fs.existsSync(task.videoPath)) {
            return res.status(404).json({
                success: false,
                error: '视频文件不存在'
            });
        }

        // 设置响应头
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${taskId}.mp4"`);

        // 流式传输视频文件
        const videoStream = fs.createReadStream(task.videoPath);
        videoStream.pipe(res);

        console.log(`[Download] User downloaded video: ${taskId}`);

    } catch (error) {
        console.error('[Download Error]', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/delete/:taskId
 * 立即删除视频文件
 */
router.delete('/delete/:taskId', (req, res) => {
    try {
        const { taskId } = req.params;

        console.log(`[Delete] Received request to delete task: ${taskId}`);

        // 立即清理任务文件
        cleanupTask(taskId);

        res.json({
            success: true,
            message: '视频已删除'
        });

        console.log(`[Delete] Task ${taskId} deleted successfully`);

    } catch (error) {
        console.error('[Delete Error]', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/download/:taskId
 * 下载视频（代理 ComfyUI）
 */
router.get('/download/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = tasks.get(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: '任务不存在'
            });
        }

        if (task.status !== 'SUCCEEDED') {
            return res.status(400).json({
                success: false,
                error: '视频尚未生成完成'
            });
        }

        // 获取视频 URL 和文件名
        const videoUrl = task.comfyuiVideoUrl;
        const filename = task.comfyuiFilename || `${taskId}.mp4`;

        if (!videoUrl) {
            return res.status(404).json({
                success: false,
                error: '视频 URL 不存在'
            });
        }

        console.log(`[Download] Proxying video download: ${filename}`);
        console.log(`[Download] ComfyUI URL: ${videoUrl}`);

        // 从 ComfyUI 获取视频流
        const videoResponse = await axios.get(videoUrl, {
            responseType: 'stream',
            timeout: 30000
        });

        // 设置响应头，强制下载
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // 如果有 Content-Length，也设置上
        if (videoResponse.headers['content-length']) {
            res.setHeader('Content-Length', videoResponse.headers['content-length']);
        }

        // 将视频流传输给客户端
        videoResponse.data.pipe(res);

        videoResponse.data.on('end', () => {
            console.log(`[Download] Video downloaded successfully: ${filename}`);
        });

        videoResponse.data.on('error', (error) => {
            console.error(`[Download Error] Stream error:`, error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: '视频传输失败'
                });
            }
        });

    } catch (error) {
        console.error('[Download Error]', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
});

/**
 * 异步处理 EasyAnimate T2V 任务
 */
async function processEasyAnimateT2VTask(taskId) {
    const task = tasks.get(taskId);
    if (!task) return;

    try {
        console.log(`[Process T2V] Starting task ${taskId}`);

        // 更新状态为 RUNNING
        task.status = 'RUNNING';
        task.progress = 30;
        tasks.set(taskId, task);

        // 轮询任务状态
        const result = await easyAnimateAPI.pollTaskStatus(taskId, 120); // 最多等待20分钟

        if (result.status === 'SUCCEEDED') {
            console.log(`[Process T2V] Task ${taskId} succeeded:`, result);

            // 下载视频到本地
            const videoPath = path.join(__dirname, '../temp', `${taskId}.mp4`);
            await downloadVideoFromUrl(result.videoUrl, videoPath);

            // 更新任务状态
            task.status = 'SUCCEEDED';
            task.progress = 100;
            task.videoPath = videoPath;
            task.videoUrl = result.videoUrl;
            task.comfyuiVideoUrl = result.videoUrl;
            task.comfyuiFilename = result.filename;
            task.updatedAt = new Date();
            tasks.set(taskId, task);

            // 记录用户使用次数
            if (task.userId && task.userId !== 'unknown') {
                userManager.recordUsage(task.userId, {
                    taskId: taskId,
                    model: 'easyanimate-t2v',
                    timestamp: new Date().toISOString()
                });
                console.log(`[Usage] Recorded T2V usage for user: ${task.userId}`);
            }

            // 发送视频给用户（通过 Bot）- 仅在非 Web 模式下
            if (task.userId !== 'unknown') {
                await sendVideoToUser(task.userId, videoPath, task);
                // Telegram 模式：1 分钟后清理
                setTimeout(() => {
                    cleanupTask(taskId);
                }, 60000);
            } else {
                // Web 模式：5 分钟后清理
                setTimeout(() => {
                    cleanupTask(taskId);
                }, 300000);
            }

        } else if (result.status === 'FAILED') {
            console.error(`[Process T2V] Task ${taskId} failed:`, result.error);

            task.status = 'FAILED';
            task.error = result.error || '生成失败';
            task.updatedAt = new Date();
            tasks.set(taskId, task);
        }

    } catch (error) {
        console.error(`[Process T2V Error] Task ${taskId}:`, error);

        // 更新任务状态为失败
        task.status = 'FAILED';
        task.error = error.message;
        task.updatedAt = new Date();
        tasks.set(taskId, task);
    }
}

// ==================== CogVideoX T2V 任务处理 ====================

async function processCogVideoT2VTask(taskId, prompt) {
    const task = tasks.get(taskId);
    if (!task) {
        console.error(`[CogVideoX T2V] Task ${taskId} not found`);
        return;
    }

    try {
        console.log(`[CogVideoX T2V] Starting task ${taskId} with prompt: "${prompt.substring(0, 50)}..."`);

        // 更新任务状态为处理中
        task.status = 'PROCESSING';
        task.progress = 10;
        task.updatedAt = new Date();
        tasks.set(taskId, task);

        // 调用 CogVideoX T2V API
        const ComfyUICogVideoAPI = require('../comfyui-cogvideo-api');
        const comfyuiUrl = process.env.COMFYUI_URL || 'http://localhost:8188';
        const cogVideoAPI = new ComfyUICogVideoAPI(comfyuiUrl);

        console.log(`[CogVideoX T2V] Calling CogVideoX T2V API...`);

        // 更新进度
        task.progress = 30;
        task.updatedAt = new Date();
        tasks.set(taskId, task);

        // 调用T2V生成
        const result = await cogVideoAPI.generateT2VVideo(
            prompt,           // 提示词
            '',               // 负面提示词（使用默认）
            16,               // fps（推荐16fps）
            49                // 帧数（49帧=3秒，平衡质量和速度）
        );

        console.log(`[CogVideoX T2V] Task ${taskId} result:`, result);

        if (result && result.success) {
            // 下载视频到本地
            const axios = require('axios');
            const fs = require('fs');
            const path = require('path');

            const videoUrl = result.videoUrl;
            const filename = result.filename || `t2v_${Date.now()}.mp4`;
            const outputDir = process.env.OUTPUT_DIR || path.join(__dirname, '../output');
            const localPath = path.join(outputDir, filename);

            // 确保输出目录存在
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            console.log(`[CogVideoX T2V] Downloading video from ${videoUrl}`);

            task.progress = 80;
            task.updatedAt = new Date();
            tasks.set(taskId, task);

            // 下载视频
            const response = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 60000
            });
            fs.writeFileSync(localPath, response.data);

            console.log(`[CogVideoX T2V] Video saved to ${localPath}`);

            // 更新任务状态为完成
            task.status = 'SUCCEEDED';
            task.progress = 100;
            task.videoPath = localPath;                     // 下载API需要这个字段
            task.result = {
                videoPath: localPath,
                videoUrl: `/output/${filename}`,
                filename: filename
            };
            task.comfyuiVideoUrl = `/output/${filename}`;  // 前端查询API需要这个字段
            task.comfyuiFilename = filename;                // 前端查询API需要这个字段
            task.updatedAt = new Date();
            tasks.set(taskId, task);

            console.log(`[CogVideoX T2V] Task ${taskId} completed successfully`);
        } else {
            throw new Error(result?.error || 'CogVideoX T2V生成失败');
        }

    } catch (error) {
        console.error(`[CogVideoX T2V Error] Task ${taskId}:`, error);

        // 更新任务状态为失败
        task.status = 'FAILED';
        task.error = error.message;
        task.updatedAt = new Date();
        tasks.set(taskId, task);
    }
}

module.exports = router;

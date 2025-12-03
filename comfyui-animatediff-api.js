require('dotenv').config();
const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');
const FormData = require('form-data');
const fs = require('fs');

class ComfyUIAnimateDiffAPI {
    constructor(comfyuiUrl = 'http://localhost:8188') {
        this.baseUrl = comfyuiUrl;
        this.clientId = Math.random().toString(36).substring(7);
    }

    // AnimateDiff 工作流模板 (图生视频 Image-to-Video)
    getAnimateDiffWorkflow(imageBase64, prompt, motionLora = 'zoom-in') {
        // 移除 data:image/jpeg;base64, 前缀（如果有）
        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

        return {
            "1": {
                "inputs": {
                    "ckpt_name": "realisticVisionV60B1_v51HyperVAE.safetensors"
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "2": {
                "inputs": {
                    "model_name": "v3_sd15_mm.ckpt"
                },
                "class_type": "ADE_LoadAnimateDiffModel"
            },
            "3": {
                "inputs": {
                    "name": `v2_lora_${this.getLoraName(motionLora)}.ckpt`,
                    "strength": 0.5  // 进一步降低到 0.5，实现最轻微的运动
                },
                "class_type": "ADE_AnimateDiffLoRALoader"
            },
            "4": {
                "inputs": {
                    "motion_model": ["2", 0],
                    "motion_lora": ["3", 0],
                    "start_percent": 0.0,
                    "end_percent": 1.0
                },
                "class_type": "ADE_ApplyAnimateDiffModel"
            },
            "5": {
                "inputs": {
                    "model": ["1", 0],
                    "m_models": ["4", 0],
                    "beta_schedule": "autoselect"
                },
                "class_type": "ADE_UseEvolvedSampling"
            },
            "6": {
                "inputs": {
                    "text": prompt,
                    "clip": ["1", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "7": {
                "inputs": {
                    "text": "blurry face, deformed face, distorted features, bad anatomy, watermark, text, ugly, low quality, face deformation, warped face, inconsistent face",
                    "clip": ["1", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "8": {
                "inputs": {
                    "base64_data": base64Data,
                    "image_output": "Hide",
                    "save_prefix": "ComfyUI"
                },
                "class_type": "easy loadImageBase64"
            },
            "9": {
                "inputs": {
                    "pixels": ["8", 0],
                    "vae": ["1", 2]
                },
                "class_type": "VAEEncode"
            },
            "10": {
                "inputs": {
                    "samples": ["9", 0],
                    "amount": 32  // 增加到 32 帧以获得 4-5 秒的视频时长
                },
                "class_type": "RepeatLatentBatch"
            },
            "11": {
                "inputs": {
                    "seed": Math.floor(Math.random() * 1000000),
                    "steps": 20,  // 降低步数到 20
                    "cfg": 6.5,  // 降低 CFG 到 6.5，减少过度变化
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 0.50,  // 大幅降低到 0.50，最大限度保持原图细节
                    "model": ["5", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["10", 0]
                },
                "class_type": "KSampler"
            },
            "12": {
                "inputs": {
                    "samples": ["11", 0],
                    "vae": ["1", 2]
                },
                "class_type": "VAEDecode"
            },
            "13": {
                "inputs": {
                    "images": ["12", 0],
                    "frame_rate": 6,  // 调整帧率到 6 FPS，32帧÷6FPS=5.3秒
                    "loop_count": 0,
                    "filename_prefix": "animatediff_video",
                    "format": "video/h264-mp4",
                    "pingpong": false,
                    "save_output": true
                },
                "class_type": "VHS_VideoCombine"
            }
        };
    }

    getLoraName(motionType) {
        const loraMap = {
            'zoom-in': 'ZoomIn',
            'zoom-out': 'ZoomOut',
            'pan-left': 'PanLeft',
            'pan-right': 'PanRight',
            'pan-up': 'TiltUp',
            'pan-down': 'TiltDown',
            'roll-clockwise': 'RollingClockwise',
            'roll-anticlockwise': 'RollingAnticlockwise'
        };
        const loraName = loraMap[motionType] || 'ZoomIn';
        console.log(`🎭 运动类型: ${motionType} -> LoRA: v2_lora_${loraName}.ckpt`);
        return loraName;
    }

    async generateVideo(imageBase64, prompt, motionType = 'zoom-in') {
        try {
            console.log('📋 生成参数:', {
                promptLength: prompt?.length || 0,
                motionType,
                imageBase64Length: imageBase64?.length || 0
            });

            // 1. 准备工作流
            const workflow = this.getAnimateDiffWorkflow(imageBase64, prompt, motionType);

            console.log('📦 工作流节点数:', Object.keys(workflow).length);

            // 2. 提交任务
            const response = await axios.post(`${this.baseUrl}/prompt`, {
                prompt: workflow,
                client_id: this.clientId
            });

            const promptId = response.data.prompt_id;
            console.log(`📋 AnimateDiff 任务已提交: ${promptId}`);

            // 3. 等待生成完成
            const result = await this.waitForCompletion(promptId);
            return result;

        } catch (error) {
            console.error('❌ AnimateDiff 生成失败:', error.message);
            if (error.response) {
                console.error('❌ 错误响应状态:', error.response.status);
                console.error('❌ 错误响应数据:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }

    async waitForCompletion(promptId) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(`${this.baseUrl.replace('http', 'ws')}/ws?clientId=${this.clientId}`);
            let isResolved = false;
            let lastProgress = 0;
            let noProgressCount = 0;
            let lastMessageTime = Date.now();

            console.log(`🔗 正在连接 WebSocket: ${this.baseUrl.replace('http', 'ws')}/ws?clientId=${this.clientId}`);

            // 设置 20 分钟超时（留更多时间用于文件写入）
            const timeout = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    ws.close();
                    console.error('❌ WebSocket 20分钟超时，尝试轮询获取结果...');
                    // 超时后立即尝试轮询，而不是直接拒绝
                    this.pollForCompletion(promptId, resolve, reject);
                }
            }, 1200000);

            // 监听 WebSocket 消息
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data);
                    lastMessageTime = Date.now();

                    // 打印进度信息
                    if (message.type === 'executing' && message.data.node) {
                        console.log(`🎨 正在执行节点 #${message.data.node}...`);
                        noProgressCount = 0;
                    }

                    if (message.type === 'progress') {
                        const { value, max } = message.data;
                        const percent = ((value / max) * 100).toFixed(1);
                        console.log(`⏳ 生成进度: ${value}/${max} (${percent}%)`);
                        lastProgress = value;
                        noProgressCount = 0;
                        
                        // ⚡️ 新增：进度到 100% 时，设置一个 30 秒的备用轮询
                        if (value === max) {
                            console.log('💡 进度已达 100%，如果 10 秒内未收到完成信号，将启动轮询...');
                            setTimeout(() => {
                                if (!isResolved) {
                                    console.warn('⚠️ 进度 100% 后 10 秒未收到完成信号，启动轮询备用方案...');
                                    isResolved = true;
                                    clearTimeout(timeout);
                                    ws.close();
                                    this.pollForCompletion(promptId, resolve, reject);
                                }
                            }, 10000);
                        }
                    }

                    // 记录所有消息类型以便调试
                    if (message.type !== 'progress' && message.type !== 'executing') {
                        console.log(`📨 WebSocket 消息: ${message.type}`, message.data?.prompt_id ? `(promptId: ${message.data.prompt_id})` : '');
                    }

                    // 主要完成信号
                    if (message.type === 'execution_complete' && message.data.prompt_id === promptId) {
                        if (!isResolved) {
                            isResolved = true;
                            clearTimeout(timeout);
                            ws.close();
                            console.log('✅ 收到执行完成信号，正在获取视频文件...');
                            await this.retrieveVideo(promptId, resolve, reject);
                        }
                    }

                    // 处理执行错误
                    if (message.type === 'execution_error') {
                        if (!isResolved) {
                            isResolved = true;
                            clearTimeout(timeout);
                            ws.close();
                            reject(new Error(`生成失败: ${JSON.stringify(message.data)}`));
                        }
                    }
                } catch (error) {
                    console.error('🔴 WebSocket 消息解析错误:', error);
                }
            });

            ws.on('error', (error) => {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timeout);
                    console.error('🔴 WebSocket 错误:', error.message);
                    // 错误时也尝试轮询，而不是直接拒绝
                    this.pollForCompletion(promptId, resolve, reject);
                }
            });

            ws.on('close', async () => {
                console.log(`⚠️ WebSocket 已关闭 (isResolved=${isResolved})`);
                // WebSocket 关闭时，尝试通过轮询检查完成状态
                if (!isResolved) {
                    isResolved = true;
                    console.log('🔍 WebSocket 关闭，正在轮询检查完成状态...');
                    await this.pollForCompletion(promptId, resolve, reject);
                } else {
                    console.log('ℹ️ 任务已被处理，忽略 WebSocket 关闭事件');
                }
            });

            ws.on('open', () => {
                console.log('🎥 WebSocket 已连接，开始监控视频生成进度...');
            });
        });
    }

    // 轮询检查完成状态（备用方案）
    async pollForCompletion(promptId, resolve, reject) {
        let pollCount = 0;
        const maxPolls = 240; // 4分钟内每秒轮询一次
        
        const poll = async () => {
            try {
                const historyResponse = await axios.get(`${this.baseUrl}/history/${promptId}`, {
                    timeout: 5000
                });
                
                const promptHistory = historyResponse.data[promptId];
                
                if (!promptHistory) {
                    // 任务不存在
                    pollCount++;
                    if (pollCount < maxPolls) {
                        if (pollCount % 20 === 0) {
                            console.log(`⏳ 轮询中... (${pollCount}/${maxPolls}秒) - 任务尚未创建`);
                        }
                        setTimeout(poll, 1000);
                    } else {
                        reject(new Error('轮询超时：任务从未创建'));
                    }
                    return;
                }

                // 检查是否存在任何输出（视频、GIF、或图像）
                const outputs = promptHistory.outputs || {};
                let hasOutput = false;
                let debugInfo = [];
                
                for (const nodeId in outputs) {
                    const nodeOutput = outputs[nodeId];
                    const keys = Object.keys(nodeOutput);
                    debugInfo.push(`节点 ${nodeId}: [${keys.join(', ')}]`);
                    
                    // 检查视频输出
                    if (nodeOutput.videos && nodeOutput.videos.length > 0) {
                        hasOutput = true;
                        console.log(`   ✅ 找到视频输出在节点 ${nodeId}: ${nodeOutput.videos[0].filename}`);
                    }
                    
                    // 检查 GIF 输出（VHS_VideoCombine 的输出）
                    if (nodeOutput.gifs && nodeOutput.gifs.length > 0) {
                        hasOutput = true;
                        console.log(`   ✅ 找到 GIF/视频输出在节点 ${nodeId}: ${nodeOutput.gifs[0].filename}`);
                    }
                    
                    // 检查图像输出
                    if (nodeOutput.images && nodeOutput.images.length > 0) {
                        hasOutput = true;
                        if (pollCount % 20 === 0) {
                            console.log(`   📸 找到图像输出在节点 ${nodeId}: ${nodeOutput.images.length} 张`);
                        }
                    }
                }
                
                if (debugInfo.length > 0 && pollCount === 1) {
                    // 第一次轮询时打印所有信息
                    console.log(`📊 第 1 秒 - 任务开始有输出:`);
                    debugInfo.forEach(info => console.log(`   - ${info}`));
                }
                
                // 有任何输出就认为成功
                if (hasOutput) {
                    console.log('✅ 轮询发现输出已生成，正在获取...');
                    await this.retrieveVideo(promptId, resolve, reject);
                    return;
                }
                
                // 检查是否有错误
                if (promptHistory.status && promptHistory.status[1]) {
                    const errorInfo = promptHistory.status[1];
                    if (errorInfo.error || errorInfo.node_error) {
                        console.error('❌ 检测到任务错误:', errorInfo);
                        reject(new Error(`ComfyUI 任务错误: ${JSON.stringify(errorInfo)}`));
                        return;
                    }
                }
                
                pollCount++;
                if (pollCount < maxPolls) {
                    if (pollCount % 20 === 0) {
                        console.log(`⏳ 轮询中... (${pollCount}/${maxPolls}秒) - 等待输出...`);
                    }
                    setTimeout(poll, 1000); // 每秒轮询一次
                } else {
                    console.error('❌ 轮询 4 分钟后仍未找到输出，任务可能失败或卡住');
                    console.error('📊 最终状态:', JSON.stringify(promptHistory, null, 2));
                    reject(new Error('轮询超时：无法获取完成状态'));
                }
            } catch (error) {
                pollCount++;
                if (pollCount < maxPolls) {
                    // 不打印每次错误，避免日志过多
                    if (pollCount % 60 === 0) {
                        console.log(`⏳ 轮询重试 (${pollCount}/${maxPolls}秒) - ${error.message}`);
                    }
                    setTimeout(poll, 1000);
                } else {
                    reject(new Error(`轮询失败: ${error.message}`));
                }
            }
        };
        
        console.log('🔍 开始轮询检查任务完成状态...');
        poll();
    }

    // 获取视频文件（提取为独立方法）
    async retrieveVideo(promptId, resolve, reject) {
        try {
            console.log(`📥 获取任务 ${promptId} 的历史数据...`);
            const historyResponse = await axios.get(`${this.baseUrl}/history/${promptId}`, {
                timeout: 10000
            });
            const history = historyResponse.data[promptId];

            if (!history) {
                throw new Error('无法获取任务历史');
            }

            console.log(`📋 任务输出节点数: ${Object.keys(history.outputs).length}`);

            // 查找视频输出或图像输出
            const outputs = history.outputs;
            let videoInfo = null;
            let imageInfo = null;
            let foundNode = null;
            let nodeType = null;

            // 首先查找视频输出（最优先）
            for (const nodeId in outputs) {
                const output = outputs[nodeId];
                const keys = Object.keys(output);
                console.log(`🔍 检查节点 ${nodeId}:`, keys);
                
                // 优先检查 videos 输出
                if (output.videos && output.videos.length > 0) {
                    videoInfo = output.videos[0];
                    foundNode = nodeId;
                    nodeType = 'video';
                    console.log(`✅ 找到视频输出在节点 ${nodeId}: ${videoInfo.filename}`);
                    break;
                }
                
                // 检查 gifs 输出（VHS_VideoCombine 节点）
                if (output.gifs && output.gifs.length > 0) {
                    videoInfo = output.gifs[0];
                    foundNode = nodeId;
                    nodeType = 'gif';
                    console.log(`✅ 找到 GIF/视频输出在节点 ${nodeId}: ${videoInfo.filename}`);
                    break;
                }
                
                // 备用：如果没有视频，记录图像
                if (output.images && output.images.length > 0) {
                    if (!imageInfo) {
                        imageInfo = output.images;
                        foundNode = nodeId;
                        nodeType = 'images';
                        console.log(`⚠️  找到图像输出在节点 ${nodeId}，共 ${imageInfo.length} 张`);
                    }
                }
            }

            if (videoInfo) {
                console.log(`✅ 视频生成完成: ${videoInfo.filename} (来自节点 ${foundNode}, 类型: ${nodeType})`);
                resolve({
                    success: true,
                    videoUrl: `${this.baseUrl}/view?filename=${videoInfo.filename}&type=output`,
                    filename: videoInfo.filename,
                    type: nodeType
                });
            } else if (imageInfo) {
                // 返回图像而不是拒绝
                console.log(`⚠️ 生成了图像而不是视频，返回第一张图像`);
                const firstImage = imageInfo[0];
                resolve({
                    success: true,
                    videoUrl: `${this.baseUrl}/view?filename=${firstImage}&type=output`,
                    filename: firstImage,
                    type: 'images',
                    frameCount: imageInfo.length
                });
            } else {
                console.error('❌ 未找到视频、GIF 或图像输出，输出内容:', JSON.stringify(outputs, null, 2));
                reject(new Error('未找到生成的输出文件'));
            }
        } catch (error) {
            console.error('❌ 获取视频失败:', error.message);
            reject(error);
        }
    }
}

// Express API 服务器
const app = express();
app.use(express.json({limit: '50mb'}));

// 从环境变量获取 ComfyUI 地址
const comfyuiUrl = process.env.COMFYUI_URL || 'http://localhost:8188';
const animateDiffAPI = new ComfyUIAnimateDiffAPI(comfyuiUrl);

// 健康检查
app.get('/health', async (req, res) => {
    try {
        const response = await axios.get(`${comfyuiUrl}/system_stats`, {
            timeout: 5000  // 5秒超时
        });
        res.json({
            status: 'healthy',
            comfyui: 'online',
            comfyui_url: comfyuiUrl,
            system: response.data
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'ComfyUI 不可用',
            comfyui_url: comfyuiUrl,
            error: error.message
        });
    }
});

// AnimateDiff 视频生成 API
app.post('/generate-video', async (req, res) => {
    try {
        const { image, prompt, motionType = 'zoom-in' } = req.body;

        if (!image) {
            return res.status(400).json({
                error: '缺少必需参数: image'
            });
        }

        console.log(`🎬 开始生成 AnimateDiff 视频: ${motionType}`);
        console.log(`📝 提示词: ${prompt || '(默认)'}`);

        const result = await animateDiffAPI.generateVideo(
            image,
            prompt || 'high quality video, smooth motion, cinematic',
            motionType
        );

        res.json(result);

    } catch (error) {
        console.error('❌ API 错误:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// 支持的运动类型列表
app.get('/motion-types', (req, res) => {
    res.json({
        motionTypes: [
            { value: 'zoom-in', label: '放大' },
            { value: 'zoom-out', label: '缩小' },
            { value: 'pan-left', label: '左移' },
            { value: 'pan-right', label: '右移' },
            { value: 'pan-up', label: '上移' },
            { value: 'pan-down', label: '下移' }
        ]
    });
});

const PORT = process.env.COMFYUI_API_PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 ComfyUI AnimateDiff API 服务器启动在端口 ${PORT}`);
    console.log(`📍 健康检查: http://localhost:${PORT}/health`);
    console.log(`🎬 视频生成: POST http://localhost:${PORT}/generate-video`);
});

module.exports = ComfyUIAnimateDiffAPI;

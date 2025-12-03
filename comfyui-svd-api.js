require('dotenv').config();
const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');

class ComfyUISVDAPI {
    constructor(comfyuiUrl = 'http://localhost:8188') {
        this.baseUrl = comfyuiUrl;
        this.clientId = Math.random().toString(36).substring(7);
    }

    // SVD (Stable Video Diffusion) 工作流模板 - 使用 LoadImage
    getSVDWorkflow(uploadedFilename, motionBucketId = 127, fps = 6, augmentationLevel = 0.0) {
        return {
            "1": {
                "inputs": {
                    "image": uploadedFilename,
                    "upload": "image"
                },
                "class_type": "LoadImage"
            },
            "2": {
                "inputs": {
                    "ckpt_name": "SVD/svd_xt.safetensors"
                },
                "class_type": "ImageOnlyCheckpointLoader"
            },
            "3": {
                "inputs": {
                    "width": 1024,
                    "height": 576,
                    "video_frames": 25,
                    "motion_bucket_id": motionBucketId,
                    "fps": fps,
                    "augmentation_level": augmentationLevel,
                    "clip_vision": ["2", 1],
                    "init_image": ["4", 0],
                    "vae": ["2", 2]
                },
                "class_type": "SVD_img2vid_Conditioning"
            },
            "4": {
                "inputs": {
                    "width": 1024,
                    "height": 576,
                    "interpolation": "lanczos",
                    "method": "stretch",
                    "condition": "always",
                    "multiple_of": 64,
                    "image": ["1", 0]
                },
                "class_type": "ImageResize+"
            },
            "5": {
                "inputs": {
                    "min_cfg": 1.0,
                    "model": ["2", 0]
                },
                "class_type": "VideoLinearCFGGuidance"
            },
            "6": {
                "inputs": {
                    "seed": Math.floor(Math.random() * 1000000000),
                    "steps": 20,
                    "cfg": 2.5,
                    "sampler_name": "euler",
                    "scheduler": "karras",
                    "denoise": 1.0,
                    "model": ["5", 0],
                    "positive": ["3", 0],
                    "negative": ["3", 1],
                    "latent_image": ["3", 2]
                },
                "class_type": "KSampler"
            },
            "7": {
                "inputs": {
                    "samples": ["6", 0],
                    "vae": ["2", 2]
                },
                "class_type": "VAEDecode"
            },
            "8": {
                "inputs": {
                    "images": ["7", 0],
                    "frame_rate": fps,
                    "loop_count": 0,
                    "filename_prefix": `svd_video_${Date.now()}`,
                    "format": "video/h264-mp4",
                    "pingpong": false,
                    "save_output": true
                },
                "class_type": "VHS_VideoCombine"
            }
        };
    }

    async generateVideo(imagePath, motionBucketId = 127, fps = 6, augmentationLevel = 0.0) {
        try {
            console.log('📋 SVD 生成参数:', {
                motionBucketId,
                fps,
                augmentationLevel,
                imagePath
            });

            // 1. 上传图片到 ComfyUI
            const FormData = require('form-data');
            const form = new FormData();
            form.append('image', fs.createReadStream(imagePath));

            console.log('📤 上传图片到 ComfyUI...');
            const uploadResponse = await axios.post(`${this.baseUrl}/upload/image`, form, {
                headers: form.getHeaders()
            });

            const uploadedFilename = uploadResponse.data.name;
            console.log('✅ 图片上传成功:', uploadedFilename);

            // 2. 准备工作流
            const workflow = this.getSVDWorkflow(uploadedFilename, motionBucketId, fps, augmentationLevel);

            console.log('📦 SVD 工作流节点数:', Object.keys(workflow).length);

            // 3. 提交任务
            const response = await axios.post(`${this.baseUrl}/prompt`, {
                prompt: workflow,
                client_id: this.clientId
            });

            const promptId = response.data.prompt_id;
            console.log(`📋 SVD 任务已提交: ${promptId}`);

            // 4. 等待生成完成
            const result = await this.waitForCompletion(promptId);
            return result;

        } catch (error) {
            console.error('❌ SVD 生成失败:', error.message);
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

            console.log(`🔗 正在连接 WebSocket: ${this.baseUrl.replace('http', 'ws')}/ws?clientId=${this.clientId}`);

            // 设置 5 分钟超时
            const timeout = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    ws.close();
                    console.error('❌ WebSocket 5分钟超时，尝试轮询获取结果...');
                    this.pollForCompletion(promptId, resolve, reject);
                }
            }, 300000);

            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data);

                    if (message.type === 'executing' && message.data.node) {
                        console.log(`🎨 正在执行节点 #${message.data.node}...`);
                    }

                    if (message.type === 'progress') {
                        const { value, max } = message.data;
                        const percent = ((value / max) * 100).toFixed(1);
                        console.log(`⏳ 生成进度: ${value}/${max} (${percent}%)`);

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

                    if (message.type === 'execution_complete' && message.data.prompt_id === promptId) {
                        if (!isResolved) {
                            isResolved = true;
                            clearTimeout(timeout);
                            ws.close();
                            console.log('✅ 收到执行完成信号，正在获取视频文件...');
                            await this.retrieveVideo(promptId, resolve, reject);
                        }
                    }

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
                    this.pollForCompletion(promptId, resolve, reject);
                }
            });

            ws.on('close', async () => {
                console.log(`⚠️ WebSocket 已关闭 (isResolved=${isResolved})`);
                if (!isResolved) {
                    isResolved = true;
                    console.log('🔍 WebSocket 关闭，正在轮询检查完成状态...');
                    await this.pollForCompletion(promptId, resolve, reject);
                }
            });

            ws.on('open', () => {
                console.log('🎥 WebSocket 已连接，开始监控 SVD 视频生成进度...');
            });
        });
    }

    async pollForCompletion(promptId, resolve, reject) {
        let pollCount = 0;
        const maxPolls = 240;

        const poll = async () => {
            try {
                const historyResponse = await axios.get(`${this.baseUrl}/history/${promptId}`, {
                    timeout: 5000
                });

                const promptHistory = historyResponse.data[promptId];

                if (!promptHistory) {
                    pollCount++;
                    if (pollCount < maxPolls) {
                        if (pollCount % 20 === 0) {
                            console.log(`⏳ 轮询中... (${pollCount}/${maxPolls}秒)`);
                        }
                        setTimeout(poll, 1000);
                    } else {
                        reject(new Error('轮询超时：任务从未创建'));
                    }
                    return;
                }

                const outputs = promptHistory.outputs || {};
                let hasOutput = false;

                for (const nodeId in outputs) {
                    const nodeOutput = outputs[nodeId];

                    if (nodeOutput.videos && nodeOutput.videos.length > 0) {
                        hasOutput = true;
                        console.log(`✅ 找到视频输出在节点 ${nodeId}`);
                    }

                    if (nodeOutput.gifs && nodeOutput.gifs.length > 0) {
                        hasOutput = true;
                        console.log(`✅ 找到 GIF/视频输出在节点 ${nodeId}`);
                    }
                }

                if (hasOutput) {
                    console.log('✅ 轮询发现输出已生成，正在获取...');
                    await this.retrieveVideo(promptId, resolve, reject);
                    return;
                }

                pollCount++;
                if (pollCount < maxPolls) {
                    if (pollCount % 20 === 0) {
                        console.log(`⏳ 轮询中... (${pollCount}/${maxPolls}秒)`);
                    }
                    setTimeout(poll, 1000);
                } else {
                    reject(new Error('轮询超时：无法获取完成状态'));
                }
            } catch (error) {
                pollCount++;
                if (pollCount < maxPolls) {
                    setTimeout(poll, 1000);
                } else {
                    reject(new Error(`轮询失败: ${error.message}`));
                }
            }
        };

        console.log('🔍 开始轮询检查任务完成状态...');
        poll();
    }

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

            const outputs = history.outputs;
            let videoInfo = null;
            let foundNode = null;

            for (const nodeId in outputs) {
                const output = outputs[nodeId];

                if (output.videos && output.videos.length > 0) {
                    videoInfo = output.videos[0];
                    foundNode = nodeId;
                    console.log(`✅ 找到视频输出: ${videoInfo.filename}`);
                    break;
                }

                if (output.gifs && output.gifs.length > 0) {
                    videoInfo = output.gifs[0];
                    foundNode = nodeId;
                    console.log(`✅ 找到 GIF/视频输出: ${videoInfo.filename}`);
                    break;
                }
            }

            if (videoInfo) {
                console.log(`✅ SVD 视频生成完成: ${videoInfo.filename}`);
                resolve({
                    success: true,
                    videoUrl: `${this.baseUrl}/view?filename=${videoInfo.filename}&type=output`,
                    filename: videoInfo.filename,
                    engine: 'SVD'
                });
            } else {
                console.error('❌ 未找到视频输出');
                reject(new Error('未找到生成的视频文件'));
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

const comfyuiUrl = process.env.COMFYUI_URL || 'http://localhost:8188';
const svdAPI = new ComfyUISVDAPI(comfyuiUrl);

// 健康检查
app.get('/health', async (req, res) => {
    try {
        const response = await axios.get(`${comfyuiUrl}/system_stats`, {
            timeout: 5000
        });
        res.json({
            status: 'healthy',
            comfyui: 'online',
            comfyui_url: comfyuiUrl,
            engine: 'SVD (Stable Video Diffusion)',
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

// SVD 视频生成 API
app.post('/generate-video', async (req, res) => {
    try {
        const {
            imagePath,          // 图片文件路径
            motionBucketId = 127,  // 运动幅度 (1-255, 推荐 100-150)
            fps = 6,                // 帧率 (推荐 6-8)
            augmentationLevel = 0.0 // 图像增强 (0.0 = 保持原图)
        } = req.body;

        if (!imagePath) {
            return res.status(400).json({
                error: '缺少必需参数: imagePath'
            });
        }

        console.log(`🎬 开始生成 SVD 视频`);
        console.log(`📝 参数: motionBucketId=${motionBucketId}, fps=${fps}, augmentation=${augmentationLevel}`);

        const result = await svdAPI.generateVideo(
            imagePath,
            motionBucketId,
            fps,
            augmentationLevel
        );

        res.json(result);

    } catch (error) {
        console.error('❌ API 错误:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// 参数说明
app.get('/parameters', (req, res) => {
    res.json({
        parameters: {
            motionBucketId: {
                description: '运动幅度控制',
                range: '1-255',
                default: 127,
                recommended: '100-150 (数值越大运动越明显)',
                examples: {
                    50: '非常轻微的运动',
                    100: '轻微运动（推荐人物特写）',
                    127: '中等运动',
                    150: '明显运动',
                    200: '强烈运动'
                }
            },
            fps: {
                description: '帧率',
                range: '1-30',
                default: 6,
                recommended: '6-8 (平衡流畅度和文件大小)',
                note: '25帧总数，fps=6时约4.2秒，fps=8时约3.1秒'
            },
            augmentationLevel: {
                description: '图像增强级别',
                range: '0.0-1.0',
                default: 0.0,
                recommended: '0.0 (保持原图细节)',
                note: '0.0 = 完全保持原图，数值越大变化越大'
            }
        }
    });
});

const PORT = process.env.SVD_API_PORT || 3002;
app.listen(PORT, () => {
    console.log(`🚀 ComfyUI SVD API 服务器启动在端口 ${PORT}`);
    console.log(`📍 健康检查: http://localhost:${PORT}/health`);
    console.log(`🎬 视频生成: POST http://localhost:${PORT}/generate-video`);
    console.log(`📖 参数说明: GET http://localhost:${PORT}/parameters`);
    console.log(`\n⚙️  关键参数:`);
    console.log(`   - motionBucketId: 运动幅度 (推荐 100-150)`);
    console.log(`   - fps: 帧率 (推荐 6-8)`);
    console.log(`   - augmentationLevel: 图像增强 (推荐 0.0)`);
});

module.exports = ComfyUISVDAPI;

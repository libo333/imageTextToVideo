require('dotenv').config();
const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');

class ComfyUICogVideoAPI {
    constructor(comfyuiUrl = 'http://localhost:8188') {
        this.baseUrl = comfyuiUrl;
        this.clientId = Math.random().toString(36).substring(7);
    }

    // CogVideoX 1.5 I2V工作流模板（图片转视频）
    getCogVideoWorkflow(uploadedFilename, prompt = '', fps = 16, numFrames = 80) {
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
                    "prompt": prompt || "高质量视频，流畅动作，清晰细节",
                    "image": ["1", 0],
                    "num_frames": numFrames,           // 80帧（5秒）
                    "num_inference_steps": 20,         // 50→20步，大幅减少时间
                    "guidance_scale": 6.0,
                    "use_dynamic_cfg": true,
                    "seed": Math.floor(Math.random() * 1000000000),
                    "interpolation_factor": 1,         // 3→1，禁用插帧（保持原时长）
                    "flow_precision": 0.3,             // 0.5→0.3，降低精度换速度
                    "motion_threshold": 0.15,          // 提高阈值，减少处理
                    "smoothness": 0.3,                 // 0.5→0.3，减少平滑处理
                    "flow_method": "Farneback",        // DIS→Farneback，更快的方法
                    "edge_mode": "Replicate",
                    "interpolation_strength": 0.5,     // 1.0→0.5，减弱插值强度
                    "upscale_factor": 1.0              // 保持1.0，不放大
                },
                "class_type": "CogVideoX Image-2-Video Extended"
            },
            "3": {
                "inputs": {
                    "video": ["2", 0],
                    "filename_prefix": `cogvideo_${Date.now()}`,
                    "fps": fps
                },
                "class_type": "CogVideoX Save Video"
            }
        };
    }

    // CogVideoX 1.5 T2V工作流模板（文字转视频）
    getCogVideoT2VWorkflow(prompt, negativePrompt = '', fps = 16, numFrames = 80) {
        const seed = Math.floor(Math.random() * 1000000000);
        return {
            "0": {
                "inputs": {
                    "width": 1024,
                    "height": 576,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "1": {
                "inputs": {
                    "clip_name": "t5xxl_fp8_e4m3fn.safetensors",
                    "type": "sd3"
                },
                "class_type": "CLIPLoader"
            },
            "2": {
                "inputs": {
                    "model": "kijai/CogVideoX-5b-1.5-T2V",
                    "precision": "bf16",
                    "quantization": "disabled",
                    "enable_sequential_cpu_offload": false
                },
                "class_type": "DownloadAndLoadCogVideoModel"
            },
            "3": {
                "inputs": {
                    "clip": ["1", 0],
                    "prompt": prompt || "high quality video",
                    "strength": 1.0,
                    "force_offload": true
                },
                "class_type": "CogVideoTextEncode"
            },
            "4": {
                "inputs": {
                    "clip": ["1", 0],
                    "prompt": negativePrompt || "blurry, low quality, distorted, warped, deformed, grainy, blinking, mouth movement, text, watermark, artifacts, glitches, jerky motion",
                    "strength": 1.0,
                    "force_offload": true
                },
                "class_type": "CogVideoTextEncode"
            },
            "5": {
                "inputs": {
                    "model": ["2", 0],
                    "positive": ["3", 0],
                    "negative": ["4", 0],
                    "num_frames": numFrames,
                    "steps": 100,
                    "cfg": 8.0,
                    "seed": seed,
                    "scheduler": "CogVideoXDDIM",
                    "denoise_strength": 1.0,
                    "samples": ["0", 0]
                },
                "class_type": "CogVideoSampler"
            },
            "6": {
                "inputs": {
                    "vae": ["2", 1],
                    "samples": ["5", 0],
                    "enable_vae_tiling": true,
                    "tile_sample_min_height": 240,
                    "tile_sample_min_width": 360,
                    "tile_overlap_factor_height": 0.2,
                    "tile_overlap_factor_width": 0.2,
                    "auto_tile_size": true
                },
                "class_type": "CogVideoDecode"
            },
            "7": {
                "inputs": {
                    "images": ["6", 0],
                    "fps": fps
                },
                "class_type": "CreateVideo"
            },
            "8": {
                "inputs": {
                    "video": ["7", 0],
                    "filename_prefix": `t2v_${Date.now()}`,
                    "format": "mp4",
                    "codec": "h264"
                },
                "class_type": "SaveVideo"
            }
        };
    }

    // T2V视频生成（纯文字转视频）
    async generateT2VVideo(prompt, negativePrompt = '', fps = 16, numFrames = 80) {
        try {
            // 增强提示词质量 - 更科学的处理
            let enhancedPrompt = prompt.trim();
            
            // 检查是否包含质量相关词汇
            const qualityKeywords = ['quality', 'detailed', 'smooth', 'cinematic', 'professional', '4k', 'high definition'];
            const hasQuality = qualityKeywords.some(keyword => enhancedPrompt.toLowerCase().includes(keyword));
            
            if (!hasQuality) {
                // 添加质量提示词到开头（权重更高）
                enhancedPrompt = 'high quality, smooth motion, cinematic, professional. ' + enhancedPrompt;
            }
            
            const enhancedNegativePrompt = negativePrompt || 'blurry, low quality, distorted, warped, deformed, grainy, blinking, mouth movement, text, watermark, artifacts, glitches, jerky motion';

            console.log('📋 CogVideoX T2V 生成参数:', {
                originalPrompt: prompt.substring(0, 100),
                enhancedPrompt: enhancedPrompt.substring(0, 150),
                negativePrompt: enhancedNegativePrompt.substring(0, 100),
                fps,
                numFrames,
                duration: `${(numFrames / fps).toFixed(1)}秒`,
                resolution: '1024x576',
                steps: 100,
                cfg: 8.0
            });

            // 1. 准备T2V工作流
            const workflow = this.getCogVideoT2VWorkflow(enhancedPrompt, enhancedNegativePrompt, fps, numFrames);

            console.log('📦 CogVideoX T2V 工作流节点数:', Object.keys(workflow).length);

            // 2. 提交任务
            const response = await axios.post(`${this.baseUrl}/prompt`, {
                prompt: workflow,
                client_id: this.clientId
            });

            const promptId = response.data.prompt_id;
            console.log(`📋 CogVideoX T2V 任务已提交: ${promptId}`);

            // 3. 等待生成完成
            const result = await this.waitForCompletion(promptId);
            return result;

        } catch (error) {
            console.error('❌ CogVideoX T2V 生成失败:', error.message);
            if (error.response) {
                console.error('❌ 错误响应状态:', error.response.status);
                console.error('❌ 错误响应数据:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }

    async generateVideo(imagePath, prompt = '', fps = 16, numFrames = 80) {
        try {
            console.log('📋 CogVideoX 生成参数:', {
                prompt,
                fps,
                numFrames,
                duration: `${(numFrames / fps).toFixed(1)}秒`,
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
            const workflow = this.getCogVideoWorkflow(uploadedFilename, prompt, fps, numFrames);

            console.log('📦 CogVideoX 工作流节点数:', Object.keys(workflow).length);

            // 3. 提交任务
            const response = await axios.post(`${this.baseUrl}/prompt`, {
                prompt: workflow,
                client_id: this.clientId
            });

            const promptId = response.data.prompt_id;
            console.log(`📋 CogVideoX 任务已提交: ${promptId}`);

            // 4. 等待生成完成
            const result = await this.waitForCompletion(promptId);
            return result;

        } catch (error) {
            console.error('❌ CogVideoX 生成失败:', error.message);
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
            const timeout = 3600000; // 60分钟超时（高分辨率生成可能需要很长时间）

            const timeoutId = setTimeout(() => {
                if (!isResolved) {
                    ws.close();
                    console.log('❌ WebSocket 60分钟超时，尝试轮询获取结果...');
                    this.pollForCompletion(promptId).then(resolve).catch(reject);
                }
            }, timeout);

            ws.on('open', () => {
                console.log('🎥 WebSocket 已连接，开始监控 CogVideoX 视频生成进度...');
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());

                    if (message.type === 'executing' && message.data.node) {
                        console.log(`🎨 正在执行节点 #${message.data.node}...`);
                    }

                    if (message.type === 'progress') {
                        const progress = Math.round((message.data.value / message.data.max) * 100);
                        console.log(`⏳ 生成进度: ${progress}% (${message.data.value}/${message.data.max})`);
                    }

                    if (message.type === 'execution_error') {
                        clearTimeout(timeoutId);
                        isResolved = true;
                        ws.close();
                        reject(new Error(`生成失败: ${JSON.stringify(message.data)}`));
                    }

                    if (message.type === 'executed' && message.data.prompt_id === promptId) {
                        clearTimeout(timeoutId);
                        if (isResolved) return;
                        isResolved = true;
                        ws.close();

                        console.log('✅ CogVideoX 执行完成，获取结果...');
                        this.retrieveVideo(promptId, resolve, reject);
                    }

                } catch (error) {
                    console.error('❌ WebSocket 消息解析错误:', error);
                }
            });

            ws.on('close', () => {
                console.log(`⚠️ WebSocket 已关闭 (isResolved=${isResolved})`);
                if (!isResolved) {
                    clearTimeout(timeoutId);
                    this.pollForCompletion(promptId).then(resolve).catch(reject);
                }
            });

            ws.on('error', (error) => {
                console.error('❌ WebSocket 错误:', error);
                clearTimeout(timeoutId);
                if (!isResolved) {
                    isResolved = true;
                    this.pollForCompletion(promptId).then(resolve).catch(reject);
                }
            });
        });
    }

    async pollForCompletion(promptId) {
        console.log('🔍 开始轮询检查任务完成状态...');

        let pollCount = 0;
        const maxPolls = 1800; // 30分钟（1800秒）

        return new Promise((resolve, reject) => {
            const poll = async () => {
                if (pollCount >= maxPolls) {
                    reject(new Error('轮询超时：无法获取完成状态'));
                    return;
                }

                pollCount++;

                try {
                    const historyResponse = await axios.get(`${this.baseUrl}/history/${promptId}`, {
                        timeout: 10000
                    });

                    const promptHistory = historyResponse.data[promptId];

                    if (!promptHistory) {
                        if (pollCount % 10 === 0) {
                            console.log(`⏳ 轮询中... (${pollCount * 1}/${maxPolls}秒)`);
                        }
                        setTimeout(poll, 1000);
                        return;
                    }

                    const outputs = promptHistory.outputs || {};

                    for (const nodeId in outputs) {
                        const nodeOutput = outputs[nodeId];

                        // 检查标准 videos 格式
                        if (nodeOutput.videos && nodeOutput.videos.length > 0) {
                            const videoInfo = nodeOutput.videos[0];
                            console.log(`✅ CogVideoX 视频生成完成: ${videoInfo.filename}`);
                            resolve({
                                success: true,
                                videoUrl: `${this.baseUrl}/view?filename=${videoInfo.filename}&type=output`,
                                filename: videoInfo.filename,
                                engine: 'CogVideoX'
                            });
                            return;
                        }

                        // 检查 gifs 格式
                        if (nodeOutput.gifs && nodeOutput.gifs.length > 0) {
                            const videoInfo = nodeOutput.gifs[0];
                            console.log(`✅ CogVideoX 视频生成完成: ${videoInfo.filename}`);
                            resolve({
                                success: true,
                                videoUrl: `${this.baseUrl}/view?filename=${videoInfo.filename}&type=output`,
                                filename: videoInfo.filename,
                                engine: 'CogVideoX'
                            });
                            return;
                        }

                        // 检查 SaveVideo 节点的 images 输出格式（实际包含视频文件）
                        if (nodeOutput.images && nodeOutput.images.length > 0) {
                            const imageInfo = nodeOutput.images[0];
                            // 检查是否是视频文件
                            if (imageInfo.filename && /\.(mp4|webm|avi|mov|mkv)$/i.test(imageInfo.filename)) {
                                console.log(`✅ CogVideoX 视频生成完成: ${imageInfo.filename}`);
                                resolve({
                                    success: true,
                                    videoUrl: `${this.baseUrl}/view?filename=${imageInfo.filename}&type=output`,
                                    filename: imageInfo.filename,
                                    engine: 'CogVideoX'
                                });
                                return;
                            }
                        }

                        // 检查 CogVideoX Save Video 节点的 text 输出格式
                        if (nodeOutput.text && Array.isArray(nodeOutput.text)) {
                            const textOutput = nodeOutput.text.join('');
                            const match = textOutput.match(/([^\/\\]+\.mp4)$/);
                            if (match) {
                                const filename = match[1];
                                console.log(`✅ CogVideoX 视频生成完成: ${filename}`);
                                resolve({
                                    success: true,
                                    videoUrl: `${this.baseUrl}/view?filename=${filename}&type=output`,
                                    filename: filename,
                                    engine: 'CogVideoX'
                                });
                                return;
                            }
                        }
                    }

                    if (pollCount % 10 === 0) {
                        console.log(`⏳ 轮询中... (${pollCount}/${maxPolls}秒)`);
                    }
                    setTimeout(poll, 1000);

                } catch (error) {
                    if (pollCount % 30 === 0) {
                        console.log(`⚠️ 轮询请求失败 (${pollCount}/${maxPolls}): ${error.message}`);
                    }
                    setTimeout(poll, 1000);
                }
            };

            poll();
        });
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

            console.log(`📊 任务完成状态:`, {
                status: history.status?.status_str || 'unknown',
                outputNodes: Object.keys(history.outputs).length,
                promptedNodes: history.prompt ? Object.keys(history.prompt[2]).length : 0
            });

            const outputs = history.outputs;
            let videoInfo = null;
            let debugInfo = [];

            for (const nodeId in outputs) {
                const output = outputs[nodeId];
                const keys = Object.keys(output);
                debugInfo.push(`节点 ${nodeId}: [${keys.join(', ')}]`);

                // 检查标准的 videos 输出格式
                if (output.videos && output.videos.length > 0) {
                    videoInfo = output.videos[0];
                    console.log(`✅ 找到视频输出: ${videoInfo.filename}`);
                    break;
                }

                // 检查 gifs 输出格式
                if (output.gifs && output.gifs.length > 0) {
                    videoInfo = output.gifs[0];
                    console.log(`✅ 找到 GIF/视频输出: ${videoInfo.filename}`);
                    break;
                }

                // 检查 SaveVideo 节点的 images 输出格式（实际包含视频文件）
                if (output.images && output.images.length > 0) {
                    const imageInfo = output.images[0];
                    // 检查是否是视频文件（.mp4, .webm, .avi 等）
                    if (imageInfo.filename && /\.(mp4|webm|avi|mov|mkv)$/i.test(imageInfo.filename)) {
                        videoInfo = imageInfo;
                        console.log(`✅ 找到视频文件（images字段）: ${videoInfo.filename}`);
                        break;
                    } else {
                        console.log(`⚠️ images 字段包含非视频文件: ${imageInfo.filename}`);
                    }
                }

                // 检查 CogVideoX Save Video 节点的 text 输出格式
                if (output.text && Array.isArray(output.text)) {
                    // text 是字符数组，需要组合成字符串
                    const textOutput = output.text.join('');
                    console.log(`📝 文本输出: ${textOutput.substring(0, 100)}...`);

                    // 从路径中提取文件名
                    const match = textOutput.match(/([^\/\\]+\.mp4)$/);
                    if (match) {
                        const filename = match[1];
                        videoInfo = { filename };
                        console.log(`✅ 从文本输出中找到视频: ${filename}`);
                        break;
                    }
                }
            }

            if (debugInfo.length > 0) {
                console.log(`📦 所有输出节点信息:`);
                debugInfo.forEach(info => console.log(`   - ${info}`));
            }

            if (videoInfo) {
                console.log(`✅ CogVideoX 视频生成完成: ${videoInfo.filename}`);
                resolve({
                    success: true,
                    videoUrl: `${this.baseUrl}/view?filename=${videoInfo.filename}&type=output`,
                    filename: videoInfo.filename,
                    engine: 'CogVideoX'
                });
            } else {
                console.error('❌ 未找到视频输出');
                console.error('输出内容:', JSON.stringify(outputs, null, 2));
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
const cogVideoAPI = new ComfyUICogVideoAPI(comfyuiUrl);

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
            engine: 'CogVideoX 1.5 (5B I2V)',
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

// CogVideoX 视频生成 API
app.post('/generate-video', async (req, res) => {
    try {
        const {
            imagePath,          // 图片文件路径
            prompt = '',        // 提示词
            fps = 16,          // 帧率
            numFrames = 80     // 总帧数（80帧 = 5秒）
        } = req.body;

        if (!imagePath) {
            return res.status(400).json({
                error: '缺少必需参数: imagePath'
            });
        }

        console.log(`🎬 开始生成 CogVideoX 视频`);
        console.log(`📝 参数: prompt="${prompt}", fps=${fps}, frames=${numFrames}`);

        const result = await cogVideoAPI.generateVideo(
            imagePath,
            prompt,
            fps,
            numFrames
        );

        res.json(result);

    } catch (error) {
        console.error('❌ API 错误:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// CogVideoX T2V（文字转视频）API
app.post('/generate-t2v', async (req, res) => {
    try {
        const {
            prompt,              // 提示词（必需）
            negativePrompt = '', // 负面提示词
            fps = 16,            // 帧率（T2V默认16fps）
            numFrames = 80      // 总帧数（80帧 = 约5秒）
        } = req.body;

        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({
                error: '缺少必需参数: prompt (提示词不能为空)'
            });
        }

        console.log(`🎬 开始生成 CogVideoX T2V 视频`);
        console.log(`📝 参数: prompt="${prompt}", negativePrompt="${negativePrompt}", fps=${fps}, frames=${numFrames}`);

        const result = await cogVideoAPI.generateT2VVideo(
            prompt,
            negativePrompt,
            fps,
            numFrames
        );

        res.json(result);

    } catch (error) {
        console.error('❌ T2V API 错误:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// 参数说明
app.get('/parameters', (req, res) => {
    res.json({
        parameters: {
            prompt: {
                description: '视频生成提示词',
                type: 'string',
                default: '高质量视频，流畅动作，清晰细节',
                examples: [
                    '镜头缓慢推进，细节清晰',
                    '人物自然微笑，头发随风飘动',
                    '画面明亮，色彩鲜艳'
                ]
            },
            fps: {
                description: '视频帧率',
                type: 'number',
                default: 16,
                range: '8-24',
                recommended: 16
            },
            numFrames: {
                description: '总帧数',
                type: 'number',
                default: 80,
                options: {
                    49: '3秒 (48帧)',
                    80: '5秒 (80帧)',
                    113: '7秒 (112帧)',
                    161: '10秒 (160帧)'
                },
                note: '帧数越多，生成时间越长，VRAM占用越高'
            }
        },
        notes: [
            '⚠️ CogVideoX生成时间较长（5-10分钟）',
            '⚠️ 请确保有足够的VRAM（推荐16GB+）',
            '⚠️ 模型使用CogVideoX License，不可商用'
        ]
    });
});

const PORT = process.env.COGVIDEO_API_PORT || 3003;

app.listen(PORT, () => {
    console.log(`🚀 ComfyUI CogVideoX API 服务器启动在端口 ${PORT}`);
    console.log(`📍 健康检查: http://localhost:${PORT}/health`);
    console.log(`🎬 视频生成: POST http://localhost:${PORT}/generate-video`);
    console.log(`📖 参数说明: GET http://localhost:${PORT}/parameters`);
    console.log(``);
    console.log(`⚙️  关键参数:`);
    console.log(`   - prompt: 提示词`);
    console.log(`   - fps: 帧率 (推荐 16)`);
    console.log(`   - numFrames: 帧数 (80=5秒, 160=10秒)`);
    console.log(``);
    console.log(`⚠️  注意: CogVideoX生成需要5-10分钟`);
});

module.exports = ComfyUICogVideoAPI;

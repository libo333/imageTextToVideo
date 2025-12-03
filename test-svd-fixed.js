// 直接测试修复后的 SVD API 类
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

class ComfyUISVDAPI {
    constructor(comfyuiUrl = 'http://192.168.20.59:8188') {
        this.baseUrl = comfyuiUrl;
        this.clientId = Math.random().toString(36).substring(7);
    }

    // 修复后的 SVD 工作流 - 添加时间戳防止缓存
    getSVDWorkflow(imageBase64, motionBucketId = 127, fps = 6, augmentationLevel = 0.0) {
        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

        return {
            "1": {
                "inputs": {
                    "base64_data": base64Data,
                    "image_output": "Hide",
                    "save_prefix": `ComfyUI_${Date.now()}_${Math.floor(Math.random() * 1000)}`
                },
                "class_type": "easy loadImageBase64"
            },
            "2": {
                "inputs": {
                    "ckpt_name": "svd_xt.safetensors"
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
                    "interpolation": "LANCZOS",
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

    async generateVideo(imageBase64, motionBucketId = 100, fps = 6, augmentationLevel = 0.0) {
        try {
            console.log('📋 SVD 生成参数:', {
                motionBucketId,
                fps,
                augmentationLevel
            });

            const workflow = this.getSVDWorkflow(imageBase64, motionBucketId, fps, augmentationLevel);
            console.log('📦 SVD 工作流节点数:', Object.keys(workflow).length);

            const response = await axios.post(`${this.baseUrl}/prompt`, {
                prompt: workflow,
                client_id: this.clientId
            });

            const promptId = response.data.prompt_id;
            console.log(`📋 SVD 任务已提交: ${promptId}\n`);

            // 轮询等待完成
            return await this.pollForCompletion(promptId);

        } catch (error) {
            console.error('❌ SVD 生成失败:', error.message);
            throw error;
        }
    }

    async pollForCompletion(promptId) {
        let pollCount = 0;
        const maxPolls = 240; // 4分钟

        while (pollCount < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            pollCount++;

            try {
                const historyResponse = await axios.get(`${this.baseUrl}/history/${promptId}`, {
                    timeout: 5000
                });

                const promptHistory = historyResponse.data[promptId];

                if (!promptHistory) {
                    if (pollCount % 10 === 0) {
                        console.log(`⏳ [${pollCount}s] 等待任务创建...`);
                    }
                    continue;
                }

                const status = promptHistory.status?.status_str || 'unknown';

                if (pollCount % 5 === 0) {
                    console.log(`⏳ [${pollCount}s] 状态: ${status}`);
                }

                const outputs = promptHistory.outputs || {};

                for (const nodeId in outputs) {
                    const nodeOutput = outputs[nodeId];

                    if (nodeOutput.videos && nodeOutput.videos.length > 0) {
                        const videoInfo = nodeOutput.videos[0];
                        console.log(`\n✅ SVD 视频生成完成: ${videoInfo.filename}`);
                        return {
                            success: true,
                            videoUrl: `${this.baseUrl}/view?filename=${videoInfo.filename}&type=output`,
                            filename: videoInfo.filename,
                            engine: 'SVD'
                        };
                    }

                    if (nodeOutput.gifs && nodeOutput.gifs.length > 0) {
                        const videoInfo = nodeOutput.gifs[0];
                        console.log(`\n✅ SVD 视频生成完成: ${videoInfo.filename}`);
                        return {
                            success: true,
                            videoUrl: `${this.baseUrl}/view?filename=${videoInfo.filename}&type=output`,
                            filename: videoInfo.filename,
                            engine: 'SVD'
                        };
                    }
                }
            } catch (error) {
                if (pollCount % 30 === 0) {
                    console.log(`⚠️ [${pollCount}s] 轮询请求失败: ${error.message}`);
                }
            }
        }

        throw new Error('轮询超时：无法获取完成状态');
    }
}

async function testFixed() {
    try {
        console.log('🧪 测试修复后的 SVD API...\n');

        // 1. 读取测试图片
        const tempDir = path.join(__dirname, 'temp');
        const files = fs.readdirSync(tempDir).filter(f => f.match(/\.(jpg|jpeg|png)$/i));

        if (files.length === 0) {
            console.log('❌ temp 目录没有图片文件');
            return;
        }

        const imageFile = files[0];
        const imagePath = path.join(tempDir, imageFile);
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

        console.log('✅ 使用图片:', imageFile);
        console.log('✅ 图片大小:', (base64Image.length / 1024).toFixed(2), 'KB\n');

        // 2. 使用修复后的 API 生成视频
        const svdAPI = new ComfyUISVDAPI('http://192.168.20.59:8188');

        const startTime = Date.now();
        const result = await svdAPI.generateVideo(base64Image, 100, 6, 0.0);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n✅ 生成成功！耗时:', duration, '秒');
        console.log('📹 视频URL:', result.videoUrl);
        console.log('📝 文件名:', result.filename);

    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
    }
}

testFixed();

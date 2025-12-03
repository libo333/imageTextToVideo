// 直接测试 ComfyUI SVD 工作流
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testDirectComfyUI() {
    try {
        console.log('🧪 直接测试 ComfyUI SVD 工作流...\n');

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
        const base64Data = imageBuffer.toString('base64');

        console.log('✅ 使用图片:', imageFile);
        console.log('✅ Base64 大小:', (base64Data.length / 1024).toFixed(2), 'KB\n');

        // 2. 构建 SVD 工作流
        const workflow = {
            "1": {
                "inputs": {
                    "base64_data": base64Data,
                    "image_output": "Hide",
                    "save_prefix": "ComfyUI"
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
                    "motion_bucket_id": 100,
                    "fps": 6,
                    "augmentation_level": 0.0,
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
                    "frame_rate": 6,
                    "loop_count": 0,
                    "filename_prefix": "svd_test",
                    "format": "video/h264-mp4",
                    "pingpong": false,
                    "save_output": true
                },
                "class_type": "VHS_VideoCombine"
            }
        };

        console.log('📦 工作流准备完成，节点数:', Object.keys(workflow).length);
        console.log('📋 提交任务到 ComfyUI...\n');

        const clientId = Math.random().toString(36).substring(7);
        const startTime = Date.now();

        // 3. 提交工作流
        const response = await axios.post('http://192.168.20.59:8188/prompt', {
            prompt: workflow,
            client_id: clientId
        }, {
            timeout: 10000
        });

        const promptId = response.data.prompt_id;
        const submitTime = Date.now() - startTime;

        console.log('✅ 任务提交成功！');
        console.log('📋 Prompt ID:', promptId);
        console.log('⏱️  提交耗时:', submitTime, 'ms\n');

        // 4. 轮询检查完成状态
        console.log('🔍 开始轮询检查完成状态...\n');

        let pollCount = 0;
        const maxPolls = 300; // 5分钟
        let completed = false;

        while (pollCount < maxPolls && !completed) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            pollCount++;

            try {
                const historyResponse = await axios.get(`http://192.168.20.59:8188/history/${promptId}`, {
                    timeout: 5000
                });

                const history = historyResponse.data[promptId];

                if (history) {
                    const status = history.status?.status_str || 'unknown';
                    console.log(`⏳ [${pollCount}s] 状态: ${status}`);

                    if (history.outputs && Object.keys(history.outputs).length > 0) {
                        console.log('\n✅ 发现输出！');
                        console.log('📊 输出节点:', Object.keys(history.outputs));

                        for (const nodeId in history.outputs) {
                            const output = history.outputs[nodeId];
                            if (output.videos) {
                                console.log(`✅ 视频文件: ${output.videos[0].filename}`);
                            }
                            if (output.gifs) {
                                console.log(`✅ GIF文件: ${output.gifs[0].filename}`);
                            }
                        }

                        completed = true;
                        break;
                    }
                } else {
                    if (pollCount % 10 === 0) {
                        console.log(`⏳ [${pollCount}s] 等待任务创建...`);
                    }
                }
            } catch (error) {
                if (pollCount % 30 === 0) {
                    console.log(`⚠️ [${pollCount}s] 轮询请求失败: ${error.message}`);
                }
            }
        }

        if (!completed) {
            console.log('\n❌ 轮询超时！任务未完成');
        } else {
            const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`\n🎉 测试完成！总耗时: ${totalTime} 秒`);
        }

    } catch (error) {
        console.error('\n❌ 测试失败:');
        console.error('   错误信息:', error.message);

        if (error.response) {
            console.error('   HTTP状态:', error.response.status);
            console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testDirectComfyUI();

// 简化的 SVD 测试 - 使用最基本的工作流
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testBasicSVD() {
    try {
        console.log('🧪 测试基本 SVD 工作流...\n');

        // 读取测试图片
        const tempDir = path.join(__dirname, 'temp');
        const files = fs.readdirSync(tempDir).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
        const imageFile = files[0];
        const imagePath = path.join(tempDir, imageFile);

        console.log('✅ 使用图片:', imageFile);

        // 直接上传图片文件到 ComfyUI
        const FormData = require('form-data');
        const form = new FormData();
        form.append('image', fs.createReadStream(imagePath));

        console.log('📤 上传图片到 ComfyUI...');
        const uploadResponse = await axios.post('http://192.168.20.59:8188/upload/image', form, {
            headers: form.getHeaders()
        });

        console.log('✅ 图片上传成功:', uploadResponse.data);

        const uploadedFilename = uploadResponse.data.name;
        const uploadedSubfolder = uploadResponse.data.subfolder || '';

        // 使用上传的图片创建工作流
        const timestamp = Date.now();
        const workflow = {
            "3": {
                "inputs": {
                    "image": uploadedFilename,
                    "upload": "image"
                },
                "class_type": "LoadImage",
                "_meta": {
                    "title": "Load Image"
                }
            },
            "4": {
                "inputs": {
                    "ckpt_name": "svd_xt.safetensors"
                },
                "class_type": "ImageOnlyCheckpointLoader",
                "_meta": {
                    "title": "ImageOnlyCheckpointLoader"
                }
            },
            "5": {
                "inputs": {
                    "width": 1024,
                    "height": 576,
                    "video_frames": 14,
                    "motion_bucket_id": 100,
                    "fps": 6,
                    "augmentation_level": 0,
                    "clip_vision": ["4", 1],
                    "init_image": ["3", 0],
                    "vae": ["4", 2]
                },
                "class_type": "SVD_img2vid_Conditioning",
                "_meta": {
                    "title": "SVD_img2vid_Conditioning"
                }
            },
            "6": {
                "inputs": {
                    "min_cfg": 1,
                    "model": ["4", 0]
                },
                "class_type": "VideoLinearCFGGuidance",
                "_meta": {
                    "title": "VideoLinearCFGGuidance"
                }
            },
            "7": {
                "inputs": {
                    "seed": Math.floor(Math.random() * 1000000000),
                    "steps": 20,
                    "cfg": 2.5,
                    "sampler_name": "euler",
                    "scheduler": "karras",
                    "denoise": 1,
                    "model": ["6", 0],
                    "positive": ["5", 0],
                    "negative": ["5", 1],
                    "latent_image": ["5", 2]
                },
                "class_type": "KSampler",
                "_meta": {
                    "title": "KSampler"
                }
            },
            "8": {
                "inputs": {
                    "samples": ["7", 0],
                    "vae": ["4", 2]
                },
                "class_type": "VAEDecode",
                "_meta": {
                    "title": "VAE Decode"
                }
            },
            "9": {
                "inputs": {
                    "frame_rate": 6,
                    "loop_count": 0,
                    "filename_prefix": `svd_test_${timestamp}`,
                    "format": "video/h264-mp4",
                    "pix_fmt": "yuv420p",
                    "crf": 19,
                    "save_metadata": true,
                    "pingpong": false,
                    "save_output": true,
                    "images": ["8", 0]
                },
                "class_type": "VHS_VideoCombine",
                "_meta": {
                    "title": "Video Combine"
                }
            }
        };

        console.log('📋 提交 SVD 工作流...\n');

        const clientId = Math.random().toString(36).substring(7);
        const response = await axios.post('http://192.168.20.59:8188/prompt', {
            prompt: workflow,
            client_id: clientId
        });

        const promptId = response.data.prompt_id;
        console.log('✅ 任务已提交:', promptId);
        console.log('🔍 开始监控...\n');

        // 轮询检查
        let pollCount = 0;
        const maxPolls = 300;

        while (pollCount < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            pollCount++;

            const historyResponse = await axios.get(`http://192.168.20.59:8188/history/${promptId}`);
            const history = historyResponse.data[promptId];

            if (history && pollCount % 5 === 0) {
                console.log(`⏳ [${pollCount * 2}s] 状态:`, history.status?.status_str || 'unknown');
            }

            if (history && history.outputs && Object.keys(history.outputs).length > 0) {
                console.log('\n✅ 找到输出！');
                for (const nodeId in history.outputs) {
                    const output = history.outputs[nodeId];
                    console.log(`节点 ${nodeId}:`, JSON.stringify(output, null, 2));
                }
                break;
            }
        }

    } catch (error) {
        console.error('\n❌ 错误:', error.message);
        if (error.response) {
            console.error('响应:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testBasicSVD();

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class ComfyUIEasyAnimateAPI {
    constructor(host = 'http://192.168.20.59:8188') {
        this.host = host;
        this.client_id = this.generateClientId();
    }

    generateClientId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    // Text-to-Video 工作流模板
    createT2VWorkflow(prompt, aspectRatio = '768:512', numFrames = 49) {
        // EasyAnimate V5 限制：video_length最大49，必须是4的倍数
        const validFrames = Math.min(Math.floor(numFrames / 4) * 4, 49);

        return {
            "1": {
                "inputs": {
                    "model": "EasyAnimateV5.1-12b-zh",
                    "GPU_memory_mode": "model_cpu_offload",
                    "model_type": "Inpaint",
                    "config": "easyanimate_video_v5.1_magvit_qwen.yaml",
                    "precision": "bf16"
                },
                "class_type": "LoadEasyAnimateModel",
                "_meta": {
                    "title": "LoadEasyAnimateModel"
                }
            },
            "2": {
                "inputs": {
                    "easyanimate_model": ["1", 0],
                    "prompt": prompt,
                    "negative_prompt": "",
                    "video_length": validFrames, // 使用修正后的帧数
                    "width": parseInt(aspectRatio.split(':')[0]) || 768,
                    "height": parseInt(aspectRatio.split(':')[1]) || 512,
                    "is_image": false,
                    "seed": Math.floor(Math.random() * 1000000000),
                    "steps": 25,
                    "cfg": 7.0,
                    "scheduler": "Flow",
                    "teacache_threshold": 0.1,
                    "enable_teacache": true
                },
                "class_type": "EasyAnimateV5_T2VSampler",
                "_meta": {
                    "title": "EasyAnimate T2V Sampler"
                }
            },
            "3": {
                "inputs": {
                    "images": ["2", 0],
                    "frame_rate": 24,
                    "loop_count": 0,
                    "filename_prefix": "EasyAnimate_T2V",
                    "format": "video/h264-mp4",
                    "pix_fmt": "yuv420p",
                    "crf": 20,
                    "save_metadata": true,
                    "pingpong": false,
                    "save_output": true
                },
                "class_type": "VHS_VideoCombine",
                "_meta": {
                    "title": "Video Combine"
                }
            }
        };
    }

    async queuePrompt(workflow) {
        try {
            console.log('Sending workflow to ComfyUI...');
            const response = await axios.post(`${this.host}/prompt`, {
                prompt: workflow,
                client_id: this.client_id
            }, {
                timeout: 10000
            });

            if (response.data && response.data.prompt_id) {
                console.log('Task queued successfully:', response.data.prompt_id);
                return response.data.prompt_id;
            } else {
                throw new Error('No prompt_id returned from ComfyUI');
            }
        } catch (error) {
            console.error('Error queuing prompt:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            throw new Error(`Failed to queue task: ${error.message}`);
        }
    }

    async getTaskStatus(promptId) {
        try {
            const response = await axios.get(`${this.host}/history/${promptId}`, {
                timeout: 5000
            });

            if (!response.data || !response.data[promptId]) {
                return { status: 'PENDING', progress: 0 };
            }

            const task = response.data[promptId];

            if (task.status) {
                if (task.status.status_str === 'success') {
                    // 检查是否有输出
                    if (task.outputs) {
                        console.log('Task outputs:', task.outputs);

                        // 查找视频输出（通常在节点5：Video Combine）
                        for (const [nodeId, output] of Object.entries(task.outputs)) {
                            if (output.gifs && output.gifs.length > 0) {
                                const videoFile = output.gifs[0];
                                return {
                                    status: 'SUCCEEDED',
                                    progress: 100,
                                    videoUrl: `${this.host}/view?filename=${encodeURIComponent(videoFile.filename)}&subfolder=${encodeURIComponent(videoFile.subfolder || '')}&type=${encodeURIComponent(videoFile.type || 'output')}`,
                                    filename: videoFile.filename,
                                    subfolder: videoFile.subfolder,
                                    type: videoFile.type
                                };
                            }
                        }
                    }
                    return { status: 'SUCCEEDED', progress: 100 };
                } else if (task.status.status_str === 'error') {
                    const errorMsg = task.status.messages && task.status.messages.length > 0
                        ? task.status.messages.join('; ')
                        : 'Unknown error occurred';
                    return { status: 'FAILED', error: errorMsg };
                }
            }

            return { status: 'RUNNING', progress: 50 };
        } catch (error) {
            console.error('Error checking task status:', error.message);
            return { status: 'PENDING', progress: 0 };
        }
    }

    async generateTextToVideo(prompt, options = {}) {
        const {
            aspectRatio = '768:512',
            numFrames = 81,
            timeout = 20 * 60 * 1000 // 20分钟超时
        } = options;

        console.log('Starting T2V generation with EasyAnimate:', {
            prompt,
            aspectRatio,
            numFrames
        });

        // 创建工作流
        const workflow = this.createT2VWorkflow(prompt, aspectRatio, numFrames);

        // 提交任务
        const promptId = await this.queuePrompt(workflow);

        return {
            taskId: promptId,
            status: 'PENDING',
            progress: 0
        };
    }

    async pollTaskStatus(taskId, maxAttempts = 120) {
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const status = await this.getTaskStatus(taskId);

                if (status.status === 'SUCCEEDED' || status.status === 'FAILED') {
                    return status;
                }

                // 等待10秒后重试
                await new Promise(resolve => setTimeout(resolve, 10000));
                attempts++;

            } catch (error) {
                console.error('Error polling task status:', error.message);
                attempts++;

                if (attempts >= maxAttempts) {
                    throw new Error('Task polling timeout');
                }

                // 等待5秒后重试
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        throw new Error('Task timeout after maximum attempts');
    }
}

module.exports = ComfyUIEasyAnimateAPI;
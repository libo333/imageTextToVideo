const { ComfyUISVDAPI } = require('./comfyui-svd-api.js');

console.log('🚀 正在启动 SVD API 服务...');

// 从环境变量或默认值获取配置
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const SVD_API_PORT = process.env.SVD_API_PORT || 3002;

console.log(`📍 ComfyUI 地址: ${COMFYUI_URL}`);
console.log(`📍 SVD API 端口: ${SVD_API_PORT}`);

// 启动服务的代码已经在 comfyui-svd-api.js 中
// 这个文件只是为了提供单独启动入口
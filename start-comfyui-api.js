#!/usr/bin/env node
/**
 * ComfyUI AnimateDiff API 独立启动脚本
 *
 * 用法: node start-comfyui-api.js
 *
 * 环境变量:
 * - COMFYUI_URL: ComfyUI 服务地址（默认: http://localhost:8188）
 * - COMFYUI_API_PORT: API 服务端口（默认: 3001）
 */

require('dotenv').config();

console.log('🚀 启动 ComfyUI AnimateDiff API 服务...\n');

// 检查 ComfyUI 连接配置
const comfyuiUrl = process.env.COMFYUI_URL || 'http://localhost:8188';
const apiPort = process.env.COMFYUI_API_PORT || 3001;

console.log('📋 配置信息:');
console.log(`   ComfyUI 地址: ${comfyuiUrl}`);
console.log(`   API 端口: ${apiPort}`);
console.log('');

// 启动服务
require('./comfyui-animatediff-api.js');

console.log('\n✅ 服务已启动！');
console.log('\n💡 测试命令:');
console.log(`   健康检查: curl http://localhost:${apiPort}/health`);
console.log(`   运动类型: curl http://localhost:${apiPort}/motion-types`);
console.log('\n按 Ctrl+C 停止服务\n');

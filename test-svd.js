// SVD API 测试脚本
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testSVD() {
    try {
        console.log('🧪 开始测试 SVD API...\n');

        // 1. 测试健康检查
        console.log('1️⃣ 测试健康检查...');
        const healthResponse = await axios.get('http://localhost:3002/health');
        console.log('✅ 健康检查通过:', healthResponse.data.status);
        console.log('   ComfyUI:', healthResponse.data.comfyui);
        console.log('   URL:', healthResponse.data.comfyui_url);
        console.log('');

        // 2. 准备测试图片
        console.log('2️⃣ 准备测试图片...');
        const tempDir = path.join(__dirname, 'temp');
        const files = fs.readdirSync(tempDir).filter(f => f.match(/\.(jpg|jpeg|png)$/i));

        if (files.length === 0) {
            console.log('❌ temp 目录没有图片文件');
            console.log('   请手动放一张图片到 temp 目录');
            return;
        }

        const imageFile = files[0];
        const imagePath = path.join(tempDir, imageFile);
        console.log('✅ 使用图片:', imageFile);

        // 读取并转换为 base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
        console.log('✅ 图片大小:', (base64Image.length / 1024).toFixed(2), 'KB');
        console.log('');

        // 3. 调用生成API
        console.log('3️⃣ 调用 SVD 生成 API...');
        console.log('   motionBucketId: 100');
        console.log('   fps: 6');
        console.log('   augmentationLevel: 0.0');
        console.log('');

        const startTime = Date.now();

        const response = await axios.post('http://localhost:3002/generate-video', {
            image: base64Image,
            motionBucketId: 100,
            fps: 6,
            augmentationLevel: 0.0
        }, {
            timeout: 600000 // 10分钟超时
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('✅ 生成成功！耗时:', duration, '秒');
        console.log('📹 视频URL:', response.data.videoUrl);
        console.log('📝 文件名:', response.data.filename);
        console.log('');

        console.log('🎉 测试完成！');
        console.log('');
        console.log('📍 你可以访问以下地址查看视频:');
        console.log('   ', response.data.videoUrl);

    } catch (error) {
        console.error('\n❌ 测试失败:');
        console.error('   错误信息:', error.message);

        if (error.response) {
            console.error('   HTTP状态:', error.response.status);
            console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
        }

        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 提示: SVD API 服务可能未启动');
            console.error('   请运行: npm run svd');
        }
    }
}

// 运行测试
testSVD();

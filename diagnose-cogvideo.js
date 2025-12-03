#!/usr/bin/env node
/**
 * CogVideoX T2V 视频诊断脚本
 * 分析生成的视频文件是否正常
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 CogVideoX T2V 视频诊断工具\n');

const outputDir = path.join(__dirname, 'output');
const tempDir = path.join(__dirname, 'temp');

function checkDirectory(dir, name) {
    console.log(`\n📁 检查 ${name} 目录: ${dir}`);
    
    if (!fs.existsSync(dir)) {
        console.log(`   ❌ 目录不存在`);
        return;
    }

    const files = fs.readdirSync(dir)
        .filter(f => /\.(mp4|webm|avi|mov)$/i.test(f))
        .sort((a, b) => {
            const statA = fs.statSync(path.join(dir, a));
            const statB = fs.statSync(path.join(dir, b));
            return statB.mtime - statA.mtime; // 最新的在前
        });

    if (files.length === 0) {
        console.log(`   ⚠️  未找到视频文件`);
        return;
    }

    console.log(`   ✅ 找到 ${files.length} 个视频文件\n`);
    
    files.slice(0, 5).forEach((file, i) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
        const sizeKB = (stat.size / 1024).toFixed(0);
        const mtime = stat.mtime.toLocaleString('zh-CN');
        
        const status = stat.size > 1024 * 100 ? '✅' : '⚠️ ';
        const sizeStr = sizeMB > 1 ? `${sizeMB} MB` : `${sizeKB} KB`;
        
        console.log(`   ${status} [${i + 1}] ${file}`);
        console.log(`      大小: ${sizeStr} ${stat.size > 1024 * 100 ? '(正常)' : '(异常小)'}`);
        console.log(`      时间: ${mtime}`);
        
        if (i === 0) {
            // 分析最新文件
            analyzeVideo(filePath);
        }
    });
}

function analyzeVideo(filePath) {
    console.log(`\n📊 分析文件: ${path.basename(filePath)}`);
    
    const stat = fs.statSync(filePath);
    const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
    
    console.log(`   文件大小: ${sizeMB} MB`);
    console.log(`   原始字节: ${stat.size}`);
    
    // 估算视频信息
    if (stat.size < 100 * 1024) {
        console.log(`\n   ⚠️  文件异常小！可能的原因：`);
        console.log(`      • 视频只有 1-2 帧`);
        console.log(`      • 生成过程被中断`);
        console.log(`      • 编码器未正确配置`);
    } else if (stat.size < 1 * 1024 * 1024) {
        console.log(`\n   ⚠️  文件较小（< 1 MB），质量可能不理想`);
        console.log(`      预期: 2-10 MB`);
    } else {
        console.log(`\n   ✅ 文件大小在合理范围内`);
    }
    
    // 读取文件头检查是否是有效的 MP4
    try {
        const header = Buffer.alloc(12);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, header, 0, 12, 0);
        fs.closeSync(fd);
        
        // 检查 MP4 签名
        const ftyp = header.toString('ascii', 4, 8);
        if (ftyp === 'ftyp') {
            console.log(`   ✅ MP4 文件格式有效`);
        } else {
            console.log(`   ❌ 不是有效的 MP4 文件（签名: ${ftyp}）`);
        }
    } catch (error) {
        console.log(`   ⚠️  无法读取文件头: ${error.message}`);
    }
}

// 检查两个目录
checkDirectory(outputDir, '输出目录 (output)');
checkDirectory(tempDir, '临时目录 (temp)');

console.log('\n' + '='.repeat(60));
console.log('\n🎯 诊断建议：\n');

const outputFiles = fs.existsSync(outputDir) 
    ? fs.readdirSync(outputDir).filter(f => /\.(mp4|webm)$/i.test(f))
    : [];

if (outputFiles.length === 0) {
    console.log('1. ❌ 输出目录中没有视频文件');
    console.log('   → 检查 ComfyUI 是否正确生成了视频');
    console.log('   → 查看 npm run dev 的完整日志\n');
} else {
    const latestFile = outputFiles[outputFiles.length - 1];
    const filePath = path.join(outputDir, latestFile);
    const size = fs.statSync(filePath).size;
    
    if (size < 100 * 1024) {
        console.log('1. ⚠️  文件异常小（< 100 KB）');
        console.log('   → 运行 npm run dev 重新生成');
        console.log('   → 检查完整的生成日志\n');
    } else if (size < 1024 * 1024) {
        console.log('1. ⚠️  文件较小（< 1 MB），质量可能不理想');
        console.log('   → 尝试增加 steps 参数（75 → 100）');
        console.log('   → 尝试增加 numFrames（49 → 80）\n');
    } else {
        console.log('1. ✅ 文件大小正常，继续测试');
        console.log('   → 播放视频检查实际质量');
        console.log('   → 如果质量仍不满意，增加推理步数\n');
    }
}

console.log('2. 查看详细日志：');
console.log('   → 运行 npm run dev');
console.log('   → 查找以下关键日志：');
console.log('      "📊 任务完成状态"');
console.log('      "📦 所有输出节点信息"\n');

console.log('3. 进一步优化：');
console.log('   → 编辑 comfyui-cogvideo-api.js');
console.log('   → 调整以下参数：');
console.log('      • numFrames: 49 → 80 (更长的视频)');
console.log('      • steps: 75 → 100 (更高质量)');
console.log('      • cfg: 7.5 → 8.0 (更强的提示词遵从)\n');

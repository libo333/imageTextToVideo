#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
下载 CogVideoX-5b-I2V (旧版，非1.5) 模型
模型大小：约 20GB
格式：.bin (PyTorch 格式)
"""

from huggingface_hub import snapshot_download
import os

# 设置下载目录
download_dir = r"E:\myProject\imageToVideo\models\CogVideoX-5b-I2V"

print("=" * 60)
print("开始下载 CogVideoX-5b-I2V (旧版) 模型")
print("=" * 60)
print(f"模型仓库: THUDM/CogVideoX-5b-I2V")
print(f"下载目录: {download_dir}")
print(f"预计大小: ~20GB")
print(f"格式: .bin (PyTorch)")
print("=" * 60)
print()

# 创建下载目录
os.makedirs(download_dir, exist_ok=True)

try:
    # 下载模型
    snapshot_download(
        repo_id="THUDM/CogVideoX-5b-I2V",
        local_dir=download_dir,
        local_dir_use_symlinks=False,
        resume_download=True,  # 支持断点续传
    )

    print()
    print("=" * 60)
    print("✅ 模型下载完成！")
    print("=" * 60)
    print(f"模型位置: {download_dir}")
    print()
    print("下一步：使用 SCP 传输到服务器")

except Exception as e:
    print()
    print("=" * 60)
    print(f"❌ 下载失败: {e}")
    print("=" * 60)
    print("请检查网络连接，或尝试使用镜像源")

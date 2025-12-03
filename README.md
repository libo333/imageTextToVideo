# Telegram 图生视频 Bot

基于 Node.js + Telegraf 开发的 Telegram Bot，使用 ComfyUI 本地部署实现图片到视频的转换。

## 功能特性

- 接收用户发送的图片
- 支持自定义提示词生成视频
- 支持多种运动效果（缩放、平移、旋转等）
- 多引擎支持：ComfyUI AnimateDiff、SVD、CogVideoX
- 异步处理，实时反馈任务进度
- 自动下载并发送生成的视频
- 完整的用户管理和会员系统
- Web App 可视化界面

## 📚 文档导航

本项目文档已整理到 `docs/` 目录，按用途分类：

### 📖 [使用指南](docs/guides/)
快速入门和使用说明：
- [快速开始](docs/guides/快速开始.md) - 5分钟快速开始指南
- [启动说明](docs/guides/启动说明.md) - 详细启动步骤
- [Telegram 使用指南](docs/guides/Telegram使用指南.md) - Bot 和 Web App 使用方法
- [本地模型调研](docs/guides/本地部署开源模型调研报告.md) - 开源模型对比分析

### 🚀 [部署指南](docs/deploy/)
各种环境的部署说明：
- [RTX 3090 本地部署](docs/deploy/RTX3090本地部署指南.md) - 完整的本地部署指南
- [部署任务清单](docs/deploy/RTX3090部署任务清单.md) - 逐步部署检查清单
- [环境配置](docs/deploy/ENV_SETUP.md) - 环境变量和配置说明
- [Cloudflare Tunnel](docs/deploy/deploy-cloudflare-tunnel.md) - 穿透部署方案
- [Railway 部署](docs/deploy/deploy-railway.md) - PaaS 云平台部署
- [VPS 部署](docs/deploy/deploy-vps.md) - 自建服务器部署（Nginx + PM2）
- [部署信息](docs/deploy/当前部署信息.md) - 当前部署状态记录

### 🔧 [技术参考](docs/reference/)
技术集成和实现细节：
- [ComfyUI 集成说明](docs/reference/README_ComfyUI集成说明.md) - ComfyUI 三引擎总览
- [SVD 集成指南](docs/reference/SVD_INTEGRATION_GUIDE.md) - SVD 图生视频使用
- [CogVideoX 方案](docs/reference/CogVideoX集成实施方案.md) - 最新高质量模型集成
- [AnimateDiff 指南](docs/reference/ComfyUI-Manager-AnimateDiff部署指南.md) - 快速动画生成
- [Web App 部署](docs/reference/README_WebApp_部署指南.md) - Web 界面部署和集成
- [功能更新](docs/reference/README_功能更新.md) - 用户管理和会员系统
- [用户管理系统](docs/reference/README_用户管理系统.md) - 使用限制和会员配置
- [多引擎扩展计划](docs/reference/MULTI_ENGINE_EXPANSION_PLAN.md) - 未来的模型扩展方案

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填入配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# Telegram Bot Token (从 @BotFather 获取)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# ComfyUI 配置
COMFYUI_URL=http://localhost:8188
COMFYUI_API_URL=http://localhost:3001
SVD_API_URL=http://localhost:3002
COGVIDEO_API_URL=http://localhost:3003

# Web App 配置
WEBAPP_URL=http://localhost:3000/webapp
PORT=3000
```

#### 获取 Telegram Bot Token

1. 在 Telegram 中搜索 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 创建新机器人
3. 按提示设置机器人名称和用户名
4. 获取 Bot Token

#### 配置 ComfyUI（推荐）

ComfyUI 是本项目推荐的视频生成引擎，提供最佳的视频质量和本地控制。

参考：[ComfyUI集成说明](README_ComfyUI集成说明.md)

### 3. 启动服务

有多种启动方式可选：

```bash
# 开发环境（包含 Bot + Web 服务）
npm run dev

# 生产环境（仅 Web 服务和 API）
npm start

# 启动 ComfyUI AnimateDiff API 服务
npm run comfyui

# 启动 SVD API 服务
npm run svd
```

```bash
node bot.js
```

或使用 npm script：

```bash
npm start
```

## 使用说明

### Bot 命令

- `/start` - 显示欢迎信息和帮助
- `/help` - 显示使用说明
- `/templates` - 查看可用的特效模板
- `/cancel` - 取消当前操作

### 使用流程

1. 在 Telegram 中找到你的 Bot
2. 发送一张图片
3. 选择操作：
   - **输入提示词**：描述你想要的视频效果
   - **使用特效模板**：选择预设的特效模板
   - **跳过提示词**：直接生成默认效果
4. 等待 1-3 分钟
5. 接收生成的视频

### 提示词示例

```
一个人在海边漫步，夕阳西下，海浪轻柔
古装美女在竹林中起舞，衣袂飘飘
科幻场景，未来城市，霓虹灯闪烁
```

### 可用特效模板

**🎬 动作特效：**
- `flying` - 飞行
- `dance1`, `dance2`, `dance3`, `dance4`, `dance5` - 跳舞（5种风格）
- `dissolve` - 溶解
- `melt` - 融化
- `squish` - 挤压
- `inflate` - 膨胀
- `poke` - 戳动

**🐉 生物特效：**
- `dragon` - 龙
- `jellyfish` - 水母
- `mermaid` - 美人鱼

**💕 浪漫特效：**
- `rose` - 玫瑰
- `crystalrose` - 水晶玫瑰
- `singleheart` - 单心
- `coupleheart` - 双心
- `hug` - 拥抱
- `frenchkiss` - 亲吻

**👔 主题特效：**
- `cheongsam` - 旗袍
- `graduation` - 毕业
- `money` - 金钱
- `workstation` - 工作站

**🎨 艺术特效：**
- `sketch` - 素描
- `cloud` - 云朵
- `steam` - 蒸汽
- `icecream` - 冰淇淋
- `carousel` - 旋转木马
- `star` - 星星

**👥 人物特效：**
- `pupil` - 学生
- `clone` - 克隆
- `muscle` - 肌肉
- `twintails` - 双马尾
- `cloudbao` - 云宝

## 项目结构

```
myProject/
├── bot.js              # Telegram Bot 主文件
├── aliyun-video.js     # 阿里云视频生成模块
├── package.json        # 项目配置
├── .env                # 环境变量配置（需自行创建）
├── .env.example        # 环境变量示例
├── temp/               # 临时文件目录（自动创建）
└── README.md           # 项目说明
```

## API 参数说明

### 视频生成参数

- `model`: 模型版本
  - `wan2.5-i2v-preview` - 支持有声视频（推荐）
  - `wan2.2-i2v-flash` - 极速版（速度快50%）
  - `wan2.2-i2v-plus` - 专业版（稳定性高）

- `resolution`: 分辨率
  - `480P`, `720P`, `1080P`

- `duration`: 视频时长
  - 范围：5-10 秒

## 注意事项

1. 生成的视频链接有效期为 24 小时
2. 视频生成通常需要 1-3 分钟
3. 使用特效模板时，提示词参数会被忽略
4. 确保有足够的磁盘空间存储临时文件

## 故障排查

### Bot 无法启动

- 检查 `.env` 文件是否正确配置
- 确认 Telegram Bot Token 有效
- 确认阿里云 API Key 有效

### 图片处理失败

- 检查网络连接
- 确认 Telegram API 可访问
- 检查临时文件目录权限

### 视频生成失败

- 检查阿里云 API 配额
- 确认图片格式正确（支持 JPEG, PNG）
- 查看控制台错误日志

## 依赖包

- `telegraf` - Telegram Bot 框架
- `dotenv` - 环境变量管理
- `axios` - HTTP 客户端

## License

MIT

## 相关链接

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegraf 文档](https://telegraf.js.org/)
- [阿里云通义万相 API](https://help.aliyun.com/zh/model-studio/)

## 补丁
在 import torch 之后加上一小段“兼容补丁”即可，让旧版 torch 也有 get_default_device。操作步骤如下：
SSH 登录到那台运行 ComfyUI 的服务器，进入文件所在目录：
cd /home/ubuntu/ComfyUI/custom_nodes/ComfyUI-CogVideoX
使用你习惯的编辑器打开 __init__.py（例如 nano）：
nano __init__.py
在文件顶部 import torch 下面插入这段代码：
# 兼容补丁开始
if not hasattr(torch, "get_default_device"):
    def _get_default_device():
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    torch.get_default_device = _get_default_device
# 兼容补丁结束
保存文件并退出编辑器（nano 下是 Ctrl+O、Enter、Ctrl+X）。
重启 ComfyUI（关闭原进程再启动）：
# 停止旧的 ComfyUI 进程（根据你的启动方式操作）# 例如：pkill -f ComfyUI# 然后重新进入 ComfyUI 目录并启动cd /home/ubuntu/ComfyUIpython main.py
回到本地运行 npm run cogvideo 再试一次。这个补丁会让 transformers 调用 torch.get_default_device() 时得到一个合法的 device，从而继续加载 CogVideoX 模型。
后续如果你有时间，仍建议把服务器上的 torch 升到 2.3+，那就可以把这段补丁移除，保持环境干净。

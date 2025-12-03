const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const router = express.Router();

// 配置 Multer 存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名
        const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('只支持图片文件！'), false);
    }
};

// Multer 配置
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 限制
    },
    fileFilter: fileFilter
});

/**
 * POST /api/upload
 * 上传图片
 */
router.post('/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: '没有上传文件'
            });
        }

        const userId = req.body.userId || 'unknown';

        console.log(`[Upload] User ${userId} uploaded image: ${req.file.filename}`);

        res.json({
            success: true,
            imageId: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

    } catch (error) {
        console.error('[Upload Error]', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 错误处理中间件
 */
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: '文件大小不能超过 10MB'
            });
        }
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }

    if (error) {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }

    next();
});

module.exports = router;

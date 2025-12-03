/**
 * ComfyUI 视频生成运动效果配置
 *
 * 用于 AnimateDiff 等模型的运动类型定义
 */

const MOTION_CONFIGS = {
    // AnimateDiff 运动效果
    'animatediff': {
        name: 'AnimateDiff',
        description: 'ComfyUI AnimateDiff 运动效果',
        motionTypes: [
            'zoom-in', 'zoom-out',
            'pan-left', 'pan-right', 'pan-up', 'pan-down',
            'roll-clockwise', 'roll-anticlockwise'
        ]
    },

    // SVD 运动效果（motionBucketId 控制）
    'svd': {
        name: 'SVD',
        description: 'Stable Video Diffusion 运动强度',
        motionBucketRange: [1, 255],
        defaultMotionBucket: 100,
        description_motion: '数值越高，运动幅度越大'
    }
};

/**
 * 获取运动配置
 * @param {string} engineName - 引擎名称 ('animatediff' 或 'svd')
 * @returns {Object|null} 运动配置对象
 */
function getMotionConfig(engineName) {
    return MOTION_CONFIGS[engineName] || null;
}

/**
 * 获取所有可用的运动效果
 * @param {string} engineName - 引擎名称
 * @returns {Array} 运动效果列表
 */
function getAvailableMotions(engineName) {
    const config = getMotionConfig(engineName);
    if (!config) return [];
    return config.motionTypes || [];
}

/**
 * 验证运动效果是否被支持
 * @param {string} engineName - 引擎名称
 * @param {string} motionType - 运动效果名称
 * @returns {boolean} 是否支持
 */
function isMotionSupported(engineName, motionType) {
    const config = getMotionConfig(engineName);
    if (!config || !config.motionTypes) return false;
    return config.motionTypes.includes(motionType.toLowerCase());
}

/**
 * 获取分类的运动效果列表
 * @param {string} engineName - 引擎名称
 * @returns {Object} 分类的运动效果列表
 */
function getCategorizedMotions(engineName) {
    const motions = getAvailableMotions(engineName);

    if (engineName === 'animatediff') {
        return {
            缩放效果: motions.filter(m => m.includes('zoom')),
            平移效果: motions.filter(m => m.includes('pan')),
            旋转效果: motions.filter(m => m.includes('roll'))
        };
    }

    return { 所有效果: motions };
}

module.exports = {
    MOTION_CONFIGS,
    getMotionConfig,
    getAvailableMotions,
    isMotionSupported,
    getCategorizedMotions,
    // 向后兼容的别名
    getModelConfig: getMotionConfig,
    getAvailableModels: () => Object.keys(MOTION_CONFIGS),
    isTemplateSupported: isMotionSupported,
    getModelTemplates: getCategorizedMotions
};
/* ============================================================
 * filter.ts - 数据滤波工具
 * 提供低通滤波器类和灵敏度预设常量，用于平滑传感器原始数据
 * ============================================================ */

/**
 * 5档灵敏度预设，α值越小越平滑（响应慢），越大越灵敏（噪声多）
 * 由SensorManager在setSensitivity时查表使用
 */
const SENSITIVITY_PRESETS: SensitivityPreset[] = [
  { level: 1, name: '超稳定', alpha: 0.05, description: '精密测量，极度稳定但响应慢' },
  { level: 2, name: '稳定',   alpha: 0.1,  description: '日常使用，平衡稳定性和响应速度' },
  { level: 3, name: '标准',   alpha: 0.2,  description: '通用场景（默认）' },
  { level: 4, name: '灵敏',   alpha: 0.4,  description: '需要快速响应的场景' },
  { level: 5, name: '超灵敏', alpha: 0.7,  description: '快速追踪变化，噪声较大' },
];

/**
 * 一阶低通滤波器
 * 公式：output = α × current + (1 - α) × previous
 * α 越小越平滑（响应越慢），α 越大越灵敏（噪声越多）
 */
class LowPassFilter {
  /** 滤波系数，范围 (0, 1) */
  private alpha: number;
  /** 上一帧的输出值（初始为 null 表示尚未初始化） */
  private lastValue: number | null;

  constructor(alpha: number) {
    this.alpha = alpha;
    this.lastValue = null;
  }

  /**
   * 输入新的传感器原始值，返回滤波后的平滑值
   * 首次调用时直接返回原始值（无历史数据可混合）
   */
  filter(value: number): number {
    if (this.lastValue === null) {
      // 首帧直接设定，避免从0开始的抖动
      this.lastValue = value;
      return value;
    }
    this.lastValue = this.alpha * value + (1 - this.alpha) * this.lastValue;
    return this.lastValue;
  }

  /**
   * 更新滤波系数（灵敏度切换时调用）
   */
  setAlpha(alpha: number): void {
    this.alpha = alpha;
  }

  /**
   * 重置历史状态（传感器重启或校准重置后调用）
   */
  reset(): void {
    this.lastValue = null;
  }
}

/**
 * 工厂函数：为 beta/gamma 两个轴创建一对滤波器
 * @param alpha 初始滤波系数，默认使用3档标准值
 */
function createFilterPair(alpha: number = 0.2): { beta: LowPassFilter; gamma: LowPassFilter } {
  return {
    beta: new LowPassFilter(alpha),
    gamma: new LowPassFilter(alpha),
  };
}

/**
 * 根据灵敏度档位查找对应的α系数
 * @param level 1-5的档位值，不在范围内时返回默认值0.2
 */
function getAlphaByLevel(level: SensitivityLevel): number {
  const preset = SENSITIVITY_PRESETS.find(p => p.level === level);
  return preset ? preset.alpha : 0.2;
}

export { LowPassFilter, SENSITIVITY_PRESETS, createFilterPair, getAlphaByLevel };

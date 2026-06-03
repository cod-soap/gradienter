/* ============================================================
 * calibration.ts - 校准工具
 * 管理水平仪的零点校准：记录偏移量、应用修正、持久化
 * ============================================================ */

/** Storage中校准数据的存储键 */
const CALIBRATION_STORAGE_KEY = 'calibration_data';

/**
 * 校准管理器
 * 原理：记录校准时刻的 beta/gamma 值作为偏移量，
 * 后续每帧读数减去偏移量，使当前位置角度显示为 0°
 */
class CalibrationManager {
  /** beta轴校准偏移（校准时的beta值） */
  private offsetBeta: number;
  /** gamma轴校准偏移（校准时的gamma值） */
  private offsetGamma: number;
  /** 是否已执行校准 */
  private isCalibrated: boolean;
  /** 校准时间戳 */
  private calibratedAt: number;

  constructor() {
    this.offsetBeta = 0;
    this.offsetGamma = 0;
    this.isCalibrated = false;
    this.calibratedAt = 0;
  }

  /**
   * 执行校准：将当前 beta/gamma 设为零点
   * @param currentBeta 当前经过滤波的beta角度值
   * @param currentGamma 当前经过滤波的gamma角度值
   */
  calibrate(currentBeta: number, currentGamma: number): void {
    this.offsetBeta = currentBeta;
    this.offsetGamma = currentGamma;
    this.isCalibrated = true;
    this.calibratedAt = Date.now();
  }

  /**
   * 重置校准：恢复原始未校准状态
   */
  reset(): void {
    this.offsetBeta = 0;
    this.offsetGamma = 0;
    this.isCalibrated = false;
    this.calibratedAt = 0;
  }

  /**
   * 应用校准修正：返回减去偏移量后的角度值
   * 未校准时直接返回原始值
   */
  apply(beta: number, gamma: number): { beta: number; gamma: number } {
    return {
      beta: beta - this.offsetBeta,
      gamma: gamma - this.offsetGamma,
    };
  }

  /**
   * 获取当前校准状态（供UI组件查询按钮文字/颜色使用）
   */
  getState(): CalibrationState {
    return {
      isCalibrated: this.isCalibrated,
      offsetBeta: this.offsetBeta,
      offsetGamma: this.offsetGamma,
      calibratedAt: this.isCalibrated ? this.calibratedAt : undefined,
    };
  }

  /**
   * 持久化校准数据到本地Storage
   * 在用户退出页面前调用，下次进入时可恢复
   */
  save(): void {
    if (!this.isCalibrated) return;
    try {
      const data: CalibrationState = {
        isCalibrated: this.isCalibrated,
        offsetBeta: this.offsetBeta,
        offsetGamma: this.offsetGamma,
        calibratedAt: this.calibratedAt,
      };
      wx.setStorageSync(CALIBRATION_STORAGE_KEY, data);
    } catch (e) {
      // Storage写入失败时静默处理，不影响测量功能
      console.warn('[Calibration] 校准数据保存失败', e);
    }
  }

  /**
   * 从本地Storage恢复上次校准数据
   * 在onLoad或onShow中调用，实现跨会话校准保持
   */
  load(): void {
    try {
      const data = wx.getStorageSync(CALIBRATION_STORAGE_KEY) as CalibrationState | undefined;
      if (data && data.isCalibrated) {
        this.offsetBeta = data.offsetBeta;
        this.offsetGamma = data.offsetGamma;
        this.isCalibrated = true;
        this.calibratedAt = data.calibratedAt !== undefined ? data.calibratedAt : 0;
      }
    } catch (e) {
      // Storage读取失败时静默处理，以未校准状态继续
      console.warn('[Calibration] 校准数据加载失败', e);
    }
  }
}

export { CalibrationManager };

/* ============================================================
 * sensor.ts - 传感器管理器（核心模块）
 * 单例模式封装设备方向监听，集成滤波和校准，向上层分发处理后的数据
 * 包含iOS/Android平台适配和异常处理
 * ============================================================ */

import { LowPassFilter, createFilterPair, getAlphaByLevel } from './filter';
import { CalibrationManager } from './calibration';

/** 帧率限制：最多30fps，防止高频setData导致卡顿 */
const MAX_FPS = 30;
const MIN_FRAME_INTERVAL_MS = 1000 / MAX_FPS;

/** 单例实例（模块级变量，避免 static class field 的真机兼容性问题） */
let _sensorManagerInstance: SensorManager | null = null;

/** 传感器启动失败回调的参数类型 */
type SensorStartFailReason = 'permission' | 'hardware';

/** 传感器启动失败回调函数类型 */
type SensorStartFailCallback = (reason: SensorStartFailReason) => void;

/**
 * 传感器管理器（单例）
 * 负责：启动/停止传感器监听、低通滤波降噪、校准偏移修正、数据分发
 * 内置iOS/Android平台差异适配，统一坐标系方向
 *
 * 使用方式：
 *   const sensor = SensorManager.getInstance();
 *   sensor.start('game');
 *   sensor.onData(data => { ... });
 */
class SensorManager {
  /** beta轴低通滤波器 */
  private filterBeta: LowPassFilter;
  /** gamma轴低通滤波器 */
  private filterGamma: LowPassFilter;
  /** 校准管理器（内部聚合，外部通过 calibrate/resetCalibration 访问） */
  private calibration: CalibrationManager;

  /** 已注册的数据回调列表 */
  private callbacks: SensorDataCallback[];
  /** 传感器启动失败的回调列表（用于通知页面权限拒绝或硬件不支持） */
  private startFailCallbacks: SensorStartFailCallback[];
  /** 是否正在监听传感器 */
  private isListening: boolean;
  /** 上一帧输出时间（用于限帧） */
  private lastFrameTime: number;
  /** 当前灵敏度档位 */
  private sensitivityLevel: SensitivityLevel;

  /**
   * 当前设备平台（ios / android / devtools）
   * 用于平台差异适配
   */
  private platform: string;

  /**
   * gamma轴方向修正系数
   * iOS遵循W3C规范：向右倾斜gamma为正
   * Android部分机型/微信版本中gamma方向相反，需取反统一行为
   * 值为 1（不修正）或 -1（取反修正）
   */
  private gammaSign: 1 | -1;

  /**
   * beta轴方向修正系数
   * 当前两个平台beta方向一致，保留扩展点
   */
  private betaSign: 1 | -1;

  private constructor() {
    // 检测当前平台，用于适配差异
    const sysInfo = wx.getSystemInfoSync();
    this.platform = sysInfo.platform;

    /**
     * Android设备的gamma轴（左右倾斜）坐标系方向与iOS相反
     * iOS：向右倾斜 → gamma 正值
     * Android：向右倾斜 → gamma 负值（部分设备/微信版本）
     * 取反修正使两平台行为一致，用户无需分平台处理
     *
     * 注意：若发现特定机型表现异常，可通过校准功能补偿偏差
     */
    this.gammaSign = this.platform === 'android' ? -1 : 1;
    this.betaSign = 1; // beta轴目前两平台一致

    // 使用默认3档（标准）α值初始化滤波器对
    const filters = createFilterPair(getAlphaByLevel(3));
    this.filterBeta = filters.beta;
    this.filterGamma = filters.gamma;
    this.calibration = new CalibrationManager();
    this.callbacks = [];
    this.startFailCallbacks = [];
    this.isListening = false;
    this.lastFrameTime = 0;
    this.sensitivityLevel = 3;
  }

  /**
   * 获取单例实例
   */
  static getInstance(): SensorManager {
    if (!_sensorManagerInstance) {
      _sensorManagerInstance = new SensorManager();
    }
    return _sensorManagerInstance;
  }

  /**
   * 启动传感器监听
   * @param interval 采样率：'game'最高(~60Hz)，'ui'较高(~20Hz)，'normal'普通(~5Hz)
   *
   * 平台适配说明：
   * - iOS：支持 'game' 模式，高频采样性能好
   * - Android：部分低端机不支持 'game' 模式，自动降级为 'ui' 模式
   * - devtools：模拟数据，interval 对实际采样率无影响
   */
  start(interval: 'game' | 'ui' | 'normal' = 'game'): void {
    if (this.isListening) return;

    /**
     * Android平台适配：
     * 部分Android设备不支持 'game' 高频采样模式，会导致启动失败
     * 当用户指定 'game' 时，Android上自动降级为 'ui' 模式（约20Hz），
     * 经过SensorManager的30fps限制，实际输出最多20fps，仍可流畅显示
     */
    const actualInterval = (interval === 'game' && this.platform === 'android') ? 'ui' : interval;

    wx.startDeviceMotionListening({
      interval: actualInterval,
      success: () => {
        this.isListening = true;
        // 注册原始数据回调，内部完成处理后再分发给外层
        wx.onDeviceMotionChange((res) => {
          this._handleRawData(res.alpha, res.beta, res.gamma);
        });
      },
      fail: (err) => {
        const errMsg = err.errMsg || '';
        console.error('[SensorManager] 传感器启动失败', errMsg);

        /**
         * 分类错误类型：
         * - permission：用户拒绝权限（在部分Android系统上，传感器需要运动权限）
         * - hardware：设备硬件不支持该传感器
         */
        const isPermissionError =
          errMsg.toLowerCase().includes('auth') ||
          errMsg.toLowerCase().includes('permission') ||
          errMsg.toLowerCase().includes('scope') ||
          errMsg.toLowerCase().includes('denied');
        const reason: SensorStartFailReason = isPermissionError ? 'permission' : 'hardware';

        // 通知所有注册了失败回调的监听者
        this.startFailCallbacks.forEach((cb) => {
          try {
            cb(reason);
          } catch (e) {
            console.warn('[SensorManager] startFail回调执行异常', e);
          }
        });
      },
    });
  }

  /**
   * 停止传感器监听
   * 页面 onHide / onUnload 时调用，节省电量
   */
  stop(): void {
    if (!this.isListening) return;
    wx.stopDeviceMotionListening({
      complete: () => {
        this.isListening = false;
        // 重置滤波器历史状态，避免下次启动时带着旧数据
        this.filterBeta.reset();
        this.filterGamma.reset();
      },
    });
  }

  /**
   * 注册数据回调
   * 同一回调函数不会重复注册
   */
  onData(callback: SensorDataCallback): void {
    if (!this.callbacks.includes(callback)) {
      this.callbacks.push(callback);
    }
  }

  /**
   * 取消数据回调注册
   */
  offData(callback: SensorDataCallback): void {
    const idx = this.callbacks.indexOf(callback);
    if (idx !== -1) {
      this.callbacks.splice(idx, 1);
    }
  }

  /**
   * 注册传感器启动失败回调
   * 当 start() 因权限拒绝或硬件不支持而失败时触发
   * 页面可在此回调中显示友好提示或引导用户开启权限
   */
  onStartFail(callback: SensorStartFailCallback): void {
    if (!this.startFailCallbacks.includes(callback)) {
      this.startFailCallbacks.push(callback);
    }
  }

  /**
   * 取消传感器启动失败回调注册
   */
  offStartFail(callback: SensorStartFailCallback): void {
    const idx = this.startFailCallbacks.indexOf(callback);
    if (idx !== -1) {
      this.startFailCallbacks.splice(idx, 1);
    }
  }

  /**
   * 设置灵敏度档位（1-5）
   * 会立即更新滤波器α系数，下一帧生效
   */
  setSensitivity(level: SensitivityLevel): void {
    this.sensitivityLevel = level;
    const alpha = getAlphaByLevel(level);
    this.filterBeta.setAlpha(alpha);
    this.filterGamma.setAlpha(alpha);
  }

  /**
   * 获取当前灵敏度档位
   */
  getSensitivity(): SensitivityLevel {
    return this.sensitivityLevel;
  }

  /**
   * 执行校准：将当前角度设为零点
   * 需要在传感器已启动、数据稳定后调用
   * @param currentBeta 当前滤波后的beta值（由调用方传入，确保是最新稳定值）
   * @param currentGamma 当前滤波后的gamma值
   */
  calibrate(currentBeta: number, currentGamma: number): void {
    this.calibration.calibrate(currentBeta, currentGamma);
    this.calibration.save();
  }

  /**
   * 重置校准
   */
  resetCalibration(): void {
    this.calibration.reset();
    // 清除持久化数据
    try {
      wx.removeStorageSync('calibration_data');
    } catch (e) {
      console.warn('[SensorManager] 清除校准Storage失败', e);
    }
  }

  /**
   * 获取当前校准状态（供UI使用）
   */
  getCalibrationState(): CalibrationState {
    return this.calibration.getState();
  }

  /**
   * 加载上次保存的校准数据（onShow时调用）
   */
  loadCalibration(): void {
    this.calibration.load();
  }

  /**
   * 获取传感器是否正在监听
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * 获取当前设备平台（ios / android / devtools）
   * 供页面层做进一步的平台差异处理
   */
  getPlatform(): string {
    return this.platform;
  }

  /**
   * 内部处理原始传感器数据：
   * 1. 过滤异常值（NaN/Infinity）
   * 2. 平台差异修正（Android gamma取反）
   * 3. 低通滤波平滑
   * 4. 应用校准偏移
   * 5. 帧率限制（≤30fps）
   * 6. 分发给已注册的回调
   */
  private _handleRawData(alpha: number, beta: number, gamma: number): void {
    // 过滤异常值，防止NaN/Infinity导致UI渲染异常
    if (!isFinite(beta) || !isFinite(gamma) || !isFinite(alpha)) {
      return;
    }

    /**
     * 平台差异修正：
     * Android的gamma轴（左右倾斜）方向与iOS相反，
     * 乘以修正系数（-1 on Android, 1 on iOS）统一坐标系
     */
    const correctedBeta = beta * this.betaSign;
    const correctedGamma = gamma * this.gammaSign;

    // 低通滤波：平滑噪声
    const smoothBeta = this.filterBeta.filter(correctedBeta);
    const smoothGamma = this.filterGamma.filter(correctedGamma);

    // 应用校准偏移修正
    const calibrated = this.calibration.apply(smoothBeta, smoothGamma);

    // 帧率限制：超过30fps的帧直接丢弃，减少setData压力
    const now = Date.now();
    if (now - this.lastFrameTime < MIN_FRAME_INTERVAL_MS) {
      return;
    }
    this.lastFrameTime = now;

    // 构造输出数据对象并分发
    const output: FilteredData = {
      alpha,               // alpha不需滤波，保留原始值（主要用于指南针方向）
      beta: calibrated.beta,
      gamma: calibrated.gamma,
      timestamp: now,
    };

    this.callbacks.forEach(cb => {
      try {
        cb(output);
      } catch (e) {
        console.error('[SensorManager] 数据回调执行异常', e);
      }
    });
  }
}

export { SensorManager };

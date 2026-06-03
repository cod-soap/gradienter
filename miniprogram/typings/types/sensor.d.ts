/* ============================================================
 * sensor.d.ts - 传感器相关类型定义
 * 涵盖设备方向数据、滤波器状态、设备能力检测结果等类型
 * ============================================================ */

/** 设备方向原始数据（来自 wx.onDeviceMotionChange） */
interface DeviceMotionData {
  /** Z轴旋转角度 [0, 360)，手机围绕垂直轴旋转（指南针方向） */
  alpha: number;
  /** X轴旋转角度 [-180, 180)，手机前后倾斜角度 */
  beta: number;
  /** Y轴旋转角度 [-90, 90)，手机左右倾斜角度 */
  gamma: number;
}

/** 经过滤波和校准处理后的角度数据 */
interface FilteredData {
  /** 滤波后的 alpha 值（通常不用于测量，但保留） */
  alpha: number;
  /** 滤波+校准后的 beta 值（前后倾斜，对应Y轴测量） */
  beta: number;
  /** 滤波+校准后的 gamma 值（左右倾斜，对应X轴测量） */
  gamma: number;
  /** 数据时间戳，单位ms */
  timestamp: number;
}

/** 低通滤波器配置参数 */
interface FilterConfig {
  /** 滤波系数α，范围(0,1)，越小越平滑（响应慢），越大越灵敏（噪声多） */
  alpha: number;
}

/** 校准状态数据 */
interface CalibrationState {
  /** 是否已执行校准 */
  isCalibrated: boolean;
  /** beta轴偏移量（校准时的beta值） */
  offsetBeta: number;
  /** gamma轴偏移量（校准时的gamma值） */
  offsetGamma: number;
  /** 校准时间戳 */
  calibratedAt?: number;
}

/** 灵敏度档位枚举（1-5，数字越大越灵敏） */
type SensitivityLevel = 1 | 2 | 3 | 4 | 5;

/** 传感器数据回调函数类型 */
type SensorDataCallback = (data: FilteredData) => void;

/** 设备传感器能力检测结果 */
interface DeviceCapability {
  /** 是否支持设备方向传感器（陀螺仪） */
  hasDeviceMotion: boolean;
  /** 是否支持加速计 */
  hasAccelerometer: boolean;
  /** 传感器综合精度评级：high/medium/low */
  precisionLevel: 'high' | 'medium' | 'low' | 'unknown';
  /** 操作系统平台 */
  platform: string;
  /** 微信基础库版本 */
  sdkVersion: string;
}

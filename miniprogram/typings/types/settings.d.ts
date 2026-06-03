/* ============================================================
 * settings.d.ts - 用户设置相关类型定义
 * 涵盖用户设置数据结构、灵敏度配置等类型
 * ============================================================ */

/** 用户设置（持久化到本地Storage） */
interface UserSettings {
  /** 灵敏度档位，范围1-5，默认3（标准） */
  sensitivity: SensitivityLevel;
  /** 刻度尺单位，默认cm */
  rulerUnit: 'cm' | 'inch';
  /** 上次校准数据（跨会话保留，方便恢复上次测量状态） */
  lastCalibration?: {
    beta: number;
    gamma: number;
    timestamp: number;
  };
}

/** 灵敏度配置项 */
interface SensitivityPreset {
  /** 档位编号（1-5） */
  level: SensitivityLevel;
  /** 档位名称（如"超稳定"、"标准"） */
  name: string;
  /** 低通滤波器α系数 */
  alpha: number;
  /** 描述（适用场景） */
  description: string;
}

/** 设备信息缓存（onLaunch时获取一次） */
interface DeviceInfo {
  /** 屏幕宽度（逻辑像素，单位px） */
  screenWidth: number;
  /** 屏幕高度（逻辑像素，单位px） */
  screenHeight: number;
  /** 设备像素比（物理像素/逻辑像素） */
  pixelRatio: number;
  /** 操作系统平台（'ios' | 'android' | 'devtools'） */
  platform: string;
  /** 微信版本号 */
  version: string;
  /** 微信基础库版本 */
  SDKVersion: string;
  /** 设备型号字符串（用于PPI估算） */
  model: string;
  /** 屏幕宽度（物理像素） */
  screenWidthPx: number;
  /** 估算的PPI（pixels per inch，用于刻度尺计算） */
  estimatedPPI: number;
}

/** 应用全局数据结构 */
interface GlobalAppData {
  /** 设备信息缓存 */
  deviceInfo: DeviceInfo;
  /** 用户设置缓存（避免频繁读Storage） */
  userSettings: UserSettings;
}

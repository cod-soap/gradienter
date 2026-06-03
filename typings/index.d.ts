/// <reference path="./types/index.d.ts" />

/* 引入小程序业务类型定义（传感器、记录、设置相关类型） */
/// <reference path="../miniprogram/typings/types/sensor.d.ts" />
/// <reference path="../miniprogram/typings/types/record.d.ts" />
/// <reference path="../miniprogram/typings/types/settings.d.ts" />

/**
 * IAppOption - 全局App实例类型
 * globalData 存放设备信息和用户设置的缓存，避免页面重复读取
 */
interface IAppOption {
  globalData: {
    /** 设备信息缓存（onLaunch时初始化） */
    deviceInfo: DeviceInfo
    /** 用户设置缓存（从Storage加载，变更时同步写回） */
    userSettings: UserSettings
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback
}

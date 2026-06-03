// app.ts - 应用入口，全局生命周期管理
// 负责：获取设备信息缓存、初始化用户设置、处理分享场景启动

App<IAppOption>({
  /**
   * 全局数据
   * deviceInfo: 设备信息缓存，onLaunch时初始化，避免后续重复调用getSystemInfo
   * userSettings: 用户设置缓存，从Storage读取，减少IO操作
   */
  globalData: {
    deviceInfo: {
      screenWidth: 375,
      screenHeight: 667,
      pixelRatio: 2,
      platform: 'devtools',
      version: '',
      SDKVersion: '',
      model: '',
      screenWidthPx: 750,
      estimatedPPI: 326,
    },
    userSettings: {
      sensitivity: 3,
      rulerUnit: 'cm',
    },
  },

  onLaunch(options: WechatMiniprogram.App.LaunchShowOption) {
    // 获取系统信息并缓存到 globalData，后续页面通过 getApp().globalData 访问
    // 避免每个页面重复调用 wx.getSystemInfoSync()
    try {
      const sysInfo = wx.getSystemInfoSync()
      const screenWidthPx = sysInfo.screenWidth * sysInfo.pixelRatio

      // 根据屏幕物理像素宽估算PPI，微信不直接提供物理尺寸
      // 主要用于刻度尺组件计算物理长度，不需要极高精度
      let estimatedPPI = 326  // 默认值，对应常见 Retina 屏幕
      if (screenWidthPx >= 1440) {
        estimatedPPI = 480
      } else if (screenWidthPx >= 1080) {
        estimatedPPI = 420
      } else if (screenWidthPx >= 720) {
        estimatedPPI = 320
      } else {
        estimatedPPI = 160
      }

      this.globalData.deviceInfo = {
        screenWidth: sysInfo.screenWidth,
        screenHeight: sysInfo.screenHeight,
        pixelRatio: sysInfo.pixelRatio,
        platform: sysInfo.platform,
        version: sysInfo.version,
        SDKVersion: sysInfo.SDKVersion,
        model: sysInfo.model || '',
        screenWidthPx,
        estimatedPPI,
      }
    } catch (err) {
      // 获取设备信息失败，保留默认值继续运行
      console.error('[App] 获取设备信息失败:', err)
    }

    // 从本地Storage读取用户设置，合并到默认值上
    try {
      const saved = wx.getStorageSync('user_settings')
      if (saved && typeof saved === 'object') {
        this.globalData.userSettings = {
          sensitivity: 3,
          rulerUnit: 'cm',
          ...saved,
        }
      }
    } catch (err) {
      // 读取设置失败，保留默认值
      console.error('[App] 读取用户设置失败:', err)
    }

    // 处理分享场景启动：记录启动来源以供页面判断
    // 场景值 1044=好友分享、1007/1008=群分享，从分享链接打开时携带此场景
    // 微信框架会自动路由到分享的目标页面（record-detail），
    // 此处仅记录场景便于调试，具体数据解析由 record-detail 页面处理
    const scene = options.scene
    if (scene === 1044 || scene === 1007 || scene === 1008) {
      console.log('[App] 从分享链接启动，场景值:', scene, '路径:', options.path, '参数:', options.query)
    }
  },
})

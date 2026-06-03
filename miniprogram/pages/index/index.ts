/* ============================================================
 * index.ts - 首页逻辑
 * 提供三个功能入口的跳转，以及设备能力的预检测
 * ============================================================ */

import { getDeviceCapability } from '../../utils/device-check';

Component({
  data: {
    /** 设备是否支持传感器，false时入口卡片显示警告图标 */
    sensorSupported: true,
    /** 版本号，从全局数据读取 */
    appVersion: '1.0.0',
  },

  lifetimes: {
    attached() {
      // 获取版本号
      try {
        const sysInfo = wx.getSystemInfoSync();
        this.setData({ appVersion: sysInfo.version || '1.0.0' });
      } catch (e) { /* 忽略 */ }
    },
  },

  pageLifetimes: {
    show() {
      // 每次页面显示时检测设备能力，给用户明确的功能可用性提示
      this._checkDeviceCapability();
    },
  },

  methods: {
    /** 跳转到水平气泡尺页面 */
    goToBubbleLevel() {
      wx.navigateTo({ url: '/pages/bubble-level/bubble-level' });
    },

    /** 跳转到万向水平仪页面 */
    goToUniversalLevel() {
      wx.navigateTo({ url: '/pages/universal-level/universal-level' });
    },

    /** 跳转到使用教程页面 */
    goToTutorial() {
      wx.navigateTo({ url: '/pages/tutorial/tutorial' });
    },

    /**
     * 检测设备传感器能力，更新 sensorSupported 状态
     * 结果仅用于显示提示，不阻止用户进入功能页面
     */
    async _checkDeviceCapability() {
      try {
        const capability = await getDeviceCapability();
        this.setData({ sensorSupported: capability.hasDeviceMotion });
      } catch (e) {
        // 检测失败时默认认为支持，进入功能页面后再做进一步处理
        this.setData({ sensorSupported: true });
      }
    },
  },
});

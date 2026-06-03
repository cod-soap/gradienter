/* ============================================================
 * device-check.ts - 设备能力检测工具
 * 检测设备是否支持陀螺仪/加速计，处理iOS/Android差异
 * 提供友好的权限引导弹窗
 * ============================================================ */

/**
 * 检测设备方向传感器（陀螺仪）是否可用
 * 通过尝试启动并立即停止来验证API支持
 * @returns Promise<boolean> true=支持，false=不支持
 */
function checkDeviceMotionSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    wx.startDeviceMotionListening({
      interval: 'normal',
      success: () => {
        // 能启动说明支持，立即停止，不真正开始监听
        wx.stopDeviceMotionListening({ complete: () => resolve(true) });
      },
      fail: () => {
        resolve(false);
      },
    });
  });
}

/**
 * 检测加速计是否可用
 * @returns Promise<boolean>
 */
function checkAccelerometerSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    wx.startAccelerometer({
      interval: 'normal',
      success: () => {
        wx.stopAccelerometer({ complete: () => resolve(true) });
      },
      fail: () => {
        resolve(false);
      },
    });
  });
}

/**
 * 综合检测设备传感器能力，返回 DeviceCapability 对象
 * 此函数会并发检测两种传感器，减少等待时间
 */
async function getDeviceCapability(): Promise<DeviceCapability> {
  const sysInfo = wx.getSystemInfoSync();

  // 并发检测两种传感器，加快检测速度
  const [hasDeviceMotion, hasAccelerometer] = await Promise.all([
    checkDeviceMotionSupport(),
    checkAccelerometerSupport(),
  ]);

  // 根据平台和传感器综合判断精度等级
  // iOS陀螺仪通常比Android精度更稳定，开发者工具精度最低
  let precisionLevel: DeviceCapability['precisionLevel'] = 'unknown';
  if (!hasDeviceMotion) {
    precisionLevel = 'unknown';
  } else if (sysInfo.platform === 'devtools') {
    // 开发者工具中传感器是模拟的，精度无意义
    precisionLevel = 'low';
  } else if (sysInfo.platform === 'ios') {
    precisionLevel = 'high';
  } else if (sysInfo.platform === 'android') {
    // Android设备差异较大，保守评估为medium
    precisionLevel = 'medium';
  }

  return {
    hasDeviceMotion,
    hasAccelerometer,
    precisionLevel,
    platform: sysInfo.platform,
    sdkVersion: sysInfo.SDKVersion,
  };
}

/**
 * 显示传感器硬件不支持的友好提示弹窗
 * 当检测到设备不支持方向传感器时调用
 * 用户可选择返回首页或留在页面查看静态界面
 */
function showSensorNotSupportedModal(): void {
  wx.showModal({
    title: '设备不支持',
    content: '您的设备不支持方向传感器，无法使用水平仪测量功能。建议使用带有陀螺仪的智能手机。',
    showCancel: true,
    cancelText: '留在页面',
    confirmText: '返回首页',
    confirmColor: '#2979FF',
    success: (res) => {
      if (res.confirm) {
        // 用户选择返回首页
        wx.navigateBack({ delta: 1 });
      }
      // 用户选择留在页面时：显示静态界面，不强制退出
    },
  });
}

/**
 * 显示传感器权限被拒绝的引导弹窗
 * 引导用户前往系统设置开启传感器相关权限（适用于部分Android系统）
 */
function showSensorPermissionGuide(): void {
  wx.showModal({
    title: '需要传感器权限',
    content: '水平仪需要访问设备方向传感器。如被系统拒绝，请前往「手机设置 → 应用 → 微信 → 权限」开启传感器权限。',
    showCancel: true,
    cancelText: '取消',
    confirmText: '前往设置',
    confirmColor: '#2979FF',
    success: (res) => {
      if (res.confirm) {
        // openSetting 可以打开小程序权限设置页（iOS/部分Android有效）
        wx.openSetting({
          fail: () => {
            // 部分平台 openSetting 不可用，给出手动引导
            wx.showToast({
              title: '请手动前往系统设置开启权限',
              icon: 'none',
              duration: 2500,
            });
          },
        });
      }
    },
  });
}

/**
 * 检测传感器能力并在不支持时显示友好弹窗
 * 供功能页面（气泡尺/万向水平仪）在进入时统一调用
 *
 * @returns Promise<boolean> true=设备支持传感器，可以正常使用；false=不支持（已弹窗提示）
 */
async function checkAndShowSensorModal(): Promise<boolean> {
  const capability = await getDeviceCapability();

  if (!capability.hasDeviceMotion) {
    // 硬件不支持方向传感器，弹出友好提示
    showSensorNotSupportedModal();
    return false;
  }

  // 开发者工具中传感器为模拟数据，精度低，给出非阻断性提示
  if (capability.platform === 'devtools') {
    wx.showToast({
      title: '模拟器传感器数据仅供预览',
      icon: 'none',
      duration: 2000,
    });
  }

  return true;
}

export {
  checkDeviceMotionSupport,
  checkAccelerometerSupport,
  getDeviceCapability,
  showSensorNotSupportedModal,
  showSensorPermissionGuide,
  checkAndShowSensorModal,
};

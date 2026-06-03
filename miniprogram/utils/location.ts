/* ============================================================
 * location.ts - 位置服务封装
 * 获取当前地理位置，处理权限请求与降级（用户拒绝时返回空位置）
 * ============================================================ */

/**
 * 获取当前位置信息
 * 若用户未授权或获取失败，返回 null（调用方决定是否带位置保存记录）
 */
function getCurrentLocation(): Promise<LocationInfo | null> {
  return new Promise((resolve) => {
    wx.getLocation({
      type: 'wgs84',   // 坐标系：WGS84国际标准（记录存档用，不需要高精度）
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude,
          // 微信getLocation不直接返回地址，address字段由上层（反地理编码）填充
          address: undefined,
        });
      },
      fail: (err) => {
        // 权限被拒绝 or 超时 → 降级返回null，记录将不包含位置信息
        console.warn('[Location] 获取位置失败', err);
        resolve(null);
      },
    });
  });
}

/**
 * 检查位置权限是否已授权
 * 返回 true 表示已授权，false 表示未授权或检查失败
 */
function checkLocationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    wx.getSetting({
      success: (res) => {
        resolve(!!res.authSetting['scope.userLocation']);
      },
      fail: () => {
        resolve(false);
      },
    });
  });
}

/**
 * 请求位置权限并引导用户到设置页
 * 适合在用户点击"记录角度"时调用：
 *   1. 先尝试获取权限
 *   2. 被拒绝时弹出引导弹窗
 * @returns Promise<boolean> 最终是否获得授权
 */
function requestLocationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    wx.authorize({
      scope: 'scope.userLocation',
      success: () => resolve(true),
      fail: () => {
        // 用户之前拒绝过，需要引导到系统设置手动开启
        wx.showModal({
          title: '需要位置权限',
          content: '记录角度时需要获取位置信息。请前往设置开启位置权限，否则记录将不包含位置信息。',
          confirmText: '前往设置',
          cancelText: '不需要',
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  resolve(!!settingRes.authSetting['scope.userLocation']);
                },
                fail: () => resolve(false),
              });
            } else {
              // 用户选择不需要位置，允许继续（无位置保存）
              resolve(false);
            }
          },
          fail: () => resolve(false),
        });
      },
    });
  });
}

export { getCurrentLocation, checkLocationPermission, requestLocationPermission };

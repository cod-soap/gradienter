/* ============================================================
 * bubble-level.ts - 水平气泡尺页面
 * 三合一气泡水平尺：水平管、垂直管、双向45°管同时显示。
 * 使用 SensorManager 获取传感器数据，低通滤波+校准后实时更新各管角度值。
 * 使用 Component({}) 模式（glass-easel 兼容），通过 pageLifetimes 管理传感器生命周期。
 * ============================================================ */

import { SensorManager } from '../../utils/sensor';
import { saveSettings, getSettings } from '../../utils/storage';
import { checkAndShowSensorModal, showSensorPermissionGuide } from '../../utils/device-check';

/** 气泡管最大测量角度（超出后气泡到达管端） */
const MAX_ANGLE = 15;

Component({
  data: {
    /** X轴角度（gamma，左右倾斜），传给水平管 */
    angleX: 0,
    /** Y轴角度（beta，前后倾斜），传给垂直管 */
    angleY: 0,
    /** 45°方向合成角度 = (beta - gamma) / sqrt(2)，手机左倾时响应 */
    angle45: 0,
    /** 135°方向合成角度 = (beta + gamma) / sqrt(2)，手机右倾时响应 */
    angle135: 0,
    /** 是否已校准 */
    isCalibrated: false,
    /** 当前灵敏度档位（1-5） */
    sensitivity: 3 as SensitivityLevel,
    /** 刻度尺单位 */
    rulerUnit: 'cm' as 'cm' | 'inch',
    /** 模板中使用的常量 */
    MAX_ANGLE,
    /** 传感器是否可用 */
    sensorSupported: true,
  },

  pageLifetimes: {
    /** 页面显示时启动传感器 */
    show() {
      this._startSensor();
    },
    /** 页面隐藏时停止传感器 */
    hide() {
      this._stopSensor();
    },
  },

  lifetimes: {
    /** 组件首次挂载：加载设置，并创建绑定了 this 的传感器回调 */
    attached() {
      (this as any)._boundSensorCallback = (data: FilteredData) => {
        this._onSensorData(data);
      };
      (this as any)._boundStartFailCallback = (reason: 'permission' | 'hardware') => {
        this._onSensorStartFail(reason);
      };
      (this as any)._sensorCapabilityChecked = false;
      this._loadSettings();
    },
    /** 组件销毁：确保传感器停止并清理回调 */
    detached() {
      this._stopSensor();
    },
  },

  methods: {
    /**
     * 启动传感器监听
     */
    async _startSensor() {
      const self = this as any;
      const currentData = this.data as any;
      if (!currentData.sensorSupported) return;

      if (!self._sensorCapabilityChecked) {
        self._sensorCapabilityChecked = true;
        const supported = await checkAndShowSensorModal();
        if (!supported) {
          this.setData({ sensorSupported: false });
          return;
        }
      }

      const sensor = SensorManager.getInstance();
      sensor.onStartFail((this as any)._boundStartFailCallback);
      sensor.loadCalibration();
      const calibState = sensor.getCalibrationState();
      this.setData({ isCalibrated: calibState.isCalibrated });
      sensor.onData((this as any)._boundSensorCallback as SensorDataCallback);
      sensor.start('game');
    },

    /**
     * 停止传感器监听并注销所有回调
     */
    _stopSensor() {
      const sensor = SensorManager.getInstance();
      sensor.offData((this as any)._boundSensorCallback as SensorDataCallback);
      sensor.offStartFail((this as any)._boundStartFailCallback);
      sensor.stop();
    },

    /**
     * 传感器启动失败处理
     */
    _onSensorStartFail(reason: 'permission' | 'hardware') {
      this.setData({ sensorSupported: false });
      if (reason === 'permission') {
        showSensorPermissionGuide();
      } else {
        wx.showToast({ title: '传感器不可用', icon: 'none', duration: 2000 });
      }
    },

    /**
     * 传感器数据回调（≤30fps）
     * 计算四根管的角度并更新数据
     */
    _onSensorData(data: FilteredData) {
      const { beta, gamma } = data;
      if (!isFinite(beta) || !isFinite(gamma)) return;

      // 45°方向：(beta - gamma) / √2（手机左倾时响应）
      const angle45 = (beta - gamma) / Math.SQRT2;
      // 135°方向：(beta + gamma) / √2（手机右倾时响应）
      const angle135 = (beta + gamma) / Math.SQRT2;

      this.setData({
        angleX: gamma,
        angleY: beta,
        angle45,
        angle135,
      });
    },

    /**
     * 从本地存储加载用户设置
     */
    _loadSettings() {
      const settings = getSettings();
      const sensor = SensorManager.getInstance();
      this.setData({
        sensitivity: settings.sensitivity,
        rulerUnit: settings.rulerUnit,
      });
      sensor.setSensitivity(settings.sensitivity);
    },

    /**
     * 执行校准：将当前角度设为零点
     */
    onCalibrate() {
      const sensor = SensorManager.getInstance();
      const { angleX, angleY } = this.data as any;
      sensor.calibrate(angleY as number, angleX as number);
      this.setData({ isCalibrated: true });
      wx.showToast({ title: '校准成功', icon: 'success', duration: 1500 });
    },

    /**
     * 重置校准：恢复到原始角度读数
     */
    onResetCalibration() {
      const sensor = SensorManager.getInstance();
      sensor.resetCalibration();
      this.setData({ isCalibrated: false });
      wx.showToast({ title: '已重置校准', icon: 'none', duration: 1500 });
    },

    /**
     * 切换灵敏度档位
     */
    onSensitivityChange(e: WechatMiniprogram.CustomEvent) {
      const level = e.detail.value as SensitivityLevel;
      const sensor = SensorManager.getInstance();
      sensor.setSensitivity(level);
      this.setData({ sensitivity: level });
      const currentSettings = getSettings();
      saveSettings({ ...currentSettings, sensitivity: level });
    },

    /**
     * 切换刻度尺单位（cm ↔ inch）
     */
    onUnitToggle() {
      const current = (this.data as any).rulerUnit as 'cm' | 'inch';
      const next: 'cm' | 'inch' = current === 'cm' ? 'inch' : 'cm';
      this.setData({ rulerUnit: next });
      const currentSettings = getSettings();
      saveSettings({ ...currentSettings, rulerUnit: next });
    },
  },
});

/* ============================================================
 * universal-level.ts - 万向水平仪页面
 * 360°罗盘+小圆点指示器，显示任意方向倾斜状态。
 * 使用 Component({}) 模式，通过 pageLifetimes 管理传感器生命周期。
 * Task-09新增：设备能力检测、权限引导、iOS/Android适配、运行时容错
 * ============================================================ */

import { SensorManager } from '../../utils/sensor';
import { saveSettings, getSettings, saveRecord, generateRecordId, getRecordCount, MAX_RECORDS } from '../../utils/storage';
import { getCurrentLocation, requestLocationPermission, checkLocationPermission } from '../../utils/location';
import { checkAndShowSensorModal, showSensorPermissionGuide } from '../../utils/device-check';

Component({
  data: {
    /** X轴角度（beta，手机前后倾斜），传给罗盘组件纵向偏移 */
    angleX: 0,
    /** Y轴角度（gamma，手机左右倾斜），传给罗盘组件横向偏移 */
    angleY: 0,
    /** 是否已校准 */
    isCalibrated: false,
    /** 当前灵敏度档位（1-5） */
    sensitivity: 3 as SensitivityLevel,
    /**
     * 传感器是否可用
     * false：设备不支持传感器，UI应显示静态/降级状态
     */
    sensorSupported: true,
  },

  pageLifetimes: {
    /** 页面显示时启动传感器（包括从其他页面返回、从后台恢复） */
    show() {
      this._startSensor();
    },
    /** 页面隐藏时停止传感器，节省电量并减少发热 */
    hide() {
      this._stopSensor();
    },
  },

  lifetimes: {
    attached() {
      // 创建绑定 this 的数据回调，确保异步调用时 this 指向正确
      (this as any)._boundSensorCallback = (data: FilteredData) => {
        this._onSensorData(data);
      };
      // 传感器启动失败回调：处理权限拒绝或硬件不支持
      (this as any)._boundStartFailCallback = (reason: 'permission' | 'hardware') => {
        this._onSensorStartFail(reason);
      };
      // 设备能力检测标志：只在首次进入时检测，返回页面时不重复检测
      (this as any)._sensorCapabilityChecked = false;
      this._loadSettings();
    },
    /** 组件销毁：确保传感器停止并清理回调，防止内存泄漏 */
    detached() {
      this._stopSensor();
    },
  },

  methods: {
    /**
     * 启动传感器监听
     * 首次进入时检测设备能力；从后台恢复或返回页面时跳过检测直接重启
     */
    async _startSensor() {
      const self = this as any;

      // 若已知设备不支持传感器，直接返回，不重复检测和弹窗
      const currentData = this.data as any;
      if (!currentData.sensorSupported) return;

      // 设备能力检测：仅在首次进入页面时执行
      if (!self._sensorCapabilityChecked) {
        self._sensorCapabilityChecked = true;
        const supported = await checkAndShowSensorModal();
        if (!supported) {
          this.setData({ sensorSupported: false });
          return;
        }
      }

      const sensor = SensorManager.getInstance();

      // 在 start() 之前注册失败回调，确保不漏失败事件
      sensor.onStartFail((this as any)._boundStartFailCallback);

      // 恢复上次校准状态
      sensor.loadCalibration();
      const calibState = sensor.getCalibrationState();
      this.setData({ isCalibrated: calibState.isCalibrated });

      // 注册数据回调
      sensor.onData((this as any)._boundSensorCallback as SensorDataCallback);

      // 启动传感器（SensorManager 内部已处理Android降级）
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
     * @param reason 'permission'=权限问题，'hardware'=硬件不支持
     */
    _onSensorStartFail(reason: 'permission' | 'hardware') {
      this.setData({ sensorSupported: false });

      if (reason === 'permission') {
        // 权限被拒绝：引导用户前往设置开启传感器权限
        showSensorPermissionGuide();
      } else {
        // 硬件不支持：给出简要提示（主提示已在 checkAndShowSensorModal 中处理）
        wx.showToast({
          title: '传感器不可用',
          icon: 'none',
          duration: 2000,
        });
      }
    },

    /**
     * 传感器数据回调：将滤波+校准后的 beta/gamma 更新到 data
     */
    _onSensorData(data: FilteredData) {
      const { beta, gamma } = data;

      // 防御性检查：确保数据有效（SensorManager 内部已过滤，此处双重保障）
      if (!isFinite(beta) || !isFinite(gamma)) return;

      this.setData({
        angleX: beta,   // 前后倾斜 → 罗盘纵向
        angleY: gamma,  // 左右倾斜 → 罗盘横向
      });
    },

    /**
     * 加载本地设置（灵敏度），同步到传感器管理器
     */
    _loadSettings() {
      const settings = getSettings();
      const sensor = SensorManager.getInstance();
      this.setData({ sensitivity: settings.sensitivity });
      sensor.setSensitivity(settings.sensitivity);
    },

    /**
     * 执行校准：将当前姿态设为零点
     */
    onCalibrate() {
      const sensor = SensorManager.getInstance();
      const { angleX, angleY } = this.data as any;
      sensor.calibrate(angleX as number, angleY as number);
      this.setData({ isCalibrated: true });
      wx.showToast({ title: '校准成功', icon: 'success', duration: 1500 });
    },

    /**
     * 重置校准，恢复原始角度读数
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
     * 记录当前角度数据，使用标准 AngleRecord 格式保存到本地 Storage
     * 流程：检查数量上限 → 获取位置（可选）→ 保存记录 → 提示结果
     */
    async onRecord() {
      // 1. 检查记录数上限（500条）
      if (getRecordCount() >= MAX_RECORDS) {
        wx.showModal({
          title: '记录已满',
          content: `最多保存 ${MAX_RECORDS} 条记录，请先到「我的记录」页面清理旧记录。`,
          showCancel: false,
          confirmText: '知道了',
        });
        return;
      }

      const { angleX, angleY, isCalibrated } = this.data as any;
      const sensor = SensorManager.getInstance();
      const calibState = sensor.getCalibrationState();

      // 2. 尝试获取位置：先检查权限状态，再决定是否请求
      let location: LocationInfo | null = null;
      try {
        const hasPermission = await checkLocationPermission();
        if (hasPermission) {
          // 已有权限，直接静默获取（不弹任何提示）
          location = await getCurrentLocation();
        } else {
          // 无权限，请求授权（内部会弹引导弹窗，用户可选择不授权）
          const granted = await requestLocationPermission();
          if (granted) {
            location = await getCurrentLocation();
          }
          // 用户拒绝授权：location 保持 null，记录不含位置信息（正常降级）
        }
      } catch (e) {
        // 位置获取异常时降级处理，不影响记录保存
        console.warn('[UniversalLevel] 获取位置异常，将不含位置信息', e);
        location = null;
      }

      // 3. 构造符合 AngleRecord 接口的记录对象
      const record: AngleRecord = {
        id: generateRecordId(),
        angleX: parseFloat((angleX as number).toFixed(3)),
        angleY: parseFloat((angleY as number).toFixed(3)),
        timestamp: Date.now(),
        isCalibrated: !!(isCalibrated),
        calibrationOffset: calibState.isCalibrated ? {
          beta: calibState.offsetBeta,
          gamma: calibState.offsetGamma,
        } : undefined,
        // location 为 null 时不写入字段（undefined 在 JSON 序列化时会被忽略）
        location: location ?? undefined,
      };

      // 4. 保存记录，并处理 Storage 异常（例如 Storage 已满）
      try {
        saveRecord(record);
        const locHint = location ? '（含位置）' : '';
        wx.showToast({ title: `记录已保存${locHint}`, icon: 'success', duration: 1500 });
      } catch (e) {
        const errMsg = (e as Error).message || '保存失败';
        // Storage 满或其他写入错误：给出友好提示
        wx.showModal({
          title: '保存失败',
          content: errMsg.includes('记录数已达上限')
            ? '记录数已满，请先清理旧记录后再保存。'
            : `保存角度记录失败：${errMsg}`,
          showCancel: false,
          confirmText: '知道了',
        });
      }
    },

    /**
     * 跳转到「我的记录」页面
     */
    onGoToRecords() {
      wx.navigateTo({ url: '/pages/records/records' });
    },
  },
});

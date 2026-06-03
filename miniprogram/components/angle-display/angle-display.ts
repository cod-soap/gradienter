/* ============================================================
 * angle-display.ts - 角度数值展示组件
 * 以大号等宽字体显示 X/Y 轴角度值，并根据偏离程度改变颜色：
 * 绿色（接近水平）→ 黄色（轻微偏离）→ 红色（明显偏离）
 * ============================================================ */

/** 颜色状态阈值（度）：小于此值显示绿色 */
const THRESHOLD_OK = 1;
/** 大于此值显示红色 */
const THRESHOLD_ERROR = 5;

Component({
  properties: {
    /** X轴角度（gamma，手机左右倾斜），单位：度 */
    angleX: {
      type: Number,
      value: 0,
    },
    /** Y轴角度（beta，手机前后倾斜），单位：度 */
    angleY: {
      type: Number,
      value: 0,
    },
    /** 小数位数，默认1位（气泡尺用），万向水平仪需要3位 */
    precision: {
      type: Number,
      value: 1,
    },
  },

  observers: {
    /**
     * 批量监听三个属性，任一变化时统一更新显示。
     * 避免各属性单独使用 property observer 导致多次 setData：
     * 当父组件同时更新 angleX/angleY 时，只触发一次 _updateDisplay。
     */
    'angleX, angleY, precision': function() {
      this._updateDisplay();
    },
  },

  data: {
    /** X轴角度格式化字符串（带符号，如 +2.5 / -1.3） */
    angleXStr: '0.0',
    /** Y轴角度格式化字符串 */
    angleYStr: '0.0',
    /** X轴颜色状态 CSS 类名后缀 */
    angleXStatus: 'angle-display__value--ok',
    /** Y轴颜色状态 CSS 类名后缀 */
    angleYStatus: 'angle-display__value--ok',
  },

  lifetimes: {
    attached() {
      // 组件挂载时初始化显示
      this._updateDisplay();
    },
  },

  methods: {
    /**
     * 根据最新的 angleX/angleY 更新显示字符串和颜色状态
     * 由 observer 触发，避免在 data 中存储冗余计算结果导致多次 setData
     */
    _updateDisplay() {
      const x = this.properties.angleX as number;
      const y = this.properties.angleY as number;
      const p = this.properties.precision as number;

      this.setData({
        angleXStr: this._formatAngle(x, p),
        angleYStr: this._formatAngle(y, p),
        angleXStatus: this._getStatus(x),
        angleYStatus: this._getStatus(y),
      });
    },

    /**
     * 格式化角度为带符号字符串（例："+2.5" / "-1.3" / " 0.0"）
     * 正数显示 + 号，负数显示 - 号，便于快速判断方向
     */
    _formatAngle(angle: number, precision: number): string {
      const fixed = Math.abs(angle).toFixed(precision);
      if (angle > 0.005) return `+${fixed}`;
      if (angle < -0.005) return `-${fixed}`;
      return ` ${fixed}`; // 近似零，前置空格对齐
    },

    /**
     * 根据角度绝对值返回颜色状态类名
     * ok（绿） → warn（黄） → error（红）
     */
    _getStatus(angle: number): string {
      const abs = Math.abs(angle);
      if (abs <= THRESHOLD_OK) return 'angle-display__value--ok';
      if (abs <= THRESHOLD_ERROR) return 'angle-display__value--warn';
      return 'angle-display__value--error';
    },
  },
});

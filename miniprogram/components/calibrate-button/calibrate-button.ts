/* ============================================================
 * calibrate-button.ts - 校准/重置切换按钮组件
 * 根据 isCalibrated 状态在"校准"和"重置校准"之间切换，
 * 点击后向父组件触发对应事件，自身不持有校准逻辑。
 * ============================================================ */

Component({
  properties: {
    /** 当前是否处于已校准状态，由父组件传入 */
    isCalibrated: {
      type: Boolean,
      value: false,
    },
  },

  data: {},

  methods: {
    /**
     * 按钮点击处理：根据当前状态触发不同事件
     * - 未校准 → 触发 calibrate 事件（父组件执行校准）
     * - 已校准 → 触发 reset 事件（父组件重置校准）
     */
    _onTap() {
      if (this.properties.isCalibrated) {
        // 已校准状态，点击触发重置
        this.triggerEvent('reset');
      } else {
        // 未校准状态，点击触发校准
        this.triggerEvent('calibrate');
      }
    },
  },
});

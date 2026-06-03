/* ============================================================
 * sensitivity-picker.ts - 灵敏度档位选择器组件
 * 以 ●●●○○ 圆点形式展示当前灵敏度，点击区域后弹出单选面板。
 * 通过 change 事件将新档位值传递给父组件。
 * ============================================================ */

/** 灵敏度档位描述信息 */
const SENSITIVITY_OPTIONS = [
  { level: 1, name: '超稳定', desc: '极度平滑，适合精密测量' },
  { level: 2, name: '稳定', desc: '较平滑，日常使用推荐' },
  { level: 3, name: '标准', desc: '平衡稳定性与响应速度' },
  { level: 4, name: '灵敏', desc: '快速响应，有轻微抖动' },
  { level: 5, name: '超灵敏', desc: '实时追踪，抖动较明显' },
];

Component({
  properties: {
    /** 当前灵敏度档位（1-5，默认3=标准） */
    value: {
      type: Number,
      value: 3,
    },
  },

  data: {
    /** 5个档位枚举数组，用于 wx:for 渲染圆点 */
    levels: [1, 2, 3, 4, 5],
    /** 弹出面板是否显示 */
    showPanel: false,
    /** 灵敏度选项列表（供 WXML 渲染） */
    options: SENSITIVITY_OPTIONS,
  },

  methods: {
    /**
     * 点击灵敏度区域（包括圆点），弹出选择面板
     */
    _onPickerTap() {
      this.setData({ showPanel: true });
    },

    /**
     * 选择某个灵敏度档位
     * 触发 change 事件，detail.value 为新档位编号
     */
    _onOptionTap(e: WechatMiniprogram.TouchEvent) {
      const level = e.currentTarget.dataset['level'] as number;
      this.setData({ showPanel: false });
      if (level === this.properties.value) return;
      this.triggerEvent('change', { value: level });
    },

    /**
     * 点击遮罩层关闭面板
     */
    _onMaskTap() {
      this.setData({ showPanel: false });
    },
  },
});

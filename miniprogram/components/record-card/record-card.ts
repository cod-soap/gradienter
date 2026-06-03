/* ============================================================
 * record-card.ts - 角度记录卡片组件
 * 展示单条测量记录：角度值、记录时间、位置信息，含分享/删除操作按钮
 * 通过 properties 接收 AngleRecord，通过 triggerEvent 向父组件传递操作
 * ============================================================ */

/** 数字补零：将数字格式化为至少2位字符串（如 9 → "09"） */
function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 将时间戳格式化为 "YYYY-MM-DD HH:mm" 可读字符串 */
function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

Component({
  properties: {
    /** 角度记录数据，类型为 AngleRecord，由父组件传入 */
    record: {
      type: Object,
      value: null as unknown as AngleRecord,
    },
  },

  data: {
    /** 格式化后的时间字符串，如 "2024-01-15 14:30" */
    formattedTime: '' as string,
    /** 格式化后的角度字符串，如 "X: -3.355°  Y: -5.566°" */
    formattedAngle: '' as string,
    /** 位置显示文字（有位置时显示地址或坐标，无位置时为空） */
    locationText: '' as string,
    /** 是否有位置信息（控制位置行的显示隐藏） */
    hasLocation: false as boolean,
  },

  observers: {
    /**
     * 监听 record 属性变化，重新计算格式化展示数据
     * 使用 observer 而非 computed 是因为小程序 Component 无内置 computed
     */
    'record': function(record: AngleRecord | null) {
      if (!record) return;

      const formattedTime = formatTimestamp(record.timestamp);
      // 角度精确到小数点后3位，与万向水平仪页面的显示精度一致
      const formattedAngle = `X: ${record.angleX.toFixed(3)}°  Y: ${record.angleY.toFixed(3)}°`;
      const hasLocation = !!(record.location);

      let locationText = '';
      if (hasLocation && record.location) {
        if (record.location.address) {
          // 有地址描述时优先显示地址
          locationText = record.location.address;
        } else {
          // 无地址时降级显示经纬度坐标（保留4位小数）
          locationText = `${record.location.latitude.toFixed(4)}, ${record.location.longitude.toFixed(4)}`;
        }
      }

      this.setData({ formattedTime, formattedAngle, locationText, hasLocation });
    },
  },

  methods: {
    /**
     * 点击分享按钮：向父组件触发 share 事件，携带完整记录数据
     * 父组件负责决定分享方式（跳转详情页 or 弹出分享菜单）
     */
    _onShare() {
      this.triggerEvent('share', { record: this.properties.record });
    },

    /**
     * 点击删除按钮：向父组件触发 delete 事件，携带记录ID
     * 父组件负责弹出二次确认对话框并执行删除
     */
    _onDelete() {
      const record = this.properties.record as AngleRecord;
      if (!record) return;
      this.triggerEvent('delete', { id: record.id });
    },
  },
});

/* ============================================================
 * record-detail.ts - 记录详情页（兼作分享落地页）
 *
 * 两种进入方式：
 *   1. 从「我的记录」点击「分享」跳转：URL 携带 id，从 Storage 读取完整记录
 *   2. 他人点击分享卡片进入：URL 携带 type=record&ax=&ay=&t=&lat=&lng=，直接解析展示
 *
 * 分享来源（isFromShare=true）时底部显示「打开水平仪」按钮，跳转首页
 * ============================================================ */

import { getRecords } from '../../utils/storage';

/** 数字补零 */
function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 时间戳格式化为 "YYYY-MM-DD HH:mm" */
function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

Component({
  data: {
    /** 记录数据是否已加载完成 */
    loaded: false as boolean,
    /** X轴角度值（beta），精确到3位小数 */
    angleX: 0 as number,
    /** Y轴角度值（gamma），精确到3位小数 */
    angleY: 0 as number,
    /** 格式化后的角度字符串，如 "X: -3.355°  Y: -5.566°" */
    formattedAngle: '' as string,
    /** 格式化后的时间字符串 */
    formattedTime: '' as string,
    /** 位置文字（地址或坐标） */
    locationText: '' as string,
    /** 是否有位置信息 */
    hasLocation: false as boolean,
    /** 是否从分享链接进入（控制底部「打开水平仪」按钮的显示） */
    isFromShare: false as boolean,
    /** 记录加载失败时的错误提示 */
    loadError: '' as string,
    /** 用于 onShareAppMessage 的分享数据（从Storage读取后缓存） */
    _shareRecord: null as AngleRecord | null,
  },

  methods: {
    /**
     * 页面加载：解析 URL 参数，判断来源并加载记录数据
     * 必须放在 methods 中（Component 作为页面时的 onLoad 调用位置）
     */
    onLoad(options: Record<string, string | undefined>) {
      const { id, type, ax, ay, t, lat, lng } = options;

      if (type === 'record' && ax && ay && t) {
        // ── 来源：分享链接 ──────────────────────────────────────────
        // 直接从 URL 参数解析，不依赖 Storage（对方设备无本地数据）
        this._loadFromShareParams(ax, ay, t, lat, lng);
      } else if (id) {
        // ── 来源：本地「我的记录」页面跳转 ──────────────────────────
        this._loadFromStorage(id);
      } else {
        // 参数不足，显示错误状态
        this.setData({ loaded: true, loadError: '记录信息无效或已失效' });
      }
    },

    /**
     * 从 URL 参数（分享链接）中解析记录数据
     * 分享参数：ax=angleX, ay=angleY, t=timestamp, lat=纬度, lng=经度
     */
    _loadFromShareParams(ax: string, ay: string, t: string, lat?: string, lng?: string) {
      const angleX = parseFloat(ax);
      const angleY = parseFloat(ay);
      const timestamp = parseInt(t, 10);

      // 参数值校验：防止 NaN 或非法值
      if (isNaN(angleX) || isNaN(angleY) || isNaN(timestamp)) {
        this.setData({ loaded: true, loadError: '分享数据解析失败，记录信息可能已损坏' });
        return;
      }

      const latNum = lat ? parseFloat(lat) : NaN;
      const lngNum = lng ? parseFloat(lng) : NaN;
      const hasLocation = !isNaN(latNum) && !isNaN(lngNum);
      const locationText = hasLocation ? `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}` : '';

      this.setData({
        loaded: true,
        isFromShare: true,
        angleX,
        angleY,
        formattedAngle: `X: ${angleX.toFixed(3)}°  Y: ${angleY.toFixed(3)}°`,
        formattedTime: formatTimestamp(timestamp),
        locationText,
        hasLocation,
        // 分享来源无 Storage 记录，_shareRecord 置空
        _shareRecord: null,
      });
    },

    /**
     * 从本地 Storage 中按 ID 读取完整记录
     * 供「我的记录」跳转时使用，能获取完整的 AngleRecord 数据
     */
    _loadFromStorage(id: string) {
      const records = getRecords();
      const record = records.find(r => r.id === id);

      if (!record) {
        this.setData({ loaded: true, loadError: '未找到该记录，可能已被删除' });
        return;
      }

      const locationText = record.location?.address
        || (record.location ? `${record.location.latitude.toFixed(4)}, ${record.location.longitude.toFixed(4)}` : '');

      this.setData({
        loaded: true,
        isFromShare: false,
        angleX: record.angleX,
        angleY: record.angleY,
        formattedAngle: `X: ${record.angleX.toFixed(3)}°  Y: ${record.angleY.toFixed(3)}°`,
        formattedTime: formatTimestamp(record.timestamp),
        locationText,
        hasLocation: !!(record.location),
        // 缓存完整记录，供 onShareAppMessage 使用
        _shareRecord: record,
      });
    },

    /**
     * 「打开水平仪」按钮点击：跳转到首页
     * 仅在从分享链接进入时显示此按钮
     */
    _goToIndex() {
      // reLaunch 关闭所有页面后跳转首页，避免分享落地页留在导航栈
      wx.reLaunch({ url: '/pages/index/index' });
    },

    /**
     * 分享配置：让此页面可通过右上角「...」菜单转发给好友
     * 分享路径使用 type=record 格式，接收方进入即为分享落地页
     */
    onShareAppMessage(): WechatMiniprogram.Page.ICustomShareContent {
      const { angleX, angleY, _shareRecord } = this.data;

      const angleXStr = angleX.toFixed(3);
      const angleYStr = angleY.toFixed(3);
      const timestamp = _shareRecord?.timestamp || Date.now();
      const lat = _shareRecord?.location?.latitude;
      const lng = _shareRecord?.location?.longitude;
      const hasCoords = lat !== undefined && lng !== undefined;

      return {
        title: `水平仪测量记录 X:${angleXStr}° Y:${angleYStr}°`,
        // 分享路径：携带经纬度坐标，接收方直接展示坐标（无需反地理编码）
        path: `/pages/record-detail/record-detail?type=record&ax=${angleX}&ay=${angleY}&t=${timestamp}${hasCoords ? `&lat=${lat}&lng=${lng}` : ''}`,
      };
    },
  },
});

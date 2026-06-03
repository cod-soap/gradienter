/* ============================================================
 * record.d.ts - 角度记录相关类型定义
 * 涵盖角度记录数据结构、分享参数、位置信息等类型
 * ============================================================ */

/** 位置信息（记录角度时可选获取） */
interface LocationInfo {
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
  /** 地址描述（反地理编码结果，可能为空） */
  address?: string;
}

/** 单条角度记录（存储到本地Storage） */
interface AngleRecord {
  /** 唯一ID，格式：时间戳+4位随机数 */
  id: string;
  /** X轴角度（对应设备方向 beta 值） */
  angleX: number;
  /** Y轴角度（对应设备方向 gamma 值） */
  angleY: number;
  /** 记录时间戳（毫秒） */
  timestamp: number;
  /** 位置信息（用户授权时获取，否则为 undefined） */
  location?: LocationInfo;
  /** 用户备注（预留字段，当前版本可选） */
  note?: string;
  /** 记录时是否处于校准状态 */
  isCalibrated: boolean;
  /** 校准偏移量（处于校准状态时记录，方便事后还原原始角度） */
  calibrationOffset?: {
    beta: number;
    gamma: number;
  };
}

/** 分享链接携带的参数（编码到URL query中） */
interface ShareParams {
  /** 分享类型，固定为 'record' */
  type: 'record';
  /** 角度记录的唯一ID（用于从Storage读取完整记录） */
  recordId: string;
  /** X轴角度值 */
  angleX: number;
  /** Y轴角度值 */
  angleY: number;
  /** 记录时间戳 */
  timestamp: number;
  /** 位置描述（简化字符串，如"北京市朝阳区"） */
  location?: string;
}

/** 记录列表的排序方向 */
type RecordSortOrder = 'desc' | 'asc';

/** 格式化后的记录（用于页面展示，含格式化时间/角度字符串） */
interface FormattedRecord extends AngleRecord {
  /** 格式化的时间字符串，如"2024-01-15 14:30" */
  formattedTime: string;
  /** 格式化的角度字符串，如"X: -3.355° Y: -5.566°" */
  formattedAngle: string;
  /** 位置显示文字（无位置时显示"未知位置"） */
  locationText: string;
}

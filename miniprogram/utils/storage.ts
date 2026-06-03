/* ============================================================
 * storage.ts - 本地存储封装
 * 统一管理角度记录和用户设置的读写，封装Storage API细节
 * ============================================================ */

/** 角度记录的Storage键名（存储 AngleRecord[] 数组） */
const RECORDS_KEY = 'angle_records';
/** 用户设置的Storage键名（存储 UserSettings 对象） */
const SETTINGS_KEY = 'user_settings';

/** 最大记录数量限制，超出时拒绝新增并提示用户清理 */
const MAX_RECORDS = 500;

/** 默认用户设置（首次启动时使用） */
const DEFAULT_SETTINGS: UserSettings = {
  sensitivity: 3,
  rulerUnit: 'cm',
};

/**
 * 保存一条角度记录
 * 如果记录数已达上限则抛出错误（调用方需处理并提示用户）
 */
function saveRecord(record: AngleRecord): void {
  const records = getRecords();
  if (records.length >= MAX_RECORDS) {
    throw new Error(`记录数已达上限（${MAX_RECORDS}条），请先清理旧记录`);
  }
  records.push(record);
  wx.setStorageSync(RECORDS_KEY, records);
}

/**
 * 读取所有角度记录（按存储顺序返回，调用方自行排序）
 * 读取失败时返回空数组，不影响功能
 */
function getRecords(): AngleRecord[] {
  try {
    const data = wx.getStorageSync(RECORDS_KEY);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('[Storage] 读取记录失败', e);
    return [];
  }
}

/**
 * 根据ID删除一条角度记录
 * ID不存在时静默忽略
 */
function deleteRecord(id: string): void {
  const records = getRecords();
  const filtered = records.filter(r => r.id !== id);
  wx.setStorageSync(RECORDS_KEY, filtered);
}

/**
 * 清空所有角度记录
 */
function clearRecords(): void {
  wx.setStorageSync(RECORDS_KEY, []);
}

/**
 * 获取当前记录数量
 */
function getRecordCount(): number {
  return getRecords().length;
}

/**
 * 保存用户设置
 * 同时更新globalData缓存，避免后续需要重新读Storage
 */
function saveSettings(settings: UserSettings): void {
  try {
    wx.setStorageSync(SETTINGS_KEY, settings);
    // 同步更新全局缓存，减少后续Storage读取开销
    const app = getApp<{ globalData: GlobalAppData }>();
    if (app && app.globalData) {
      app.globalData.userSettings = settings;
    }
  } catch (e) {
    console.warn('[Storage] 保存设置失败', e);
  }
}

/**
 * 读取用户设置
 * 读取失败或不存在时返回默认设置
 */
function getSettings(): UserSettings {
  try {
    const data = wx.getStorageSync(SETTINGS_KEY) as UserSettings | undefined;
    if (data && typeof data === 'object') {
      // 合并默认值，防止旧版本Settings缺少新字段
      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch (e) {
    console.warn('[Storage] 读取设置失败', e);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * 生成唯一记录ID（时间戳 + 4位随机数）
 */
function generateRecordId(): string {
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${Date.now()}${random}`;
}

export {
  saveRecord,
  getRecords,
  deleteRecord,
  clearRecords,
  getRecordCount,
  saveSettings,
  getSettings,
  generateRecordId,
  MAX_RECORDS,
};

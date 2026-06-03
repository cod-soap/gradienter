/* ============================================================
 * records.ts - 我的记录页面
 * 列表展示用户保存的所有角度记录，支持删除（二次确认）和分享（跳转详情页）
 * 使用 Component({}) 模式以兼容 glass-easel 框架
 * ============================================================ */

import { getRecords, deleteRecord, clearRecords } from '../../utils/storage';

Component({
  data: {
    /** 所有角度记录列表，按时间戳倒序排列（最新在最前） */
    records: [] as AngleRecord[],
    /** 当前列表是否为空，控制空状态提示的显示 */
    isEmpty: true as boolean,
  },

  pageLifetimes: {
    /**
     * 每次页面显示时重新加载记录
     * 覆盖 onShow，确保从其他页面返回后列表能自动刷新
     */
    show() {
      this._loadRecords();
    },
  },

  methods: {
    /**
     * 从本地存储读取记录，按时间戳降序排列后更新列表
     * 使用 slice() 避免修改原数组引用
     */
    _loadRecords() {
      const raw = getRecords();
      // 降序排列：时间戳大（新）的排在前面
      const sorted = raw.slice().sort((a, b) => b.timestamp - a.timestamp);
      this.setData({
        records: sorted,
        isEmpty: sorted.length === 0,
      });
    },

    /**
     * 接收 record-card 的 share 事件
     * 跳转到记录详情页，用户可从详情页通过右上角菜单将记录分享给好友
     */
    _onRecordShare(event: WechatMiniprogram.CustomEvent) {
      const record = event.detail.record as AngleRecord;
      if (!record) return;

      // 跳转详情页：传入 id 标识来自本地，详情页从 Storage 读取完整数据
      wx.navigateTo({
        url: `/pages/record-detail/record-detail?id=${record.id}`,
      });
    },

    /**
     * 接收 record-card 的 delete 事件
     * 弹出确认对话框，确认后删除并刷新列表
     */
    _onRecordDelete(event: WechatMiniprogram.CustomEvent) {
      const { id } = event.detail as { id: string };
      if (!id) return;

      wx.showModal({
        title: '删除记录',
        content: '确认删除这条测量记录吗？此操作不可撤销。',
        confirmText: '删除',
        confirmColor: '#FF1744', // 警示红，强调危险操作
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            try {
              deleteRecord(id);
              wx.showToast({ title: '已删除', icon: 'success', duration: 1200 });
              // 删除后立即刷新列表
              this._loadRecords();
            } catch (e) {
              wx.showToast({ title: '删除失败，请重试', icon: 'error' });
            }
          }
        },
      });
    },

    /**
     * 点击空状态区域的"去记录"按钮
     * 跳转到万向水平仪页面引导用户进行第一次测量
     */
    _goToUniversalLevel() {
      wx.navigateTo({ url: '/pages/universal-level/universal-level' });
    },

    /**
     * 一键清空所有记录
     * 弹出二次确认（显示当前记录数），确认后清空并刷新列表
     */
    _onClearAll() {
      const count = this.data.records.length;
      if (count === 0) return;

      wx.showModal({
        title: '清空所有记录',
        content: `确认删除全部 ${count} 条测量记录吗？此操作不可撤销。`,
        confirmText: '全部清空',
        confirmColor: '#FF1744',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            try {
              clearRecords();
              wx.showToast({ title: '已清空', icon: 'success', duration: 1200 });
              this._loadRecords();
            } catch (e) {
              wx.showToast({ title: '清空失败，请重试', icon: 'error' });
            }
          }
        },
      });
    },

    /**
     * 分享配置：通过右上角"..."菜单分享应用入口
     * 注意：记录的分享在记录详情页（record-detail）处理
     */
    onShareAppMessage(): WechatMiniprogram.Page.ICustomShareContent {
      return {
        title: '精准水平仪 - 专业测量工具',
        path: '/pages/index/index',
      };
    },
  },
});

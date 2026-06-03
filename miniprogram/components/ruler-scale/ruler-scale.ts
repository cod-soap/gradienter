/* ============================================================
 * ruler-scale.ts - 刻度尺组件
 * 使用 Canvas 2D 绘制精准物理刻度尺，根据设备 PPI 计算刻度间距。
 * 支持 cm / inch 两种单位，提供三级刻度线（大/中/小）和数字标注。
 * PPI 从 app.ts 缓存的 globalData.deviceInfo.estimatedPPI 读取。
 * ============================================================ */

import { COLORS } from '../../utils/canvas-bindhelper';

/** 刻度尺单位类型 */
type RulerUnit = 'cm' | 'inch';

Component({
  properties: {
    /** 刻度尺单位：'cm'（厘米）| 'inch'（英寸） */
    unit: {
      type: String,
      value: 'cm' as RulerUnit,
      observer() {
        // 单位切换时重新绘制
        this._draw();
      },
    },
  },

  // 内部状态直接挂在实例上，不放入 data 以避免触发不必要的渲染
  // this._ctx         : Canvas 2D 渲染上下文
  // this._canvasW     : Canvas 逻辑宽度（CSS px）
  // this._canvasH     : Canvas 逻辑高度（CSS px）
  // this._ppiLogical  : 逻辑像素下的每英寸像素数 = 物理PPI / devicePixelRatio

  lifetimes: {
    /** 组件节点就绪后初始化 Canvas */
    ready() {
      this._initCanvas();
    },
  },

  methods: {
    /**
     * 初始化 Canvas：获取节点、设置物理分辨率、缩放上下文
     * 完成后立即绘制第一帧
     */
    _initCanvas() {
      this.createSelectorQuery()
        .select('#ruler-canvas')
        .fields({ node: true, size: true })
        .exec((res: any[]) => {
          const item = res[0];
          if (!item || !item.node) {
            console.warn('[RulerScale] Canvas 节点未找到');
            return;
          }

          const canvas = item.node as WechatMiniprogram.Canvas;
          const dpr = wx.getSystemInfoSync().pixelRatio;

          // 设置物理像素分辨率（保证 Retina 屏清晰）
          canvas.width  = item.width  * dpr;
          canvas.height = item.height * dpr;

          // 使用 Canvas 2D 新 API（标准 Web Canvas 接口）
          const ctx = canvas.getContext('2d') as any;
          // 缩放使绘图坐标对齐逻辑像素（逻辑 px = CSS px）
          ctx.scale(dpr, dpr);

          (this as any)._ctx      = ctx;
          (this as any)._canvasW  = item.width;
          (this as any)._canvasH  = item.height;

          // 计算逻辑像素下的 PPI
          // 物理 PPI / dpr = 每逻辑 px 代表的物理英寸换算系数
          const estimatedPPI: number =
            (getApp() as any).globalData.deviceInfo.estimatedPPI ?? 326;
          (this as any)._ppiLogical = estimatedPPI / dpr;

          // 初始化后立即绘制
          this._draw();
        });
    },

    /**
     * 绘制刻度尺（根据当前 unit 属性决定单位制）
     */
    _draw() {
      const ctx: any = (this as any)._ctx;
      if (!ctx) return; // Canvas 尚未初始化，忽略

      const W: number        = (this as any)._canvasW;
      const H: number        = (this as any)._canvasH;
      const ppiLogical: number = (this as any)._ppiLogical;
      const unit = this.properties.unit as RulerUnit;

      // 清空画布
      ctx.clearRect(0, 0, W, H);

      // 绘制深色半透明背景（与气泡管风格一致）
      ctx.fillStyle = COLORS.TUBE_BG;
      ctx.fillRect(0, 0, W, H);

      // 绘制顶部边框线（分隔气泡管与刻度尺）
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W, 0);
      ctx.strokeStyle = COLORS.TUBE_BORDER;
      ctx.lineWidth = 1;
      ctx.stroke();

      if (unit === 'cm') {
        this._drawCmRuler(ctx, W, H, ppiLogical);
      } else {
        this._drawInchRuler(ctx, W, H, ppiLogical);
      }
    },

    /**
     * 绘制厘米刻度尺
     * - 大刻度：每 1cm，较长线 + 数字标注
     * - 中刻度：每 5mm，中等长度线
     * - 小刻度：每 1mm，短线
     *
     * @param ppiLogical 逻辑像素PPI（物理PPI / dpr）
     */
    _drawCmRuler(ctx: any, W: number, H: number, ppiLogical: number) {
      // 1mm 对应的逻辑像素 = PPI / 25.4（1inch = 25.4mm）
      const mmPx = ppiLogical / 25.4;
      // 总毫米数（向下取整确保不超出画布）
      const totalMm = Math.floor(W / mmPx);

      // 三级刻度线高度（从顶部向下延伸，比例为画布高度）
      const majorH = H * 0.58; // 大刻度（每cm）
      const midH   = H * 0.38; // 中刻度（每5mm）
      const minorH = H * 0.20; // 小刻度（每1mm）

      for (let i = 0; i <= totalMm; i++) {
        const x = i * mmPx;
        let lineH: number;
        let color: string;
        let lineWidth: number;

        if (i % 10 === 0) {
          // 每10mm = 1cm，大刻度
          lineH = majorH;
          color = COLORS.SCALE_PRIMARY;
          lineWidth = 1.5;
        } else if (i % 5 === 0) {
          // 每5mm，中刻度
          lineH = midH;
          color = COLORS.SCALE_SECONDARY;
          lineWidth = 1;
        } else {
          // 每1mm，小刻度
          lineH = minorH;
          color = COLORS.SCALE_SECONDARY;
          lineWidth = 0.8;
        }

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, lineH);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // 大刻度处（除第0刻度外）绘制厘米数字
        if (i % 10 === 0 && i > 0) {
          const label = String(i / 10);
          ctx.fillStyle = COLORS.SCALE_PRIMARY;
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(label, x, majorH + 2);
        }
      }

      // 恢复默认对齐方式，避免影响后续绘制
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    },

    /**
     * 绘制英寸刻度尺
     * - 大刻度：每 1inch，较长线 + 数字标注（如 1"、2"）
     * - 中刻度：每 1/4inch，中等长度线
     * - 小刻度：每 1/8inch，短线
     *
     * @param ppiLogical 逻辑像素PPI
     */
    _drawInchRuler(ctx: any, W: number, H: number, ppiLogical: number) {
      // 1/8 inch 对应逻辑像素（最小刻度单位）
      const eighthPx = ppiLogical / 8;
      // 总 1/8 inch 个数
      const totalEighths = Math.floor(W / eighthPx);

      const majorH = H * 0.58;
      const midH   = H * 0.38;
      const minorH = H * 0.20;

      for (let i = 0; i <= totalEighths; i++) {
        const x = i * eighthPx;
        let lineH: number;
        let color: string;
        let lineWidth: number;

        if (i % 8 === 0) {
          // 每8格 = 1inch，大刻度
          lineH = majorH;
          color = COLORS.SCALE_PRIMARY;
          lineWidth = 1.5;
        } else if (i % 2 === 0) {
          // 每2格 = 1/4inch，中刻度
          lineH = midH;
          color = COLORS.SCALE_SECONDARY;
          lineWidth = 1;
        } else {
          // 每1格 = 1/8inch，小刻度
          lineH = minorH;
          color = COLORS.SCALE_SECONDARY;
          lineWidth = 0.8;
        }

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, lineH);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // 大刻度处（除第0刻度外）绘制英寸数字
        if (i % 8 === 0 && i > 0) {
          const label = (i / 8) + '"';
          ctx.fillStyle = COLORS.SCALE_PRIMARY;
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(label, x, majorH + 2);
        }
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    },
  },
});

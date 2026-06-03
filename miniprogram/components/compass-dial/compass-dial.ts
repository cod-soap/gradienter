/* ============================================================
 * compass-dial.ts - 360°罗盘表盘组件
 * 使用 Canvas 2D 绘制罗盘刻度盘、十字参考线、同心参考圆。
 * 根据 angleX(beta) / angleY(gamma) 属性控制小圆点在盘面上的位置。
 * 小圆点颜色随偏离程度（绿→黄→红）动态变化。
 * ============================================================ */

import { COLORS, degreeToColor, hexToRgba, drawCircleDial } from '../../utils/canvas-bindhelper';

/** 小圆点活动区域半径与外圆半径之比（限制在 68% 范围内移动） */
const DOT_ZONE_RATIO = 0.68;
/** 对应最大显示角度（超出此角度小圆点到达活动区边缘） */
const MAX_ANGLE = 45;

Component({
  properties: {
    /** X轴角度（beta，手机前后倾斜），正值=前倾，负值=后仰 */
    angleX: {
      type: Number,
      value: 0,
    },
    /** Y轴角度（gamma，手机左右倾斜），正值=右倾，负值=左倾 */
    angleY: {
      type: Number,
      value: 0,
    },
  },

  observers: {
    /**
     * 同时监听 angleX 和 angleY 变化，合并为一次重绘。
     * 如果分别使用 property observer，父组件每次 setData({angleX, angleY}) 会触发两次
     * _draw，导致每帧多绘制一次（浪费约50%的绘制开销）。
     * 使用 observers 批量监听，两个属性在同一个 setData 中更新时只触发一次回调。
     */
    'angleX, angleY': function(angleX: number, angleY: number) {
      this._draw(angleX, angleY);
    },
  },

  data: {},

  // 内部状态直接挂在实例上（不放 data，避免触发不必要的渲染）
  // this._ctx: Canvas 2D 上下文
  // this._canvasW: Canvas 逻辑宽度（px，DPR=1 的坐标空间）
  // this._canvasH: Canvas 逻辑高度

  lifetimes: {
    ready() {
      this._initCanvas();
    },
  },

  methods: {
    /**
     * 初始化 Canvas：查找节点 → 设置物理分辨率 → 缩放上下文
     */
    _initCanvas() {
      this.createSelectorQuery()
        .select('#compass-canvas')
        .fields({ node: true, size: true })
        .exec((res: any[]) => {
          const item = res[0];
          if (!item || !item.node) {
            console.warn('[CompassDial] Canvas节点未找到');
            return;
          }
          const canvas = item.node as WechatMiniprogram.Canvas;
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = item.width * dpr;
          canvas.height = item.height * dpr;

          const ctx = canvas.getContext('2d') as any;
          ctx.scale(dpr, dpr);

          (this as any)._ctx = ctx;
          (this as any)._canvasW = item.width;
          (this as any)._canvasH = item.height;

          // 初始化后立即绘制一帧
          this._draw(
            this.properties.angleX as number,
            this.properties.angleY as number,
          );
        });
    },

    /**
     * 主绘制入口：清空画布，依次绘制各层
     * @param angleX beta 角度（前后倾斜）
     * @param angleY gamma 角度（左右倾斜）
     */
    _draw(angleX: number, angleY: number) {
      const ctx = (this as any)._ctx;
      if (!ctx) return;

      const W: number = (this as any)._canvasW;
      const H: number = (this as any)._canvasH;

      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      // 外圆半径：取宽高最小值的 46%，留出少量边距
      const outerR = Math.min(W, H) * 0.46;

      this._drawBackground(ctx, cx, cy, outerR);
      this._drawRings(ctx, cx, cy, outerR);
      this._drawScaleMarks(ctx, cx, cy, outerR);
      this._drawCrosshair(ctx, cx, cy, outerR);
      this._drawDot(ctx, cx, cy, outerR, angleX, angleY);
    },

    /**
     * 绘制盘面背景（外圆 + 内部填充）
     */
    _drawBackground(ctx: any, cx: number, cy: number, outerR: number) {
      // 外圆填充（深色背景）
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 15, 30, 0.92)';
      ctx.fill();

      // 外圆边框（蓝灰色工业风）
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = '#37474F';
      ctx.lineWidth = 2;
      ctx.stroke();
    },

    /**
     * 绘制同心参考圆（25% / 50% / 75% 半径处）
     */
    _drawRings(ctx: any, cx: number, cy: number, outerR: number) {
      const ratios = [0.25, 0.50, 0.75];
      ratios.forEach((ratio, i) => {
        const r = outerR * ratio;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        // 最外层参考圆稍亮，内层渐暗
        ctx.strokeStyle = i === 2 ? 'rgba(69, 90, 100, 0.6)' : 'rgba(55, 71, 79, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    },

    /**
     * 绘制刻度线（使用 canvas-bindhelper 的 drawCircleDial）
     * 每 30° 大刻度 + 标签，每 10° 中刻度，每 5° 小刻度
     */
    _drawScaleMarks(ctx: any, cx: number, cy: number, outerR: number) {
      drawCircleDial(ctx, {
        cx,
        cy,
        outerRadius: outerR,
        majorStep: 30,
        midStep: 10,
        minorStep: 5,
        majorLen: outerR * 0.12,
        midLen: outerR * 0.07,
        minorLen: outerR * 0.04,
        showLabel: true,
      });
    },

    /**
     * 绘制十字参考线（水平 + 垂直），延伸到刻度线内侧
     */
    _drawCrosshair(ctx: any, cx: number, cy: number, outerR: number) {
      const innerR = outerR * 0.88; // 十字线长度到此半径

      ctx.strokeStyle = COLORS.CROSSHAIR;
      ctx.lineWidth = 1;

      // 水平线
      ctx.beginPath();
      ctx.moveTo(cx - innerR, cy);
      ctx.lineTo(cx + innerR, cy);
      ctx.stroke();

      // 垂直线
      ctx.beginPath();
      ctx.moveTo(cx, cy - innerR);
      ctx.lineTo(cx, cy + innerR);
      ctx.stroke();

      // 圆心参考点（小实心圆）
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fill();
    },

    /**
     * 绘制倾斜指示小圆点
     * 点位置：angleY(gamma) → 水平偏移，angleX(beta) → 垂直偏移
     * 颜色随最大偏离轴角度变化：绿→黄→红
     */
    _drawDot(ctx: any, cx: number, cy: number, outerR: number, angleX: number, angleY: number) {
      // 活动区域半径（圆点中心允许到达的最大距离）
      const zoneR = outerR * DOT_ZONE_RATIO;
      const dotR = outerR * 0.07; // 圆点自身半径

      // 将角度线性映射到像素偏移，超出 MAX_ANGLE 时夹紧到边缘
      const clampedX = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angleY)); // gamma → 左右
      const clampedY = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angleX)); // beta  → 上下

      const offsetX = (clampedX / MAX_ANGLE) * zoneR;
      const offsetY = (clampedY / MAX_ANGLE) * zoneR;

      const dotX = cx + offsetX;
      const dotY = cy + offsetY;

      // 根据最大偏离角度计算颜色
      const maxAbs = Math.max(Math.abs(angleX), Math.abs(angleY));
      const color = degreeToColor(maxAbs, 1, MAX_ANGLE);

      // 外发光（模糊大圆，增强可见性）
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotR * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.12);
      ctx.fill();

      // 圆点主体（半透明填充）
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.65);
      ctx.fill();

      // 圆点边框（实色，高亮轮廓）
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 高光小点（模拟玻璃球折射光斑）
      ctx.beginPath();
      ctx.arc(dotX - dotR * 0.28, dotY - dotR * 0.3, dotR * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fill();
    },
  },
});

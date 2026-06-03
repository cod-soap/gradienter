/* ============================================================
 * bubble-tube.ts - 气泡管组件
 * 使用 Canvas 2D 绘制气泡水准管，支持水平/垂直/45°/反向45°四种方向。
 * 气泡位置根据传入的 angle 属性实时更新，气泡颜色随偏离程度变化。
 * 水平方向支持内嵌刻度尺（cm/inch），直接绘制在管体上。
 * ============================================================ */

import { COLORS, degreeToColor, hexToRgba } from '../../utils/canvas-bindhelper';

/** 气泡管方向类型：水平/垂直/45°左上-右下/45°右上-左下 */
type TubeDirection = 'horizontal' | 'vertical' | 'diagonal' | 'diagonal-reverse';

Component({
  properties: {
    /** 气泡管方向 */
    direction: {
      type: String,
      value: 'horizontal' as TubeDirection,
    },
    /** 当前倾斜角度（度），由页面传入，已经过滤波和校准 */
    angle: {
      type: Number,
      value: 0,
      observer(newVal: number) {
        this._draw(newVal);
      },
    },
    /** 气泡管最大测量范围（超出此角度气泡到达管端），默认15° */
    maxAngle: {
      type: Number,
      value: 15,
    },
    /** 是否显示刻度尺（horizontal 时在管体下方，vertical 时在管体右侧） */
    showRuler: {
      type: Boolean,
      value: false,
    },
    /** 刻度尺单位（仅 showRuler=true 时生效） */
    rulerUnit: {
      type: String,
      value: 'cm' as 'cm' | 'inch',
      observer() {
        // 单位切换时重绘
        this._draw(this.properties.angle as number);
      },
    },
  },

  data: {},

  lifetimes: {
    ready() {
      this._initCanvas();
    },
  },

  methods: {
    /**
     * 初始化 Canvas：获取节点、设置物理分辨率、缩放上下文
     */
    _initCanvas() {
      this.createSelectorQuery()
        .select('#bubble-canvas')
        .fields({ node: true, size: true })
        .exec((res: any[]) => {
          const item = res[0];
          if (!item || !item.node) {
            console.warn('[BubbleTube] Canvas节点未找到');
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

          // 计算逻辑PPI（用于内嵌刻度尺）
          const estimatedPPI: number =
            (getApp() as any).globalData?.deviceInfo?.estimatedPPI ?? 326;
          (this as any)._ppiLogical = estimatedPPI / dpr;

          this._draw(this.properties.angle as number);
        });
    },

    /**
     * 绘制气泡管（根据 direction 分发到对应绘制函数）
     */
    _draw(angle: number) {
      const ctx = (this as any)._ctx;
      if (!ctx) return;

      const W: number = (this as any)._canvasW;
      const H: number = (this as any)._canvasH;
      const maxAngle: number = this.properties.maxAngle as number;
      const direction: TubeDirection = this.properties.direction as TubeDirection;

      ctx.clearRect(0, 0, W, H);

      if (direction === 'horizontal') {
        this._drawHorizontalTube(ctx, W, H, angle, maxAngle);
      } else if (direction === 'vertical') {
        this._drawVerticalTube(ctx, W, H, angle, maxAngle);
      } else if (direction === 'diagonal') {
        this._drawDiagonalTube(ctx, W, H, angle, maxAngle, Math.PI / 4);
      } else if (direction === 'diagonal-reverse') {
        // 反向45°：旋转 -45°（即从右上到左下）
        this._drawDiagonalTube(ctx, W, H, angle, maxAngle, -Math.PI / 4);
      }
    },

    /**
     * 绘制水平气泡管（横向）
     * 气泡随 gamma（左右倾斜）角度左右移动
     * 当 showRuler=true 时，在管体下半部绘制物理刻度
     */
    _drawHorizontalTube(ctx: any, W: number, H: number, angle: number, maxAngle: number) {
      const showRuler = this.properties.showRuler as boolean;
      const margin = W * 0.04;

      // 管体区域（有刻度尺时气泡区占上部，刻度区占下部）
      const tubeW = W - 2 * margin;
      const tubeH = showRuler ? H * 0.55 : H * 0.55;
      const tubeX = margin;
      const tubeY = showRuler ? H * 0.02 : (H - tubeH) / 2;
      const tubeR = tubeH / 2;

      const cx = tubeX + tubeW / 2;
      const cy = tubeY + tubeH / 2;

      // 绘制管体背景
      this._drawTubeBody(ctx, tubeX, tubeY, tubeW, tubeH, tubeR);

      // 绘制管内刻度线
      this._drawHorizScaleMarks(ctx, cx, tubeY, tubeW, tubeH);

      // 中心高亮线（零点标记，绿色）
      ctx.beginPath();
      ctx.moveTo(cx, tubeY + tubeH * 0.1);
      ctx.lineTo(cx, tubeY + tubeH * 0.9);
      ctx.strokeStyle = COLORS.SCALE_HIGHLIGHT;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 计算气泡偏移量
      const bubbleRadius = tubeH * 0.34;
      const maxTravel = (tubeW - 2 * tubeR) * 0.42;
      const clamped = Math.max(-maxAngle, Math.min(maxAngle, angle));
      const offset = -(clamped / maxAngle) * maxTravel;

      const color = degreeToColor(angle);
      this._drawBubble(ctx, cx + offset, cy, bubbleRadius, color);

      // 如果需要内嵌刻度尺，在管体下方绘制
      if (showRuler) {
        const rulerY = tubeY + tubeH + 2;
        const rulerH = H - rulerY - 2;
        const unit = this.properties.rulerUnit as 'cm' | 'inch';
        this._drawInlineRuler(ctx, tubeX, rulerY, tubeW, rulerH, unit);
      }
    },

    /**
     * 在管体下方绘制内嵌刻度尺
     * 从管体左端开始，按物理尺寸绘制三级刻度线
     */
    _drawInlineRuler(
      ctx: any,
      startX: number,
      y: number,
      width: number,
      height: number,
      unit: 'cm' | 'inch',
    ) {
      const ppiLogical: number = (this as any)._ppiLogical || 120;

      // 绘制分隔线
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + width, y);
      ctx.strokeStyle = hexToRgba(COLORS.TUBE_BORDER, 0.5);
      ctx.lineWidth = 0.5;
      ctx.stroke();

      if (unit === 'cm') {
        this._drawCmTicks(ctx, startX, y, width, height, ppiLogical);
      } else {
        this._drawInchTicks(ctx, startX, y, width, height, ppiLogical);
      }
    },

    /**
     * 绘制厘米刻度（三级：1mm小/5mm中/10mm大）
     */
    _drawCmTicks(
      ctx: any,
      startX: number,
      y: number,
      width: number,
      height: number,
      ppiLogical: number,
    ) {
      const mmPx = ppiLogical / 25.4;
      const totalMm = Math.floor(width / mmPx);

      const majorH = height * 0.7;
      const midH = height * 0.45;
      const minorH = height * 0.25;

      for (let i = 0; i <= totalMm; i++) {
        const x = startX + i * mmPx;
        let lineH: number;
        let color: string;
        let lw: number;

        if (i % 10 === 0) {
          lineH = majorH;
          color = COLORS.SCALE_PRIMARY;
          lw = 1.2;
        } else if (i % 5 === 0) {
          lineH = midH;
          color = COLORS.SCALE_SECONDARY;
          lw = 0.8;
        } else {
          lineH = minorH;
          color = COLORS.SCALE_SECONDARY;
          lw = 0.5;
        }

        ctx.beginPath();
        ctx.moveTo(x, y + 1);
        ctx.lineTo(x, y + 1 + lineH);
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.stroke();

        // 大刻度处标注cm数字（跳过0）
        if (i % 10 === 0 && i > 0) {
          ctx.fillStyle = COLORS.SCALE_PRIMARY;
          ctx.font = '7px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(String(i / 10), x, y + majorH + 2);
        }
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    },

    /**
     * 绘制英寸刻度（三级：1/8"小/1/4"中/1"大）
     */
    _drawInchTicks(
      ctx: any,
      startX: number,
      y: number,
      width: number,
      height: number,
      ppiLogical: number,
    ) {
      const eighthPx = ppiLogical / 8;
      const totalEighths = Math.floor(width / eighthPx);

      const majorH = height * 0.7;
      const midH = height * 0.45;
      const minorH = height * 0.25;

      for (let i = 0; i <= totalEighths; i++) {
        const x = startX + i * eighthPx;
        let lineH: number;
        let color: string;
        let lw: number;

        if (i % 8 === 0) {
          lineH = majorH;
          color = COLORS.SCALE_PRIMARY;
          lw = 1.2;
        } else if (i % 2 === 0) {
          lineH = midH;
          color = COLORS.SCALE_SECONDARY;
          lw = 0.8;
        } else {
          lineH = minorH;
          color = COLORS.SCALE_SECONDARY;
          lw = 0.5;
        }

        ctx.beginPath();
        ctx.moveTo(x, y + 1);
        ctx.lineTo(x, y + 1 + lineH);
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.stroke();

        if (i % 8 === 0 && i > 0) {
          ctx.fillStyle = COLORS.SCALE_PRIMARY;
          ctx.font = '7px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText((i / 8) + '"', x, y + majorH + 2);
        }
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    },

    /**
     * 绘制垂直气泡管（纵向）
     * 气泡随 beta（前后倾斜）角度上下移动
     * 当 showRuler=true 时，左侧绘制纵向刻度尺（紧贴屏幕边缘），管体在刻度尺右侧
     */
    _drawVerticalTube(ctx: any, W: number, H: number, angle: number, maxAngle: number) {
      const showRuler = this.properties.showRuler as boolean;
      const margin = H * 0.04;
      const tubeH = H - 2 * margin;
      const tubeW = showRuler ? Math.min(W * 0.45, 30) : W * 0.55;
      const tubeY = margin;
      const tubeR = tubeW / 2;

      // 有刻度尺时：刻度尺在左侧紧贴边缘，管体在刻度尺右侧
      let tubeX: number;
      if (showRuler) {
        const rulerW = W - tubeW - 4;  // 刻度尺宽度 = 剩余空间
        tubeX = rulerW + 3;            // 管体紧跟刻度尺右侧
      } else {
        tubeX = (W - tubeW) / 2;
      }

      const cx = tubeX + tubeW / 2;
      const cy = H / 2;

      this._drawTubeBody(ctx, tubeX, tubeY, tubeW, tubeH, tubeR);
      this._drawVertScaleMarks(ctx, tubeX, cy, tubeW, tubeH);

      // 中心高亮线（水平）
      ctx.beginPath();
      ctx.moveTo(tubeX + tubeW * 0.1, cy);
      ctx.lineTo(tubeX + tubeW * 0.9, cy);
      ctx.strokeStyle = COLORS.SCALE_HIGHLIGHT;
      ctx.lineWidth = 2;
      ctx.stroke();

      const bubbleRadius = tubeW * 0.34;
      const maxTravel = (tubeH - 2 * tubeR) * 0.42;
      const clamped = Math.max(-maxAngle, Math.min(maxAngle, angle));
      const offset = -(clamped / maxAngle) * maxTravel;

      const color = degreeToColor(angle);
      this._drawBubble(ctx, cx, cy + offset, bubbleRadius, color);

      // 刻度尺在管体左侧，紧贴canvas左边缘
      if (showRuler) {
        const rulerX = 0;
        const rulerW = tubeX - 3;
        const unit = this.properties.rulerUnit as 'cm' | 'inch';
        this._drawVerticalRuler(ctx, rulerX, tubeY, rulerW, tubeH, unit);
      }
    },

    /**
     * 绘制纵向刻度尺（垂直管左侧，刻度线从左边缘往右画）
     * 左边缘紧贴屏幕，用户拿手机左侧边缘去量物体时，刻度线向内延伸
     */
    _drawVerticalRuler(
      ctx: any,
      x: number,
      startY: number,
      width: number,
      height: number,
      unit: 'cm' | 'inch',
    ) {
      const ppiLogical: number = (this as any)._ppiLogical || 120;

      // 分隔线（竖直，在刻度尺右边缘，与管体分隔）
      const rightEdge = x + width;
      ctx.beginPath();
      ctx.moveTo(rightEdge, startY);
      ctx.lineTo(rightEdge, startY + height);
      ctx.strokeStyle = hexToRgba(COLORS.TUBE_BORDER, 0.5);
      ctx.lineWidth = 0.5;
      ctx.stroke();

      if (unit === 'cm') {
        this._drawVertCmTicks(ctx, x, startY, width, height, ppiLogical);
      } else {
        this._drawVertInchTicks(ctx, x, startY, width, height, ppiLogical);
      }
    },

    /**
     * 绘制纵向厘米刻度（从上往下，刻度线从左边缘往右画，数字在右侧）
     * 左边缘=屏幕边缘=测量起点，刻度向内延伸方便读数
     */
    _drawVertCmTicks(
      ctx: any,
      x: number,
      startY: number,
      width: number,
      height: number,
      ppiLogical: number,
    ) {
      const mmPx = ppiLogical / 25.4;
      const totalMm = Math.floor(height / mmPx);

      const majorW = width * 0.7;
      const midW = width * 0.45;
      const minorW = width * 0.25;
      const leftEdge = x;

      for (let i = 0; i <= totalMm; i++) {
        const y = startY + i * mmPx;
        let lineW: number;
        let color: string;
        let lw: number;

        if (i % 10 === 0) {
          lineW = majorW; color = COLORS.SCALE_PRIMARY; lw = 1.2;
        } else if (i % 5 === 0) {
          lineW = midW; color = COLORS.SCALE_SECONDARY; lw = 0.8;
        } else {
          lineW = minorW; color = COLORS.SCALE_SECONDARY; lw = 0.5;
        }

        // 刻度线从左边缘往右画
        ctx.beginPath();
        ctx.moveTo(leftEdge + 1, y);
        ctx.lineTo(leftEdge + 1 + lineW, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.stroke();

        // 大刻度处标注cm数字（在刻度线右侧）
        if (i % 10 === 0 && i > 0) {
          ctx.fillStyle = COLORS.SCALE_PRIMARY;
          ctx.font = '7px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(i / 10), leftEdge + majorW + 3, y);
        }
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    },

    /**
     * 绘制纵向英寸刻度（从上往下，刻度线从左边缘往右画）
     */
    _drawVertInchTicks(
      ctx: any,
      x: number,
      startY: number,
      width: number,
      height: number,
      ppiLogical: number,
    ) {
      const eighthPx = ppiLogical / 8;
      const totalEighths = Math.floor(height / eighthPx);

      const majorW = width * 0.7;
      const midW = width * 0.45;
      const minorW = width * 0.25;
      const leftEdge = x;

      for (let i = 0; i <= totalEighths; i++) {
        const y = startY + i * eighthPx;
        let lineW: number;
        let color: string;
        let lw: number;

        if (i % 8 === 0) {
          lineW = majorW; color = COLORS.SCALE_PRIMARY; lw = 1.2;
        } else if (i % 2 === 0) {
          lineW = midW; color = COLORS.SCALE_SECONDARY; lw = 0.8;
        } else {
          lineW = minorW; color = COLORS.SCALE_SECONDARY; lw = 0.5;
        }

        // 刻度线从左边缘往右画
        ctx.beginPath();
        ctx.moveTo(leftEdge + 1, y);
        ctx.lineTo(leftEdge + 1 + lineW, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.stroke();

        if (i % 8 === 0 && i > 0) {
          ctx.fillStyle = COLORS.SCALE_PRIMARY;
          ctx.font = '7px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText((i / 8) + '"', leftEdge + majorW + 3, y);
        }
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    },

    /**
     * 绘制45°气泡管（斜向，支持正向和反向旋转角度）
     * @param rotateAngle 旋转弧度：PI/4 为左上-右下，-PI/4 为右上-左下
     */
    _drawDiagonalTube(
      ctx: any,
      W: number,
      H: number,
      angle: number,
      maxAngle: number,
      rotateAngle: number,
    ) {
      const size = Math.min(W, H);
      const cx = W / 2;
      const cy = H / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotateAngle);

      // 在旋转后的坐标系中绘制水平管
      const tubeW = size * 0.82;
      const tubeH = size * 0.18;
      const tubeR = tubeH / 2;
      const tubeX = -tubeW / 2;
      const tubeY = -tubeH / 2;

      this._drawTubeBody(ctx, tubeX, tubeY, tubeW, tubeH, tubeR);
      this._drawHorizScaleMarks(ctx, 0, tubeY, tubeW, tubeH);

      // 中心高亮线
      ctx.beginPath();
      ctx.moveTo(0, tubeY + tubeH * 0.1);
      ctx.lineTo(0, tubeY + tubeH * 0.9);
      ctx.strokeStyle = COLORS.SCALE_HIGHLIGHT;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 气泡偏移
      const bubbleRadius = tubeH * 0.34;
      const maxTravel = (tubeW - 2 * tubeR) * 0.42;
      const clamped = Math.max(-maxAngle, Math.min(maxAngle, angle));
      const offset = -(clamped / maxAngle) * maxTravel;

      const color = degreeToColor(angle);
      this._drawBubble(ctx, offset, 0, bubbleRadius, color);

      ctx.restore();
    },

    /**
     * 绘制管体背景（圆角矩形，工业风半透明玻璃效果）
     */
    _drawTubeBody(ctx: any, x: number, y: number, w: number, h: number, r: number) {
      const radius = Math.min(r, w / 2, h / 2);

      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.arcTo(x + w, y, x + w, y + radius, radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
      ctx.lineTo(x + radius, y + h);
      ctx.arcTo(x, y + h, x, y + h - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.closePath();

      ctx.fillStyle = COLORS.TUBE_BG;
      ctx.fill();
      ctx.strokeStyle = COLORS.TUBE_BORDER;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },

    /**
     * 绘制水平管的刻度线（垂直短线，分布在管中心两侧）
     */
    _drawHorizScaleMarks(ctx: any, cx: number, tubeY: number, tubeW: number, tubeH: number) {
      const halfSpan = tubeW * 0.38;
      const count = 5;
      const step = halfSpan / count;

      for (let i = 1; i <= count; i++) {
        const isMajor = i === count;
        const markH = isMajor ? tubeH * 0.65 : (i % 2 === 0 ? tubeH * 0.45 : tubeH * 0.28);
        const markY = tubeY + (tubeH - markH) / 2;
        const color = isMajor ? COLORS.SCALE_PRIMARY : COLORS.SCALE_SECONDARY;

        // 左侧刻度
        ctx.beginPath();
        ctx.moveTo(cx - i * step, markY);
        ctx.lineTo(cx - i * step, markY + markH);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 右侧刻度
        ctx.beginPath();
        ctx.moveTo(cx + i * step, markY);
        ctx.lineTo(cx + i * step, markY + markH);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    },

    /**
     * 绘制垂直管的刻度线（水平短线，分布在管中心上下）
     */
    _drawVertScaleMarks(ctx: any, tubeX: number, cy: number, tubeW: number, tubeH: number) {
      const halfSpan = tubeH * 0.38;
      const count = 5;
      const step = halfSpan / count;

      for (let i = 1; i <= count; i++) {
        const isMajor = i === count;
        const markW = isMajor ? tubeW * 0.65 : (i % 2 === 0 ? tubeW * 0.45 : tubeW * 0.28);
        const markX = tubeX + (tubeW - markW) / 2;
        const color = isMajor ? COLORS.SCALE_PRIMARY : COLORS.SCALE_SECONDARY;

        ctx.beginPath();
        ctx.moveTo(markX, cy - i * step);
        ctx.lineTo(markX + markW, cy - i * step);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(markX, cy + i * step);
        ctx.lineTo(markX + markW, cy + i * step);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    },

    /**
     * 绘制气泡（圆形，带高光的玻璃质感）
     */
    _drawBubble(ctx: any, x: number, y: number, r: number, color: string) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.55);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 高光（白色小圆，模拟玻璃折射光斑）
      ctx.beginPath();
      ctx.arc(x - r * 0.25, y - r * 0.28, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fill();
    },
  },
});

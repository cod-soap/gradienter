/* ============================================================
 * canvas-bindhelper.ts - Canvas绘图辅助工具
 * 封装水平仪常用的Canvas 2D绘图操作，供气泡管/罗盘组件调用
 * ============================================================ */

/** Canvas颜色常量（与 variables.wxss 中的CSS变量值保持一致） */
const COLORS = {
  /** 霓虹绿：水平/正常状态 */
  GREEN:  '#00E676',
  /** 警示黄：接近水平/中间状态 */
  YELLOW: '#FFD600',
  /** 警示红：倾斜过大/异常状态 */
  RED:    '#FF1744',
  /** 管体背景（微透明白） */
  TUBE_BG: 'rgba(255, 255, 255, 0.08)',
  /** 管体边框 */
  TUBE_BORDER: '#455A64',
  /** 气泡填充（半透明绿） */
  BUBBLE_FILL: 'rgba(0, 230, 118, 0.6)',
  /** 主刻度线 */
  SCALE_PRIMARY: '#455A64',
  /** 次刻度线 */
  SCALE_SECONDARY: '#37474F',
  /** 零点/高亮刻度线 */
  SCALE_HIGHLIGHT: '#00E676',
  /** 十字线 */
  CROSSHAIR: 'rgba(255, 255, 255, 0.3)',
};

/**
 * 绘制圆角矩形（Canvas 2D路径）
 * 微信Canvas 2D不直接支持roundRect，用四段圆弧拼接实现
 */
function drawRoundRect(
  ctx: WechatMiniprogram.CanvasContext,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  // 确保圆角半径不超过边长的一半
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
}

/** drawScaleLines 的配置参数 */
interface ScaleLinesConfig {
  /** 起始坐标X */
  x: number;
  /** 起始坐标Y */
  y: number;
  /** 方向：'horizontal'水平尺 | 'vertical'垂直尺 */
  direction: 'horizontal' | 'vertical';
  /** 总长度（像素） */
  totalLength: number;
  /** 每个小刻度对应的像素间距 */
  minorSpacing: number;
  /** 每几个小刻度出现一个中刻度 */
  midEvery: number;
  /** 每几个小刻度出现一个大刻度 */
  majorEvery: number;
  /** 刻度线高度（小/中/大） */
  minorHeight: number;
  midHeight: number;
  majorHeight: number;
  /** 是否在大刻度处显示数字标签 */
  showLabel?: boolean;
  /** 标签格式化函数（输入刻度索引，输出显示字符串） */
  labelFormatter?: (index: number) => string;
}

/**
 * 绘制多级刻度线（通用，支持水平/垂直方向）
 */
function drawScaleLines(
  ctx: WechatMiniprogram.CanvasContext,
  config: ScaleLinesConfig,
): void {
  const {
    x, y, direction, totalLength, minorSpacing,
    midEvery, majorEvery, minorHeight, midHeight, majorHeight,
    showLabel = false, labelFormatter,
  } = config;

  const count = Math.floor(totalLength / minorSpacing);

  for (let i = 0; i <= count; i++) {
    const pos = i * minorSpacing;
    let lineLen: number;
    let color: string;

    if (i % majorEvery === 0) {
      lineLen = majorHeight;
      color = COLORS.SCALE_PRIMARY;
    } else if (i % midEvery === 0) {
      lineLen = midHeight;
      color = COLORS.SCALE_SECONDARY;
    } else {
      lineLen = minorHeight;
      color = COLORS.SCALE_SECONDARY;
    }

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    if (direction === 'horizontal') {
      ctx.moveTo(x + pos, y);
      ctx.lineTo(x + pos, y + lineLen);
    } else {
      ctx.moveTo(x, y + pos);
      ctx.lineTo(x + lineLen, y + pos);
    }
    ctx.stroke();

    // 大刻度处绘制数字标签
    if (showLabel && i % majorEvery === 0 && labelFormatter) {
      ctx.fillStyle = COLORS.SCALE_PRIMARY;
      ctx.font = '10px monospace';
      const label = labelFormatter(i);
      if (direction === 'horizontal') {
        ctx.fillText(label, x + pos - 6, y + majorHeight + 12);
      } else {
        ctx.fillText(label, x + majorHeight + 4, y + pos + 4);
      }
    }
  }
}

/** drawCircleDial 的配置参数 */
interface CircleDialConfig {
  /** 圆心X（相对Canvas坐标） */
  cx: number;
  /** 圆心Y */
  cy: number;
  /** 外圆半径 */
  outerRadius: number;
  /** 大刻度每隔多少度出现一次 */
  majorStep: number;
  /** 中刻度每隔多少度出现一次 */
  midStep: number;
  /** 小刻度每隔多少度出现一次 */
  minorStep: number;
  /** 大刻度线长 */
  majorLen: number;
  /** 中刻度线长 */
  midLen: number;
  /** 小刻度线长 */
  minorLen: number;
  /** 是否在大刻度处显示角度标签 */
  showLabel?: boolean;
}

/**
 * 绘制圆形表盘（罗盘刻度线）
 * 从12点钟方向(0°)顺时针绘制刻度线和标签
 */
function drawCircleDial(
  ctx: WechatMiniprogram.CanvasContext,
  config: CircleDialConfig,
): void {
  const {
    cx, cy, outerRadius, majorStep, midStep, minorStep,
    majorLen, midLen, minorLen, showLabel = false,
  } = config;

  for (let deg = 0; deg < 360; deg += minorStep) {
    const rad = (deg - 90) * (Math.PI / 180); // -90使0°在12点方向
    let lineLen: number;
    let color: string;

    if (deg % majorStep === 0) {
      lineLen = majorLen;
      color = COLORS.SCALE_PRIMARY;
    } else if (deg % midStep === 0) {
      lineLen = midLen;
      color = COLORS.SCALE_SECONDARY;
    } else {
      lineLen = minorLen;
      color = COLORS.SCALE_SECONDARY;
    }

    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const x1 = cx + cos * outerRadius;
    const y1 = cy + sin * outerRadius;
    const x2 = cx + cos * (outerRadius - lineLen);
    const y2 = cy + sin * (outerRadius - lineLen);

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = deg % majorStep === 0 ? 1.5 : 1;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 大刻度处绘制角度标签（在刻度线内侧）
    if (showLabel && deg % majorStep === 0) {
      const labelRadius = outerRadius - majorLen - 14;
      const lx = cx + cos * labelRadius;
      const ly = cy + sin * labelRadius;
      ctx.fillStyle = COLORS.SCALE_PRIMARY;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(deg), lx, ly);
    }
  }

  // 恢复默认对齐方式
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/**
 * 绘制气泡（圆形，带径向渐变模拟玻璃质感）
 * @param ctx Canvas上下文
 * @param x 气泡中心X
 * @param y 气泡中心Y
 * @param radius 气泡半径
 * @param color 气泡颜色（如 '#00E676'）
 */
function drawBubble(
  ctx: WechatMiniprogram.CanvasContext,
  x: number,
  y: number,
  radius: number,
  color: string,
): void {
  // 外圈填充（半透明主色）
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color.replace('#', 'rgba(').replace(/([0-9a-f]{2})/gi, (m) =>
    parseInt(m, 16) + ',') + '0.55)';
  // 回退为直接设置半透明
  ctx.fillStyle = hexToRgba(color, 0.55);
  ctx.fill();

  // 边框（同色，不透明）
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 高光（白色小圆，模拟玻璃折射）
  ctx.beginPath();
  ctx.arc(x - radius * 0.25, y - radius * 0.25, radius * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fill();
}

/**
 * 根据偏离程度（角度）映射颜色：绿色→黄色→红色
 * @param angle 偏离角度（绝对值），通常为 beta 或 gamma 的值
 * @param threshold 绿色阈值（小于此值视为水平）默认 1°
 * @param maxAngle 红色阈值（超过此值全红）默认 10°
 * @returns 颜色字符串（十六进制）
 */
function degreeToColor(
  angle: number,
  threshold: number = 1,
  maxAngle: number = 10,
): string {
  const abs = Math.abs(angle);
  if (abs <= threshold) {
    return COLORS.GREEN;
  }
  if (abs >= maxAngle) {
    return COLORS.RED;
  }
  // 线性插值：threshold→maxAngle 范围内，绿→黄→红
  const ratio = (abs - threshold) / (maxAngle - threshold);
  if (ratio < 0.5) {
    // 绿→黄
    return COLORS.YELLOW;
  }
  return COLORS.RED;
}

/**
 * 十六进制颜色转 rgba 字符串（内部辅助函数）
 * 支持 #RGB 和 #RRGGBB 格式
 */
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export {
  COLORS,
  drawRoundRect,
  drawScaleLines,
  drawCircleDial,
  drawBubble,
  degreeToColor,
  hexToRgba,
};

export type { ScaleLinesConfig, CircleDialConfig };

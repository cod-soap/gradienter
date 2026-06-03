# 手机水平仪微信小程序 - 架构设计文档

## 1. 项目概述

本项目是一个微信小程序版手机水平仪，利用微信官方设备方向监听API实现两大核心功能：**水平气泡尺**和**万向水平仪**。目标是打造专业级测量工具，UI风格偏向工业风。

### 1.1 技术栈

| 技术项 | 选型 | 说明 |
|--------|------|------|
| 开发语言 | TypeScript | 项目已配置TS编译，严格模式 |
| 组件框架 | glass-easel | 项目已启用，微信官方高性能组件框架 |
| 渲染方式 | Skyline + WebView混合 | Skyline用于高性能Canvas渲染（罗盘/气泡），WebView用于普通页面 |
| Canvas | Canvas 2D API | 用于绘制罗盘刻度盘、气泡管、刻度线等 |
| 设备API | `wx.onDeviceMotionChange` + `wx.onAccelerometerChange` | 核心传感器数据来源 |
| 数据存储 | `wx.getStorageSync` / `wx.setStorageSync` | 本地存储角度记录、校准数据、用户设置 |
| 位置服务 | `wx.getLocation` | 记录角度时获取地理位置 |
| 分享能力 | `wx.onShareAppMessage` | 分享角度记录给其他用户 |

### 1.2 技术选型说明

#### 为什么用Canvas而非纯WXML+CSS
- 气泡管内气泡的实时移动、罗盘刻度的旋转动画需要高帧率(60fps)
- Canvas直接操作像素，避免WXML频繁setData导致的性能问题
- 精密刻度线的绘制用Canvas更灵活精确

#### 为什么用 `wx.onDeviceMotionChange` 而非 `wx.onGyroscopeChange`
- `onDeviceMotionChange` 返回 alpha/beta/gamma 三轴欧拉角，直接对应设备倾斜角度
- `onGyroscopeChange` 返回角速度，需要积分计算角度，存在累积误差
- 水平仪需要的是绝对角度而非角速度，`onDeviceMotionChange` 更适合
- 同时辅助使用 `wx.onAccelerometerChange` 获取加速度数据，用于低通滤波降噪

#### 数据存储策略
- 角度记录使用本地Storage，无需后端服务器
- 分享通过小程序转发携带参数实现，接收方解析参数展示记录
- 校准偏移量、灵敏度设置持久化到Storage

---

## 2. 项目目录结构

```
miniprogram/
├── app.ts                          # 应用入口，全局生命周期
├── app.json                        # 全局配置，页面路由，权限声明
├── app.wxss                        # 全局样式，工业风主题变量
│
├── assets/                         # 静态资源目录
│   └── icons/                      # 图标资源（SVG或PNG）
│       ├── bubble-level.png        # 气泡尺图标
│       ├── universal-level.png     # 万向水平仪图标
│       ├── tutorial.png            # 教程图标
│       ├── calibrate.png           # 校准图标
│       └── record.png             # 记录图标
│
├── styles/                         # 公共样式目录
│   ├── variables.wxss              # 工业风主题变量（颜色、字体、间距）
│   └── mixins.wxss                 # 公共样式片段
│
├── utils/                          # 工具函数目录
│   ├── sensor.ts                   # 传感器管理：封装设备方向监听、启停、数据回调
│   ├── filter.ts                   # 数据滤波：低通滤波器、卡尔曼滤波器实现
│   ├── calibration.ts              # 校准工具：零点校准、偏移量计算、校准状态管理
│   ├── canvas-bindhelper.ts             # Canvas绘图辅助：刻度线绘制、圆形表盘绘制等
│   ├── storage.ts                  # 本地存储封装：角度记录CRUD、设置读写
│   ├── location.ts                 # 位置服务封装：获取位置、格式化地址
│   ├── device-check.ts             # 设备能力检测：陀螺仪/加速计是否可用
│   └── util.ts                     # 通用工具函数（已有文件）
│
├── components/                     # 自定义组件目录
│   ├── bubble-tube/                # 气泡管组件（单根气泡管，可复用于水平/垂直/45°）
│   │   ├── bubble-tube.ts
│   │   ├── bubble-tube.wxml
│   │   ├── bubble-tube.wxss
│   │   └── bubble-tube.json
│   ├── compass-dial/               # 罗盘表盘组件（360°刻度盘+小圆点）
│   │   ├── compass-dial.ts
│   │   ├── compass-dial.wxml
│   │   ├── compass-dial.wxss
│   │   └── compass-dial.json
│   ├── ruler-scale/                # 刻度尺组件（cm/inch刻度线）
│   │   ├── ruler-scale.ts
│   │   ├── ruler-scale.wxml
│   │   ├── ruler-scale.wxss
│   │   └── ruler-scale.json
│   ├── sensitivity-picker/         # 灵敏度选择器组件
│   │   ├── sensitivity-picker.ts
│   │   ├── sensitivity-picker.wxml
│   │   ├── sensitivity-picker.wxss
│   │   └── sensitivity-picker.json
│   ├── calibrate-button/           # 校准/重置按钮组件
│   │   ├── calibrate-button.ts
│   │   ├── calibrate-button.wxml
│   │   ├── calibrate-button.wxss
│   │   └── calibrate-button.json
│   ├── angle-display/              # 角度数值展示组件（大字体显示X°/Y°）
│   │   ├── angle-display.ts
│   │   ├── angle-display.wxml
│   │   ├── angle-display.wxss
│   │   └── angle-display.json
│   └── record-card/                # 角度记录卡片组件（用于记录列表展示）
│       ├── record-card.ts
│       ├── record-card.wxml
│       ├── record-card.wxss
│       └── record-card.json
│
├── pages/                          # 页面目录
│   ├── index/                      # 首页（功能入口选择）
│   │   ├── index.ts
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   └── index.json
│   ├── bubble-level/               # 水平气泡尺页面
│   │   ├── bubble-level.ts
│   │   ├── bubble-level.wxml
│   │   ├── bubble-level.wxss
│   │   └── bubble-level.json
│   ├── universal-level/            # 万向水平仪页面
│   │   ├── universal-level.ts
│   │   ├── universal-level.wxml
│   │   ├── universal-level.wxss
│   │   └── universal-level.json
│   ├── records/                    # 我的记录页面（角度记录列表）
│   │   ├── records.ts
│   │   ├── records.wxml
│   │   ├── records.wxss
│   │   └── records.json
│   ├── record-detail/              # 记录详情页（分享落地页）
│   │   ├── record-detail.ts
│   │   ├── record-detail.wxml
│   │   ├── record-detail.wxss
│   │   └── record-detail.json
│   ├── tutorial/                   # 使用教程页面
│   │   ├── tutorial.ts
│   │   ├── tutorial.wxml
│   │   ├── tutorial.wxss
│   │   └── tutorial.json
│   └── logs/                       # 日志页面（已有，保留）
│       ├── logs.ts
│       ├── logs.wxml
│       ├── logs.wxss
│       └── logs.json
│
└── typings/                        # 类型定义（已有目录）
    ├── index.d.ts                  # 全局类型定义
    └── types/
        ├── sensor.d.ts             # 传感器相关类型
        ├── record.d.ts             # 角度记录相关类型
        └── settings.d.ts           # 设置相关类型
```

---

## 3. 页面与组件拆分

### 3.1 页面清单

| 页面 | 路径 | 功能描述 |
|------|------|----------|
| 首页 | `pages/index/index` | 三大功能入口：气泡尺、万向水平仪、使用教程 |
| 水平气泡尺 | `pages/bubble-level/bubble-level` | 三合一气泡尺（水平/垂直/45°），含刻度线、校准、灵敏度 |
| 万向水平仪 | `pages/universal-level/universal-level` | 360°罗盘，X/Y角度显示，校准、记录、灵敏度 |
| 我的记录 | `pages/records/records` | 角度记录列表，支持删除、分享 |
| 记录详情 | `pages/record-detail/record-detail` | 单条记录详情，也作为分享落地页 |
| 使用教程 | `pages/tutorial/tutorial` | 图文教程，介绍两个工具的使用方法 |

### 3.2 组件清单

| 组件 | 功能 | 使用页面 |
|------|------|----------|
| `bubble-tube` | 绘制单根气泡管（管体+气泡+刻度线），通过属性控制方向(水平/垂直/45°) | 水平气泡尺 |
| `compass-dial` | 绘制360°罗盘表盘（刻度+十字线+小圆点），通过属性传入X/Y角度 | 万向水平仪 |
| `ruler-scale` | 绘制精准刻度尺（cm/inch可切换），根据屏幕PPI计算物理尺寸 | 水平气泡尺 |
| `sensitivity-picker` | 灵敏度档位选择面板（底部弹出或内嵌选项） | 气泡尺、万向水平仪 |
| `calibrate-button` | 校准/重置切换按钮，封装校准状态逻辑 | 气泡尺、万向水平仪 |
| `angle-display` | 大字体角度数值显示（如 X: -3.355° Y: -5.566°） | 万向水平仪 |
| `record-card` | 单条角度记录的卡片展示（角度值、时间、地点） | 我的记录、记录详情 |

### 3.3 页面-组件关系图

```
pages/index
  └── 纯WXML布局（三个功能入口卡片）

pages/bubble-level
  ├── bubble-tube × 3（水平管、垂直管、45°管）
  ├── ruler-scale × 1（刻度尺）
  ├── calibrate-button × 1
  ├── sensitivity-picker × 1
  └── angle-display × 1（当前倾斜角度）

pages/universal-level
  ├── compass-dial × 1（罗盘表盘）
  ├── angle-display × 1（X/Y角度）
  ├── calibrate-button × 1
  └── sensitivity-picker × 1

pages/records
  └── record-card × N（列表渲染）

pages/record-detail
  └── record-card × 1 + 详细信息

pages/tutorial
  └── 纯WXML图文布局
```

---

## 4. 核心算法说明

### 4.1 传感器数据获取与处理流程

```
传感器原始数据 → 低通滤波降噪 → 灵敏度缩放 → 校准偏移修正 → UI渲染
```

#### 4.1.1 数据采集

使用 `wx.onDeviceMotionChange` 获取设备方向数据：

```typescript
// 回调数据结构
interface DeviceMotionData {
  alpha: number;  // Z轴旋转角度 [0, 360)，手机围绕垂直轴旋转
  beta: number;   // X轴旋转角度 [-180, 180)，手机前后倾斜
  gamma: number;  // Y轴旋转角度 [-90, 90)，手机左右倾斜
}
```

**角度含义映射：**
- `beta` → 水平气泡尺的垂直方向倾斜（手机前后倾斜角度）
- `gamma` → 水平气泡尺的水平方向倾斜（手机左右倾斜角度）
- `beta + gamma` → 用于45°测量的合成角度
- `beta` → 万向水平仪的X轴角度
- `gamma` → 万向水平仪的Y轴角度

#### 4.1.2 低通滤波算法

传感器原始数据有高频噪声，需要低通滤波平滑：

```typescript
/**
 * 一阶低通滤波器
 * 公式: output = α × current + (1 - α) × previous
 * α越小越平滑（响应越慢），α越大越灵敏（噪声越多）
 */
class LowPassFilter {
  private alpha: number;      // 滤波系数，范围 (0, 1)
  private lastValue: number;  // 上一次的输出值

  constructor(alpha: number) {
    this.alpha = alpha;
    this.lastValue = 0;
  }

  /**
   * 输入新的传感器原始值，返回滤波后的平滑值
   */
  filter(value: number): number {
    this.lastValue = this.alpha * value + (1 - this.alpha) * this.lastValue;
    return this.lastValue;
  }

  /**
   * 更新滤波系数（灵敏度调节时调用）
   */
  setAlpha(alpha: number): void {
    this.alpha = alpha;
  }
}
```

#### 4.1.3 灵敏度档位设计

灵敏度通过调整低通滤波器的α系数实现：

| 档位 | 名称 | α值 | 适用场景 |
|------|------|-----|----------|
| 1 | 超稳定 | 0.05 | 精密测量，需要极度稳定的读数 |
| 2 | 稳定 | 0.1 | 日常使用，平衡稳定性和响应速度 |
| 3 | 标准（默认） | 0.2 | 通用场景 |
| 4 | 灵敏 | 0.4 | 需要快速响应的场景 |
| 5 | 超灵敏 | 0.7 | 快速追踪变化，噪声较大 |

#### 4.1.4 校准算法

```typescript
/**
 * 校准管理器
 * 原理：记录校准时的角度值作为偏移量，后续读数减去偏移量
 */
class CalibrationManager {
  private offsetBeta: number = 0;   // beta轴校准偏移
  private offsetGamma: number = 0;  // gamma轴校准偏移
  private isCalibrated: boolean = false;

  /**
   * 执行校准：将当前角度设为零点
   * @param currentBeta 当前beta角度
   * @param currentGamma 当前gamma角度
   */
  calibrate(currentBeta: number, currentGamma: number): void {
    this.offsetBeta = currentBeta;
    this.offsetGamma = currentGamma;
    this.isCalibrated = true;
  }

  /**
   * 重置校准：恢复原始状态
   */
  reset(): void {
    this.offsetBeta = 0;
    this.offsetGamma = 0;
    this.isCalibrated = false;
  }

  /**
   * 应用校准：返回校准后的角度
   */
  apply(beta: number, gamma: number): { beta: number; gamma: number } {
    return {
      beta: beta - this.offsetBeta,
      gamma: gamma - this.offsetGamma,
    };
  }
}
```

### 4.2 气泡位置计算

气泡在管中的位置与倾斜角度的关系：

```typescript
/**
 * 根据倾斜角度计算气泡在管中的位置偏移
 * @param angle 倾斜角度（度），范围通常为 [-90, 90]
 * @param tubeLength 气泡管的像素长度
 * @param maxAngle 气泡管测量范围的最大角度（超出此角度气泡到达管端）
 * @returns 气泡中心相对于管中心的像素偏移量
 */
function calcBubbleOffset(angle: number, tubeLength: number, maxAngle: number): number {
  // 将角度限制在管的测量范围内
  const clampedAngle = Math.max(-maxAngle, Math.min(maxAngle, angle));
  // 线性映射：角度 → 管长度的一半
  const halfTube = tubeLength / 2;
  const offset = (clampedAngle / maxAngle) * halfTube;
  return offset;
}
```

### 4.3 罗盘小圆点位置计算

```typescript
/**
 * 根据X/Y轴倾斜角度计算罗盘上小圆点的位置
 * @param angleX X轴角度（beta）
 * @param angleY Y轴角度（gamma）
 * @param radius 罗盘半径（像素）
 * @param maxAngle 最大倾斜角度（映射到罗盘边缘）
 * @returns 小圆点相对于罗盘中心的坐标
 */
function calcDotPosition(
  angleX: number,
  angleY: number,
  radius: number,
  maxAngle: number = 45
): { x: number; y: number } {
  // 将角度映射到罗盘半径范围
  const normalizedX = Math.max(-1, Math.min(1, angleY / maxAngle)); // gamma对应左右
  const normalizedY = Math.max(-1, Math.min(1, angleX / maxAngle)); // beta对应前后

  let x = normalizedX * radius;
  let y = normalizedY * radius;

  // 限制小圆点在圆盘范围内（距离不超过半径）
  const distance = Math.sqrt(x * x + y * y);
  if (distance > radius) {
    x = (x / distance) * radius;
    y = (y / distance) * radius;
  }

  return { x, y };
}
```

### 4.4 刻度尺物理尺寸计算

```typescript
/**
 * 根据屏幕PPI计算刻度线间距
 * 微信小程序中通过 wx.getSystemInfoSync() 获取屏幕信息
 * 使用 screenWidth(px) 和 screenWidth(mm) 换算PPI
 *
 * 1cm = 10mm, 1inch = 25.4mm
 * 刻度间距(px) = PPI × (单位长度 / 25.4)
 */
function calcScaleSpacing(ppi: number, unit: 'cm' | 'inch'): number {
  if (unit === 'cm') {
    return ppi / 2.54; // 1cm对应的像素数
  } else {
    return ppi; // 1inch对应的像素数
  }
}

/**
 * PPI估算方法：
 * const sysInfo = wx.getSystemInfoSync();
 * const screenWidthPx = sysInfo.screenWidth * sysInfo.pixelRatio;
 * 由于微信不直接提供物理尺寸，可使用常见设备PPI数据库
 * 或使用 sysInfo.model 匹配已知设备PPI
 */
```

### 4.5 45°角测量算法

```typescript
/**
 * 45°角气泡管的角度计算
 * 将设备倾斜角度投影到45°方向
 * @param beta 前后倾斜角度
 * @param gamma 左右倾斜角度
 * @returns 投影到45°方向的角度值
 */
function calc45DegreeAngle(beta: number, gamma: number): number {
  // 45°方向是beta和gamma的等权合成
  // 使用向量投影：将(beta, gamma)投影到45°方向向量(1/√2, 1/√2)
  const projected = (beta + gamma) / Math.SQRT2;
  return projected;
}
```

---

## 5. 实现与设计约束

### 5.1 开发规范

1. **中文注释**：所有函数、关键逻辑、组件属性必须添加中文注释，注释要说明"为什么"而不仅是"做什么"
2. **TypeScript严格模式**：项目已开启 `strict: true`，不允许 `any` 类型，所有变量必须有明确类型
3. **组件化**：可复用的UI元素必须封装为组件，组件之间通过 properties（父→子）和 triggerEvent（子→父）通信
4. **命名规范**：
   - 文件名：kebab-case（如 `bubble-tube.ts`）
   - 变量/函数：camelCase（如 `calcBubbleOffset`）
   - 类型/接口：PascalCase（如 `DeviceMotionData`）
   - 常量：UPPER_SNAKE_CASE（如 `MAX_ANGLE`）
   - CSS类名：BEM命名法（如 `.bubble-tube__container`，`.btn--active`）
5. **setData优化**：高频更新（传感器数据）使用局部更新，避免整体setData
6. **Canvas绑定**：使用 Canvas 2D 接口（`type="2d"`），不使用旧版 Canvas API

### 5.2 设计约束

1. **帧率目标**：传感器数据更新和UI渲染保持 30fps 以上，Canvas绘制目标 60fps
2. **内存限制**：角度记录本地存储不超过 500 条，超出后提示用户清理
3. **兼容性**：最低支持微信基础库版本 2.30.0（确保 Canvas 2D 和设备方向API可用）
4. **权限管理**：
   - 设备方向监听需要用户授权，首次使用时友好引导
   - 位置信息获取需要用户授权，仅在"记录角度"时请求
5. **离线可用**：核心功能（气泡尺、万向水平仪）不依赖网络，纯本地运算
6. **屏幕旋转**：锁定竖屏模式（`"pageOrientation": "portrait"`），避免屏幕旋转干扰测量
7. **纯前端小程序**: 所有功能均无需后端参与
8. **UI风格**: 灵活运用frontend-design插件(已经安装好)，避免同质化的AI前端风格
---

## 6. UI设计规范（工业风）

### 6.1 色彩体系

```
/* 主色系 - 深色工业风 */
--color-bg-primary: #1A1A2E;        /* 深藏青 - 主背景 */
--color-bg-secondary: #16213E;      /* 深靛蓝 - 卡片/面板背景 */
--color-bg-tertiary: #0F3460;       /* 深蓝 - 高亮区域背景 */

/* 强调色 - 高对比度工业指示色 */
--color-accent-green: #00E676;      /* 霓虹绿 - 水平/正常指示 */
--color-accent-red: #FF1744;        /* 警示红 - 倾斜过大/异常指示 */
--color-accent-yellow: #FFD600;     /* 警示黄 - 接近水平/中间状态 */
--color-accent-blue: #2979FF;       /* 亮蓝 - 按钮/交互元素 */

/* 文字色 */
--color-text-primary: #E0E0E0;      /* 浅灰 - 主文字 */
--color-text-secondary: #9E9E9E;    /* 中灰 - 副文字 */
--color-text-accent: #FFFFFF;       /* 白色 - 强调数值 */

/* 刻度/线条 */
--color-line-primary: #455A64;      /* 蓝灰 - 主刻度线 */
--color-line-secondary: #37474F;    /* 深蓝灰 - 次刻度线 */
--color-line-highlight: #00E676;    /* 霓虹绿 - 零点/高亮刻度线 */

/* 气泡颜色 */
--color-bubble: rgba(0, 230, 118, 0.6);  /* 半透明绿 - 气泡填充 */
--color-bubble-border: #00E676;           /* 霓虹绿 - 气泡边框 */
--color-tube-bg: rgba(255, 255, 255, 0.08); /* 微透明白 - 管体背景 */
--color-tube-border: #455A64;              /* 蓝灰 - 管体边框 */
```

### 6.2 字体规范

```
/* 角度数值 - 大号等宽字体 */
--font-mono: 'Menlo', 'Courier New', monospace;
--font-size-angle-lg: 48rpx;       /* 主角度数值 */
--font-size-angle-md: 36rpx;       /* 次要角度数值 */
--font-size-angle-sm: 28rpx;       /* 辅助数值 */

/* 标签文字 */
--font-size-label: 28rpx;          /* 功能标签 */
--font-size-tip: 24rpx;            /* 提示文字 */

/* 标题 */
--font-size-title: 36rpx;          /* 页面标题 */
--font-size-subtitle: 30rpx;       /* 子标题 */
```

### 6.3 组件视觉风格

- **气泡管**：深色半透明管体，内部有精密刻度线，绿色半透明气泡，管体两端有金属质感端盖
- **罗盘表盘**：深色背景圆形表盘，白色/浅灰刻度线，十字交叉线，绿色小圆点指示器
- **按钮**：圆角矩形，深色背景+亮色边框，按下时高亮反馈，图标+文字组合
- **卡片**：深色背景+细微边框，圆角8rpx，内部有左侧亮色指示条
- **首页入口**：大尺寸工具卡片，顶部有工具图标，底部有名称和简述，有细微发光效果

### 6.4 动效规范

- 气泡移动：使用滤波后的数据驱动，天然平滑，不需要额外动画
- 页面转场：使用微信默认的滑入动画
- 按钮反馈：点击时有 scale(0.95) + 高亮色的快速反馈（150ms）
- 校准切换：状态变化时按钮文字/颜色有过渡动画（200ms）

---

## 7. 数据结构定义

### 7.1 角度记录

```typescript
/** 单条角度记录 */
interface AngleRecord {
  id: string;               // 唯一ID（时间戳+随机数）
  angleX: number;           // X轴角度（beta）
  angleY: number;           // Y轴角度（gamma）
  timestamp: number;        // 记录时间戳
  location?: {              // 位置信息（可选，用户可能拒绝授权）
    latitude: number;       // 纬度
    longitude: number;      // 经度
    address?: string;       // 地址描述（反地理编码结果）
  };
  note?: string;            // 用户备注（可选）
  isCalibrated: boolean;    // 记录时是否处于校准状态
  calibrationOffset?: {     // 校准偏移量（如果有）
    beta: number;
    gamma: number;
  };
}
```

### 7.2 用户设置

```typescript
/** 用户设置 */
interface UserSettings {
  sensitivity: number;       // 灵敏度档位 1-5，默认3
  rulerUnit: 'cm' | 'inch'; // 刻度尺单位，默认cm
  lastCalibration?: {        // 上次校准数据（跨会话保留）
    beta: number;
    gamma: number;
    timestamp: number;
  };
}
```

### 7.3 分享数据

```typescript
/** 分享携带的参数（URL query） */
interface ShareParams {
  type: 'record';            // 分享类型
  recordId: string;          // 记录ID
  angleX: number;            // X轴角度
  angleY: number;            // Y轴角度
  timestamp: number;         // 记录时间
  location?: string;         // 位置描述（简化的字符串）
}
```

---

## 8. 异常场景设计

### 8.1 设备能力不足

| 异常场景 | 检测方法 | 友好提示 | 降级方案 |
|----------|----------|----------|----------|
| 无陀螺仪/加速计 | `wx.onDeviceMotionChange` 回调触发 `fail` | 弹出模态对话框："您的设备不支持方向传感器，水平仪功能无法使用。建议使用支持陀螺仪的手机。" | 显示静态演示模式，仅展示UI效果 |
| 传感器精度低 | 检测数据波动幅度异常 | 顶部Toast提示："检测到传感器精度较低，测量结果仅供参考" | 自动切换到"超稳定"灵敏度档位 |
| 未授权设备方向 | `wx.startDeviceMotionListening` 返回权限错误 | 弹出引导对话框，引导用户到设置页开启权限 | 提供"前往设置"按钮 |
| 未授权位置信息 | `wx.getLocation` 返回权限错误 | Toast提示："位置权限未开启，记录将不包含位置信息" | 允许不带位置信息保存记录 |

### 8.2 运行时异常

| 异常场景 | 处理方式 |
|----------|----------|
| Canvas创建失败 | 降级到纯WXML模式，使用CSS transform模拟气泡移动 |
| 本地存储已满 | 提示用户清理旧记录，提供一键清理按钮 |
| 传感器数据异常（NaN/Infinity） | 过滤异常值，使用上一帧的有效数据 |
| 分享参数解析失败 | 显示"记录信息已失效"的友好提示页 |
| 小程序后台挂起后恢复 | `onShow` 生命周期中重新注册传感器监听 |

### 8.3 权限请求流程

```
进入功能页面
  ↓
检查传感器权限 → 未授权 → 显示功能介绍+权限说明弹窗 → 用户同意 → 请求权限
  ↓                                                      ↓
已授权                                                用户拒绝
  ↓                                                      ↓
正常使用                                      显示"前往设置"引导
```

---

## 9. 风险点清单

| 编号 | 风险 | 等级 | 影响 | 缓解措施 |
|------|------|------|------|----------|
| R1 | 不同手机传感器精度差异大 | 高 | 测量结果不准确 | 提供校准功能；提示用户"测量结果仅供参考" |
| R2 | 高频setData导致性能卡顿 | 高 | 气泡/圆点不流畅 | 使用Canvas直接绘制；控制更新频率≤30fps；使用requestAnimationFrame |
| R3 | iOS和Android传感器行为不一致 | 中 | 角度计算可能反向或范围不同 | 检测平台 `wx.getSystemInfoSync().platform`，分平台适配参数 |
| R4 | 部分低端机无陀螺仪 | 中 | 功能完全不可用 | 入口处检测设备能力，不支持时显示友好提示+静态演示 |
| R5 | 屏幕PPI获取不精确 | 中 | 刻度尺物理尺寸不准 | 提供常见机型PPI数据库；提示"刻度仅供参考"；允许用户手动校准 |
| R6 | 小程序分享参数长度限制 | 低 | 分享的记录数据可能被截断 | 精简分享参数，仅携带必要字段；数值保留3位小数 |
| R7 | 微信基础库版本过低 | 低 | API不可用 | 在 `app.json` 中声明最低基础库版本 |
| R8 | 长时间使用传感器耗电 | 低 | 用户手机发热/电量下降 | 页面 `onHide` 时停止传感器监听，`onShow` 时恢复 |

---

## 10. 迭代计划

### Phase 1：核心框架搭建（基础可运行）
- 项目目录结构搭建
- 全局样式（工业风主题变量）
- 传感器工具封装（sensor.ts, filter.ts, calibration.ts）
- 设备能力检测工具
- 类型定义文件
- 首页布局与导航

### Phase 2：水平气泡尺
- bubble-tube 组件开发（Canvas绘制管体+气泡）
- 气泡尺页面布局（三合一：水平/垂直/45°管）
- 校准功能实现
- 灵敏度选择器组件
- ruler-scale 刻度尺组件

### Phase 3：万向水平仪
- compass-dial 罗盘组件开发（Canvas绘制表盘+小圆点）
- 万向水平仪页面布局
- angle-display 角度显示组件
- 校准功能接入
- 灵敏度选择器接入

### Phase 4：记录与分享
- 本地存储封装（storage.ts）
- 位置服务封装（location.ts）
- 记录角度功能
- 我的记录页面
- 记录详情页面
- 小程序分享功能

### Phase 5：使用教程与收尾
- 使用教程页面（图文）
- 异常处理完善
- iOS/Android适配测试
- 性能优化
- 边界情况处理

---

## 11. app.json 配置参考

```json
{
  "pages": [
    "pages/index/index",
    "pages/bubble-level/bubble-level",
    "pages/universal-level/universal-level",
    "pages/records/records",
    "pages/record-detail/record-detail",
    "pages/tutorial/tutorial"
  ],
  "window": {
    "navigationBarTextStyle": "white",
    "navigationBarTitleText": "精准水平仪",
    "navigationBarBackgroundColor": "#1A1A2E",
    "backgroundColor": "#1A1A2E"
  },
  "style": "v2",
  "componentFramework": "glass-easel",
  "lazyCodeLoading": "requiredComponents",
  "requiredPrivateInfos": [
    "getLocation"
  ],
  "permission": {
    "scope.userLocation": {
      "desc": "用于记录测量时的位置信息"
    }
  }
}
```

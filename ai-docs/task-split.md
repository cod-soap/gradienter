# AI开发任务拆分

> 本文档将整个项目拆分为多个独立的AI开发任务。每个任务设计为可在单个AI对话上下文中完成，避免上下文超限。
> 任务之间有明确的依赖关系，必须按顺序执行（除非标注可并行）。

---

## 任务依赖关系图

```
Task-01 (项目基础搭建)
  ├── Task-02 (传感器工具层)
  │     ├── Task-04 (水平气泡尺页面)
  │     │     └── Task-06 (刻度尺组件)
  │     └── Task-05 (万向水平仪页面)
  │           └── Task-07 (记录与分享功能)
  ├── Task-03 (首页)
  └── Task-08 (使用教程页面)

Task-07 完成后 → Task-09 (异常处理与适配)
全部完成后 → Task-10 (集成测试与优化)
```

---

## Task-01：项目基础搭建

**前置依赖**：无

**目标**：搭建项目目录结构、全局配置、主题样式、类型定义

**具体任务**：

1. 更新 `miniprogram/app.json`：
   - 添加所有页面路由（6个页面）
   - 设置导航栏为深色工业风（背景 `#1A1A2E`，文字白色）
   - 添加位置权限声明
   - 设置 `pageOrientation: "portrait"` 锁定竖屏

2. 更新 `miniprogram/app.wxss`：
   - 定义工业风CSS变量（完整色彩体系、字体规范、间距规范）
   - 设置全局 page 背景色
   - 定义通用按钮样式、卡片样式

3. 更新 `miniprogram/app.ts`：
   - 全局数据中添加设备信息缓存（screenWidth, pixelRatio, platform等）
   - onLaunch 中获取系统信息并缓存

4. 创建类型定义文件：
   - `miniprogram/typings/types/sensor.d.ts`：传感器相关类型（DeviceMotionData, FilteredData等）
   - `miniprogram/typings/types/record.d.ts`：角度记录类型（AngleRecord, ShareParams等）
   - `miniprogram/typings/types/settings.d.ts`：设置类型（UserSettings, SensitivityLevel等）
   - 更新 `miniprogram/typings/index.d.ts`：全局类型声明（IAppOption扩展）

5. 创建目录结构：
   - `miniprogram/assets/icons/`
   - `miniprogram/styles/`
   - `miniprogram/components/`
   - `miniprogram/utils/`（已存在，只需确认）
   - 创建所有页面的空目录和基础四件套文件

6. 创建公共样式文件：
   - `miniprogram/styles/variables.wxss`：主题变量
   - `miniprogram/styles/mixins.wxss`：公共样式片段

**输出文件清单**：
```
miniprogram/app.json (修改)
miniprogram/app.wxss (修改)
miniprogram/app.ts (修改)
miniprogram/styles/variables.wxss (新建)
miniprogram/styles/mixins.wxss (新建)
miniprogram/typings/types/sensor.d.ts (新建)
miniprogram/typings/types/record.d.ts (新建)
miniprogram/typings/types/settings.d.ts (新建)
miniprogram/typings/index.d.ts (修改)
miniprogram/pages/bubble-level/* (新建空页面)
miniprogram/pages/universal-level/* (新建空页面)
miniprogram/pages/records/* (新建空页面)
miniprogram/pages/record-detail/* (新建空页面)
miniprogram/pages/tutorial/* (新建空页面)
```

**验收标准**：
- 小程序可正常编译运行
- 所有页面路由可访问（显示空页面即可）
- 全局样式变量可用
- TypeScript类型定义无编译错误

**预计上下文消耗**：中等（大量文件创建，但每个文件内容不多）

---

## Task-02：传感器工具层开发

**前置依赖**：Task-01

**目标**：封装所有与传感器相关的工具函数，这是核心业务逻辑层

**具体任务**：

1. `miniprogram/utils/device-check.ts` - 设备能力检测工具：
   - `checkDeviceMotionSupport()`: 检测设备方向传感器是否可用
   - `checkAccelerometerSupport()`: 检测加速计是否可用
   - `getDeviceCapability()`: 综合检测结果，返回设备能力对象
   - 处理不同平台的差异（iOS/Android）

2. `miniprogram/utils/filter.ts` - 数据滤波工具：
   - `LowPassFilter` 类：一阶低通滤波器
     - `constructor(alpha: number)`
     - `filter(value: number): number`
     - `setAlpha(alpha: number): void`
     - `reset(): void`
   - `SENSITIVITY_PRESETS` 常量：5档灵敏度对应的α值
   - `createFilterPair()`: 创建beta/gamma两个滤波器的工厂函数

3. `miniprogram/utils/calibration.ts` - 校准工具：
   - `CalibrationManager` 类：
     - `calibrate(beta, gamma)`: 执行校准
     - `reset()`: 重置校准
     - `apply(beta, gamma)`: 应用校准修正
     - `getState()`: 获取校准状态
     - `save()` / `load()`: 校准数据持久化

4. `miniprogram/utils/sensor.ts` - 传感器管理器（核心模块）：
   - `SensorManager` 类（单例模式）：
     - `start(interval: 'game' | 'ui' | 'normal')`: 启动传感器监听
     - `stop()`: 停止监听
     - `onData(callback: (data: FilteredData) => void)`: 注册数据回调
     - `offData(callback)`: 取消数据回调
     - `setSensitivity(level: number)`: 设置灵敏度
     - `calibrate()` / `resetCalibration()`: 校准操作代理
     - 内部集成：原始数据 → 异常过滤 → 低通滤波 → 校准修正 → 回调分发

5. `miniprogram/utils/storage.ts` - 本地存储封装：
   - `saveRecord(record: AngleRecord): void`
   - `getRecords(): AngleRecord[]`
   - `deleteRecord(id: string): void`
   - `clearRecords(): void`
   - `saveSettings(settings: UserSettings): void`
   - `getSettings(): UserSettings`
   - `getRecordCount(): number`
   - 最大记录数限制（500条）

6. `miniprogram/utils/location.ts` - 位置服务封装：
   - `getCurrentLocation(): Promise<LocationInfo>`: 获取当前位置
   - `checkLocationPermission(): Promise<boolean>`: 检查位置权限
   - `requestLocationPermission()`: 请求权限并引导设置
   - 处理授权失败的降级（返回空位置）

7. `miniprogram/utils/canvas-bindhelper.ts` - Canvas绘图辅助：
   - `drawRoundRect(ctx, x, y, w, h, r)`: 圆角矩形
   - `drawScaleLines(ctx, config)`: 刻度线绘制（通用）
   - `drawCircleDial(ctx, config)`: 圆形表盘绘制
   - `drawBubble(ctx, x, y, radius, color)`: 气泡绘制
   - `degreeToColor(angle, threshold)`: 角度→颜色映射（绿→黄→红）

**输出文件清单**：
```
miniprogram/utils/device-check.ts (新建)
miniprogram/utils/filter.ts (新建)
miniprogram/utils/calibration.ts (新建)
miniprogram/utils/sensor.ts (新建)
miniprogram/utils/storage.ts (新建)
miniprogram/utils/location.ts (新建)
miniprogram/utils/canvas-bindhelper.ts (新建)
```

**验收标准**：
- 所有工具函数TypeScript编译无错误
- 每个函数都有中文注释
- SensorManager 可以正确启动/停止传感器
- LowPassFilter 可以对输入数据进行平滑处理
- CalibrationManager 校准/重置功能正确
- Storage工具可以正确读写数据

**预计上下文消耗**：高（核心逻辑代码量大，但都是工具函数，逻辑独立）

---

## Task-03：首页开发

**前置依赖**：Task-01

**可与Task-02并行**

**目标**：实现首页三大功能入口

**具体任务**：

1. `miniprogram/pages/index/index.wxml`：
   - 页面标题"精准水平仪"
   - 三张功能入口卡片（水平气泡尺、万向水平仪、使用教程）
   - 每张卡片包含：图标区域、名称、简短描述
   - 底部可选：版本号、免责声明

2. `miniprogram/pages/index/index.wxss`：
   - 工业风深色背景
   - 卡片样式：深色卡片+边框发光效果+左侧亮色指示条
   - 点击态样式
   - 响应式布局适配不同屏幕

3. `miniprogram/pages/index/index.ts`：
   - 三个跳转函数
   - onLoad 中进行设备能力预检测（如果 device-check.ts 已完成）

4. `miniprogram/pages/index/index.json`：
   - 页面配置（导航栏标题等）

**输出文件清单**：
```
miniprogram/pages/index/index.wxml (修改)
miniprogram/pages/index/index.wxss (修改)
miniprogram/pages/index/index.ts (修改)
miniprogram/pages/index/index.json (修改)
```

**验收标准**：
- 首页三个入口卡片显示正确
- 工业风深色UI
- 点击卡片可跳转到对应页面
- 适配不同屏幕尺寸

**预计上下文消耗**：低

---

## Task-04：水平气泡尺页面开发

**前置依赖**：Task-01, Task-02

**目标**：实现完整的水平气泡尺功能页面，包含三根气泡管和所有交互

**具体任务**：

1. **bubble-tube 组件** (`miniprogram/components/bubble-tube/`)：
   - 使用 Canvas 2D 绘制气泡管
   - 支持三种方向：horizontal（水平）、vertical（垂直）、diagonal（45°）
   - 绘制内容：管体背景 → 中心标记线 → 刻度线 → 气泡
   - 气泡位置根据传入的 angle 属性计算
   - 气泡颜色根据角度大小变化（接近0°=绿色，偏离=黄→红）
   - 属性：direction, angle, maxAngle, width, height

2. **calibrate-button 组件** (`miniprogram/components/calibrate-button/`)：
   - 封装校准/重置切换按钮
   - 属性：isCalibrated（外部传入校准状态）
   - 事件：bind:calibrate（点击校准时触发）、bind:reset（点击重置时触发）
   - 工业风按钮样式

3. **sensitivity-picker 组件** (`miniprogram/components/sensitivity-picker/`)：
   - 5档灵敏度选择
   - 以圆点/横条形式展示（●●●○○ = 3档）
   - 点击可切换档位
   - 属性：value（当前档位）
   - 事件：bind:change（档位变化时触发）

4. **angle-display 组件** (`miniprogram/components/angle-display/`)：
   - 大号等宽字体显示角度值
   - 格式：X: 2.5° Y: -1.3° 或单独显示
   - 属性：angleX, angleY, precision（小数位数）

5. **bubble-level 页面** (`miniprogram/pages/bubble-level/`)：
   - 页面布局：水平管（顶部横向）+ 垂直管（中间纵向）+ 45°管（斜向）
   - 接入 SensorManager，获取实时角度数据
   - 将角度数据分发给三根气泡管
   - 底部工具栏：校准按钮 + 灵敏度选择 + 单位切换(cm/inch)
   - 角度数值显示

**输出文件清单**：
```
miniprogram/components/bubble-tube/* (新建)
miniprogram/components/calibrate-button/* (新建)
miniprogram/components/sensitivity-picker/* (新建)
miniprogram/components/angle-display/* (新建)
miniprogram/pages/bubble-level/* (修改)
```

**验收标准**：
- 三根气泡管同时显示且方向正确
- 气泡随手机倾斜实时平滑移动
- 手机放平时气泡在中心
- 校准功能正常
- 灵敏度切换有明显效果
- Canvas绘制流畅无卡顿
- 组件可复用

**预计上下文消耗**：高（Canvas绘制代码量大，4个组件+1个页面）

---

## Task-05：万向水平仪页面开发

**前置依赖**：Task-01, Task-02, Task-04（复用 calibrate-button、sensitivity-picker、angle-display组件）

**目标**：实现360°罗盘万向水平仪

**具体任务**：

1. **compass-dial 组件** (`miniprogram/components/compass-dial/`)：
   - 使用 Canvas 2D 绘制罗盘
   - 绘制内容：
     - 外圈：360°刻度线（每30°大刻度+数字标签，每10°中刻度，每5°小刻度）
     - 同心圆：多层参考圆环
     - 十字线：水平和垂直中心线
     - 小圆点：倾斜指示器，位置由angleX/angleY映射
   - 小圆点位置 = 将角度归一化映射到半径范围内，限制在圆内
   - 小圆点颜色：中心附近=绿色，偏离=红色
   - 属性：angleX, angleY, size（表盘尺寸）

2. **universal-level 页面** (`miniprogram/pages/universal-level/`)：
   - 页面布局：罗盘（占页面上半部分）+ 角度数值（中间）+ 工具栏（底部）
   - 接入 SensorManager 获取实时数据
   - 工具栏包含：校准按钮 + 灵敏度选择 + 记录角度按钮 + 我的记录按钮
   - "记录角度"按钮点击后保存当前角度到Storage
   - "我的记录"按钮跳转到记录列表页

**输出文件清单**：
```
miniprogram/components/compass-dial/* (新建)
miniprogram/pages/universal-level/* (修改)
```

**验收标准**：
- 罗盘正确显示360°刻度
- 小圆点随手机倾斜实时平滑移动
- 手机放平时小圆点在中心
- 小圆点不会超出罗盘范围
- 校准功能正常
- 灵敏度可调
- 可记录角度

**预计上下文消耗**：高（罗盘Canvas绘制复杂）

---

## Task-06：刻度尺组件开发

**前置依赖**：Task-04（集成到气泡尺页面）

**可与Task-05并行**

**目标**：实现物理精准的刻度尺组件

**具体任务**：

1. **ruler-scale 组件** (`miniprogram/components/ruler-scale/`)：
   - Canvas绘制精准刻度线
   - 根据设备PPI计算物理尺寸（1cm/1inch的像素数）
   - PPI获取策略：使用 `wx.getSystemInfoSync().model` 匹配已知设备数据库，回退使用默认PPI
   - 三级刻度线：大刻度（每cm/inch）+中刻度（每5mm）+小刻度（每1mm）
   - 大刻度旁显示数字
   - 支持cm/inch切换
   - 属性：unit（'cm'|'inch'）、length（显示长度）

2. 集成到 bubble-level 页面：
   - 刻度尺紧贴水平气泡管显示
   - 底部工具栏添加 cm/inch 切换按钮

**输出文件清单**：
```
miniprogram/components/ruler-scale/* (新建)
miniprogram/pages/bubble-level/* (修改，集成刻度尺)
```

**验收标准**：
- 刻度线间距与实际物理尺寸基本一致
- cm/inch切换正常
- 三级刻度线清晰可辨
- 数字标注正确

**预计上下文消耗**：中等

---

## Task-07：记录与分享功能开发

**前置依赖**：Task-05

**目标**：实现角度记录的保存、列表展示、详情查看和分享功能

**具体任务**：

1. **record-card 组件** (`miniprogram/components/record-card/`)：
   - 单条角度记录的卡片展示
   - 显示：角度值(X/Y)、记录时间、地点
   - 操作按钮：分享、删除
   - 工业风卡片样式

2. **records 页面** (`miniprogram/pages/records/`)：
   - 列表展示所有角度记录（使用record-card组件）
   - 按时间倒序排列
   - 空状态显示
   - 删除确认逻辑
   - 分享按钮触发小程序分享

3. **record-detail 页面** (`miniprogram/pages/record-detail/`)：
   - 单条记录详情展示
   - 解析页面参数：从Storage读取（本地查看）或从URL参数解析（分享查看）
   - 分享来源显示"打开水平仪"按钮
   - 配置 onShareAppMessage

4. 更新 `miniprogram/app.ts`：
   - onLaunch 中处理全局分享场景参数

**输出文件清单**：
```
miniprogram/components/record-card/* (新建)
miniprogram/pages/records/* (修改)
miniprogram/pages/record-detail/* (修改)
miniprogram/app.ts (修改)
```

**验收标准**：
- 记录列表正确展示
- 删除有二次确认
- 分享可生成正确的小程序卡片
- 从分享链接进入可正确解析展示数据
- 空状态正常显示
- 记录数不超过500条限制

**预计上下文消耗**：中等

---

## Task-08：使用教程页面开发

**前置依赖**：Task-01

**可与Task-04/05/06/07并行**

**目标**：实现图文使用教程

**具体任务**：

1. **tutorial 页面** (`miniprogram/pages/tutorial/`)：
   - 分section展示两个工具的使用教程
   - 每个section包含：标题、功能说明、按钮说明
   - 常见问题FAQ
   - 工业风排版样式
   - 可折叠/展开的section（使用微信原生 `<collapse>` 或自实现手风琴效果）

**输出文件清单**：
```
miniprogram/pages/tutorial/* (修改)
```

**验收标准**：
- 教程内容完整覆盖所有功能
- 排版清晰易读
- 工业风视觉风格统一

**预计上下文消耗**：低

---

## Task-09：异常处理与平台适配

**前置依赖**：Task-04, Task-05, Task-07

**目标**：完善所有异常场景处理和iOS/Android适配

**具体任务**：

1. 设备能力检测完善：
   - 进入功能页面前检测传感器能力
   - 不支持时弹出友好提示弹窗
   - 提供静态演示模式（可选）

2. 权限引导流程：
   - 传感器权限请求与引导
   - 位置权限请求与引导
   - 拒绝后的"前往设置"引导

3. iOS/Android适配：
   - 检测 `platform` 差异
   - beta/gamma 方向可能相反的处理
   - 传感器更新频率差异适配

4. 运行时容错：
   - NaN/Infinity 数据过滤
   - Canvas创建失败降级
   - Storage满的处理
   - 分享参数解析失败处理

5. 页面生命周期完善：
   - 所有功能页面的 onHide/onShow 传感器暂停/恢复
   - onUnload 清理
   - 后台恢复处理

**输出文件清单**：
```
miniprogram/utils/device-check.ts (完善)
miniprogram/pages/bubble-level/bubble-level.ts (修改)
miniprogram/pages/universal-level/universal-level.ts (修改)
miniprogram/utils/sensor.ts (完善)
```

**验收标准**：
- 无传感器设备有友好提示
- 权限拒绝后不崩溃，有引导
- iOS和Android行为一致
- 异常数据不会导致UI异常
- 后台恢复后功能正常

**预计上下文消耗**：中等

---

## Task-10：集成测试与性能优化

**前置依赖**：所有前序任务

**目标**：全面测试、性能优化、最终收尾

**具体任务**：

1. 全流程走查：
   - 首页 → 气泡尺 → 校准 → 灵敏度调节 → 返回
   - 首页 → 万向水平仪 → 校准 → 记录角度 → 我的记录 → 详情 → 分享
   - 首页 → 使用教程
   - 分享链接 → 记录详情（落地页）

2. 性能优化：
   - Canvas绑定requestAnimationFrame确认
   - setData 调用频率检查（不超过30fps）
   - 内存泄漏检查（传感器监听是否正确清理）
   - 页面滚动流畅度

3. UI一致性检查：
   - 所有页面的色彩主题统一
   - 字体大小一致
   - 间距统一
   - 按钮风格统一

4. 代码注释完善：
   - 检查所有文件是否有中文注释
   - 补充缺失的注释

5. 边缘场景：
   - 记录数达到上限的处理
   - 快速切换页面的稳定性
   - 低电量/省电模式下的行为

**输出文件清单**：可能修改任何文件

**验收标准**：
- 全流程无崩溃
- Canvas动画流畅(≥30fps)
- 所有功能符合需求文档描述
- 代码注释完整
- 工业风UI统一

**预计上下文消耗**：中等

---

## AI对话窗口分配建议

| 对话窗口 | 任务 | 预计Token消耗 | 说明 |
|----------|------|--------------|------|
| 窗口1 | Task-01 | ~30K | 基础搭建，文件多但内容少 |
| 窗口2 | Task-02 | ~50K | 核心工具函数，逻辑复杂 |
| 窗口3 | Task-03 | ~15K | 首页较简单 |
| 窗口4 | Task-04 | ~60K | 气泡尺+4个组件，最复杂的任务 |
| 窗口5 | Task-05 | ~45K | 罗盘组件+页面 |
| 窗口6 | Task-06 | ~25K | 刻度尺组件 |
| 窗口7 | Task-07 | ~35K | 记录+分享，涉及多页面 |
| 窗口8 | Task-08 | ~15K | 教程页面，纯内容 |
| 窗口9 | Task-09 | ~30K | 异常处理，修改多个文件 |
| 窗口10 | Task-10 | ~25K | 集成测试+优化 |

**总计约10个AI对话窗口，建议按依赖顺序执行。**

---

## 每个任务的AI提示词模板

开始每个任务时，向AI提供以下上下文：

```
你正在开发一个微信小程序版手机水平仪。

项目信息：
- 开发语言：TypeScript
- 组件框架：glass-easel
- UI风格：深色工业风
- 必须给所有代码加中文注释

请阅读以下文档了解项目全貌：
1. ai-docs/architecture.md - 架构设计文档
2. ai-docs/requirements.md - 需求文档
3. ai-docs/task-split.md - 任务拆分文档

你当前的任务是：Task-0X [任务名称]
请严格按照任务描述完成开发，不要超出任务范围。
```

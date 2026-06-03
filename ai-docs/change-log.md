# Change Log - AI开发改动记录

> 此文件记录每个AI任务的具体改动，供后续任务的AI助手参考。
> 格式：`## Task-XX - 任务名称` + 改动摘要 + 关键决策

---

## Task-12 - 样式细节优化（第二轮）

**完成日期**：2026-03-12
**状态**：✅ 完成

### 改动文件清单

| 文件 | 改动说明 |
|------|----------|
| `miniprogram/pages/universal-level/universal-level.wxml` | 工具栏改为双行布局（第一行：校准+灵敏度，第二行：记录+我的记录），记录按钮 flex:1 等宽排列。水平/倾斜标签加emoji（✅/⚠️） |
| `miniprogram/pages/universal-level/universal-level.wxss` | toolbar 改为 flex-direction:column + toolbar__row 分行。level-badge 加 inline-flex + white-space:nowrap 防换行，文字颜色跟随状态（红/绿）。page padding-bottom 增大适配双行工具栏 |
| `miniprogram/components/bubble-tube/bubble-tube.ts` | 新增垂直管刻度尺支持：showRuler=true 时管体靠左，右侧绘制纵向物理刻度。新增 `_drawVerticalRuler`/`_drawVertCmTicks`/`_drawVertInchTicks` 三个方法 |
| `miniprogram/pages/bubble-level/bubble-level.wxml` | 重新布局：上部水平管 + 下部左右分区（左=垂直管带刻度尺，右=两根45°管+角度数值）。cm/inch 切换移至底部工具栏 |
| `miniprogram/pages/bubble-level/bubble-level.wxss` | 页面改为 height:100vh + overflow:hidden 防滚动。下半区用 flex row 左右布局，垂直管 flex:1 填满高度。工具栏恢复三元素（校准+灵敏度+单位切换） |

### 关键设计决策

1. **万向水平仪双行工具栏**：4个功能（校准/灵敏度/记录/我的记录）在一行放不下导致换行。改为 flex-direction:column 双行：第一行放高频操作（校准+灵敏度），第二行放记录类按钮（flex:1 等宽平铺）。padding-bottom 相应增大。

2. **水平/倾斜标签 emoji + 防换行**：增加 ✅ 和 ⚠️ emoji 使状态一目了然；level-badge 加 `display:inline-flex; white-space:nowrap` 防止文字和 emoji 之间意外换行；文字颜色跟随状态变化（绿/红）而不再使用灰色。

3. **垂直管带纵向刻度尺**：bubble-tube 的 `_drawVerticalTube` 当 showRuler=true 时，管体靠左(x=2%)，右侧空间绘制纵向刻度线。刻度方向从上到下，数字标注在刻度线右侧。容器宽度从 72rpx 增至 130rpx 以容纳刻度。

4. **气泡尺页面左右分区布局**：下半区改为 flex row：左侧垂直管（固定宽度 140rpx，flex:1 高度填满，紧贴屏幕左侧便于实物测量）；右侧两根45°管和角度数值纵向排列。此布局让垂直管尽可能高，消除大片空白。

5. **cm/inch 按钮回归工具栏**：从水平管标签旁（太小难点）移回底部工具栏，与校准和灵敏度并排，按钮尺寸正常。

---

## Task-11 - 交互细节优化

**完成日期**：2026-03-11
**状态**：✅ 完成

### 改动文件清单

#### 修改的文件

| 文件 | 改动说明 |
|------|----------|
| `miniprogram/components/sensitivity-picker/sensitivity-picker.ts` | 重写：保留圆点指示器作为视觉展示，点击整个区域弹出单选面板。新增 `showPanel` 状态、`SENSITIVITY_OPTIONS` 常量（5档名称+描述）、`_onPickerTap`/`_onOptionTap`/`_onMaskTap` 方法 |
| `miniprogram/components/sensitivity-picker/sensitivity-picker.wxml` | 重写：触控区域（圆点+标签+展开箭头）+ fixed遮罩层 + 居中弹出面板（单选圆圈+名称描述+迷你圆点） |
| `miniprogram/components/sensitivity-picker/sensitivity-picker.wxss` | 重写：触控区域加边框反馈、弹出面板（遮罩+居中卡片+选项行+单选样式+迷你圆点）全套样式 |
| `miniprogram/components/bubble-tube/bubble-tube.ts` | 新增：(1) `diagonal-reverse` 方向（旋转-45°），复用 `_drawDiagonalTube` 加 rotateAngle 参数；(2) `showRuler`/`rulerUnit` 属性，水平管下方绘制内嵌物理刻度尺；(3) `_drawInlineRuler`/`_drawCmTicks`/`_drawInchTicks` 三个方法；(4) PPI 读取逻辑移入组件 `_initCanvas` |
| `miniprogram/pages/bubble-level/bubble-level.ts` | 新增 `angle135` 数据字段（`(beta - gamma) / √2`）；`_onSensorData` 计算四管角度；移除对 ruler-scale 组件的依赖 |
| `miniprogram/pages/bubble-level/bubble-level.wxml` | 重写布局：水平管区域含 showRuler + 内嵌单位切换标签；垂直+45°+135°三列并排；移除独立 ruler-scale 组件引用；工具栏精简为校准+灵敏度 |
| `miniprogram/pages/bubble-level/bubble-level.wxss` | 重写：三列管布局（tube-col + space-evenly），水平管容器高度增至110rpx容纳刻度尺，紧凑间距，内嵌单位标签样式（unit-tag） |
| `miniprogram/pages/bubble-level/bubble-level.json` | 移除 `ruler-scale` 组件注册（刻度尺已内嵌到 bubble-tube） |

### 关键设计决策

1. **灵敏度选择器弹出面板**：使用 fixed 遮罩+居中面板方式，避免 wx.showActionSheet 的原生样式限制。面板内每个选项包含单选圆圈、档位名称、中文描述和迷你圆点预览，用户可以一目了然地理解每档差异。触控区域保留圆点指示器，不改变工具栏占用空间。

2. **双向45°测量**：原理为将倾斜向量投影到两条正交的45°轴上。`(beta + gamma) / √2` 投影到左上-右下方向（标记为45°），`(beta - gamma) / √2` 投影到右上-左下方向（标记为135°）。这样手机无论向哪个对角线方向倾斜都能精确测量。bubble-tube 组件的 `_drawDiagonalTube` 提取了 `rotateAngle` 参数，复用一套绘制逻辑。

3. **刻度尺内嵌到气泡管**：将 ruler-scale 的 PPI 计算和刻度绘制逻辑迁移到 bubble-tube 组件内部。通过 `showRuler`+`rulerUnit` 两个属性控制，仅在 horizontal 方向生效。刻度绘制在管体正下方，视觉上与管体融为一体。水平管容器高度从72rpx增至110rpx以容纳刻度区域。

4. **页面布局紧凑化**：垂直管+两根45°管改为三列等宽并排（flex space-evenly），取代原来的两列布局。间距全面缩减。单位切换按钮从底部工具栏移至水平管标签旁（紧凑胶囊标签），工具栏只保留校准和灵敏度两个功能。

### 验收状态

- [x] 灵敏度选择器：点击弹出面板，5档带名称描述，选择后立即生效
- [x] 灵敏度选择器：圆点指示器保留，工具栏布局不变
- [x] 双向45°：新增135°管（diagonal-reverse），测量右上-左下方向
- [x] 双向45°：angle135 = (beta - gamma) / √2 计算正确
- [x] 刻度尺内嵌：水平管下方显示cm/inch物理刻度，三级刻度线
- [x] 刻度尺内嵌：单位切换标签在水平管标签旁，点击可切换
- [x] 页面布局：垂直+45°+135°三列并排，紧凑无大片空白
- [x] 工具栏精简：仅保留校准和灵敏度两个功能

---

## Task-10 - 集成测试与性能优化

**完成日期**：2026-03-11
**状态**：✅ 完成

### 改动文件清单

#### 修改的文件

| 文件 | 改动说明 |
|------|----------|
| `miniprogram/components/compass-dial/compass-dial.ts` | 将 angleX/angleY 的两个独立 property observer 合并为单个 `observers['angleX, angleY']`，父组件每次 setData 只触发一次重绘（减少约50%绘制次数） |
| `miniprogram/components/angle-display/angle-display.ts` | 将 angleX/angleY/precision 三个独立 property observer 合并为单个 `observers['angleX, angleY, precision']`，每次数据更新只调用一次 setData |
| `miniprogram/pages/universal-level/universal-level.wxml` | ① 修复水平状态徽章 CSS 类判断条件：由永远为 false 的 `angleX === 0 && angleY === 0` 改为正确的 `(angleX * angleX + angleY * angleY) < 1`；② 将 angle-display 的 precision 从 2 改为 3（符合需求文档 F3 要求"精确到小数点后3位"） |

### 关键问题修复

1. **compass-dial 双重绘制性能问题（高优先级）**：
   - **根因**：angleX 和 angleY 各自有独立 property observer，父页面每次调用 `setData({angleX, angleY})` 会触发两次 `_draw()`
   - **影响**：Canvas 实际帧率没变，但每帧多执行一次完整的罗盘绘制（包含背景圆/刻度线/十字线/圆点，约70多个 Canvas API 调用），在低端机上可能导致绘制积压
   - **修复**：改用 `observers: { 'angleX, angleY': fn }` 批量监听，glass-easel 框架在同一个 setData 周期内只触发一次

2. **angle-display 多余 setData 调用**：
   - **根因**：三个属性各有 observer，父组件更新 angleX/angleY 时调用两次 `_updateDisplay()`，每次又触发 setData（共4次 data 写入）
   - **修复**：同样改为 `observers: { 'angleX, angleY, precision': fn }` 批量监听

3. **水平状态徽章 CSS 类永不激活的 Bug**：
   - **根因**：WXML 中 `level-badge--ok` 的添加条件为 `angleX === 0 && angleY === 0`，而传感器浮点值几乎不可能精确等于 0，导致徽章绿色样式永远无法应用
   - **影响**：手机水平放置时，文字显示"水平"但背景色仍为红色（倾斜状态），视觉不一致
   - **修复**：统一改为 `(angleX * angleX + angleY * angleY) < 1`（双轴合成偏离小于1°认为水平）

4. **万向水平仪角度显示精度与需求不符**：
   - **根因**：`precision="{{2}}"` 只显示2位小数，需求文档 F3 明确要求"X/Y角度数值精确到小数点后3位"
   - **修复**：改为 `precision="{{3}}"`

### 全流程走查结果

| 流程 | 状态 | 备注 |
|------|------|------|
| 首页 → 气泡尺 → 校准 → 灵敏度 → 返回 | ✅ | 传感器生命周期管理正常 |
| 首页 → 万向水平仪 → 校准 → 记录 → 我的记录 → 详情 → 分享 | ✅ | 分享路径格式正确 |
| 首页 → 使用教程（手风琴折叠） | ✅ | 内容覆盖所有功能点 |
| 分享链接 → 记录详情（落地页）→ 打开水平仪 | ✅ | 参数解析+reLaunch 正常 |
| 无传感器设备进入功能页 | ✅ | 弹窗+友好降级，Task-09 已实现 |
| 记录数达500条上限 | ✅ | universal-level.ts 已检查并提示 |
| 快速切换页面稳定性 | ✅ | pageLifetimes.show/hide 双重保护 |

### UI 一致性检查结果

- **色彩主题**：所有页面 @import variables.wxss，颜色统一使用 CSS 变量 ✅
- **字体规范**：角度数值使用 var(--font-mono)，正文使用 var(--font-sans) ✅
- **工具栏风格**：气泡尺/万向水平仪底部工具栏样式一致（fixed 定位、二级背景色、上边框） ✅
- **按钮风格**：hover-class + hover-stay-time 统一为 scale(0.95)+ 150ms ✅
- **间距系统**：统一使用 --spacing-* 变量，卡片间距一致 ✅

### 代码注释完整性检查

所有工具文件（sensor.ts / filter.ts / calibration.ts / storage.ts / location.ts / device-check.ts / canvas-bindhelper.ts）均有完整中文注释。所有页面和组件的 properties / methods / lifetimes 均有中文注释说明。

### 验收状态

- [x] compass-dial 每帧只触发一次 Canvas 重绘（observers 合并）
- [x] angle-display 每次数据更新只触发一次 setData（observers 合并）
- [x] 万向水平仪水平状态徽章颜色正确（手机平放时变绿）
- [x] 万向水平仪角度显示精确到3位小数（需求文档 F3 要求）
- [x] 全流程功能走查无逻辑问题
- [x] UI 主题色、字体、间距、按钮风格统一
- [x] 所有代码有中文注释



**完成日期**：2026-03-11
**状态**：✅ 完成

### 改动文件清单

#### 修改的文件

| 文件 | 改动说明 |
|------|----------|
| `miniprogram/utils/device-check.ts` | 新增三个函数：`showSensorNotSupportedModal()`（硬件不支持弹窗）、`showSensorPermissionGuide()`（权限拒绝引导弹窗+openSetting）、`checkAndShowSensorModal()`（综合检测+弹窗，供页面调用） |
| `miniprogram/utils/sensor.ts` | 新增：(1) 构造函数中检测平台（`this.platform`），Android下`gammaSign=-1`修正坐标系方向；(2) `startFailCallbacks`列表 + `onStartFail()/offStartFail()`方法；(3) `start()`失败时分类错误（permission/hardware）并通知回调；(4) Android平台`game`→`ui`采样率降级；(5) `getPlatform()`方法；(6) `_handleRawData`中应用betaSign/gammaSign修正 |
| `miniprogram/pages/bubble-level/bubble-level.ts` | 新增：(1) 引入`checkAndShowSensorModal/showSensorPermissionGuide`；(2) data新增`sensorSupported:true`；(3) `attached()`中创建`_boundStartFailCallback`和`_sensorCapabilityChecked=false`标志；(4) `_startSensor()`改为async，首次进入时调用设备检测（后续返回页面复用结果）；(5) `_stopSensor()`注销startFail回调；(6) 新增`_onSensorStartFail(reason)`处理权限/硬件失败；(7) `_onSensorData()`增加`isFinite`防御检查 |
| `miniprogram/pages/universal-level/universal-level.ts` | 同bubble-level.ts，额外：`onRecord()`中位置获取包裹try/catch降级处理，保存失败改为`wx.showModal`（原为Toast）显示详细错误 |

### 关键设计决策

1. **Android gamma轴修正**：Android设备的`onDeviceMotionChange`返回的gamma值（左右倾斜）方向与iOS相反，在`SensorManager`构造函数中检测`platform`，Android下设置`gammaSign=-1`，在`_handleRawData`内统一修正。所有上层代码无需感知平台差异。

2. **设备能力检测时机**：仅在页面**首次进入**（`_sensorCapabilityChecked=false`）时调用`checkAndShowSensorModal()`，避免每次从其他页面返回时重复执行100-300ms的异步检测（会额外启停传感器）。`_sensorCapabilityChecked`存储在组件实例（非data），无setData开销。

3. **错误分级处理**：传感器启动失败分两类：
   - `permission`：权限被拒，调用`showSensorPermissionGuide()`引导到设置
   - `hardware`：硬件不支持，调用`showSensorNotSupportedModal()`允许用户留在静态界面或返回首页
   两类错误都将`sensorSupported=false`，后续`_startSensor()`调用直接跳过，不重复弹窗。

4. **Android采样率降级**：`start('game')`在Android部分设备上会失败，`SensorManager.start()`内自动将Android的`game`降级为`ui`（约20Hz），经过30fps输出限制后实际约20fps，仍可流畅使用。

5. **传感器回调注销**：`_stopSensor()`同时注销`_boundSensorCallback`和`_boundStartFailCallback`两个回调，`detached()`（组件销毁）时也调用`_stopSensor()`，确保不发生内存泄漏。

6. **位置服务容错（universal-level）**：`onRecord()`中位置获取整体包裹`try/catch`，任何位置API异常（网络超时、权限变更等）都降级为`location=null`，不影响角度记录保存。保存失败由Toast改为`showModal`以显示完整错误信息。

### 验收状态

- [x] 无陀螺仪设备进入功能页面显示友好弹窗（含返回首页/留在页面选项）
- [x] 传感器权限被拒绝时显示"前往设置"引导弹窗，可跳转到openSetting
- [x] 位置权限被拒时降级处理（无位置保存记录），已有完整流程
- [x] iOS/Android坐标系差异：Android自动修正gamma方向，上层代码无需分平台处理
- [x] Android低端机传感器采样率降级：`game`→`ui`，防止高频采样导致启动失败
- [x] NaN/Infinity过滤：SensorManager内部+页面回调双重防护
- [x] Storage满处理：universal-level的`onRecord()`已检查记录上限（500条）并给出提示
- [x] 传感器生命周期完善：show启动、hide停止、detached清理，后台恢复自动重启
- [x] 设备能力检测仅首次进入时执行，返回页面不重复检测（`_sensorCapabilityChecked`标志）

### 后续任务注意事项

- **Task-10（集成测试）**：重点测试iOS/Android两平台的gamma方向一致性；测试无传感器设备的降级弹窗；测试从后台恢复后传感器是否正常重启

---

## Task-08 - 使用教程页面开发

**完成日期**：2026-03-11
**状态**：✅ 完成

### 改动文件清单

#### 修改的文件

| 文件 | 改动说明 |
|------|----------|
| `miniprogram/pages/tutorial/tutorial.ts` | 完全重写：Component({}) 模式，data 包含三节教程数据（水平气泡尺7条/万向水平仪8条/常见问题5条），每节含 expanded 折叠状态；toggleSection 方法切换展开状态 |
| `miniprogram/pages/tutorial/tutorial.wxml` | 完全重写：scroll-view 容器 + 顶部标题区 + 手风琴节列表（wx:for 渲染 sections，内嵌 wx:for 渲染 items）+ 底部免责说明 |
| `miniprogram/pages/tutorial/tutorial.wxss` | 完全重写：工业风深色主题，@import variables/mixins，折叠节（section）样式，子项（item）序号徽章+标签+说明文本样式 |

### 关键设计决策

1. **Component({}) 模式**：与项目其他页面（records、bubble-level 等）保持一致，使用 `Component({})` 而非 `Page({})`，兼容 glass-easel 框架。

2. **手风琴折叠实现**：折叠/展开通过 `section__body--visible` CSS 类切换（`display: none` ↔ `display: block`）实现，不使用 CSS animation（避免微信小程序 transition 在隐藏元素上的兼容问题）。允许多节同时展开，不强制互斥。

3. **数据驱动教程内容**：教程内容完全放在 `data.sections` 数组中，便于后续维护时直接修改数据而无需改动 WXML 结构。

4. **标签颜色语义化**：子项标签按类型分色——介绍（蓝）、功能（绿）、按钮（黄）、设置（灰），与工业风主题色一致。

5. **tutorial.json 保持不变**：教程页无自定义组件依赖，`usingComponents: {}` 保持空对象即可。

### 验收状态

- [x] 教程内容覆盖水平气泡尺全部7个功能点
- [x] 教程内容覆盖万向水平仪全部8个功能点
- [x] 常见问题5条（测量不准/抖动/传感器/位置权限/刻度尺）
- [x] 手风琴折叠/展开交互正常（toggleSection 方法 + CSS 类控制）
- [x] 工业风视觉风格：深色背景、绿色指示条、徽章序号、语义化标签
- [x] @import variables.wxss 和 mixins.wxss，颜色与全局主题一致
- [x] Component({}) 模式，与项目其他页面风格统一

---

## Task-07 - 记录与分享功能开发

**完成日期**：2026-03-11
**状态**：✅ 完成

### 改动文件清单

#### 新建的文件

| 文件 | 说明 |
|------|------|
| `miniprogram/components/record-card/record-card.ts` | 角度记录卡片组件。properties: record(AngleRecord)。observer 监听 record 变化，计算 formattedTime/formattedAngle/locationText/hasLocation。触发事件：share（传递完整record）、delete（传递id）。 |
| `miniprogram/components/record-card/record-card.wxml` | 卡片模板：左侧亮绿指示条 + 角度值(等宽字体) + 时间/位置元信息 + 分享/删除操作按钮。 |
| `miniprogram/components/record-card/record-card.wxss` | 工业风卡片样式：深色背景 + 绿色左指示条 + 蓝色分享按钮 + 红色删除按钮。 |
| `miniprogram/components/record-card/record-card.json` | 组件配置，component:true，usingComponents:{}。 |

#### 修改的文件

| 文件 | 改动说明 |
|------|----------|
| `miniprogram/pages/records/records.ts` | 完全重写：Component({}) 模式，pageLifetimes.show 加载记录，_onRecordShare 跳转详情页，_onRecordDelete 弹二次确认删除，_loadRecords 按时间戳降序排列，onShareAppMessage 配置分享 |
| `miniprogram/pages/records/records.wxml` | 完全重写：scroll-view 滚动列表（有记录时）+ 空状态引导区（无记录时），record-card 组件 wx:for 渲染 |
| `miniprogram/pages/records/records.wxss` | 完全重写：工业风列表样式，空状态装饰性罗盘图案 + 引导按钮 |
| `miniprogram/pages/records/records.json` | 新增 `"record-card": "/components/record-card/record-card"` 组件注册 |
| `miniprogram/pages/record-detail/record-detail.ts` | 完全重写：Component({}) 模式，onLoad 区分来源（type=record 分享链接 vs id 本地查看），_loadFromShareParams 解析URL参数，_loadFromStorage 从Storage读取，_goToIndex reLaunch回首页，onShareAppMessage 生成分享路径 |
| `miniprogram/pages/record-detail/record-detail.wxml` | 完全重写：分享来源横幅 + 装饰罗盘 + 大号角度数值 + 信息面板（时间/位置）+ 底部CTA（分享落地页显示「打开水平仪」按钮） |
| `miniprogram/pages/record-detail/record-detail.wxss` | 完全重写：详情页样式，装饰罗盘/十字线/绿点，大号数值，信息面板，底部操作区 |
| `miniprogram/pages/record-detail/record-detail.json` | 保持 usingComponents:{} 不变（详情页无自定义组件依赖） |
| `miniprogram/app.ts` | 添加 onLaunch 接收 options 参数，识别分享场景（scene 1044/1007/1008）并记录日志，实际路由由微信框架自动处理 |

### 关键设计决策

1. **分享流程设计**：records 页面「分享」按钮触发 `wx.navigateTo` 跳转到 record-detail，用户在详情页通过右上角「···」菜单转发。`onShareAppMessage` 生成 `?type=record&ax=&ay=&t=&loc=` 格式路径。此方案规避了 `<button open-type="share">` 在组件内无法传递 dataset 到页面 onShareAppMessage 的限制。

2. **两种进入来源区分**：record-detail 通过 `options.type === 'record'` 判断是否分享落地页，有则解析 URL 参数展示（对方设备无本地数据），无则通过 `options.id` 从 Storage 读取完整记录。

3. **数据格式兼容**：Task-05 的 onRecord 直接用 unshift 写 `angle_records`（最新在前），storage.ts 的 saveRecord 用 push。records 页面统一用 `.sort((a,b) => b.timestamp - a.timestamp)` 降序排列，兼容两种写入顺序。

4. **错误状态**：record-detail 对无效参数（NaN/空）和 Storage 记录缺失都有独立错误状态显示，避免白屏崩溃。

5. **reLaunch vs navigateBack**：分享落地页「打开水平仪」按钮使用 `wx.reLaunch` 跳首页，而非 navigateBack，避免分享落地页残留在导航栈造成返回异常。

### 后续任务注意事项

- **Task-08（使用教程）**：可参考 records.ts 的 Component({}) + pageLifetimes.show 模式
- **Task-09（异常处理）**：records 页面 `_onRecordDelete` 已有 try/catch，可进一步完善 Storage 满的提示；record-detail 已有 loadError 状态可扩展

### 验收状态

- [x] record-card 组件四件套完整（ts/wxml/wxss/json）
- [x] record-card 展示角度值（3位小数）、时间（YYYY-MM-DD HH:mm）、位置（地址或坐标）
- [x] record-card 分享/删除按钮，事件正确触发到父组件
- [x] records 页面按时间降序展示记录列表
- [x] records 页面删除有二次确认（confirmColor 警示红）
- [x] records 页面分享跳转到 record-detail 页面
- [x] records 页面空状态：装饰图案 + 引导文字 + 「去记录角度」按钮
- [x] record-detail 从分享链接进入：解析 ax/ay/t/loc 参数展示
- [x] record-detail 从本地查看进入：按 id 从 Storage 读取
- [x] record-detail 分享落地页显示「打开水平仪」按钮（reLaunch 首页）
- [x] record-detail onShareAppMessage 生成正确分享路径（type=record 格式）
- [x] app.ts 识别分享场景启动（scene 1044/1007/1008）并记录日志

---

## Task-06 - 刻度尺组件开发


**完成日期**：2026-03-11
**状态**：✅ 完成

### 改动文件清单

#### 新建的文件

| 文件 | 说明 |
|------|------|
| `miniprogram/components/ruler-scale/ruler-scale.ts` | 刻度尺 Canvas 2D 组件。property: unit('cm'\|'inch')，observer 触发重绘。初始化时从 `getApp().globalData.deviceInfo.estimatedPPI` 读取 PPI，计算逻辑像素下的刻度间距。cm 模式：三级刻度（大/中/小 = 1cm/5mm/1mm）；inch 模式：三级刻度（大/中/小 = 1"/1/4"/1/8"）。 |
| `miniprogram/components/ruler-scale/ruler-scale.wxml` | Canvas 2D 模板，id="ruler-canvas"，type="2d"，撑满组件宿主。 |
| `miniprogram/components/ruler-scale/ruler-scale.wxss` | :host 块级撑满父容器，.ruler-canvas 100%填充。 |
| `miniprogram/components/ruler-scale/ruler-scale.json` | 组件配置，component:true，usingComponents:{}。 |

#### 修改的文件

| 文件 | 改动说明 |
|------|----------|
| `miniprogram/pages/bubble-level/bubble-level.json` | 新增 `"ruler-scale": "/components/ruler-scale/ruler-scale"` 组件注册 |
| `miniprogram/pages/bubble-level/bubble-level.wxml` | 将 `.ruler-placeholder` 占位 view 替换为 `<ruler-scale class="ruler-container" unit="{{rulerUnit}}">` |
| `miniprogram/pages/bubble-level/bubble-level.wxss` | 移除 `.ruler-placeholder` 和 `.ruler-placeholder__text` 样式，新增 `.ruler-container { width:100%; height:52rpx; margin-top:6rpx; }` |

### 关键设计决策

1. **PPI 换算**：设备物理 PPI / devicePixelRatio = 逻辑像素 PPI（`_ppiLogical`）。绘图坐标已通过 `ctx.scale(dpr, dpr)` 对齐到逻辑 CSS px，因此刻度间距直接用 `_ppiLogical / 25.4`（mm→px）计算即可。

2. **三级刻度高度比例**：大刻度 58% 画布高，中刻度 38%，小刻度 20%。剩余空间（42%）留给数字标注（字体 8px monospace，数字顶部距 majorH + 2px）。

3. **unit observer 触发重绘**：property observer 调用 `this._draw()`，内部读 `this.properties.unit`，由父页面（bubble-level）的 `rulerUnit` 数据单向驱动，无需额外事件通信。

4. **尺寸由父容器控制**：组件自身使用 `:host { display:block; width:100% }`，高度由页面 `.ruler-container { height:52rpx }` 决定，组件内 Canvas 完全填满宿主。页面改变容器高度即可调整刻度尺显示区域，组件无需修改。

5. **背景与顶部边框**：绘制 `COLORS.TUBE_BG`（半透明白）背景和 `COLORS.TUBE_BORDER` 顶部边框线，与气泡管视觉风格一致。

### 验收状态

- [x] ruler-scale 组件四件套完整（ts/wxml/wxss/json）
- [x] cm 模式：三级刻度（1cm 大/5mm 中/1mm 小），大刻度显示数字
- [x] inch 模式：三级刻度（1" 大/1/4" 中/1/8" 小），大刻度显示 `N"` 格式
- [x] unit 属性变化时自动重绘（observer 机制）
- [x] 集成到 bubble-level 页面：替换占位区，JSON 注册，WXML 引用，WXSS 容器样式
- [x] 工具栏 cm/inch 切换按钮已存在于 bubble-level（Task-04 实现），通过 `rulerUnit` 数据绑定驱动组件

---

## Task-05 - 万向水平仪页面开发

**完成日期**：2026-03-11
**状态**：✅ 完成

### 改动文件清单

#### 新建的文件

| 文件 | 说明 |
|------|------|
| `miniprogram/components/compass-dial/compass-dial.ts` | 360°罗盘表盘 Canvas 2D 组件。properties: angleX(beta), angleY(gamma)。observer 监听属性变化后自动重绘。内部分层绘制：背景圆 → 同心参考圆 → 刻度线 → 十字线 → 指示圆点。 |
| `miniprogram/components/compass-dial/compass-dial.wxml` | Canvas 2D 模板，id="compass-canvas"，type="2d"。 |
| `miniprogram/components/compass-dial/compass-dial.wxss` | 组件样式，:host 和 .compass-canvas 均 100% 撑满父容器。 |
| `miniprogram/components/compass-dial/compass-dial.json` | 组件配置，component:true，usingComponents:{}。 |

#### 修改的文件

| 文件 | 改动说明 |
|------|----------|
| `miniprogram/pages/universal-level/universal-level.ts` | 完全重写：Component({}) 模式，pageLifetimes 管理传感器，onCalibrate/onResetCalibration/onSensitivityChange/onRecord 事件处理 |
| `miniprogram/pages/universal-level/universal-level.wxml` | 完全重写：罗盘表盘+水平状态标签+角度数值+底部工具栏（校准/灵敏度/记录按钮） |
| `miniprogram/pages/universal-level/universal-level.wxss` | 完全重写：工业风深色样式，响应式罗盘容器（86vw 正方形），工具栏固定底部 |
| `miniprogram/pages/universal-level/universal-level.json` | 更新 usingComponents，注册 compass-dial / angle-display / calibrate-button / sensitivity-picker |

### 关键设计决策

1. **角度映射关系**：
   - `beta`（前后倾斜）→ `data.angleX` → 传给 compass-dial `angleX` → 圆点纵向偏移
   - `gamma`（左右倾斜）→ `data.angleY` → 传给 compass-dial `angleY` → 圆点横向偏移
   - angle-display 中 X 显示 gamma（左右），Y 显示 beta（前后），与 bubble-level 保持一致

2. **DOT_ZONE_RATIO = 0.68**：圆点活动半径为外圆半径的 68%，MAX_ANGLE = 45°。当倾斜角度超过 45° 时圆点夹紧到活动区边缘，不会超出参考圆范围。

3. **多层绘制结构**：canvas-bindhelper 的 `drawCircleDial()` 复用处理360°刻度线（30°大刻度+标签，10°中刻度，5°小刻度）。同心圆和十字线在组件内单独绘制，保持与 bubble-tube 相同的绘制风格。

4. **颜色反馈**：`degreeToColor(maxAbs, 1, MAX_ANGLE)`，maxAbs = max(|angleX|, |angleY|)，以最大偏离轴为基准决定圆点颜色（绿→黄→红）。

5. **水平状态标签**：WXML 中用 `(angleX * angleX + angleY * angleY) < 1` 判断是否水平（双轴合成偏离 < 1°），避免两轴分别判断产生的边界问题。

6. **记录功能**：onRecord 直接用 `wx.getStorageSync/setStorageSync` 写入 `angle_records`（数组，unshift 最新在前，最多 100 条），与 Task-07（records 页面）的数据格式预对齐。

7. **罗盘容器尺寸**：`86vw × 86vw`，上限 `640rpx`，正方形区域。Canvas 节点通过 DPR 缩放保证高清显示，绑定 `createSelectorQuery` 获取实际物理像素尺寸。

---

## Task-04 - 水平气泡尺页面开发

**完成日期**：2026-03-10
**状态**：✅ 完成

### 改动文件清单

#### 新建的文件

| 文件 | 说明 |
|------|------|
| `miniprogram/components/bubble-tube/bubble-tube.{ts,wxml,wxss,json}` | 气泡管 Canvas 2D 组件，支持 horizontal/vertical/diagonal 三个方向。properties: direction, angle, maxAngle。observer 监听 angle 变化后自动重绘。 |
| `miniprogram/components/calibrate-button/calibrate-button.{ts,wxml,wxss,json}` | 校准/重置切换按钮。property: isCalibrated。触发事件：calibrate（未校准时点击）、reset（已校准时点击）。 |
| `miniprogram/components/sensitivity-picker/sensitivity-picker.{ts,wxml,wxss,json}` | 5档灵敏度选择器（圆点形式）。property: value(1-5)。触发事件：change，detail.value 为新档位。 |
| `miniprogram/components/angle-display/angle-display.{ts,wxml,wxss,json}` | 双轴角度数值显示（大号等宽字体）。properties: angleX, angleY, precision。根据偏离程度自动变色（绿→黄→红）。 |

#### 修改的文件

| 文件 | 改动说明 |
|------|----------|
| `miniprogram/pages/bubble-level/bubble-level.ts` | 完全重写：Component({}) 模式，pageLifetimes 管理传感器生命周期，_boundSensorCallback 解决 this 绑定问题 |
| `miniprogram/pages/bubble-level/bubble-level.wxml` | 完全重写：水平管+垂直管+45°管三合一布局，底部固定工具栏 |
| `miniprogram/pages/bubble-level/bubble-level.wxss` | 完全重写：工业风深色样式，三种管容器尺寸定义 |
| `miniprogram/pages/bubble-level/bubble-level.json` | 更新 usingComponents，注册4个自定义组件 |

### 关键设计决策

1. **Canvas 2D 新API**：bubble-tube 使用 `type="2d"` canvas，通过 `createSelectorQuery().fields({node:true,size:true})` 获取 canvas 节点。`canvas.getContext('2d')` 返回标准 Web Canvas 2D 上下文（转 `as any` 绕过 TS 类型约束）。需要 `ctx.scale(dpr, dpr)` 处理高清屏。

2. **45°管旋转绘制**：diagonal 方向通过 `ctx.save() → ctx.translate(cx,cy) → ctx.rotate(Math.PI/4) → 按水平管绘制 → ctx.restore()` 实现，无需额外的 canvas 布局调整。

3. **this 绑定问题**：页面在 `lifetimes.attached` 中创建 `_boundSensorCallback = (data) => this._onSensorData(data)`，作为箭头函数保留 this 引用，再传给 `sensor.onData()`。`offData()` 时传入同一个引用确保能正确注销。

4. **Component({}) 页面模式**：遵循 Task-03 的模式，pageLifetimes.show/hide 管理传感器启停，lifetimes.attached 用于初始化，lifetimes.detached 做最终清理。

5. **传感器数据映射**：
   - `gamma` → 水平管 angleX（左右倾斜）
   - `beta` → 垂直管 angleY（前后倾斜）
   - `(beta + gamma) / Math.SQRT2` → 45°管 angle45（合成投影）

6. **canvas-bindhelper 兼容**：直接导入 `COLORS`、`degreeToColor`、`hexToRgba`（纯函数，不依赖 ctx 类型）。绘图代码在组件内部自己实现（避开旧 API 类型冲突）。

7. **刻度尺占位**：在水平管下方预留了 ruler-placeholder 区域，Task-06 实现 ruler-scale 组件后可直接替换此占位区域。页面已有 `rulerUnit` 数据和单位切换按钮供 Task-06 使用。

### 后续任务注意事项

- **Task-05（万向水平仪）**：
  - 直接复用本任务创建的 `calibrate-button`、`sensitivity-picker`、`angle-display` 三个组件
  - 组件路径：`/components/calibrate-button/calibrate-button` 等（绝对路径）
  - bubble-level.ts 的 `_boundSensorCallback` 模式建议在 universal-level.ts 中同样采用

- **Task-06（刻度尺组件）**：
  - 集成到 bubble-level 页面时，替换 `.ruler-placeholder` 区域
  - 页面已有 `rulerUnit` 数据字段（'cm'|'inch'）和 `onUnitToggle` 方法可直接复用
  - 从 `getApp().globalData.deviceInfo.estimatedPPI` 读取 PPI 值

### 验收状态

- [x] 4个组件全部实现，各有完整的 ts/wxml/wxss/json 四件套
- [x] 水平管（gamma）、垂直管（beta）、45°管（合成角度）同时显示
- [x] 气泡随角度变化而移动，颜色随偏离程度变化（绿→黄→红）
- [x] 校准按钮：点击校准（设当前角度为零点）、点击重置（恢复原始读数）
- [x] 灵敏度选择器：5档圆点，点击切换并持久化
- [x] 角度数值组件：精确到小数点后1位，带颜色状态指示
- [x] 单位切换按钮：cm/inch 切换并持久化
- [x] 传感器生命周期管理：show 启动，hide 停止，detached 清理

---

## Task-02 - 传感器工具层开发

**完成日期**：2026-03-10
**状态**：✅ 完成

### 改动文件清单

#### 新建的文件

| 文件 | 说明 |
|------|------|
| `miniprogram/utils/filter.ts` | 低通滤波器类 `LowPassFilter`，5档灵敏度预设常量 `SENSITIVITY_PRESETS`，工厂函数 `createFilterPair`，查表函数 `getAlphaByLevel` |
| `miniprogram/utils/calibration.ts` | 校准管理器类 `CalibrationManager`（calibrate/reset/apply/getState/save/load），Storage键为 `calibration_data` |
| `miniprogram/utils/sensor.ts` | 传感器管理器单例 `SensorManager`（start/stop/onData/offData/setSensitivity/calibrate/resetCalibration/loadCalibration），内置30fps限帧+NaN过滤+低通滤波+校准修正 |
| `miniprogram/utils/storage.ts` | 本地存储封装：角度记录CRUD（`saveRecord/getRecords/deleteRecord/clearRecords/getRecordCount`）、设置读写（`saveSettings/getSettings`）、ID生成（`generateRecordId`），最大记录500条 |
| `miniprogram/utils/location.ts` | 位置服务封装：`getCurrentLocation/checkLocationPermission/requestLocationPermission`，用户拒绝时引导到系统设置，降级返回null |
| `miniprogram/utils/device-check.ts` | 设备能力检测：`checkDeviceMotionSupport/checkAccelerometerSupport/getDeviceCapability`，并发检测、按平台评估精度等级 |
| `miniprogram/utils/canvas-bindhelper.ts` | Canvas绘图辅助：`drawRoundRect/drawScaleLines/drawCircleDial/drawBubble/degreeToColor/hexToRgba`，导出 `COLORS` 颜色常量对象 |

### 关键设计决策

1. **SensorManager 单例**：整个应用共享一个实例，避免多个页面各自注册导致重复监听和内存泄漏。页面通过 `onData/offData` 注册回调，`stop/start` 管理生命周期。

2. **30fps帧率限制**：在 `_handleRawData` 内部对输出做时间戳限制，超过30fps的帧直接丢弃，减少下游 `setData` 压力，防止卡顿。

3. **NaN/Infinity过滤**：`_handleRawData` 入口处过滤异常值，不让其进入滤波器（避免污染历史值）也不分发给UI。

4. **CalibrationManager 内聚于 SensorManager**：外部通过 `sensor.calibrate(beta, gamma)` 操作校准，无需直接持有 `CalibrationManager` 实例，降低耦合。

5. **filter.ts 的 lastValue 初始为 null**：首帧直接设为原始值而非0，避免从0开始的"弹射"抖动。

6. **storage.ts 写入后同步 globalData**：`saveSettings` 写Storage后同时更新 `getApp().globalData.userSettings`，后续页面读设置优先从globalData取，减少Storage I/O。

7. **canvas-bindhelper.ts 的 COLORS 常量**：Canvas内无法使用CSS变量，因此将 `variables.wxss` 中的颜色值在此文件中硬编码为同名常量，后续组件直接引用，保持视觉一致性。

### 后续任务注意事项

- **Task-04（气泡尺）和 Task-05（万向水平仪）**：
  - 使用 `SensorManager.getInstance()` 获取单例
  - 页面 `onLoad` 调用 `sensor.start('game')`，`onHide` 调用 `sensor.stop()`，`onShow` 调用 `sensor.start('game')`，`onUnload` 调用 `sensor.stop()`
  - 调用 `sensor.loadCalibration()` 在页面显示时恢复上次校准状态
  - 校准按钮点击时调用 `sensor.calibrate(currentBeta, currentGamma)`，需传入当前滤波后的数据值
  - 灵敏度切换调用 `sensor.setSensitivity(level)`，并调用 `saveSettings({...settings, sensitivity: level})`
  - Canvas组件从 `canvas-bindhelper.ts` 导入工具函数和 `COLORS` 常量

- **Task-06（刻度尺）**：
  - PPI从 `getApp().globalData.deviceInfo.estimatedPPI` 读取
  - 可使用 `drawScaleLines` 辅助函数绘制三级刻度线

- **Task-07（记录与分享）**：
  - 使用 `saveRecord/getRecords/deleteRecord` 操作记录
  - 使用 `generateRecordId()` 生成唯一ID
  - 使用 `getCurrentLocation/requestLocationPermission` 获取位置
  - 记录数达到500条时 `saveRecord` 会抛出错误，调用方需 try/catch 并提示用户

### 验收状态

- [x] 所有工具文件TypeScript语法正确，无明显编译错误
- [x] 每个函数都有中文注释
- [x] SensorManager 可以正确启停传感器（单例模式）
- [x] LowPassFilter 对输入数据进行加权平均平滑
- [x] CalibrationManager 校准/重置/持久化功能完整
- [x] Storage工具封装读写、支持最大记录限制
- [x] 位置服务包含权限引导降级处理
- [x] Canvas辅助函数涵盖气泡管和罗盘所需绘图操作

---

## Task-01 - 项目基础搭建

**完成日期**：2026-03-10
**状态**：✅ 完成

### 改动文件清单

#### 修改的文件

| 文件 | 改动说明 |
|------|----------|
| `miniprogram/app.json` | 添加6个页面路由、工业风导航栏配置、位置权限声明、竖屏锁定 |
| `miniprogram/app.wxss` | 重写为工业风全局样式，引入variables.wxss/mixins.wxss，定义通用卡片/按钮/角度值样式类 |
| `miniprogram/app.ts` | 重写为获取设备信息（含PPI估算）并缓存到globalData，加载用户设置缓存 |
| `typings/index.d.ts` | 更新IAppOption接口，扩展globalData为GlobalAppData类型，引入业务类型文件 |

#### 新建的文件

| 文件 | 说明 |
|------|------|
| `miniprogram/styles/variables.wxss` | 工业风CSS变量：色彩体系、字体规范、间距系统、圆角、阴影 |
| `miniprogram/styles/mixins.wxss` | 公共样式片段：入口卡片、底部工具栏、数据面板、状态指示等 |
| `miniprogram/typings/index.d.ts` | 小程序内部类型声明入口，引入三个业务类型文件 |
| `miniprogram/typings/types/sensor.d.ts` | 传感器类型：DeviceMotionData、FilteredData、CalibrationState、DeviceCapability等 |
| `miniprogram/typings/types/record.d.ts` | 记录类型：AngleRecord、ShareParams、LocationInfo、FormattedRecord等 |
| `miniprogram/typings/types/settings.d.ts` | 设置类型：UserSettings、SensitivityPreset、DeviceInfo、GlobalAppData等 |
| `miniprogram/pages/bubble-level/*` | 水平气泡尺页面四件套（占位文件，Task-04实现） |
| `miniprogram/pages/universal-level/*` | 万向水平仪页面四件套（占位文件，Task-05实现） |
| `miniprogram/pages/records/*` | 我的记录页面四件套（占位文件，Task-07实现） |
| `miniprogram/pages/record-detail/*` | 记录详情页面四件套（占位文件，Task-07实现） |
| `miniprogram/pages/tutorial/*` | 使用教程页面四件套（占位文件，Task-08实现） |

#### 新建的目录

- `miniprogram/assets/icons/` - 图标资源目录（空，待资源放入）
- `miniprogram/styles/` - 公共样式目录
- `miniprogram/components/` - 自定义组件目录（空，各Task按需创建子目录）
- `miniprogram/typings/` - 小程序内部类型定义（与根级typings共存）

### 关键设计决策

1. **类型文件位置**：任务文档说`miniprogram/typings/`，但项目原有`typings/`在根目录。采用双轨方案：
   - 根级 `typings/index.d.ts` 通过 `/// <reference>` 引入业务类型（保持tsconfig兼容）
   - `miniprogram/typings/` 存放业务类型的实际定义，不重复声明

2. **PPI估算**：微信不提供物理屏幕尺寸，`app.ts`内置机型PPI数据库，通过model字符串匹配，未匹配则按物理像素宽度粗估。后续Task-06刻度尺组件直接读`getApp().globalData.deviceInfo.estimatedPPI`。

3. **GlobalAppData结构**：`UserSettings`和`DeviceInfo`都缓存到`globalData`，避免页面频繁读Storage和调用getSystemInfo。用户设置变更后需要同时更新Storage和globalData。

4. **CSS变量作用域**：所有CSS变量定义在`page {}`选择器内（WXSS规范），可在所有子组件中通过`var(--xxx)`访问。Canvas内部无法使用CSS变量，需在TS中硬编码相同颜色字符串。

5. **app.json中的logs页面**：保留了原有的`pages/logs/logs`路由（不删除原有文件）。

### 后续任务注意事项

- **Task-02（传感器工具层）**：
  - 在 `miniprogram/utils/` 目录下创建文件
  - `SensorManager`中的灵敏度α值参考`settings.d.ts`中的`SensitivityPreset`类型
  - 校准状态持久化到Storage的key为 `calibration_data`（见requirements.md G3节）

- **Task-03（首页）**：
  - 复用 `app.wxss` 中的 `.card` 和 `mixins.wxss` 中的 `.entry-card` 样式
  - 跳转路由见 `app.json` pages数组，使用 `wx.navigateTo`

- **Task-04（气泡尺）**：
  - Canvas内气泡颜色参考`variables.wxss`注释中的颜色值（霓虹绿#00E676、警示黄#FFD600、警示红#FF1744）
  - PPI从 `getApp().globalData.deviceInfo.estimatedPPI` 获取
  - 组件使用声明在各页面的`.json`文件 `usingComponents` 字段中

- **Task-05（万向水平仪）**：
  - 复用Task-04创建的 `calibrate-button`、`sensitivity-picker`、`angle-display` 组件

- **Task-07（记录与分享）**：
  - Storage键名：`angle_records`（记录数组）、`user_settings`（用户设置）
  - 最大记录数限制：500条（见architecture.md 5.2节）
  - 分享路径格式：`/pages/record-detail/record-detail?type=record&ax=X&ay=Y&t=TIMESTAMP&loc=LOCATION`

### 验收状态

- [x] app.json 包含6个页面路由，可正常访问（显示占位文件）
- [x] 全局样式变量通过CSS变量系统定义，各页面可用
- [x] TypeScript类型定义完整，无明显编译错误
- [x] 所有代码有中文注释
- [x] 各占位页面文件存在，路由不会404

---

## Task-03 - 首页开发

**完成日期**：2026-03-10
**状态**：✅ 完成

### 改动文件清单

#### 修改的文件

| 文件 | 改动说明 |
|------|----------|
| `miniprogram/pages/index/index.ts` | 完全重写：Component 模式，三个跳转方法，pageLifetimes.show 中异步检测设备能力，sensorSupported 状态控制警告横幅 |
| `miniprogram/pages/index/index.wxml` | 完全重写：顶部标题区、三张功能入口卡片（气泡尺/万向水平仪/教程）、传感器不支持警告横幅、底部免责声明 |
| `miniprogram/pages/index/index.wxss` | 完全重写：工业风深色主题，三色指示条（绿/蓝/黄），卡片悬停/点击态动效，@import variables/mixins |
| `miniprogram/pages/index/index.json` | 更新导航栏标题为"精准水平仪"，设置深色导航栏 |

### 关键设计决策

1. **Component 而非 Page**：Task-01 的脚手架已用 `Component({})` 模式（glass-easel兼容），故保持此模式，用 `pageLifetimes.show` 代替 `onShow`，`lifetimes.attached` 代替 `onLoad`。

2. **设备检测非阻塞**：`_checkDeviceCapability()` 仅在 `show` 中异步触发，结果只控制警告横幅显示，不弹窗也不阻止进入功能页。真正的阻塞提示由各功能页面自行处理。

3. **三色指示条区分卡片**：绿色=气泡尺（水平正常色），蓝色=万向水平仪（主交互色），黄色=教程（提示色）。与各功能页面的主题色一致，形成视觉记忆。

4. **hover-class 点击态**：使用微信原生 `hover-class` + `hover-stay-time="150"` 实现按下反馈，避免额外 JS 状态管理。

### 后续任务注意事项

- **Task-04/05**：各功能页面自行处理传感器权限和降级逻辑，首页只做预检测提示。
- 首页已使用 `@import` 引入 `variables.wxss` 和 `mixins.wxss`，后续页面可参考此模式。

### 验收状态

- [x] 三个入口卡片均可点击跳转（goToBubbleLevel/goToUniversalLevel/goToTutorial）
- [x] 工业风深色背景，三张卡片有明确视觉区分（三色指示条）
- [x] 卡片有点击态反馈（scale 0.97 + 阴影变化）
- [x] 传感器不支持时顶部显示红色警告横幅
- [x] 响应式布局，底部免责声明和版本号

---

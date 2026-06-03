/* ============================================================
 * tutorial.ts - 使用教程页面
 * 以手风琴折叠面板展示水平气泡尺、万向水平仪的使用方法及常见问题
 * 使用 Component({}) 模式以兼容 glass-easel 框架
 * ============================================================ */

/** 教程子项数据结构 */
interface TutorialItem {
  title: string;       // 子项标题
  content: string;     // 子项说明内容
  tag?: string;        // 可选标签显示文字（如「介绍」「功能」）
  tagClass?: string;   // 对应 CSS 修饰符类名（纯 ASCII，避免中文类名编译报错）
}

/** 教程分节数据结构 */
interface TutorialSection {
  id: string;          // 唯一ID，用于折叠状态控制
  icon: string;        // 节标题前缀图标（emoji）
  title: string;       // 节标题
  expanded: boolean;   // 当前是否展开
  items: TutorialItem[]; // 该节下的子项列表
}

Component({
  data: {
    /** 教程分节数组，每节可独立折叠/展开 */
    sections: [
      {
        id: 'bubble',
        icon: '🔧',
        title: '水平气泡尺',
        expanded: true,  // 默认展开第一节
        items: [
          {
            title: '功能介绍',
            content: '三合一气泡水平尺在一个页面中同时提供水平管、垂直管、45°管，可同时检测多个方向的水平状态，适合桌面、地面、墙面等场景的精准测量。',
            tag: '介绍',
            tagClass: 'intro',
          },
          {
            title: '水平管',
            content: '横向放置的气泡管，测量表面是否水平（如桌面、地面）。将手机平放在被测表面，气泡居中即表示水平。',
            tag: '功能',
            tagClass: 'feature',
          },
          {
            title: '垂直管',
            content: '纵向放置的气泡管，测量物体是否垂直（如墙面、门框）。将手机竖直靠在被测物体上，气泡居中即表示垂直。',
            tag: '功能',
            tagClass: 'feature',
          },
          {
            title: '45°管',
            content: '斜向放置的气泡管，测量物体是否呈45°倾斜。适用于楼梯扶手、斜面施工等场景。',
            tag: '功能',
            tagClass: 'feature',
          },
          {
            title: '刻度尺',
            content: '显示在水平管下方，可测量物理长度。支持厘米（cm）和英寸（inch）两种单位，点击工具栏的「cm / inch」按钮切换。',
            tag: '功能',
            tagClass: 'feature',
          },
          {
            title: '校准按钮',
            content: '将当前位置设为零点，用于测量相对角度。例如将手机靠在一个斜面上点击校准，之后测量的都是相对于该斜面的偏差。点击「重置校准」可恢复到绝对角度。',
            tag: '按钮',
            tagClass: 'button',
          },
          {
            title: '灵敏度设置',
            content: '调整气泡的响应速度，共5档。超稳定（1档）适合精密测量，气泡移动平滑缓慢；超灵敏（5档）响应迅速，适合快速追踪变化。默认为3档（标准）。',
            tag: '设置',
            tagClass: 'setting',
          },
        ] as TutorialItem[],
      },
      {
        id: 'compass',
        icon: '🧭',
        title: '万向水平仪',
        expanded: false,
        items: [
          {
            title: '功能介绍',
            content: '万向水平仪通过360°罗盘实时展示设备的空间倾斜状态。罗盘上的小圆点指示当前倾斜的方向和程度，数字同步显示精确角度值。',
            tag: '介绍',
            tagClass: 'intro',
          },
          {
            title: '罗盘读数',
            content: '罗盘中的绿色小圆点代表当前的倾斜方向和程度。圆点在中心说明设备水平；圆点偏向某方向说明设备向该方向倾斜，距中心越远倾斜角度越大。',
            tag: '功能',
            tagClass: 'feature',
          },
          {
            title: 'X/Y 角度值含义',
            content: 'X 轴角度：手机左右倾斜的角度（gamma 值）。Y 轴角度：手机前后倾斜的角度（beta 值）。两轴均为 0° 时设备完全水平。',
            tag: '功能',
            tagClass: 'feature',
          },
          {
            title: '校准按钮',
            content: '将当前的倾斜状态设为零点，之后所有角度读数都是相对于校准时的姿态。点击「重置校准」可恢复到绝对角度。',
            tag: '按钮',
            tagClass: 'button',
          },
          {
            title: '记录角度',
            content: '点击「记录角度」按钮可保存当前的 X/Y 角度值。保存时会尝试获取地理位置（需授权），位置信息会附在记录中方便后续查阅。',
            tag: '按钮',
            tagClass: 'button',
          },
          {
            title: '我的记录',
            content: '点击「我的记录」按钮跳转到记录列表页，查看所有保存过的角度记录，支持分享和删除。',
            tag: '按钮',
            tagClass: 'button',
          },
          {
            title: '分享记录',
            content: '在「我的记录」页面中，点击记录卡片上的「分享」按钮，跳转到记录详情页后，通过右上角「···」菜单将记录转发给好友。好友点击后即可查看测量数据。',
            tag: '功能',
            tagClass: 'feature',
          },
          {
            title: '灵敏度设置',
            content: '调整罗盘小圆点的响应速度，共5档。档位越低越平稳，适合需要稳定读数的场景；档位越高响应越快，适合快速跟踪倾斜变化。',
            tag: '设置',
            tagClass: 'setting',
          },
        ] as TutorialItem[],
      },
      {
        id: 'faq',
        icon: '❓',
        title: '常见问题',
        expanded: false,
        items: [
          {
            title: '测量结果不准确怎么办？',
            content: '请使用「校准」功能。将手机放置在一个您认为水平（或垂直）的基准面上，点击校准按钮，之后的读数将以此为零点。不同手机传感器精度存在差异，测量结果仅供参考。',
          },
          {
            title: '气泡/圆点抖动太厉害？',
            content: '请降低灵敏度档位（向左调低）。较低的灵敏度会使用更强的滤波，读数更稳定。在需要精密测量时建议使用1档（超稳定）。',
          },
          {
            title: '提示不支持传感器？',
            content: '您的设备可能不支持陀螺仪或加速度计传感器。水平仪功能依赖这些硬件，部分低端机型或老旧设备可能不具备此能力，建议更换支持陀螺仪的设备使用。',
          },
          {
            title: '记录角度时获取位置失败？',
            content: '请确保已授予小程序「位置」权限。如曾拒绝授权，请前往「设置 → 隐私 → 位置」中手动开启。未获取位置时角度记录仍可正常保存，只是不会包含地理位置信息。',
          },
          {
            title: '刻度尺物理尺寸不准？',
            content: '刻度尺基于设备 PPI 估算物理尺寸，不同机型的屏幕规格存在差异，仅供参考。如需精确测量长度，建议使用实体卷尺。',
          },
        ] as TutorialItem[],
      },
    ] as TutorialSection[],
  },

  methods: {
    /**
     * 切换指定节的展开/折叠状态
     * 点击节标题时调用，传入节的索引
     */
    toggleSection(e: WechatMiniprogram.BaseEvent) {
      const index = e.currentTarget.dataset['index'] as number;
      const key = `sections[${index}].expanded`;
      const current = this.data.sections[index].expanded;
      // 切换该节的展开状态（不强制手风琴互斥，允许多节同时展开）
      this.setData({ [key]: !current });
    },
  },
});

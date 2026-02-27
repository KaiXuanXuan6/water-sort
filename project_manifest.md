# 项目进度宣言 (Project Manifest)

## 项目总体进度: 50%

---

## 1. 场景列表 (Scene List)

### 1.1 首页 (HomeScene) - 60%
- [x] 在现有 scene 中搭建 HomeRoot 视图结构（单场景模式）
- [x] 添加背景图（各页已统一使用 Background）
- [x] 添加开始按钮 (PlayButton/StartButton)，点击进入游戏页（当前应玩关卡）
- [x] PlayButton 文案显示 "Level N"（默认 Level 1，随 UserProfile.unlockedLevel 更新）
- [ ] 添加商店入口按钮 (ShopButton) - 暂留占位
- [x] 添加设置按钮 (SettingButton)
- [x] 编写 HomeSceneController 脚本

### 1.2 地图页 (MapScene) - 20%
- [ ] 在现有 scene 中搭建 MapRoot 视图结构（单场景模式）
- [ ] 实现关卡列表 UI (LevelList)
- [ ] 实现关卡进度显示 (ProgressDisplay)
- [ ] 添加返回主页按钮 (BackButton)
- [ ] 实现关卡解锁/锁定状态逻辑
- [x] 编写 MapSceneController 脚本

### 1.3 游戏页 (GameScene) - 40%
- [ ] 在现有 scene 中搭建 GameRoot 视图结构（单场景模式），详见 [step.md](step.md)
- [ ] 实现顶部进度条 (TopProgressBar)
- [ ] 实现道具栏 (道具按钮: 撤销、重玩、加管)
- [ ] 实现瓶子容器区 (BottleContainer) + BottleManager + 瓶子预制体（见 step.md）
- [ ] 添加返回地图按钮 (BackButton)
- [x] 编写 GameSceneController 脚本（selectedLevelId 为空时兜底 level_001）

### 1.4 结算页 (ResultPop) - 20%
- [ ] 创建弹窗预制体
- [ ] 成功界面 (星星评级、下一关关按钮)
- [ ] 失败界面 (重试按钮)
- [x] 编写 ResultPopupController 脚本

### 1.5 设置页 (SettingPop) - 20%
- [ ] 创建弹窗预制体
- [ ] 音效开关按钮
- [ ] 震动开关按钮
- [ ] 版本号显示
- [x] 编写 SettingPopupController 脚本

### 1.6 收集页 (CollectionScene) - 50%
- [ ] 在现有 scene 中搭建 CollectionRoot 视图结构（单场景模式），详见 [step.md](step.md) 第一节
- [x] 瓶子图鉴逻辑：UserProfile 扩展（unlockedBottleTypes、selectedBottleType）、BottleBlockController、CollectionSceneController 网格生成与 SelectBox tween（见 collection_bottle_scrollview_plan.md）
- [ ] 编辑器中：创建瓶子块 Prefab（bottle_bg / bottle_bg2 二选一显隐 → bottle → lock → checkbox，无 mask）；挂 BottleBlockController；Content 挂 Layout 每行 3 列；绑定 bottleBlockPrefab、selectBoxNode、bottleGridContainer/ScrollView
- [ ] 添加返回入口（由 BottomBar 或页面内返回按钮返回首页）
- [x] 编写 CollectionSceneController 脚本（已接入解锁数据与选中框）

---

## 2. 核心模块 (Core Modules)

### 2.1 数据层 - 20%
**目录**: `assets/scripts/data/`

- [x] LevelConfig.ts
  - [x] 定义关卡配置接口 (LevelConfig)
  - [x] 定义瓶子接口 (BottleState)
  - [x] 定义水层接口 (WaterLayer)
  - [x] 关卡验证方法
  - [x] levelIdToLevelNum / levelNumToLevelId 统一关卡 ID 格式，供各 Controller 复用

- [x] LevelDataLoader.ts
  - [x] 从 resources 加载关卡 JSON（loadLevelFromResources）
  - [x] 使用 LevelConfig 校验，单一数据源

- [x] UserProfile.ts
  - [x] 定义用户档案接口 (UserProfileData)
  - [x] 当前关卡进度、已解锁关卡、道具数量（默认 unlockedLevel = 1，从第一关开始）
  - [x] 收集页：unlockedBottleTypes（默认 [1]）、selectedBottleType（默认 1）及 get/set/isBottleTypeUnlocked
  - [x] 内存读写 get/set、loadFromStorage/saveToStorage
  - [x] 本地存储持久化（sys.localStorage）

- [x] ResultPayload.ts
  - [x] 结算弹窗 payload 类型，GameSceneController 与 ResultPopupController 共用

- [ ] GameState.ts（可选重构）
  - 当前状态分散在 GameSceneController 与 WaterSortEngine 中，功能已满足
  - 若需跨场景共享游戏状态，可抽离为 data 层

### 2.2 逻辑层 - 100%
**目录**: `assets/scripts/logic/`

- [x] WaterSortEngine.ts
  - [x] 移动验证方法 (canMove)
  - [x] 执行移动方法 (executeMove)
  - [x] 胜利检测方法 (checkWin)
  - [x] 撤销移动方法 (undoMove)
  - [x] 重新开始方法 (reset)
  - [x] 合法移动检测 (hasValidMoves)
  - [x] 失败条件检测 (checkDefeat)

### 2.3 表现层 - 30%
**目录**: `assets/scripts/ui/`

- [x] BottleComponent.ts
  - [x] 瓶子Sprite绑定
  - [x] 水层渲染
  - [x] 点击事件处理
  - [x] 选中状态动画
  - [x] 倒水动画

- [x] RootViewSwitcher.ts
  - [x] 按 NavigationManager.currentScene 显隐 homeRoot/mapRoot/collectionRoot/gameRoot
  - [x] 进入游戏页时隐藏 BottomBar，首页/地图页/收集页时显示（需绑定 bottomBar 节点）

- [x] TopBarController.ts
  - [x] 统一管理返回按钮、设置按钮、标题 Label；按场景显隐返回键、更新标题文案
  - [x] 监听 SCENE_LOAD_START，调用 back() / showSettingsPopup()

- [ ] WaterShader.ts
  - [ ] 2D液体模拟shader
  - [ ] 水面波动效果
  - [ ] 颜色混合效果

- [ ] PropComponent.ts
  - [ ] 撤销按钮
  - [ ] 重玩按钮
  - [ ] 加管道具

### 2.4 工具类 - 40%
**目录**: `assets/scripts/utils/`

- [ ] LevelEditor.ts
  - [ ] 关卡创建界面
  - [ ] 关卡保存功能
  - [ ] 关卡测试功能

- [x] NavigationManager.ts
  - [x] 场景导航方法
  - [x] 弹窗管理方法
  - [x] 事件系统
  - [x] 全局状态管理

- [x] AssetLoader.ts
  - [x] 动态加载瓶子图片
  - [x] 资源缓存管理
  - [x] 预加载功能

- [x] BottleManager.ts
  - [x] 瓶子管理器组件
  - [x] 批量创建瓶子
  - [x] 瓶子位置计算
  - [x] 瓶子组件访问

---

## 3. 配置文件

### 3.1 关卡数据
**目录**: `assets/resources/config/levels/`（仅维护 JSON，符合 DRY）

- [x] level_001.json
- [x] level_002.json
- [x] level_003.json
- [ ] 更多关卡...
- 说明：运行时通过 LevelDataLoader 从 resources 动态加载，无重复 TS 数据

### 3.2 游戏配置
- 已移除 GameConfigLoader；最大步数由关卡 JSON 决定，道具初始值由 UserProfile 默认值硬编码。

---

## 4. 编辑器 Inspector 绑定清单

在 Cocos Creator 中为以下组件完成属性绑定后，游戏方可完整运行。脚本路径均为 `assets/scripts/` 下。

**可用素材（按迁移批次更新）**：背景图在 `resources/Backgrounds/`（1.png～32.png），供场景/关卡背景使用，非组件绑定。通用 UI 素材（含图鉴/成就用按钮、面板、框等）统一在 `resources/UIResources/`；暂无组件绑定。

### 4.1 RootViewSwitcher（Canvas）

| 属性 | 类型 | 说明 |
|------|------|------|
| Home Root | Node | 拖入 HomeRoot 节点 |
| Map Root | Node | 拖入 MapRoot 节点 |
| Collection Root | Node | 拖入 CollectionRoot 节点（收集页，展示玩家解锁的瓶子图鉴）；详见 [step.md](step.md) 第一节 |
| Game Root | Node | 拖入 GameRoot 节点 |
| Bottom Bar | Node | 拖入 BottomBar 节点；进入游戏页时隐藏，首页/地图页/收集页时显示 |

### 4.1.1 BottomBarController（BottomBar 节点）

| 属性 | 类型 | 说明 |
|------|------|------|
| Home Button | Node | 拖入 HomeButton 节点（可选，未绑定则按名称查找） |
| Map Button | Node | 拖入 MapButton 节点（可选） |
| Collection Button | Node | 拖入 CollectionButton 节点（可选） |

根据当前 root 放大对应图标并显示深蓝背景。可选：为 HomeButton、MapButton、CollectionButton 各添加子节点 `HighlightBg`（Sprite，置于最前/索引 0，默认 active 关闭），用于高亮背景；未配置时仅生效缩放。

### 4.2 NavigationManager（NavigationManager 节点）

无需绑定属性。

### 4.2.1 TopBarController（Canvas 或共用 TopBar 节点）

| 属性 | 类型 | 说明 | 可用素材 |
|------|------|------|----------|
| Back Button | Button | 返回上一级（按场景显隐） | resources/Map/HomeIcon.png 等 |
| Setting Button | Button | 打开设置弹窗 | resources/TopBar/setting.png、resources/Dialog/SettingsBtn.png |
| Title Label | Label | 当前页标题文案（按场景更新） | 仅文案 |

### 4.3 HomeSceneController（HomeRoot）

| 属性 | 类型 | 说明 | 可用素材（resources/HomeGame/） |
|------|------|------|-------------------------------|
| Start Button | Button | 开始按钮，进入游戏页（当前应玩关卡） | 页面底图 Home.jpg（HomeGame）；按钮图可结合 Dialog |
| Level Label | Label | PlayButton 上显示 "Level N"（可选；未绑定则从 Start Button 子节点获取） | — |
| Shop Button | Button | 商店入口（可占位） | 同上 |
| Setting Button | Button | 设置按钮 | resources/Dialog/SettingsBtn.png |

### 4.4 MapSceneController（MapRoot）

| 属性 | 类型 | 说明 | 可用素材（resources/Map/） |
|------|------|------|---------------------------|
| Back Button | Button | 返回首页 | HomeIcon.png |
| Level Scroll View | ScrollView | 关卡列表滚动区域（可选） | 底图 Map.jpg |
| Level List Container | Node | 关卡按钮的父节点 | — |
| Level Item Prefab | Node | 关卡按钮预制体（可选） | MapLevelGray.png、MapLevelLit.png、MapLevelCurrent.png |
| Level Button Spacing | number | 无预制体时按钮间距，默认 90 | — |

### 4.4.1 CollectionSceneController（CollectionRoot，占位）

| 属性 | 类型 | 说明 |
|------|------|------|
| Back Button | Button | 返回首页 |
| Title Label | Label | 标题（如「图鉴」），可选 |
| Bottle Scroll View | ScrollView | 瓶子列表滚动区域，可选 |
| Bottle Grid Container | Node | 瓶子图标网格父节点，可选 |

### 4.5 GameSceneController（GameRoot）

| 属性 | 类型 | 说明 | 可用素材（resources/HomeGame/） |
|------|------|------|-------------------------------|
| Back Button | Button | 返回地图 | 可结合 Map/HomeIcon 等 |
| Undo Button | Button | 撤销 | undo.png |
| Replay Button | Button | 重玩 | ReplayBtn.png |
| Add Tube Button | Button | 加管（道具） | add_tube.png |
| Progress Bar | Node | 顶部进度条节点 | 背景可参考 GamePage1.jpg、GamePage2.jpg |
| Bottle Container | Node | 瓶子容器节点 | 同上 |
| Bottle Manager | BottleManager | 挂有 BottleManager 组件的节点 | — |
| Prop Bar | Node | 道具栏容器（可选） | — |
| Result Popup | Node | 挂有 ResultPopupController 的结算弹窗根节点 | — |

### 4.6 BottleManager（GameRoot 下 BottleManager 节点）

| 属性 | 类型 | 说明 |
|------|------|------|
| Bottle Prefab | Prefab | 瓶子预制体（可选；不绑定时由 BottleCreator 动态创建） |
| Bottle Container | Node | 与 GameSceneController 的 Bottle Container 为**同一节点** |
| Bottle Spacing | number | 瓶子水平间距（当前代码内为常量 40，若需可配置可后续加 @property） |
| Start X | number | 瓶子起始 X（当前代码为自动居中布局，无 Start X 属性） |

### 4.7 ResultPopupController（GameRoot 下 ResultPopup）

| 属性 | 类型 | 说明 | 可用素材（resources/Result/） |
|------|------|------|------------------------------|
| Success Panel | Node | 成功时显示的面板 | Victory.jpg、GreatBanner.png、StarIcon.png、StarProgressBar.png、StarProgressBarBg.png |
| Fail Panel | Node | 失败时显示的面板 | Clear.jpg |
| Next Level Button | Button | 下一关 | 可结合 Dialog 批按钮图 |
| Replay Button | Button | 重玩 | 可结合 HomeGame/ReplayBtn 或 Dialog |
| Map Button | Button | 返回地图 | 同上 |
| Home Button | Button | 返回首页 | 同上 |
| Stars | Node[] | 星星节点数组（3 个，成功时播放从左下角由小变大再落位动画） | Result/star.png |
| Progress Bar Bg | Sprite | 进度条背景 | Result/progress_bg.png |
| Progress Bar Fill | Sprite | 进度条填充（Type=FILLED, Fill Type=HORIZONTAL） | Result/progress.png |
| Progress Label | Label | 进度文案，如 "6/8" | 仅文案 |
| Move Count Label | Label | 移动次数文案 | 仅占位，无对应图 |
| Best Move Count Label | Label | 最少步数文案（可选） | 仅占位 |
| Level Num Label | Label | 关卡号文案（可选） | 仅占位 |

### 4.8 SettingPopupController（Canvas 下 SettingPopup，可选）

| 属性 | 类型 | 说明 | 可用素材（resources/Dialog/） |
|------|------|------|------------------------------|
| Close Button | Button | 关闭弹窗 | CloseBtn.png |
| Sound Toggle | Toggle | 音效开关 | SoundBtn.png |
| Vibration Toggle | Toggle | 震动开关 | MusicBtn.png（或同风格图） |
| Version Label | Label | 版本号显示 | 仅文案，无对应图 |

### 4.9 MainBg 下 ButtonBar 布局（按钮间距与右侧边距固定）

目标：两个按钮之间间距固定，按钮整体与 MainBg 右侧距离固定，按钮尺寸不变。

**步骤（在 Cocos Creator 编辑器中操作）：**

1. **ButtonBar 节点**
   - 选中 **ButtonBar**（MainBg 下的按钮容器）。
   - **添加组件 → UI → Widget**（若已有可跳过）  
     - 勾选 **Align Right**，**Right** 设为固定值（如 `20`），表示与父节点（MainBg 或当前父节点）右边缘的固定距离。  
     - 根据需要勾选 **Align Top / Align Bottom** 或 **Align Vertical Center** 以固定垂直位置。
   - **添加组件 → UI → Layout**  
     - **Type**：`HORIZONTAL`  
     - **Spacing X**：固定间距（如 `20`），即两按钮之间的固定距离。  
     - **Horizontal Direction**：`RIGHT_TO_LEFT`，使最右侧按钮贴齐 ButtonBar 右边缘，向左依次排列。  
     - **Resize Mode**：`CONTAINER`，ButtonBar 宽度随子节点总宽度 + 间距自适应。  
     - **Child Alignment**：垂直方向选 `CENTER` 或按需选择。

2. **按钮子节点（两个 SemiCircleButton 等）**
   - 若子节点上挂了 **Widget** 且设置了 Left/Right，会与 Layout 的排布冲突，建议**去掉**子节点的 Widget，或只保留垂直方向对齐（如 Top/Bottom），由 Layout 负责水平排布。  
   - 保证每个按钮节点的 **UITransform** 尺寸为固定值（或由子节点内容决定），Layout 不会改变子节点尺寸，只按固定间距排布。

效果：ButtonBar 整体距 MainBg 右侧固定；内部两按钮保持固定尺寸、固定间距，并整体靠右排列。

---

## 5. 当前任务

### 进行中
- （暂无）

### 待办
- 实现 WaterShader 水体特效（可选）
- GameSceneController 拆分：可选抽出 LevelRunner/GamePlayCoordinator，负责关卡数据+引擎+回合胜负，Controller 只做 UI 绑定与导航（见架构评审）

### 已完成
- GameRoot 胜利横幅（WinBanner）动画接入：横条填充→整体淡出→ResultPopup；ResultPopup 星星动画、进度条（Result/star、progress、progress_bg）已接入
- SettingPopup 动效冲突排查完成：移除 `PopInOutAnim` 及相关调用，当前仅通过 `node.active` 显隐（不再做 Widget 刷新与调度）
- 首页 Start 进入游戏页（当前应玩关卡）、PlayButton 显示 "Level N"、UserProfile 默认 unlockedLevel=1；GameSceneController 无 selectedLevelId 时兜底 level_001
- RootViewSwitcher 增加 bottomBar 绑定，进入游戏页隐藏 BottomBar；详细步骤写入 step.md
- NavigationManager 使用 executionOrder(-100)，各 Controller/弹窗/RootViewSwitcher 在 start() 中重试获取 instance，解决预览时加载顺序问题
- 各页背景已统一使用 Background
- UIResources 已迁至 resources；原 Collection/Elements 图鉴用素材已并入 UIResources 统一管理
- 阶段5：Dialog 已迁至 resources（resources/Dialog/）
- 阶段4：Result 已迁至 resources（resources/Result/）
- 阶段3：Map 已迁至 resources（resources/Map/）
- 阶段2：HomeGame 已迁至 resources（resources/HomeGame/）
- 阶段1：Backgrounds 已迁至 resources（resources/Backgrounds/）
- 单场景显隐：NavigationManager 同 asset 时不 loadScene，仅更新 currentScene 并发事件；RootViewSwitcher 监听 SCENE_LOAD_START 更新三块视图显隐
- 失败检测：GameSceneController 在 tryPourWater 后调用 checkDefeat，失败时弹出 ResultPopup（data.success: false）
- 删除未使用的 GameStateMachine 模块，场景与弹窗状态由 NavigationManager 统一负责
- 命名：GameSceneController 内 GameState 改为 PlayState（玩法状态），CLAUDE.md 补充状态命名说明
- BottleComponent.setRuntimeRefs、BottleCreator 去掉 as any
- cocos_creator.md：资源目录约定、单场景说明、失败结算说明、检查清单增项
- 单场景显隐（原）：RootViewSwitcher 按 currentScene 显隐三块视图
- 地图页关卡按钮可点击：MapSceneController 动态创建 Button+Label，点击调用 gotoGame(levelId)
- 结算弹窗实际显示：POPUP_OPEN 携带 data，GameSceneController 显示 resultPopup 并传参 ResultPopupController.show
- UserProfile 占位：UserProfile.ts 接口与内存实现，MapSceneController.loadUserData 使用
- 连接 GameSceneController 与 BottleManager 的交互（引用、异步生成瓶子、点击回调、状态同步、选中状态）
- 创建示例关卡 level_001.json；改为仅维护 JSON（LevelDataLoader 从 resources 加载，删除 BuiltinLevels 重复数据）
- GameSceneController 接入 WaterSortEngine 与关卡数据（移动/撤销/胜利/重玩）
- BottleManager 异步 createBottles、委托 BottleCreator、正确收集 BottleComponent
- 更新 project_manifest.md 任务状态
- 创建项目目录结构
- 定义核心数据结构 (LevelConfig.ts)
- 创建全局导航管理器 (NavigationManager.ts)
- 创建场景脚本骨架（HomeScene、MapScene、GameScene、ResultPop、SettingPop）
- 实现核心排序算法 WaterSortEngine
- 删除未使用的 LevelValidator 模块（原关卡校验/编辑用，未接入运行时）
- 未使用代码清理：LevelConfig（fromJSON/toJSON/createEmptyBottle/createLevelTemplate）、UserProfile（getUserProfile/setUserProfile/getLevelStars）、AssetLoader（preloadBottles/loadPrefab/getSpriteFrame/getPrefab/clearCache/getCacheStats）、BottleManager.bottles、BottleCreator（createFromPrefab/createBottles/createBottlesSync/preloadBottleTypes）、BottleComponent.offClick
- GameSceneController 错误/正确提示图标逻辑 DRY 合并为 showHintAboveBottle
- 移动端输入约定（建议统一触摸事件）写入 CLAUDE.md
- 实现 BottleComponent 瓶子组件
- 实现 AssetLoader 资源加载器
- 实现 BottleManager 瓶子管理器
- 复制 UI 素材到 resources 目录
- 梳理项目状态并更新 project_manifest/cocos_creator/CLAUDE 文档
- 新增 level_002.json、level_003.json 关卡
- game_config.json 曾配合 GameConfigLoader；已移除 Loader，初始值由 UserProfile 硬编码
- UserProfile localStorage 持久化；GameSceneController.saveLevelProgress 联动

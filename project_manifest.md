# 项目进度宣言 (Project Manifest)

## 项目总体进度: 35%

---

## 1. 场景列表 (Scene List)

### 1.1 首页 (HomeScene) - 20%
- [ ] 创建场景文件
- [ ] 添加背景图
- [ ] 添加开始按钮 (StartButton)
- [ ] 添加商店入口按钮 (ShopButton) - 暂留占位
- [ ] 添加设置按钮 (SettingButton)
- [x] 编写 HomeSceneController 脚本

### 1.2 地图页 (MapScene) - 20%
- [ ] 创建场景文件
- [ ] 实现关卡列表 UI (LevelList)
- [ ] 实现关卡进度显示 (ProgressDisplay)
- [ ] 添加返回主页按钮 (BackButton)
- [ ] 实现关卡解锁/锁定状态逻辑
- [x] 编写 MapSceneController 脚本

### 1.3 游戏页 (GameScene) - 20%
- [ ] 创建场景文件
- [ ] 实现顶部进度条 (TopProgressBar)
- [ ] 实现道具栏 (道具按钮: 撤销、重玩、加管)
- [ ] 实现瓶子容器区 (BottleContainer)
- [ ] 添加返回地图按钮 (BackButton)
- [x] 编写 GameSceneController 脚本

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

---

## 2. 核心模块 (Core Modules)

### 2.1 数据层 - 20%
**目录**: `assets/scripts/data/`

- [x] LevelConfig.ts
  - [x] 定义关卡配置接口 (LevelConfig)
  - [x] 定义瓶子接口 (BottleState)
  - [x] 定义水层接口 (WaterLayer)
  - [x] 关卡验证方法

- [ ] UserProfile.ts
  - [ ] 定义用户档案接口
  - [ ] 当前关卡进度
  - [ ] 已解锁关卡列表
  - [ ] 道具数量统计
  - [ ] 本地存储读写

- [ ] GameState.ts
  - [ ] 定义游戏状态枚举
  - [ ] 当前关卡数据
  - [ ] 历史操作记录 (用于撤销)
  - [ ] 当前选中瓶子状态

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

- [x] GameStateMachine.ts
  - [x] 状态定义: HOME, MAP, GAME, RESULT, SETTINGS
  - [x] 状态转换方法 (changeState, popState)
  - [x] 状态栈管理
  - [x] 状态事件发布

- [x] LevelValidator.ts
  - [x] 关卡配置验证
  - [x] 颜色分布分析
  - [x] 关卡可解性验证 (BFS搜索)
  - [x] 最少步数估算
  - [x] 随机关卡生成
  - [x] 难度计算

### 2.3 表现层 - 30%
**目录**: `assets/scripts/ui/`

- [x] BottleComponent.ts
  - [x] 瓶子Sprite绑定
  - [x] 水层渲染
  - [x] 点击事件处理
  - [x] 选中状态动画
  - [x] 倒水动画

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

- [ ] UIManager.ts
  - [ ] 弹窗显示/隐藏方法
  - [ ] 场景切换方法
  - [ ] UI层级管理

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
- [ ] level_002.json
- [ ] 更多关卡...
- 说明：运行时通过 LevelDataLoader 从 resources 动态加载，无重复 TS 数据

### 3.2 游戏配置
- [ ] game_config.json
  - [ ] 最大步数
  - [ ] 空瓶数量
  - [ ] 道具初始数量

---

## 4. 当前任务

### 进行中
- 单场景过渡：逻辑场景（Home/Map/Game）统一映射到 `scene.scene`，后续再拆分真实场景资源

### 待办
- 实现 WaterShader 水体特效（可选）
- （已完成）关卡从 resources/config/levels/*.json 动态加载，单一数据源

### 已完成
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
- 实现状态机 GameStateMachine
- 实现关卡验证器 LevelValidator
- 实现 BottleComponent 瓶子组件
- 实现 AssetLoader 资源加载器
- 实现 BottleManager 瓶子管理器
- 复制 UI 素材到 resources 目录

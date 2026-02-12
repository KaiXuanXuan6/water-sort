# 项目进度宣言 (Project Manifest)

## 项目总体进度: 0%

---

## 1. 场景列表 (Scene List)

### 1.1 首页 (HomeScene) - 0%
- [ ] 创建场景文件
- [ ] 添加背景图
- [ ] 添加开始按钮 (StartButton)
- [ ] 添加商店入口按钮 (ShopButton) - 暂留占位
- [ ] 添加设置按钮 (SettingButton)
- [ ] 编写 HomeSceneController 脚本

### 1.2 地图页 (MapScene) - 0%
- [ ] 创建场景文件
- [ ] 实现关卡列表 UI (LevelList)
- [ ] 实现关卡进度显示 (ProgressDisplay)
- [ ] 添加返回主页按钮 (BackButton)
- [ ] 实现关卡解锁/锁定状态逻辑
- [ ] 编写 MapSceneController 脚本

### 1.3 游戏页 (GameScene) - 0%
- [ ] 创建场景文件
- [ ] 实现顶部进度条 (TopProgressBar)
- [ ] 实现道具栏 (道具按钮: 撤销、重玩、加管)
- [ ] 实现瓶子容器区 (BottleContainer)
- [ ] 添加返回地图按钮 (BackButton)
- [ ] 编写 GameSceneController 脚本

### 1.4 结算页 (ResultPop) - 0%
- [ ] 创建弹窗预制体
- [ ] 成功界面 (星星评级、下一关按钮)
- [ ] 失败界面 (重试按钮)
- [ ] 编写 ResultPopupController 脚本

### 1.5 设置页 (SettingPop) - 0%
- [ ] 创建弹窗预制体
- [ ] 音效开关按钮
- [ ] 震动开关按钮
- [ ] 版本号显示
- [ ] 编写 SettingPopupController 脚本

---

## 2. 核心模块 (Core Modules)

### 2.1 数据层 - 0%
**目录**: `assets/scripts/data/`

- [ ] LevelConfig.ts
  - [ ] 定义关卡配置接口 (LevelConfig)
  - [ ] 定义瓶子接口 (BottleData)
  - [ ] 定义水层接口 (WaterLayer)
  - [ ] 关卡验证方法

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

### 2.2 逻辑层 - 0%
**目录**: `assets/scripts/logic/`

- [ ] WaterSortEngine.ts
  - [ ] 移动验证方法 (canMove)
  - [ ] 执行移动方法 (executeMove)
  - [ ] 胜利检测方法 (checkWin)
  - [ ] 撤销移动方法 (undoMove)
  - [ ] 重新开始方法 (resetLevel)

- [ ] GameStateMachine.ts
  - [ ] 状态定义: HOME, MAP, GAME, RESULT, SETTINGS
  - [ ] 状态转换方法
  - [ ] 状态事件发布

- [ ] LevelValidator.ts
  - [ ] 关卡可解性验证
  - [ ] 最少步数计算

### 2.3 表现层 - 0%
**目录**: `assets/scripts/ui/`

- [ ] BottleComponent.ts
  - [ ] 瓶子Sprite绑定
  - [ ] 水层渲染
  - [ ] 点击事件处理
  - [ ] 选中状态动画
  - [ ] 倒水动画

- [ ] WaterShader.ts
  - [ ] 2D液体模拟shader
  - [ ] 水面波动效果
  - [ ] 颜色混合效果

- [ ] PropComponent.ts
  - [ ] 撤销按钮
  - [ ] 重玩按钮
  - [ ] 加管道具

### 2.4 工具类 - 0%
**目录**: `assets/scripts/utils/`

- [ ] UIManager.ts
  - [ ] 弹窗显示/隐藏方法
  - [ ] 场景切换方法
  - [ ] UI层级管理

- [ ] LevelEditor.ts
  - [ ] 关卡创建界面
  - [ ] 关卡保存功能
  - [ ] 关卡测试功能

- [ ] EventManager.ts
  - [ ] 事件发布/订阅
  - [ ] 常用事件定义

---

## 3. 配置文件

### 3.1 关卡数据
**目录**: `assets/config/`

- [ ] 创建 levels/ 目录
- [ ] level_001.json
- [ ] level_002.json
- [ ] 更多关卡...

### 3.2 游戏配置
- [ ] game_config.json
  - [ ] 最大步数
  - [ ] 空瓶数量
  - [ ] 道具初始数量

---

## 4. 当前任务

### 进行中
- 无

### 待办
- 初始化项目框架与全局数据结构

### 已完成
- 无

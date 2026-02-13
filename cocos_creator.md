# Cocos Creator 编辑器中需完成的操作

本文档为**编辑器操作清单**，汇总所有需在 Cocos Creator 3.8.8 编辑器中完成的场景结构、节点挂载与属性绑定。代码中的 `@property` 均需在编辑器中拖拽绑定，否则对应功能可能不生效。

**重要**：完成本文档所列全部操作后，方可正常运行首页 → 地图 → 游戏 → 结算 的完整流程。

---

## 1. 场景根与单场景显隐

**场景文件**：`assets/scene.scene`（或当前主场景）

**当前现状**：场景中目前仅有 Canvas 及其子节点，需在 Canvas 下新增三个 Root 节点（HomeRoot、MapRoot、GameRoot）以实现单场景显隐切换。

### 1.1 根节点结构

在场景根节点下创建三个子节点，用于 Home / Map / Game 三块视图的显隐切换：

| 节点名称建议 | 用途 |
|-------------|------|
| `HomeRoot`  | 首页视图容器 |
| `MapRoot`   | 地图/关卡列表视图容器 |
| `GameRoot`  | 游戏玩法视图容器 |

### 1.2 RootViewSwitcher

- 在**场景根节点**上添加组件：**RootViewSwitcher**（脚本 `assets/scripts/ui/RootViewSwitcher.ts`）。
- 在 Inspector 中绑定：
  - **Home Root** → 拖入 `HomeRoot` 节点
  - **Map Root** → 拖入 `MapRoot` 节点
  - **Game Root** → 拖入 `GameRoot` 节点

---

## 2. 导航管理器（持久化）

- 在场景中创建一个常驻节点（如 `NavigationManager`），挂载组件 **NavigationManager**（`assets/scripts/utils/NavigationManager.ts`）。
- 该节点会被设为**常驻根节点**（DontDestroyOnLoad），保证场景切换时不被销毁。
- 无需在 Inspector 绑定属性。

---

## 3. 首页（HomeRoot 下）

在 **HomeRoot** 下搭建首页 UI，并挂载 **HomeSceneController**（`assets/scripts/ui/HomeSceneController.ts`）。

| 属性 | 类型 | 说明 |
|------|------|------|
| Start Button | Button | 开始按钮，点击进入地图 |
| Shop Button | Button | 商店入口（可先占位） |
| Setting Button | Button | 设置按钮 |

---

## 4. 地图页（MapRoot 下）

在 **MapRoot** 下搭建地图页 UI，并挂载 **MapSceneController**（`assets/scripts/ui/MapSceneController.ts`）。

| 属性 | 类型 | 说明 |
|------|------|------|
| Back Button | Button | 返回首页 |
| Level Scroll View | ScrollView | 关卡列表滚动区域（可选，无则列表不滚动） |
| Level List Container | Node | 关卡按钮的父节点，脚本会在此下动态创建关卡按钮 |
| Level Item Prefab | Node | 关卡按钮预制体（可选；不绑定时会动态创建简单按钮） |
| Level Button Spacing | number | 无预制体时关卡按钮间距，默认 90 |

---

## 5. 游戏页（GameRoot 下）

在 **GameRoot** 下搭建游戏页 UI，并挂载 **GameSceneController**（`assets/scripts/ui/GameSceneController.ts`）。

### 5.1 GameSceneController 绑定

| 属性 | 类型 | 说明 |
|------|------|------|
| Back Button | Button | 返回地图 |
| Undo Button | Button | 撤销 |
| Replay Button | Button | 重玩 |
| Add Tube Button | Button | 加管（道具） |
| Progress Bar | Node | 顶部进度条节点 |
| Bottle Container | Node | 瓶子容器节点，瓶子将生成在此节点下 |
| Bottle Manager | BottleManager | 瓶子管理器组件所在节点（见下） |
| Prop Bar | Node | 道具栏容器（可选） |
| Result Popup | Node | 结算弹窗根节点（挂有 ResultPopupController） |

### 5.2 BottleManager

- 在 GameRoot 下建一节点（如 `BottleManager`），挂载 **BottleManager**（`assets/scripts/utils/BottleManager.ts`）。
- 将 **GameSceneController** 的 **Bottle Manager** 属性指向该节点。
- BottleManager 自身需绑定：

| 属性 | 类型 | 说明 |
|------|------|------|
| Bottle Prefab | Prefab | 瓶子预制体（可选；不绑定时用代码动态创建瓶子） |
| Bottle Container | Node | 与 GameSceneController 的 Bottle Container 为**同一节点** |
| Bottle Spacing | number | 瓶子水平间距，默认 90 |
| Start X | number | 瓶子起始 X，默认 0 |

---

## 6. 结算弹窗（ResultPopup）

- 在 **GameRoot** 下建一节点（如 `ResultPopup`），作为结算弹窗根节点。
- 挂载 **ResultPopupController**（`assets/scripts/ui/ResultPopupController.ts`）。
- 将 **GameSceneController** 的 **Result Popup** 指向该节点。
- 初始可将该节点设为 **active = false**，由代码在胜利时打开。

### ResultPopupController 绑定

| 属性 | 类型 | 说明 |
|------|------|------|
| Success Panel | Node | 成功时显示的面板 |
| Fail Panel | Node | 失败时显示的面板 |
| Next Level Button | Button | 下一关 |
| Replay Button | Button | 重玩 |
| Map Button | Button | 返回地图 |
| Home Button | Button | 返回首页 |
| Stars | Node[] | 星星节点数组（可选） |
| Move Count Label | Label | 移动次数文案 |
| Best Move Count Label | Label | 最少步数文案（可选） |
| Level Num Label | Label | 关卡号文案（可选） |

---

## 7. 设置弹窗（可选）

若需设置页，可在场景中建一节点挂载 **SettingPopupController**（`assets/scripts/ui/SettingPopupController.ts`），并绑定其 Button / Toggle / Label 等属性。打开方式由 Home 的 Setting Button 调用 `NavigationManager.showSettingsPopup()`。

---

## 8. 检查清单

**说明**：当前 scene 尚未完成配置，需按下方清单逐项在编辑器中完成。该清单为最高优先级任务，完成后游戏方可运行。

- [ ] 场景根下存在 HomeRoot、MapRoot、GameRoot 三个节点
- [ ] 场景根挂载 RootViewSwitcher，并绑定上述三个根节点
- [ ] 场景中存在挂载 NavigationManager 的常驻节点
- [ ] HomeRoot 下挂载 HomeSceneController，并绑定 Start/Shop/Setting 按钮
- [ ] MapRoot 下挂载 MapSceneController，并绑定 Back、Level List Container（及可选 ScrollView / Prefab）
- [ ] GameRoot 下挂载 GameSceneController，并绑定 Back、Undo、Replay、AddTube、Progress Bar、Bottle Container、Bottle Manager、Result Popup
- [ ] 存在 BottleManager 节点，其 Bottle Container 与 GameSceneController 的 Bottle Container 一致
- [ ] ResultPopup 节点挂载 ResultPopupController，并绑定成功/失败面板与按钮

完成以上绑定后，运行时可实现：首页 → 地图 → 选择关卡进入游戏 → 胜利后弹出结算 → 下一关/返回地图/首页。

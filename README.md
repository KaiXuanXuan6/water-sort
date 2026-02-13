# Water Sort（水排序）

基于 **Cocos Creator 3.8.8** 的 2D 水排序益智游戏。单场景架构，通过显隐 HomeRoot / MapRoot / GameRoot 切换首页、地图、游戏视图，由 NavigationManager 管理场景与弹窗导航。

---

## 项目目标

- **玩法**：将试管中的彩色液体按颜色分瓶，直至每管同色或为空，完成关卡。
- **流程**：首页 → 关卡地图（选择关卡）→ 游戏内玩法 → 胜利/失败结算弹窗 → 下一关 / 重玩 / 返回地图或首页。
- **技术**：核心排序逻辑与 Cocos 节点解耦（WaterSortEngine），事件驱动；关卡与瓶子资源从 `assets/resources` 动态加载。

---

## 场景节点结构

主场景为**单场景**（`assets/scene.scene`），根节点下仅两个直接子节点：**Canvas**（UI 画布）与 **NavigationManager**（常驻，DontDestroyOnLoad）。所有 UI 均在 Canvas 下，通过显隐切换视图。

```
scene（场景根）
├── Canvas
│   ├── Camera
│   ├── HomeRoot           # 首页视图容器
│   ├── MapRoot            # 地图/关卡列表视图容器
│   ├── GameRoot           # 游戏玩法视图容器
│   │   ├── BottleManager   # 瓶子管理器（生成与布局）
│   │   └── ResultPopup    # 结算弹窗根节点
│   └── SettingPopup       # 设置弹窗（与三个 Root 平级，全局可用）
└── NavigationManager      # 常驻根节点，负责场景/弹窗跳转
```

---

## 节点与挂载脚本

| 节点 | 挂载脚本 | 说明 |
|------|----------|------|
| **Canvas** | `RootViewSwitcher` | 根据 NavigationManager.currentScene 显隐 HomeRoot / MapRoot / GameRoot。 |
| **NavigationManager** | `NavigationManager` | 单例，常驻。管理 HOME / MAP / GAME 场景切换及 ResultPop、SettingPop 弹窗。 |
| **HomeRoot** | `HomeSceneController` | 首页逻辑与按钮响应。 |
| **MapRoot** | `MapSceneController` | 关卡地图与关卡列表。 |
| **GameRoot** | `GameSceneController` | 游戏主控：玩法状态、瓶子交互、结算触发。 |
| **BottleManager**（GameRoot 下） | `BottleManager` | 瓶子生成与布局，Bottle Container 与 GameSceneController 共用同一节点。 |
| **ResultPopup**（GameRoot 下） | `ResultPopupController` | 结算弹窗（成功/失败面板与导航按钮）。 |
| **SettingPopup**（Canvas 下） | `SettingPopupController` | 设置弹窗，由首页 Setting 按钮通过 `NavigationManager.showSettingsPopup()` 打开。 |

脚本路径均在 `assets/scripts/` 下：UI 控制器在 `ui/`，工具类在 `utils/`，逻辑在 `logic/`，数据在 `data/`。

---

## 资源目录约定

通过代码动态加载的资源须放在 **assets/resources** 下：

| 用途 | 路径（相对 resources） | 说明 |
|------|------------------------|------|
| 关卡配置 | `config/levels/` | JSON，文件名与 levelId 一致，如 `level_001.json` |
| 瓶子贴图 | `Bottles/` | 命名如 `{bottleType}_1`、`{bottleType}_2`（正常/选中） |
| 背景图 | `Backgrounds/` | 编号背景（如 1.png～32.png），供场景/关卡背景使用 |
| 首页与游戏内 UI | `HomeGame/` | Home.jpg、GamePage1/2.jpg、add_tube.png、undo.png、ReplayBtn.png 等 |
| 地图页 | `Map/` | Map.jpg、MapLevelGray/Lit/Current.png、MapPath.png、Tab、HomeIcon 等 |
| 结算页 | `Result/` | Victory.jpg、Clear.jpg、StarIcon、StarProgressBar、GreatBanner 等 |
| 弹窗（设置/商店） | `Dialog/` | Settings.jpg、SettingsBg、CloseBtn、SoundBtn、MusicBtn、SettingsBtn 等 |
| 通用 UI 素材库 | `UIResources/` | 按钮、图标、进度条、星星、面板、框等通用图；含原 Collection 图鉴用素材（Back、PanelBg、PageBtn、Selected 等），与 HomeGame/Dialog/Map/Result 互补 |

**不迁入**：`sactx-xxx` 命名的文件为纹理图集（sprite atlas），由打包工具生成的合图，不能作为单个 UI 素材直接使用；只迁入可单独使用的源图，图集不迁移。

---

## 架构要点

- **逻辑与表现分离**：排序与校验在 `WaterSortEngine`、`LevelValidator` 中，不直接依赖 Cocos 节点。
- **事件驱动**：NavigationManager 发出场景/弹窗事件，RootViewSwitcher、各 Controller 监听并更新显隐与 UI。
- **单场景**：不切换场景资产，仅通过 RootViewSwitcher 切换三个 Root 的 `active`，NavigationManager 在目标与当前场景为同一 asset 时只更新 currentScene 并派发事件。

---

## 项目目录摘要

- `assets/scripts/` — 全部 TypeScript 脚本（data / logic / ui / utils）
- `assets/scene.scene` — 主场景
- `assets/resources/` — 动态加载的关卡 JSON 与美术资源

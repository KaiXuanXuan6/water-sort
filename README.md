# Water Sort（水排序）

基于 **Cocos Creator 3.8.8** 的 2D 水排序益智游戏。项目采用**单场景架构**，通过显隐 `HomeRoot` / `MapRoot` / `GameRoot` 切换页面，导航由 `NavigationManager` 统一管理。

## 核心玩法与流程

- 玩法：将试管中的彩色液体按颜色分瓶，直到每管同色或为空。
- 流程：`Home -> Map -> Game -> Result`（下一关 / 重玩 / 返回）。
- 逻辑核心：`WaterSortEngine`（与 Cocos 节点解耦）。

## 如何打开项目

1. 打开 **Cocos Creator 3.8.8**。
2. 选择本目录 `water-sort` 作为项目。
3. 主场景为 `assets/scene.scene`。

## 项目结构

```text
water-sort/
├─ assets/
│  ├─ scene.scene
│  ├─ resources/                  # 动态加载资源（关卡/瓶子/UI）
│  └─ scripts/
│     ├─ data/                    # 用户进度、配置读取
│     ├─ logic/                   # 玩法核心（WaterSortEngine）
│     ├─ services/                # 业务服务（AdService）
│     ├─ ui/                      # 场景与弹窗控制器
│     │  ├─ HomeSceneController.ts
│     │  ├─ MapSceneController.ts
│     │  ├─ GameSceneController.ts
│     │  └─ SettingPopupController.ts
│     └─ utils/                   # 导航与通用工具（NavigationManager）
├─ README.md
└─ tsconfig.json
```

## 关键目录

- `assets/scripts/`
  - `ui/`：场景与弹窗控制器（如 `HomeSceneController`、`GameSceneController`）
  - `logic/`：核心玩法逻辑（`WaterSortEngine` 等）
  - `data/`：用户进度与配置数据
  - `utils/`：导航与通用工具（`NavigationManager` 等）
  - `services/`：业务服务（如广告服务 `AdService`）
- `assets/resources/`：动态加载资源（关卡、瓶子贴图、UI 素材等）
- `assets/scene.scene`：主场景

## 架构要点

- 单场景 + Root 显隐切换，不依赖多场景跳转。
- `NavigationManager` 负责场景/弹窗事件分发。
- 玩法逻辑与 UI 表现分离，便于测试与扩展。

## 广告说明（当前状态）

- 已移除平台 SDK 绑定，当前仅保留 `AdService` 占位接口。
- 开屏占位：`showSplash()`
- 插屏占位：`showinterstitial()`
- 目前默认 no-op，不阻塞游戏流程；后续可在 `AdService` 内接入真实 SDK 实现。

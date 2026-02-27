# 背景 ScrollView 搭建说明

背景页与瓶子页结构类似，需要复制以下内容并在编辑器中完成绑定。

## 1. 已完成的代码

- **AssetLoader**：已增加 `loadBackgroundSprite(bgId)`，从 `resources/Backgrounds/{id}/spriteFrame` 加载。
- **UserProfile**：已增加 `unlockedBackgroundTypes`、`selectedBackgroundType` 及 `isBackgroundTypeUnlocked`、`getSelectedBackgroundType`、`setSelectedBackgroundType`。
- **BackgroundBlockController**：与 BottleBlock 类似，含 **bg2、锁与锁动画**；未解锁时显示 bg2；选中时对**背景图节点**播放 BouncePopAnim（无瓶子旋转）。需绑定：`blockBgNode`、`blockBg2Node`、`imageSprite`、`lockNode`、`checkboxNode`、`checkinNode`。
- **CollectionSceneController**：已增加背景网格构建与切换逻辑，需在场景中绑定：`backgroundScrollView`、`backgroundGridContainer`（与 bottleGridContainer 对应）、`backgroundBlockPrefab`、`backgroundSelectBoxNode`。显示/隐藏以 **backgroundScrollView 的父节点** 为准，无需单独绑定 Panel。

## 2. 需要你做的操作

### 2.1 复制并简化 Prefab：BackgroundBlock

1. 在 **assets/prefab** 下复制 **BottleBlock.prefab**，重命名为 **BackgroundBlock.prefab**。
2. 打开 BackgroundBlock.prefab，做如下修改：
   - **根节点**：移除 `BottleBlockController`，添加组件 **BackgroundBlockController**。
   - **保留并对应**（与 BottleBlock 一致）：一块底图、bg2、锁、背景图 Sprite、勾选：
     - 解锁时底图 → **blockBgNode**（对应 BottleBlock 的 Bg）。
     - 未解锁时底图 → **blockBg2Node**（对应 BottleBlock 的 Bg2）。
     - 用于显示“背景图”的 **Sprite 子节点** → **imageSprite**（选中时对该节点播 BouncePopAnim，无旋转）。
     - 锁节点 → **lockNode**（点击锁会播 BouncePopAnim 并移动选中框）。
     - 未勾选图标 → **checkboxNode**。
     - 勾选图标 → **checkinNode**。
   - 根节点保留 **Button** 组件；锁节点上需有 **Button** 组件。

### 2.2 复制场景结构：Background 容器

1. 在 **CollectionRoot → MainBg** 下，复制 **BottleContainer** 整节点，粘贴为同级，重命名为 **BackgroundContainer**。
2. 在 BackgroundContainer 内：
   - 保留 **ScrollView**（含 View + Content + Layout），可把节点名改为 **BackgroundScrollView** 方便辨认。
   - 保留 **Content** 的 Layout（cellSize、padding、spacing 可与瓶子一致，如 40×40、padding 12）。
   - **SelectBox**：保留或复制一个，重命名为 **BackgroundSelectBox**（或任意名），用于背景的选中框。
3. 将 **BackgroundContainer** 默认设为 **未激活**（active = false），与 Bottle 默认显示相反。

### 2.3 在 CollectionSceneController 上绑定

选中挂有 **CollectionSceneController** 的节点（CollectionRoot），在属性里绑定（与 Bottle 侧一致）：

- **backgroundScrollView** → 拖入 BackgroundContainer 下的 **ScrollView 组件所在节点**（即 BackgroundScrollView 节点）。
- **backgroundGridContainer** → 拖入该 ScrollView 的 **Content** 节点（与 bottleGridContainer 对应，通常即 backgroundScrollView.content）。
- **backgroundBlockPrefab** → 拖入 **BackgroundBlock.prefab**。
- **backgroundSelectBoxNode** → 拖入 BackgroundContainer 内的 **SelectBox** 节点（背景用选中框）。

## 3. 资源约定

- 背景图放在 **assets/resources/Backgrounds** 下，命名为 **1.png, 2.png, …**，对应 `bgId` 1、2、…；当前代码按 **32 个**背景（`BACKGROUND_TYPES_COUNT = 32`）建网格，若数量不同可在 `CollectionSceneController.ts` 中修改 `BACKGROUND_TYPES_COUNT`。

完成以上复制与绑定后，进入收集页切到 Background 标签即可看到背景网格，选中与勾选动画会与瓶子页一致。

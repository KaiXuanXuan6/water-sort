# Collection 瓶子图鉴 ScrollView 与瓶子块设计计划

## 1. 目标与范围

- **默认激活**：收集页进入时默认选中 BottleButton，显示瓶子图鉴 ScrollView（不实现其他 Tab 如成就等）。
- **瓶子块 prefab**：每个块展示一种瓶子类型（1～48），两种形态（解锁 / 未解锁），交互与视觉按下方规范实现。
- **数据**：用户档案中增加「已解锁瓶子类型」数组（默认只解锁第一种），以及「当前选中的瓶子类型」（即用户当前使用的瓶子，一次只能选中一种，持久化）。

---

## 2. 数据层

### 2.1 瓶子解锁说明（无等级配置）

- 瓶子解锁**不按关卡等级**，后续可能通过看广告、开宝箱等方式解锁，由业务逻辑调用 UserProfile 接口写入。
- **默认只解锁第一种**（bottleType 1）；无需「每种瓶子解锁所需关卡」的配置或 "Lvl.xx" 展示，无需新增 JSON 或常量表。

### 2.2 UserProfile 扩展

- **文件**：`assets/scripts/data/UserProfile.ts`
- **接口** `UserProfileData` 增加：
  - `unlockedBottleTypes: number[]` — 已解锁的瓶子类型 ID 列表，**默认 `[1]`**。
  - `selectedBottleType: number` — 当前选中的瓶子类型（用户当前使用的瓶子，一次只能一种），**默认 `1`**，持久化。
- **API 增补**（保持现有风格：get/set + 持久化）：
  - `getUnlockedBottleTypes(): number[]`
  - `setUnlockedBottleTypes(types: number[]): void` 或 `addUnlockedBottleType(typeId: number): void`
  - `isBottleTypeUnlocked(bottleType: number): boolean`
  - `getSelectedBottleType(): number`
  - `setSelectedBottleType(typeId: number): void`（选中后由收集页调用，写入并 `saveToStorage()`）
- 解锁逻辑：由广告/宝箱等后续功能调用；收集页只读并展示，选中时只更新 `selectedBottleType` 并持久化。

### 2.3 当前选中瓶子（持久化，不记录「上次」）

- **不**单独记录「上次选中的瓶子」；选中即**当前使用的瓶子**，直接持久化到 UserProfile。
- 在 `UserProfileData` 中维护 `selectedBottleType`，选中后更新并保存；收集页进入时从 UserProfile 读取并刷新各块的勾选/旋转状态。

---

## 3. 瓶子块 Prefab 结构

### 3.1 节点层级与素材

- **不**使用 Label 节点，不展示 "Lvl.xx" 等解锁条件文案。

| 层级（从底到顶） | 说明 | 素材/来源 |
|------------------|------|-----------|
| 根节点 | 瓶子块容器，挂 Button 或触摸 | 用于点击整块（解锁时） |
| bottle_bg | 背景 | resources/Collection/bottle_bg（当前项目内为 Collection 下） |
| bottle | 瓶子图 | AssetLoader.loadBottleSprite(bottleType, 1) → Bottles/${bottleType}_1 |
| mask（可选） | 仅未解锁时显示，盖在瓶子上 | 全屏半透明暗色 Sprite 或 Graphics，无图则用 Color(0,0,0,128) |
| lock | 仅未解锁时显示 | resources/Collection/lock.png |
| checkbox | 仅解锁时显示 | resources/Collection/checkbox.png 未勾选，checkin.png 勾选 |

- 层级顺序：bottle_bg → bottle → mask + lock（未解锁）→ checkbox（解锁时）。

### 3.2 交互逻辑（脚本控制）

- **已解锁**
  - 点击整块：播放「瓶子元素旋转 45°」动画，并将该块设为选中（checkbox 显示 checkin，其余块恢复未选中 + 0°）。
  - checkbox 仅在此态显示；未选中显示 checkbox，选中显示 checkin。
- **未解锁**
  - 整块带暗色遮罩；锁图标显示（无 Label 文案）。
  - 仅点击**锁图标**时：播放 BouncePopAnim（复用现有 `play()`）；整块点击可无反应或仅提示。

### 3.3 新建脚本

- **BottleBlockController**（挂到瓶子块 prefab 根上）
  - 职责：根据 `bottleType`、解锁状态、选中状态刷新子节点显隐与贴图（背景、瓶子、mask、lock、checkbox/checkin）；处理点击（整块 / 锁）并调用动画与选中回调。
  - 入参：`bottleType: number`、`isUnlocked: boolean`（由调用方从 UserProfile 传入）。
  - 对外：通过回调或事件通知「选中该类型」或「点击了锁」，由 CollectionSceneController 更新 UserProfile.selectedBottleType 并刷新所有块。

---

## 4. ScrollView 与网格布局

### 4.1 场景结构（CollectionRoot 下）

- 已有/需有的节点关系建议：
  - **BottleButton**：默认激活的 Tab（SemiCircleButton 或同类），点击时切换为「瓶子图鉴」内容。
  - **ScrollView**：内容为「瓶子块网格」。
    - ScrollView 的 **Content** 节点：作为 Layout 的容器。
    - Content 下：**仅放动态生成的瓶子块实例**（由 prefab 实例化），不手摆静态块。
  - **SelectBox**：一个节点（Sprite，图 `Collection/select_box`），与 Content 同父或同层级，用于框选当前选中的瓶子块；由 CollectionSceneController 控制显隐与 tween 位置（见 4.4）。

### 4.2 每行 3 个的实现

- **方案 A（推荐）**：Content 上挂 **Layout**
  - Type = **GRID**（若引擎支持），Column = 3，Cell Size = 瓶子块固定宽高，Spacing 按需；Resize Mode = CONTAINER，由 Layout 自动排布子节点。
- **方案 B**：无 GRID 时，用 **VERTICAL** Layout + 每行一个子节点，每行子节点再挂 **HORIZONTAL** Layout，每行 3 个瓶子块（需在代码里按行分组添加子节点）。

参考：MapSceneController 的 `levelListContainer` + 动态 `createLevelButton`；此处改为 `instantiate(bottleBlockPrefab)` 并设置 BottleBlockController 的 `bottleType` / `isUnlocked`，再 `content.addChild(block)`。

### 4.3 CollectionSceneController 职责扩展

- 在 `CollectionSceneController` 中：
  - 绑定：ScrollView、Content 节点（或 ScrollView.content）、瓶子块 **Prefab**（`Prefab` 类型）、**SelectBox** 节点（Sprite，`Collection/select_box`）。
  - 从 `UserProfile.getUnlockedBottleTypes()` / `isBottleTypeUnlocked()` 与 `getSelectedBottleType()` 读取数据；遍历 1～48，对每个类型 `instantiate` prefab，设置 BottleBlockController 的 `bottleType`、`isUnlocked`、是否选中（与 `getSelectedBottleType()` 比较），加入 Content；记录每个 bottleType 对应的块节点，便于 select_box 定位。
  - 监听 BottleBlock 的「选中」回调：调用 `UserProfile.setSelectedBottleType(typeId)` 并 `saveToStorage()`，再刷新所有块的选中/未选中（旋转与 checkbox/checkin）；并更新 **select_box**：首次选中时在对应块上显示 SelectBox，之后选中其他块时用 tween 将 SelectBox 从当前块位置移动到新块位置。

### 4.4 选中框（select_box）与 tween 移动

- **素材**：`assets/resources/Collection/select_box` — 竖向圆角渐变框，用于框选当前选中的瓶子块。
- **表现**：
  - **第一次点击**某块（且已解锁）时：在**被点击的块上**显示 select_box（框出现在该块位置）。
  - **之后点击其他块**时：不消失重显，而是把 select_box **tween 移动**到新选中的块上（位置从当前块平移到目标块）。
- **实现要点**：
  - 场景中一个 **SelectBox** 节点（Sprite，图 `Collection/select_box`），与 Content 同父或放在 ScrollView 内合适层级，初始可隐藏或置于默认选中块位置。
  - CollectionSceneController 持有该 SelectBox 节点引用及「当前选中的块节点」；当选中回调触发时：若此前无框（首次），则显示 SelectBox 并设位置为目标块；若此前已有框，则 tween SelectBox 的 position 从当前块位置到目标块位置（同一父节点下用本地坐标，duration 与 easing 按需）。
  - SelectBox 的尺寸需能套住单个瓶子块（与瓶子块大小匹配或略大），保证框选视觉效果。
- **层级**：SelectBox 与 Content 平级或置于 Content 之上（以便盖在块上方），不参与 Layout 排版，随选中块变化只改 position。

---

## 5. 资源与配置清单

| 资源 | 路径 | 用途 |
|------|------|------|
| 瓶子块背景 | Collection/bottle_bg | 块背景 |
| 瓶子图 | Bottles/{bottleType}_1 | 块内瓶子元素 |
| 锁 | Collection/lock.png | 未解锁时锁图标 |
| 勾选前 | Collection/checkbox.png | 解锁时未选中 |
| 勾选后 | Collection/checkin.png | 解锁且选中 |
| 选中框 | Collection/select_box.png | 框选当前选中块，首次出现后随点击 tween 移动到新块 |

---

## 6. 实现顺序建议

1. **数据**：扩展 UserProfile 的 `unlockedBottleTypes`（默认 `[1]`）、`selectedBottleType`（默认 `1`）及 get/set/isUnlocked；选中时写入 `setSelectedBottleType` 并持久化。
2. **Prefab**：在编辑器中搭好瓶子块层级（bottle_bg → bottle → mask → lock → checkbox，无 Label）；做成 Prefab，新建 BottleBlockController 挂到 prefab 根上，实现显隐、贴图、旋转 45° 动画、锁点击 BouncePopAnim、选中回调。
3. **场景**：CollectionRoot 下确保 BottleButton 默认激活、ScrollView 的 Content 挂 Layout（每行 3 列），SelectBox 节点（select_box 图）与 Content 同层级；CollectionSceneController 绑定 ScrollView、Content、BottleBlock Prefab、SelectBox，在 onLoad/start 中根据 1～48 与 UserProfile 生成块并注入数据与回调，选中后更新 UserProfile、刷新所有块，并驱动 select_box 首次出现及 tween 移动到当前选中块。

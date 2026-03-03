import { _decorator, Component, Node, Button, ScrollView, Label, UITransform, Prefab, instantiate, Vec3, tween } from 'cc';
import { NavigationManager, NavigationEvent } from '../utils/NavigationManager';
import { SoundManager } from '../utils/SoundManager';
import { LevelConfig } from '../data/LevelConfig';
import { loadFromStorage, getCurrentLevel, getUnlockedLevel, setCurrentLevel, setUnlockedLevel, saveToStorage } from '../data/UserProfile';
import { LevelItemController } from './LevelItemController';
import { GlobalBackgroundController } from './GlobalBackgroundController';

const { ccclass, property } = _decorator;

/**
 * 关卡按钮数据
 */
interface LevelButtonData {
    levelId: string;
    levelNum: number;
    isUnlocked: boolean;
    isCompleted: boolean;
    stars: number;
}

/**
 * 路径上的点坐标（相对于 levelListContainer），顺序为 [x1, y1, x2, y2, ...]，与关卡 1、2、3… 一一对应。
 */
const DEFAULT_PATH_POSITIONS = [
    10, -240,   // 1 右下
    -150, -120,   // 2
    150, 0,   // 3
    0, 80,   // 4
    -140, 150   // 5
];
const LEVELS_PER_GROUP = 5;
const DYNAMIC_MAP_GROUP_PREFIX = 'MapPathGroup_';

/**
 * 地图页控制器
 */
@ccclass('MapSceneController')
export class MapSceneController extends Component {
    // UI 组件绑定
    @property(ScrollView)
    levelScrollView: ScrollView | null = null;

    @property({ tooltip: '关卡节点父节点，绑定到 MapPath 节点即可沿路径排列' })
    levelListContainer: Node | null = null;

    @property(Prefab)
    levelItemPrefab: Prefab | null = null;

    private _navManager: NavigationManager | null = null;
    private _currentLevel: number = 1;
    private _unlockedLevel: number = 1;
    private _initialContentHeight: number = 0;
    private _baseMapOriginPos: { x: number; y: number; z: number } | null = null;

    /**
     * 组件生命周期：加载
     */
    protected onLoad(): void {
        console.log('[MapSceneController] 场景加载完成');

        this._navManager = NavigationManager.instance;

        if (!this._navManager) {
            console.error('[MapSceneController] 未找到导航管理器');
            return;
        }

        // 加载用户数据
        this.loadUserData();

        if (!this.levelListContainer && this.levelScrollView?.content) {
            this.levelListContainer = this.levelScrollView.content;
        }
        const contentTransform = this.levelScrollView?.content?.getComponent(UITransform);
        if (contentTransform) {
            this._initialContentHeight = contentTransform.height;
        }

        // 生成关卡列表
        this.generateLevelList();

        // 监听导航事件
        this.setupNavigationListeners();

        GlobalBackgroundController.instance?.refresh();
    }

    /**
     * 组件生命周期：启动
     */
    protected start(): void {
        console.log('[MapSceneController] 场景启动');
    }

    /**
     * 每次地图页被显示时（含从游戏页返回）重新拉取进度并刷新关卡按钮的「当前」态
     */
    protected onEnable(): void {
        if (!this.levelListContainer) return;
        this.loadUserData();
        this.refreshAllLevelItemStates();
        this.scheduleOnce(() => this.smoothScrollToCurrentLevel(), 0);
    }

    /**
     * 组件生命周期：销毁
     */
    protected onDestroy(): void {
        if (this._navManager) {
            this._navManager.removeListener(NavigationEvent.SCENE_LOAD_START, this.onSceneLoadStart);
        }
    }

    /**
     * 设置导航事件监听
     */
    private setupNavigationListeners(): void {
        if (this._navManager) {
            this._navManager.addListener(NavigationEvent.SCENE_LOAD_START, this.onSceneLoadStart);
        }
    }

    /**
     * 加载用户数据（来自 UserProfile，含 localStorage 持久化）
     */
    private loadUserData(): void {
        loadFromStorage();
        this._unlockedLevel = getUnlockedLevel();
        if (this._unlockedLevel < 1) {
            setUnlockedLevel(1);
            this._unlockedLevel = 1;
            saveToStorage();
        }
        this._currentLevel = getCurrentLevel();
        console.log(`[MapSceneController] 已解锁关卡: ${this._unlockedLevel}, 当前关卡: ${this._currentLevel}`);
    }

    /**
     * 生成关卡列表
     */
    private generateLevelList(): void {
        if (!this.levelListContainer) {
            console.warn('[MapSceneController] 关卡列表容器未设置');
            return;
        }
        const groupContext = this.prepareMapGroupContext();
        const totalLevels = Math.max(1, LevelConfig.getTotalLevels());
        const totalGroups = Math.max(1, Math.ceil(totalLevels / LEVELS_PER_GROUP));
        const groupPathPointCount = this.getGroupPathPointCount();
        if (groupPathPointCount < LEVELS_PER_GROUP) {
            console.warn(`[MapSceneController] 当前路径点只有 ${groupPathPointCount} 个，将按可用点位生成`);
        }

        const baseStartY = (this._baseMapOriginPos?.y ?? 0) - ((totalGroups - 1) * groupContext.mapGroupHeight) / 2;
        groupContext.baseMapGroupNode.setPosition(groupContext.basePosX, baseStartY, groupContext.basePosZ);
        const generatedCount = this.spawnLevelButtons(totalLevels, groupPathPointCount, groupContext, baseStartY);

        this.updateContentHeight(totalGroups, groupContext.mapGroupHeight);
        console.log(`[MapSceneController] 生成了 ${generatedCount} 个关卡按钮`);
        this.scheduleOnce(() => this.smoothScrollToCurrentLevel(), 0);
        groupContext.mapGroupTemplate.destroy();
    }

    private refreshAllLevelItemStates(): void {
        if (!this.levelListContainer) return;
        this.traverseNodes(this.levelListContainer, (node) => {
            if (!node.name.startsWith('Level_')) return;
            const levelNum = parseInt(node.name.replace('Level_', ''), 10) || 1;
            const isUnlocked = levelNum <= this._unlockedLevel;

            const ctrl = node.getComponent(LevelItemController);
            if (ctrl) {
                ctrl.setData(
                    { levelNum, isUnlocked },
                    this._currentLevel
                );
            }

            const btn = node.getComponent(Button);
            if (btn) {
                btn.interactable = isUnlocked;
            }
        });
    }

    private prepareMapGroupContext(): {
        baseMapGroupNode: Node;
        mapGroupParent: Node;
        mapGroupHeight: number;
        mapGroupTemplate: Node;
        basePosX: number;
        basePosZ: number;
    } {
        const baseMapGroupNode = this.findBaseMapGroupNode();
        const mapGroupParent = baseMapGroupNode.parent ?? this.levelListContainer!;
        const mapGroupHeight = Math.max(1, baseMapGroupNode.getComponent(UITransform)?.height ?? 0);
        if (!this._baseMapOriginPos) {
            const p = baseMapGroupNode.position;
            this._baseMapOriginPos = { x: p.x, y: p.y, z: p.z };
        }

        this.clearDynamicMapGroups(mapGroupParent);
        this.clearLevelButtons(baseMapGroupNode);

        // 使用“无关卡按钮”的干净模板做克隆，避免 1~5 被复制到后续分组导致重叠态。
        const mapGroupTemplate = instantiate(baseMapGroupNode);
        this.clearLevelButtons(mapGroupTemplate);

        return {
            baseMapGroupNode,
            mapGroupParent,
            mapGroupHeight,
            mapGroupTemplate,
            basePosX: this._baseMapOriginPos?.x ?? baseMapGroupNode.position.x,
            basePosZ: this._baseMapOriginPos?.z ?? baseMapGroupNode.position.z
        };
    }

    private getGroupPathPointCount(): number {
        const pathPointCount = Math.floor(DEFAULT_PATH_POSITIONS.length / 2);
        return Math.min(LEVELS_PER_GROUP, pathPointCount);
    }

    private spawnLevelButtons(
        totalLevels: number,
        groupPathPointCount: number,
        groupContext: {
            baseMapGroupNode: Node;
            mapGroupParent: Node;
            mapGroupHeight: number;
            mapGroupTemplate: Node;
            basePosX: number;
            basePosZ: number;
        },
        baseStartY: number
    ): number {
        const groupNodeMap = new Map<number, Node>();
        groupNodeMap.set(0, groupContext.baseMapGroupNode);
        let generatedCount = 0;

        for (let i = 1; i <= totalLevels; i++) {
            const groupIndex = Math.floor((i - 1) / LEVELS_PER_GROUP);
            const localIndex = (i - 1) % LEVELS_PER_GROUP;
            if (localIndex >= groupPathPointCount) continue;

            const levelData: LevelButtonData = this.createLevelData(i);
            const levelButton = this.createLevelButton(levelData);
            if (!levelButton) continue;

            const groupNode = this.getOrCreateGroupNode(groupIndex, baseStartY, groupContext, groupNodeMap);
            const levelParent = groupNode.getChildByName('LevelContainer') ?? groupNode;
            const idx = localIndex * 2;
            levelButton.setPosition(DEFAULT_PATH_POSITIONS[idx], DEFAULT_PATH_POSITIONS[idx + 1], 0);
            levelParent.addChild(levelButton);
            generatedCount++;
        }

        return generatedCount;
    }

    private createLevelData(levelNum: number): LevelButtonData {
        return {
            levelId: LevelConfig.levelNumToLevelId(levelNum),
            levelNum,
            isUnlocked: levelNum <= this._unlockedLevel,
            isCompleted: levelNum < this._unlockedLevel,
            stars: levelNum < this._unlockedLevel ? 3 : 0
        };
    }

    private getOrCreateGroupNode(
        groupIndex: number,
        baseStartY: number,
        groupContext: {
            baseMapGroupNode: Node;
            mapGroupParent: Node;
            mapGroupHeight: number;
            mapGroupTemplate: Node;
            basePosX: number;
            basePosZ: number;
        },
        groupNodeMap: Map<number, Node>
    ): Node {
        const existed = groupNodeMap.get(groupIndex);
        if (existed) {
            return existed;
        }
        const groupNode = instantiate(groupContext.mapGroupTemplate);
        groupNode.name = `${DYNAMIC_MAP_GROUP_PREFIX}${groupIndex + 1}`;
        groupNode.setPosition(
            groupContext.basePosX,
            baseStartY + groupContext.mapGroupHeight * groupIndex,
            groupContext.basePosZ
        );
        groupContext.mapGroupParent.addChild(groupNode);
        groupNodeMap.set(groupIndex, groupNode);
        return groupNode;
    }

    /**
     * 获取基础路线图节点（第 1 组），后续组通过克隆它向上拼接。
     */
    private findBaseMapGroupNode(): Node {
        if (!this.levelListContainer) {
            return this.node;
        }
        const directLevelContainer = this.levelListContainer.getChildByName('LevelContainer');
        if (directLevelContainer) {
            return directLevelContainer;
        }
        for (const child of this.levelListContainer.children) {
            if (child.getChildByName('LevelContainer')) {
                return child;
            }
        }
        return this.levelListContainer;
    }

    /**
     * 清理动态克隆的路线图组。
     */
    private clearDynamicMapGroups(parent: Node): void {
        const toRemove: Node[] = [];
        parent.children.forEach((child) => {
            if (child.name.startsWith(DYNAMIC_MAP_GROUP_PREFIX)) {
                toRemove.push(child);
            }
        });
        toRemove.forEach((child) => child.removeFromParent());
    }

    /**
     * 清理指定节点及子树内生成的关卡按钮。
     */
    private clearLevelButtons(root: Node): void {
        const toRemove: Node[] = [];
        this.traverseNodes(root, (node) => {
            if (node.name.startsWith('Level_')) {
                toRemove.push(node);
            }
        });
        toRemove.forEach((node) => node.removeFromParent());
    }

    /**
     * 根据路线图组数量扩展 ScrollView content 高度，确保可滚动查看上方拼接组。
     */
    private updateContentHeight(totalGroups: number, mapGroupHeight: number): void {
        const content = this.levelScrollView?.content;
        const contentTransform = content?.getComponent(UITransform);
        if (!contentTransform) {
            return;
        }
        if (this._initialContentHeight <= 0) {
            this._initialContentHeight = contentTransform.height;
        }
        const targetHeight = Math.max(this._initialContentHeight, Math.ceil(mapGroupHeight * totalGroups));
        contentTransform.setContentSize(contentTransform.width, targetHeight);
    }

    /**
     * 自动平滑滚动到当前关卡（使当前关卡尽量靠近视口中心）。
     */
    private smoothScrollToCurrentLevel(duration: number = 0.35): void {
        const scrollView = this.levelScrollView;
        const content = scrollView?.content;
        if (!scrollView || !content || !this.levelListContainer) {
            return;
        }

        const targetLevelNode = this.findNodeByName(this.levelListContainer, `Level_${this._currentLevel}`);
        if (!targetLevelNode) {
            return;
        }

        const contentParent = content.parent;
        const contentParentTransform = contentParent?.getComponent(UITransform);
        const contentTransform = content.getComponent(UITransform);
        const viewTransform = scrollView.node.getComponent(UITransform);
        const levelTransform = targetLevelNode.getComponent(UITransform);
        if (!contentParent || !contentParentTransform || !contentTransform || !viewTransform || !levelTransform) {
            return;
        }

        const levelWorldPos = levelTransform.convertToWorldSpaceAR(new Vec3(0, 0, 0));
        const viewWorldCenter = viewTransform.convertToWorldSpaceAR(new Vec3(0, 0, 0));
        const levelInParent = contentParentTransform.convertToNodeSpaceAR(levelWorldPos);
        const viewCenterInParent = contentParentTransform.convertToNodeSpaceAR(viewWorldCenter);

        const deltaY = levelInParent.y - viewCenterInParent.y;
        const currentPos = content.position;
        let targetY = currentPos.y - deltaY;

        const contentHeight = contentTransform.height;
        const viewHeight = viewTransform.height;
        const contentAnchorY = contentTransform.anchorY;
        const viewAnchorY = viewTransform.anchorY;
        const minY = (1 - viewAnchorY) * viewHeight - (1 - contentAnchorY) * contentHeight;
        const maxY = -viewAnchorY * viewHeight + contentAnchorY * contentHeight;
        targetY = Math.max(minY, Math.min(maxY, targetY));

        scrollView.stopAutoScroll();
        tween(content)
            .to(duration, { position: new Vec3(currentPos.x, targetY, currentPos.z) }, { easing: 'quadOut' })
            .start();
    }

    private findNodeByName(root: Node, name: string): Node | null {
        let target: Node | null = null;
        this.traverseNodes(root, (node) => {
            if (!target && node.name === name) {
                target = node;
            }
        });
        return target;
    }

    private traverseNodes(root: Node, visitor: (node: Node) => void): void {
        const stack: Node[] = [root];
        while (stack.length > 0) {
            const current = stack.pop()!;
            visitor(current);
            for (const child of current.children) {
                stack.push(child);
            }
        }
    }

    /**
     * 创建单个关卡按钮（有预制体时实例化并设置三态；无预制体时动态创建 Button + Label）
     */
    private createLevelButton(data: LevelButtonData): Node | null {
        if (this.levelItemPrefab) {
            const btnNode = instantiate(this.levelItemPrefab);
            btnNode.name = `Level_${data.levelNum}`;
            let ctrl = btnNode.getComponent(LevelItemController);
            if (!ctrl) {
                ctrl = btnNode.addComponent(LevelItemController);
            }
            ctrl.setData(
                { levelNum: data.levelNum, isUnlocked: data.isUnlocked },
                this._currentLevel
            );
            const btn = btnNode.getComponent(Button);
            if (btn) {
                btn.node.on(Button.EventType.CLICK, () => this.onLevelClick(data), this);
                btn.interactable = data.isUnlocked;
            }
            return btnNode;
        }

        const btnNode = new Node(`Level_${data.levelNum}`);
        const transform = btnNode.addComponent(UITransform);
        transform.setContentSize(80, 80);
        const btn = btnNode.addComponent(Button);

        const labelNode = new Node('Label');
        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(80, 40);
        const label = labelNode.addComponent(Label);
        label.string = String(data.levelNum);
        labelNode.setPosition(0, 0, 0);
        btnNode.addChild(labelNode);

        btn.node.on(Button.EventType.CLICK, () => this.onLevelClick(data), this);

        return btnNode;
    }

    /**
     * 关卡按钮点击
     */
    private onLevelClick(levelData: LevelButtonData): void {
        SoundManager.instance?.playOneShot('button');
        console.log(`[MapSceneController] 点击关卡: ${levelData.levelNum}`);
        this.loadUserData();

        const isUnlockedNow = levelData.levelNum <= this._unlockedLevel;
        if (!isUnlockedNow) {
            console.log('[MapSceneController] 关卡未解锁');
            return;
        }

        setCurrentLevel(levelData.levelNum);
        this._currentLevel = levelData.levelNum;
        this._navManager?.gotoGame(levelData.levelId);
    }

    /**
     * 场景加载开始事件处理
     */
    private onSceneLoadStart = (data: any): void => {
        console.log('[MapSceneController] 场景加载开始:', data.sceneName);
    };

    /**
     * 获取已解锁关卡数
     */
    public get unlockedLevel(): number {
        return this._unlockedLevel;
    }

    /**
     * 刷新关卡列表
     * 用于在游戏完成后更新进度
     */
    public refreshLevelList(): void {
        this.loadUserData();
        this.generateLevelList();
    }
}

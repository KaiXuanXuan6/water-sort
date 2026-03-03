import { _decorator, Component, Node, Button, ScrollView, Label, UITransform, Prefab, instantiate } from 'cc';
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
    30, -240,   // 1 右下
    -150, -140,   // 2
    150, 0,   // 3
    0, 80,   // 4
    -145, 160,   // 5
    140, 260      // 6
];

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
    private _levelButtons: LevelButtonData[] = [];
    private _currentLevel: number = 1;
    private _unlockedLevel: number = 1;

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
        this.levelListContainer.children.forEach((node) => {
            if (!node.name.startsWith('Level_')) return;
            const ctrl = node.getComponent(LevelItemController);
            if (!ctrl) return;
            const levelNum = parseInt(node.name.replace('Level_', ''), 10) || 1;
            ctrl.setData(
                { levelNum, isUnlocked: levelNum <= this._unlockedLevel },
                this._currentLevel
            );
        });
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
        this._levelButtons = [];

        // 只移除之前生成的关卡节点（保留 LevelContainer 等），避免 removeAllChildren 误删
        const toRemove: Node[] = [];
        this.levelListContainer.children.forEach((c) => {
            if (c.name.startsWith('Level_')) toRemove.push(c);
        });
        toRemove.forEach((c) => c.removeFromParent());

        const totalLevels = Math.max(1, LevelConfig.getTotalLevels());
        const pathPoints = DEFAULT_PATH_POSITIONS;
        const pathPointCount = Math.floor(pathPoints.length / 2);
        const visibleLevels = Math.min(totalLevels, pathPointCount);

        for (let i = 1; i <= visibleLevels; i++) {
            const levelData: LevelButtonData = {
                levelId: LevelConfig.levelNumToLevelId(i),
                levelNum: i,
                isUnlocked: i <= this._unlockedLevel,
                isCompleted: i < this._unlockedLevel,
                stars: i < this._unlockedLevel ? 3 : 0
            };

            this._levelButtons.push(levelData);

            const levelButton = this.createLevelButton(levelData);
            if (levelButton) {
                const idx = (i - 1) * 2;
                levelButton.setPosition(pathPoints[idx], pathPoints[idx + 1], 0);
                this.levelListContainer.addChild(levelButton);
            }
        }

        if (visibleLevels < totalLevels) {
            console.warn(`[MapSceneController] 路径点不足，仅显示前 ${visibleLevels}/${totalLevels} 关`);
        }
        console.log(`[MapSceneController] 生成了 ${visibleLevels} 个关卡按钮`);
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

        if (!levelData.isUnlocked) {
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
        this._levelButtons = [];
        this.loadUserData();
        this.generateLevelList();
    }
}

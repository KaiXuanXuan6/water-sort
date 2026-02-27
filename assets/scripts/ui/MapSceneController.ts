import { _decorator, Component, Node, Button, ScrollView, Label, UITransform, Prefab, instantiate } from 'cc';
import { NavigationManager, NavigationEvent } from '../utils/NavigationManager';
import { LevelConfig } from '../data/LevelConfig';
import { loadFromStorage, getUnlockedLevel, setUnlockedLevel, saveToStorage } from '../data/UserProfile';
import { LevelItemController } from './LevelItemController';

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
 * 地图页控制器
 * 负责关卡列表、进度显示和关卡选择
 */
@ccclass('MapSceneController')
export class MapSceneController extends Component {
    // UI 组件绑定
    @property(ScrollView)
    levelScrollView: ScrollView | null = null;

    @property(Node)
    levelListContainer: Node | null = null;

    @property(Prefab)
    levelItemPrefab: Prefab | null = null;

    @property({ tooltip: '无预制体时关卡按钮间距' })
    levelButtonSpacing: number = 90;

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

        // 生成关卡列表
        this.generateLevelList();

        // 监听导航事件
        this.setupNavigationListeners();
    }

    /**
     * 组件生命周期：启动
     */
    protected start(): void {
        console.log('[MapSceneController] 场景启动');
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
        console.log(`[MapSceneController] 已解锁关卡: ${this._unlockedLevel}`);
    }

    /**
     * 生成关卡列表
     */
    private generateLevelList(): void {
        if (!this.levelListContainer) {
            console.warn('[MapSceneController] 关卡列表容器未设置');
            return;
        }

        // 清空现有列表
        this.levelListContainer.removeAllChildren();

        // 生成关卡按钮（先做 1～10 关，与 level_001 等对齐）
        const totalLevels = 10;

        for (let i = 1; i <= totalLevels; i++) {
            const levelData: LevelButtonData = {
                levelId: LevelConfig.levelNumToLevelId(i),
                levelNum: i,
                isUnlocked: i <= this._unlockedLevel,
                isCompleted: i < this._unlockedLevel,
                stars: i < this._unlockedLevel ? 3 : 0
            };

            this._levelButtons.push(levelData);

            // 创建关卡按钮节点
            const levelButton = this.createLevelButton(levelData);
            if (levelButton) {
                const col = (i - 1) % 5;
                const row = Math.floor((i - 1) / 5);
                levelButton.setPosition(col * this.levelButtonSpacing, -row * this.levelButtonSpacing, 0);
                this.levelListContainer.addChild(levelButton);
            }
        }

        console.log(`[MapSceneController] 生成了 ${totalLevels} 个关卡按钮`);
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
                this._unlockedLevel
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
        console.log(`[MapSceneController] 点击关卡: ${levelData.levelNum}`);

        if (!levelData.isUnlocked) {
            console.log('[MapSceneController] 关卡未解锁');
            return;
        }

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

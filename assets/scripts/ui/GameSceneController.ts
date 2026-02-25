import { _decorator, Component, Node, Button } from 'cc';
import { NavigationManager, NavigationEvent, PopupName } from '../utils/NavigationManager';
import { LevelData, LevelConfig } from '../data/LevelConfig';
import { loadLevelFromResources } from '../data/LevelDataLoader';
import { ResultPayload } from '../data/ResultPayload';
import { setUnlockedLevel, setLevelStars, saveToStorage } from '../data/UserProfile';
import { WaterSortEngine } from '../logic/WaterSortEngine';
import { BottleManager } from '../utils/BottleManager';
import { BottleComponent, BottleStateEnum } from './BottleComponent';
import { ResultPopupController } from './ResultPopupController';

const { ccclass, property } = _decorator;

/**
 * 玩法状态（一局游戏内的状态；应用级场景由 NavigationManager.currentScene 表示）
 */
export enum PlayState {
    IDLE = 'idle',
    SELECTED = 'selected',
    POURING = 'pouring',
    PAUSED = 'paused',
    FINISHED = 'finished'
}

/**
 * 游戏页控制器
 * 负责核心游戏玩法、顶部进度、道具栏
 */
@ccclass('GameSceneController')
export class GameSceneController extends Component {
    // UI 组件绑定
    @property(Button)
    undoButton: Button | null = null;

    @property(Button)
    replayButton: Button | null = null;

    @property(Button)
    addTubeButton: Button | null = null;

    @property(Node)
    progressBar: Node | null = null;

    @property(Node)
    bottleContainer: Node | null = null;

    @property(BottleManager)
    bottleManager: BottleManager | null = null;

    @property(Node)
    propBar: Node | null = null;

    // 弹窗节点
    @property(Node)
    resultPopup: Node | null = null;

    private _navManager: NavigationManager | null = null;
    private _engine: WaterSortEngine = new WaterSortEngine();
    private _currentLevelData: LevelData | null = null;
    private _currentLevelId: string = '';
    private _playState: PlayState = PlayState.IDLE;
    private _selectedBottleIndex: number = -1;
    private _moveCount: number = 0;
    private _maxMoves: number = -1;

    /**
     * 组件生命周期：加载
     */
    protected onLoad(): void {
        console.log('[GameSceneController] 场景加载完成');

        this._navManager = NavigationManager.instance;

        if (!this._navManager) {
            console.error('[GameSceneController] 未找到导航管理器');
            return;
        }

        // 绑定事件
        this.bindEvents();

        this._currentLevelId = this._navManager?.selectedLevelId || '';
        // 监听导航事件
        this.setupNavigationListeners();
    }

    /**
     * 组件生命周期：启动
     */
    protected start(): void {
        console.log('[GameSceneController] 场景启动');
        this.runGame().catch((err) => console.error('[GameSceneController] runGame 失败', err));
    }

    /**
     * 先加载关卡再初始化游戏（关卡从 resources JSON 加载，单一数据源）
     */
    private async runGame(): Promise<void> {
        if (!this._currentLevelId) {
            console.error('[GameSceneController] 未获取到关卡ID');
            return;
        }
        await this.loadLevelData();
        await this.initGame();
    }

    /**
     * 组件生命周期：销毁
     */
    protected onDestroy(): void {
        if (this._navManager) {
            this._navManager.removeListener(NavigationEvent.SCENE_LOAD_START, this.onSceneLoadStart);
            this._navManager.removeListener(NavigationEvent.POPUP_OPEN, this.onPopupOpen);
            this._navManager.removeListener(NavigationEvent.POPUP_CLOSE, this.onPopupClose);
        }
    }

    /**
     * 绑定按钮事件
     */
    private bindEvents(): void {
        if (this.undoButton) {
            this.undoButton.node.on(Button.EventType.CLICK, this.onUndoClick, this);
        }

        if (this.replayButton) {
            this.replayButton.node.on(Button.EventType.CLICK, this.onReplayClick, this);
        }

        if (this.addTubeButton) {
            this.addTubeButton.node.on(Button.EventType.CLICK, this.onAddTubeClick, this);
        }
    }

    /**
     * 设置导航事件监听
     */
    private setupNavigationListeners(): void {
        if (this._navManager) {
            this._navManager.addListener(NavigationEvent.SCENE_LOAD_START, this.onSceneLoadStart);
            this._navManager.addListener(NavigationEvent.POPUP_OPEN, this.onPopupOpen);
            this._navManager.addListener(NavigationEvent.POPUP_CLOSE, this.onPopupClose);
        }
    }

    /**
     * 从 resources 加载关卡 JSON（单一数据源，符合 DRY）；失败则使用模拟数据
     */
    private async loadLevelData(): Promise<void> {
        console.log(`[GameSceneController] 加载关卡: ${this._currentLevelId}`);

        const data = await loadLevelFromResources(this._currentLevelId);
        if (data) {
            this._currentLevelData = data;
            this._maxMoves = data.maxMoves;
            this._engine.loadLevel(data);
            return;
        }

        this._currentLevelData = this.createMockLevelData(this._currentLevelId);
        this._maxMoves = this._currentLevelData.maxMoves;
        this._engine.loadLevel(this._currentLevelData);
    }

    /**
     * 创建模拟关卡数据（仅用于开发测试）
     */
    private createMockLevelData(levelId: string): LevelData {
        return {
            id: levelId,
            level: LevelConfig.levelIdToLevelNum(levelId),
            bottles: [],
            maxMoves: 20,
            difficulty: 'easy'
        };
    }

    /**
     * 初始化游戏
     */
    private async initGame(): Promise<void> {
        console.log('[GameSceneController] 初始化游戏');

        this._playState = PlayState.IDLE;
        this._selectedBottleIndex = -1;
        this._engine.reset();
        this._moveCount = this._engine.moveCount;

        await this.generateBottles();
        this.updateProgressBar();
        this.updatePropButtons();
    }

    /**
     * 生成瓶子（使用 BottleManager 时异步创建并绑定点击）
     */
    private async generateBottles(): Promise<void> {
        if (!this._currentLevelData) {
            return;
        }

        const manager = this.bottleManager ?? this.node.getComponentInChildren(BottleManager);
        if (manager && this._currentLevelData.bottles.length > 0) {
            await manager.createBottles(this._currentLevelData.bottles);
            this.bindBottleClickListeners(manager);
            console.log(`[GameSceneController] 生成 ${this._currentLevelData.bottles.length} 个瓶子`);
            return;
        }

        if (this.bottleContainer) {
            this.bottleContainer.removeAllChildren();
        }
        console.warn('[GameSceneController] 未找到 BottleManager 或关卡无瓶子');
    }

    /**
     * 为 BottleManager 中的每个瓶子绑定点击事件
     */
    private bindBottleClickListeners(manager: BottleManager): void {
        for (let i = 0; i < manager.bottleCount; i++) {
            const node = manager.getBottle(i);
            if (node) {
                node.on(BottleComponent.EVENT_BOTTLE_CLICK, (data: { bottleIndex: number }) => {
                    this.onBottleClick(data.bottleIndex);
                }, this);
            }
        }
    }

    /**
     * 更新进度条
     */
    private updateProgressBar(): void {
        if (!this.progressBar) {
            return;
        }

        // TODO: 实现进度条更新逻辑
        const progress = this._maxMoves > 0 ? this._moveCount / this._maxMoves : 0;
        console.log(`[GameSceneController] 进度: ${progress}`);
    }

    /**
     * 更新道具按钮状态
     */
    private updatePropButtons(): void {
        // TODO: 根据道具数量更新按钮状态
        // 例如：没有撤销次数时禁用撤销按钮
    }

    /**
     * 瓶子点击处理
     */
    public onBottleClick(bottleIndex: number): void {
        console.log(`[GameSceneController] 点击瓶子: ${bottleIndex}`);

        if (this._playState === PlayState.FINISHED || this._playState === PlayState.PAUSED) {
            return;
        }

        const manager = this.bottleManager ?? this.node.getComponentInChildren(BottleManager);

        if (this._selectedBottleIndex === -1) {
            this._selectedBottleIndex = bottleIndex;
            this._playState = PlayState.SELECTED;
            manager?.getBottleComponent(bottleIndex)?.setState(BottleStateEnum.SELECTED);
            console.log(`[GameSceneController] 选中瓶子: ${bottleIndex}`);
        } else if (this._selectedBottleIndex === bottleIndex) {
            this._selectedBottleIndex = -1;
            this._playState = PlayState.IDLE;
            manager?.getBottleComponent(bottleIndex)?.setState(BottleStateEnum.IDLE);
            console.log('[GameSceneController] 取消选中');
        } else {
            // 点击不同瓶子：尝试倒水
            this.tryPourWater(this._selectedBottleIndex, bottleIndex);
        }
    }

    /**
     * 尝试倒水
     */
    private tryPourWater(fromIndex: number, toIndex: number): void {
        console.log(`[GameSceneController] 尝试从瓶子 ${fromIndex} 倒到瓶子 ${toIndex}`);

        const validation = this._engine.canMove(fromIndex, toIndex);
        if (!validation.can) {
            console.log('[GameSceneController] 无法倒水:', validation.reason);
            this._selectedBottleIndex = -1;
            this._playState = PlayState.IDLE;
            return;
        }

        const result = this._engine.executeMove(fromIndex, toIndex);
        if (result.success) {
            this._moveCount = this._engine.moveCount;
            this.syncBottlesFromEngine();
            this.updateProgressBar();
            this.checkWin();
            if (this._playState !== PlayState.FINISHED) {
                this.checkDefeat();
            }
        }

        const manager = this.bottleManager ?? this.node.getComponentInChildren(BottleManager);
        manager?.getBottleComponent(fromIndex)?.setState(BottleStateEnum.IDLE);
        this._selectedBottleIndex = -1;
        this._playState = PlayState.IDLE;
    }

    /**
     * 将引擎中的瓶子状态同步到 UI
     */
    private syncBottlesFromEngine(): void {
        const manager = this.bottleManager ?? this.node.getComponentInChildren(BottleManager);
        const bottles = this._engine.levelData?.bottles;
        if (manager && bottles) {
            manager.updateAllBottles(bottles);
        }
    }

    /**
     * 检查游戏胜利
     */
    private checkWin(): void {
        if (this._engine.checkWin()) {
            this.onGameWin();
        }
    }

    /**
     * 检查游戏失败（无合法移动且未胜利）
     */
    private checkDefeat(): void {
        if (this._engine.checkDefeat()) {
            this.onGameLose();
        }
    }

    /**
     * 游戏失败
     */
    private onGameLose(): void {
        console.log('[GameSceneController] 游戏失败，无合法移动');
        this._playState = PlayState.FINISHED;
        const payload: ResultPayload = {
            success: false,
            levelId: this._currentLevelId,
            moveCount: this._moveCount
        };
        this._navManager?.showResultPopup(payload);
    }

    /**
     * 游戏胜利
     */
    private onGameWin(): void {
        console.log('[GameSceneController] 游戏胜利！');
        this._playState = PlayState.FINISHED;

        // TODO: 保存关卡进度
        this.saveLevelProgress();

        // 显示结算弹窗
        setTimeout(() => {
            const payload: ResultPayload = {
                success: true,
                levelId: this._currentLevelId,
                moveCount: this._moveCount
            };
            this._navManager?.showResultPopup(payload);
        }, 500);
    }

    /**
     * 保存关卡进度到 UserProfile 并持久化
     */
    private saveLevelProgress(): void {
        const levelId = this._currentLevelId;
        const currentLevel = LevelConfig.levelIdToLevelNum(levelId);
        const nextLevel = currentLevel + 1;

        setUnlockedLevel(nextLevel);

        const stars = this.calculateStars(this._moveCount);
        setLevelStars(levelId, stars);

        saveToStorage();
        console.log(`[GameSceneController] 保存关卡进度: ${levelId}, 下一关解锁至 ${nextLevel}, 星数 ${stars}`);
    }

    private calculateStars(moveCount: number): number {
        if (this._maxMoves <= 0) return 3;
        const ratio = moveCount / this._maxMoves;
        if (ratio <= 0.6) return 3;
        if (ratio <= 0.8) return 2;
        return 1;
    }

    /**
     * 撤销按钮点击
     */
    private onUndoClick(): void {
        console.log('[GameSceneController] 点击撤销按钮');
        if (this._engine.undoMove()) {
            this._moveCount = this._engine.moveCount;
            this.syncBottlesFromEngine();
            this.updateProgressBar();
        }
    }

    /**
     * 重玩按钮点击
     */
    private onReplayClick(): void {
        console.log('[GameSceneController] 点击重玩按钮');
        this.initGame();
    }

    /**
     * 加管按钮点击
     */
    private onAddTubeClick(): void {
        console.log('[GameSceneController] 点击加管按钮');
        // TODO: 添加空瓶子到游戏中
    }

    /**
     * 场景加载开始事件处理
     */
    private onSceneLoadStart = (data: any): void => {
        console.log('[GameSceneController] 场景加载开始:', data.sceneName);
    };

    /**
     * 弹窗打开事件处理：结算弹窗由本场景的 resultPopup 显示并传参
     */
    private onPopupOpen = (data: any): void => {
        if (data.popupName !== PopupName.RESULT || !data.data) {
            return;
        }
        if (this.resultPopup) {
            this.resultPopup.active = true;
            const ctrl = this.resultPopup.getComponent(ResultPopupController);
            if (ctrl && ctrl.show) {
                ctrl.show(data.data);
            }
        }
    };

    /**
     * 弹窗关闭事件处理
     */
    private onPopupClose = (data: any): void => {
        if (data.popupName === PopupName.RESULT && this.resultPopup) {
            this.resultPopup.active = false;
            console.log('[GameSceneController] 结算弹窗关闭');
        }
    };

    /**
     * 获取当前游戏状态
     */
    public get playState(): PlayState {
        return this._playState;
    }

    /**
     * 获取当前移动次数
     */
    public get moveCount(): number {
        return this._moveCount;
    }

    /**
     * 暂停游戏
     */
    public pauseGame(): void {
        this._playState = PlayState.PAUSED;
        console.log('[GameSceneController] 游戏暂停');
    }

    /**
     * 恢复游戏
     */
    public resumeGame(): void {
        if (this._playState !== PlayState.FINISHED) {
            this._playState = PlayState.IDLE;
            console.log('[GameSceneController] 游戏恢复');
        }
    }
}

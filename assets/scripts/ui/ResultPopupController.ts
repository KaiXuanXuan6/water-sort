import { _decorator, Component, Node, Button, Label } from 'cc';
import { NavigationManager, NavigationEvent, PopupName } from '../utils/NavigationManager';
import { LevelConfig } from '../data/LevelConfig';
import { ResultPayload } from '../data/ResultPayload';

const { ccclass, property } = _decorator;

/**
 * 结算弹窗控制器
 * 负责游戏成功/失败弹窗的显示和交互
 */
@ccclass('ResultPopupController')
export class ResultPopupController extends Component {
    // UI 组件绑定
    @property(Node)
    successPanel: Node | null = null;

    @property(Node)
    failPanel: Node | null = null;

    @property(Button)
    nextLevelButton: Button | null = null;

    @property(Button)
    replayButton: Button | null = null;

    @property(Button)
    mapButton: Button | null = null;

    @property(Button)
    homeButton: Button | null = null;

    @property([Node])
    stars: Node[] = [];

    @property(Label)
    moveCountLabel: Label | null = null;

    @property(Label)
    bestMoveCountLabel: Label | null = null;

    @property(Label)
    levelNumLabel: Label | null = null;

    private _navManager: NavigationManager | null = null;
    private _resultData: ResultPayload | null = null;
    private _isShowed: boolean = false;

    /**
     * 组件生命周期：加载
     */
    protected onLoad(): void {
        console.log('[ResultPopupController] 弹窗加载完成');

        this._navManager = NavigationManager.instance;

        if (!this._navManager) {
            console.error('[ResultPopupController] 未找到导航管理器');
            return;
        }

        // 初始隐藏弹窗
        this.hide();

        // 绑定按钮事件
        this.bindEvents();

        // 监听导航事件
        this.setupNavigationListeners();
    }

    /**
     * 组件生命周期：启动
     */
    protected start(): void {
        console.log('[ResultPopupController] 弹窗启动');
    }

    /**
     * 组件生命周期：销毁
     */
    protected onDestroy(): void {
        if (this._navManager) {
            this._navManager.removeListener(NavigationEvent.POPUP_OPEN, this.onPopupOpen);
        }
    }

    /**
     * 绑定按钮事件
     */
    private bindEvents(): void {
        if (this.nextLevelButton) {
            this.nextLevelButton.node.on(Button.EventType.CLICK, this.onNextLevelClick, this);
        }

        if (this.replayButton) {
            this.replayButton.node.on(Button.EventType.CLICK, this.onReplayClick, this);
        }

        if (this.mapButton) {
            this.mapButton.node.on(Button.EventType.CLICK, this.onMapClick, this);
        }

        if (this.homeButton) {
            this.homeButton.node.on(Button.EventType.CLICK, this.onHomeClick, this);
        }
    }

    /**
     * 设置导航事件监听
     */
    private setupNavigationListeners(): void {
        if (this._navManager) {
            this._navManager.addListener(NavigationEvent.POPUP_OPEN, this.onPopupOpen);
        }
    }

    /**
     * 显示弹窗
     */
    public show(data: ResultPayload): void {
        console.log('[ResultPopupController] 显示弹窗:', data);

        this._resultData = data;
        this._isShowed = true;
        this.node.active = true;

        // 根据结果显示对应面板
        if (data.success) {
            this.showSuccessPanel();
        } else {
            this.showFailPanel();
        }
    }

    /**
     * 隐藏弹窗
     */
    public hide(): void {
        console.log('[ResultPopupController] 隐藏弹窗');
        this._isShowed = false;
        this.node.active = false;
    }

    /**
     * 显示成功面板
     */
    private showSuccessPanel(): void {
        if (this.successPanel) {
            this.successPanel.active = true;
        }
        if (this.failPanel) {
            this.failPanel.active = false;
        }

        // 更新星级显示
        this.updateStarsDisplay();

        // 更新文本信息
        this.updateLabels();
    }

    /**
     * 显示失败面板
     */
    private showFailPanel(): void {
        if (this.successPanel) {
            this.successPanel.active = false;
        }
        if (this.failPanel) {
            this.failPanel.active = true;
        }
    }

    /**
     * 更新星级显示
     */
    private updateStarsDisplay(): void {
        if (!this._resultData) {
            return;
        }

        const starCount = this._resultData.stars || 0;

        console.log(`[ResultPopupController] 显示星级: ${starCount}`);

        // TODO: 根据星数激活对应的星星节点
        // for (let i = 0; i < this.stars.length; i++) {
        //     this.stars[i].active = i < starCount;
        // }
    }

    /**
     * 更新文本标签
     */
    private updateLabels(): void {
        if (!this._resultData) {
            return;
        }

        // 更新移动次数
        if (this.moveCountLabel) {
            this.moveCountLabel.string = `${this._resultData.moveCount || 0}`;
        }

        // 更新最少步数
        if (this.bestMoveCountLabel && this._resultData.minMoves) {
            this.bestMoveCountLabel.string = `${this._resultData.minMoves}`;
        }

        // 更新关卡号
        if (this.levelNumLabel) {
            const levelNum = LevelConfig.levelIdToLevelNum(this._resultData.levelId);
            this.levelNumLabel.string = `LEVEL ${levelNum}`;
        }
    }

    /**
     * 弹窗打开事件处理
     */
    private onPopupOpen = (data: any): void => {
        if (data.popupName === PopupName.RESULT && data.data) {
            console.log('[ResultPopupController] 收到打开结算弹窗请求');
            this.show(data.data);
        }
    };

    /**
     * 下一关按钮点击
     */
    private onNextLevelClick(): void {
        console.log('[ResultPopupController] 点击下一关按钮');

        if (!this._resultData) {
            return;
        }

        // 计算下一关ID
        const currentLevel = LevelConfig.levelIdToLevelNum(this._resultData.levelId);
        const nextLevelId = LevelConfig.levelNumToLevelId(currentLevel + 1);

        this.hide();
        this._navManager?.closePopup();
        this._navManager?.gotoGame(nextLevelId);
    }

    /**
     * 重玩按钮点击
     */
    private onReplayClick(): void {
        console.log('[ResultPopupController] 点击重玩按钮');

        if (!this._resultData) {
            return;
        }

        this.hide();
        this._navManager?.closePopup();
        // 重新加载当前关卡
        this._navManager?.gotoGame(this._resultData.levelId);
    }

    /**
     * 返回地图按钮点击
     */
    private onMapClick(): void {
        console.log('[ResultPopupController] 点击返回地图按钮');
        this.hide();
        this._navManager?.closePopup();
        this._navManager?.gotoMap();
    }

    /**
     * 返回首页按钮点击
     */
    private onHomeClick(): void {
        console.log('[ResultPopupController] 点击返回首页按钮');
        this.hide();
        this._navManager?.closePopup();
        this._navManager?.gotoHome();
    }

    /**
     * 获取是否显示中
     */
    public get isShowed(): boolean {
        return this._isShowed;
    }
}

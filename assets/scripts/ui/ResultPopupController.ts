import { _decorator, Component, Node, Button, Label, Sprite, UITransform, Vec3, tween, Tween, Widget } from 'cc';
import { NavigationManager, NavigationEvent, PopupName } from '../utils/NavigationManager';
import { LevelConfig } from '../data/LevelConfig';
import { ResultPayload } from '../data/ResultPayload';
import { getProgressBarCleared, getProgressBarTarget } from '../data/UserProfile';

const { ccclass, property } = _decorator;

/**
 * 结算弹窗控制器
 * 负责游戏成功/失败弹窗的显示和交互
 */
@ccclass('ResultPopupController')
export class ResultPopupController extends Component {
    // UI 组件绑定（成功/失败共用一版，用 ResultTitle 与主按钮文案区分）
    /** 结算标题（如「通关」「失败」），根据 success 更新 */
    @property(Label)
    resultTitle: Label | null = null;

    @property([Node])
    stars: Node[] = [];

    @property(Label)
    levelNumLabel: Label | null = null;

    /** 主操作按钮：成功时为「下一关」，失败时为「再玩一次」，统一绑定此按钮 */
    @property(Button)
    resultActionButton: Button | null = null;

    /** 进度条背景（Result/progress_bg）；可选 */
    @property(Sprite)
    progressBarBg: Sprite | null = null;

    /** 进度条填充（Result/progress，Sprite 需设为 FILLED 横向） */
    @property(Sprite)
    progressBarFill: Sprite | null = null;

    /** 进度文案，如 "6/8" */
    @property(Label)
    progressLabel: Label | null = null;

    private _navManager: NavigationManager | null = null;
    private _resultData: ResultPayload | null = null;
    private _isShowed: boolean = false;
    private _starFinalPositions: Vec3[] = [];

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
        if (this.resultActionButton) {
            this.resultActionButton.node.on(Button.EventType.CLICK, this.onResultActionClick, this);
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

        this.updateResultContent();
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
     * 根据 success 更新标题、主按钮文案与星星/进度/关卡号
     */
    private updateResultContent(): void {
        const success = this._resultData?.success ?? false;

        if (this.resultTitle) {
            this.resultTitle.string = success ? '通关' : '失败';
        }

        const actionLabel = this.resultActionButton?.node.getComponentInChildren(Label);
        if (actionLabel) {
            actionLabel.string = success ? '下一关' : '再玩一次';
        }

        this.updateProgressBar();
        this.updateStarsDisplay();
        this.updateLabels();
    }

    /**
     * 更新进度条：根据用户数据 progressBarCleared / progressBarTarget 表示百分比；使用 SLICED 避免拉伸变形
     */
    private updateProgressBar(): void {
        const cleared = getProgressBarCleared();
        const target = getProgressBarTarget();
        const ratio = target > 0 ? Math.min(1, cleared / target) : 0;

        if (this.progressLabel) {
            this.progressLabel.string = `${cleared}/${target}`;
        }

        if (this.progressBarBg) {
            this.progressBarBg.type = Sprite.Type.SLICED;
        }
        /** 进度条 Fill 左侧固定偏移（与背景左边缘间距） */
        const FILL_LEFT = 8.5;
        if (this.progressBarFill) {
            this.progressBarFill.type = Sprite.Type.SLICED;
            const fillNode = this.progressBarFill.node;
            const fillUT = fillNode.getComponent(UITransform);
            if (fillUT) {
                fillUT.setAnchorPoint(0, 0.5);
                const pos = fillNode.position;
                fillNode.setPosition(FILL_LEFT, pos.y, pos.z);
                const fillWidget = fillNode.getComponent(Widget);
                if (fillWidget) {
                    fillWidget.isAlignLeft = true;
                    fillWidget.left = FILL_LEFT;
                    fillWidget.isAlignRight = false;
                    fillWidget.isAlignHorizontalCenter = false;
                }
                const parentUT = fillNode.parent?.getComponent(UITransform);
                const refUT = this.progressBarBg?.node.getComponent(UITransform);
                const fullW = parentUT ? parentUT.contentSize.width : (refUT ? refUT.contentSize.width : fillUT.contentSize.width);
                const fullH = refUT ? refUT.contentSize.height : fillUT.contentSize.height;
                fillUT.setContentSize(fullW * ratio, fullH);
            }
        }
    }

    /** 星星动画：从左下角由小变大，再变小到最终位置；三颗星错峰播放 */
    private static readonly STAR_ANIM_OFFSET = new Vec3(-80, -100, 0);
    private static readonly STAR_ANIM_SCALE_UP = 1.3;
    /** 单颗星：放大阶段时长 */
    private static readonly STAR_ANIM_DURATION_UP = 0.5;
    /** 单颗星：缩小回弹阶段时长 */
    private static readonly STAR_ANIM_DURATION_DOWN = 0.2;
    /** 每颗星相对上一颗的延迟（错位播放） */
    private static readonly STAR_ANIM_DELAY = 0.5;

    /**
     * 更新星级显示并播放星星动画
     */
    private updateStarsDisplay(): void {
        if (!this._resultData) {
            return;
        }

        const starCount = Math.min(this._resultData.stars ?? 0, 3);
        const starNodes = this.stars;

        for (let i = 0; i < starNodes.length; i++) {
            const starNode = starNodes[i];
            if (!starNode) continue;
            Tween.stopAllByTarget(starNode);
            if (i < starCount) {
                starNode.active = true;
                if (this._starFinalPositions[i] === undefined) {
                    this._starFinalPositions[i] = starNode.position.clone();
                }
                const finalPos = this._starFinalPositions[i];
                const startPos = new Vec3(finalPos.x + ResultPopupController.STAR_ANIM_OFFSET.x, finalPos.y + ResultPopupController.STAR_ANIM_OFFSET.y, finalPos.z);
                starNode.setPosition(startPos);
                starNode.setScale(new Vec3(0, 0, 1));

                const delay = i * ResultPopupController.STAR_ANIM_DELAY;
                tween(starNode)
                    .delay(delay)
                    .to(ResultPopupController.STAR_ANIM_DURATION_UP, { scale: new Vec3(ResultPopupController.STAR_ANIM_SCALE_UP, ResultPopupController.STAR_ANIM_SCALE_UP, 1), position: finalPos }, { easing: 'quadOut' })
                    .to(ResultPopupController.STAR_ANIM_DURATION_DOWN, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
                    .start();
            } else {
                starNode.active = false;
            }
        }
    }

    /**
     * 更新文本标签：胜利时显示下一关「Level N」，失败时显示当前关
     */
    private updateLabels(): void {
        if (!this._resultData) {
            return;
        }
        if (this.levelNumLabel) {
            const currentLevelNum = LevelConfig.levelIdToLevelNum(this._resultData.levelId);
            const displayLevelNum = this._resultData.success ? currentLevelNum + 1 : currentLevelNum;
            this.levelNumLabel.string = `Level ${displayLevelNum}`;
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
     * 主操作按钮点击：成功则下一关，失败则重玩
     */
    private onResultActionClick(): void {
        if (!this._resultData) {
            return;
        }

        this.hide();
        this._navManager?.closePopup();

        if (this._resultData.success) {
            const currentLevel = LevelConfig.levelIdToLevelNum(this._resultData.levelId);
            const nextLevelId = LevelConfig.levelNumToLevelId(currentLevel + 1);
            this._navManager?.gotoGame(nextLevelId);
        } else {
            this._navManager?.gotoGame(this._resultData.levelId);
        }
    }

    /**
     * 获取是否显示中
     */
    public get isShowed(): boolean {
        return this._isShowed;
    }
}

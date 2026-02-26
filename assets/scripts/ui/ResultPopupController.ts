import { _decorator, Component, Node, Button, Label, Sprite, UITransform, Vec3, tween, Tween, Widget } from 'cc';
import { NavigationManager, NavigationEvent, PopupName } from '../utils/NavigationManager';
import { LevelConfig } from '../data/LevelConfig';
import { ResultPayload } from '../data/ResultPayload';
import { getProgressBarCleared, getProgressBarTarget } from '../data/UserProfile';

const { ccclass, property } = _decorator;

/**
 * 游戏结果弹窗控制器
 */
@ccclass('ResultPopupController')
export class ResultPopupController extends Component {
    // UI 组件绑定
    /** 标题：VICTORY/FAIL */
    @property(Label)
    resultTitle: Label | null = null;

    @property([Node])
    stars: Node[] = [];

    @property(Label)
    levelNumLabel: Label | null = null;

    /** 主按钮：下一关/再玩一次 */
    @property(Button)
    resultActionButton: Button | null = null;

    /** 进度条背景 */
    @property(Sprite)
    progressBarBg: Sprite | null = null;

    /** 进度条填充 */
    @property(Sprite)
    progressBarFill: Sprite | null = null;

    /** 进度文案 "6/8" */
    @property(Label)
    progressLabel: Label | null = null;

    private _navManager: NavigationManager | null = null;
    private _resultData: ResultPayload | null = null;
    private _isShowed: boolean = false;
    private _starFinalPositions: Vec3[] = [];
    private _previousProgressCleared: number = 0;
    private _isAnimating: boolean = false;

protected onLoad(): void {
        console.log('[ResultPopupController] 加载完成');
        this._navManager = NavigationManager.instance;

        if (!this._navManager) {
            console.error('[ResultPopupController] 导航管理器未找到');
            return;
        }

        this.hide();
        this.bindEvents();
        this.setupNavigationListeners();
    }

    protected start(): void {
        console.log('[ResultPopupController] 启动');
    }

    protected onDestroy(): void {
        if (this._navManager) {
            this._navManager.removeListener(NavigationEvent.POPUP_OPEN, this.onPopupOpen);
        }
    }

    private bindEvents(): void {
        if (this.resultActionButton) {
            this.resultActionButton.node.on(Button.EventType.CLICK, this.onResultActionClick, this);
        }
    }

    private setupNavigationListeners(): void {
        if (this._navManager) {
            this._navManager.addListener(NavigationEvent.POPUP_OPEN, this.onPopupOpen);
        }
    }

    public show(data: ResultPayload): void {
        console.log('[ResultPopupController] 显示:', data);
        this._resultData = data;
        this._isShowed = true;
        this.node.active = true;

        // 初始隐藏按钮
        if (this.resultActionButton) {
            this.resultActionButton.node.active = false;
        }

        // 记录进度起始点
        this._previousProgressCleared = getProgressBarCleared();
        if (this._resultData.success) {
            this._previousProgressCleared = Math.max(0, this._previousProgressCleared - 1);
        }

        this.updateResultContent();
    }

    public hide(): void {
        console.log('[ResultPopupController] 隐藏');
        this._isShowed = false;
        this.node.active = false;

        Tween.stopAllByTarget(this.resultActionButton?.node);
        this._isAnimating = false;
    }

    private updateResultContent(): void {
        const success = this._resultData?.success ?? false;

        if (this.resultTitle) {
            this.resultTitle.string = success ? 'VICTORY' : 'FAIL';
        }

        this.updateProgressBar();
        this.updateStarsDisplay();
        this.updateLabels();

        // 动画结束后显示按钮
        this.showActionButton();
    }

    private updateProgressBar(animate: boolean = true): number {
        const cleared = getProgressBarCleared();
        const target = getProgressBarTarget();
        const ratio = target > 0 ? Math.min(1, cleared / target) : 0;

        if (this.progressLabel) {
            this.progressLabel.string = `${cleared}/${target}`;
        }

        if (this.progressBarBg) {
            this.progressBarBg.type = Sprite.Type.SLICED;
        }

        const FILL_LEFT = 8.5;
        if (this.progressBarFill) {
            this.progressBarFill.type = Sprite.Type.SLICED;
            const fillNode = this.progressBarFill.node;
            const fillUT = fillNode.getComponent(UITransform);
            if (fillUT) {
                fillUT.setAnchorPoint(0, 0.5);
                fillNode.setPosition(FILL_LEFT, fillNode.position.y, fillNode.position.z);

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
                const finalWidth = fullW * ratio;

                if (animate && this._resultData?.success && this._previousProgressCleared < cleared) {
                    const oldRatio = this._previousProgressCleared / target;
                    const oldWidth = fullW * oldRatio;
                    this._isAnimating = true;

                    Tween.stopAllByTarget(fillNode);
                    fillUT.setContentSize(oldWidth, fullH);

                    return this.animateProgressBar(fillNode, fillUT, oldWidth, finalWidth, fullH);
                } else {
                    fillUT.setContentSize(finalWidth, fullH);
                    return 0;
                }
            }
        }
        return 0;
    }

    private animateProgressBar(fillNode: Node, fillUT: UITransform, oldWidth: number, newWidth: number, fullHeight: number): number {
        tween(fillUT)
            .to(ResultPopupController.PROGRESS_ANIM_DURATION, {
                contentSize: new Vec3(newWidth, fullHeight, 1)
            }, {
                easing: 'quadOut',
                onUpdate: () => {
                    if (fillNode.getComponent(Widget)) {
                        fillNode.getComponent(Widget)!.updateAlignment();
                    }
                },
                onComplete: () => {
                    this._isAnimating = false;
                }
            })
            .start();

        return ResultPopupController.PROGRESS_ANIM_DURATION;
    }

    /** 星星动画：从左下角由小变大，再变小到最终位置 */
    private static readonly STAR_ANIM_OFFSET = new Vec3(-80, -100, 0);
    private static readonly STAR_ANIM_SCALE_UP = 1.3;
    private static readonly STAR_ANIM_DURATION_UP = 0.5;
    private static readonly STAR_ANIM_DURATION_DOWN = 0.2;
    private static readonly STAR_ANIM_DELAY = 0.5;

    /** 进度条动画参数 */
    private static readonly PROGRESS_ANIM_DURATION = 0.6;

    /** 按钮弹出动画参数 */
    private static readonly BUTTON_POP_SCALE = 1.2;
    private static readonly BUTTON_POP_DURATION_UP = 0.15;
    private static readonly BUTTON_POP_DURATION_DOWN = 0.1;
    private static readonly BUTTON_POP_DURATION_SECOND_UP = 0.1;
    private static readonly BUTTON_POP_DURATION_SECOND_DOWN = 0.15;

    private updateStarsDisplay(): void {
        if (!this._resultData) return;

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

    private showActionButton(): void {
        if (!this.resultActionButton || !this._resultData) return;

        if (this._resultData.success) {
            // 成功时：让按钮在1.5s时显示完成（动画总时长0.5s）
            const buttonAnimDuration = ResultPopupController.BUTTON_POP_DURATION_UP +
                                     ResultPopupController.BUTTON_POP_DURATION_DOWN +
                                     ResultPopupController.BUTTON_POP_DURATION_SECOND_UP +
                                     ResultPopupController.BUTTON_POP_DURATION_SECOND_DOWN;
            const totalDelay = 1.5 - buttonAnimDuration; // 1.0s开始，1.5s完成

            setTimeout(() => {
                this.showAndAnimateButton();
            }, totalDelay * 1000);
        } else {
            this.showAndAnimateButton();
        }
    }

    private showAndAnimateButton(): void {
        if (!this.resultActionButton) return;

        this.resultActionButton.node.active = true;
        this.animateActionButton();
    }

    private animateActionButton(): void {
        if (!this.resultActionButton) return;

        const buttonNode = this.resultActionButton.node;
        Tween.stopAllByTarget(buttonNode);

        buttonNode.setScale(new Vec3(0, 0, 1));

        // 播放弹出动画：两下弹跳
        tween(buttonNode)
            .to(ResultPopupController.BUTTON_POP_DURATION_UP, { scale: new Vec3(ResultPopupController.BUTTON_POP_SCALE, ResultPopupController.BUTTON_POP_SCALE, 1) }, { easing: 'backOut' })
            .to(ResultPopupController.BUTTON_POP_DURATION_DOWN, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
            .to(ResultPopupController.BUTTON_POP_DURATION_SECOND_UP, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'quadOut' })
            .to(ResultPopupController.BUTTON_POP_DURATION_SECOND_DOWN, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
            .start();
    }

    private updateLabels(): void {
        if (!this._resultData) return;

        const currentLevelNum = LevelConfig.levelIdToLevelNum(this._resultData.levelId);
        const nextLevelNum = currentLevelNum + 1;
        const displayText = this._resultData.success ? `Level ${nextLevelNum}` : 'Replay';

        // 更新关卡号标签
        if (this.levelNumLabel) {
            this.levelNumLabel.string = displayText;
        }
    }

    private onPopupOpen = (data: any): void => {
        if (data.popupName === PopupName.RESULT && data.data) {
            console.log('[ResultPopupController] 打开弹窗');
            this.show(data.data);
        }
    };

    private onResultActionClick(): void {
        if (!this._resultData || this._isAnimating) return;

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

    public get isShowed(): boolean {
        return this._isShowed;
    }
}

import { _decorator, Component, Node, Button, Label, Sprite, UITransform, Vec3, Tween, Widget } from 'cc';
import { NavigationManager, NavigationEvent, PopupName } from '../utils/NavigationManager';
import { SoundManager } from '../utils/SoundManager';
import { LevelConfig } from '../data/LevelConfig';
import { ResultPayload } from '../data/ResultPayload';
import { getProgressBarCleared, getProgressBarTarget } from '../data/UserProfile';
import { ProgressBarAnim } from '../animation/ProgressBarAnim';
import { StarPopAnim } from '../animation/StarPopAnim';
import { BouncePopAnim } from '../animation/BouncePopAnim';

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

    /** 进度条满时展示的奖励弹窗节点（RewardPopup），不填则不自动弹出 */
    @property(Node)
    rewardPopupNode: Node | null = null;

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

        if (this.rewardPopupNode?.isValid) {
            this.rewardPopupNode.active = false;
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

                    const progressAnim = fillNode.getComponent(ProgressBarAnim);
                    if (progressAnim) {
                        progressAnim.play(finalWidth, fullH, () => {
                            this._isAnimating = false;
                            if (this._resultData?.progressBarJustFilled && this.rewardPopupNode?.isValid) {
                                this.rewardPopupNode.active = true;
                            }
                        });
                    } else {
                        this._isAnimating = false;
                        if (this._resultData?.progressBarJustFilled && this.rewardPopupNode?.isValid) {
                            this.rewardPopupNode.active = true;
                        }
                    }
                    return 0;
                } else {
                    fillUT.setContentSize(finalWidth, fullH);
                    return 0;
                }
            }
        }
        return 0;
    }

    /** 星星依次出现的间隔（秒） */
    private static readonly STAR_DELAY = 0.5;

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
                const starAnim = starNode.getComponent(StarPopAnim);
                if (starAnim) {
                    starAnim.play(finalPos, i * ResultPopupController.STAR_DELAY);
                }
            } else {
                starNode.active = false;
            }
        }
    }

    private showActionButton(): void {
        if (!this.resultActionButton || !this._resultData) return;

        if (this._resultData.success) {
            // 成功时：让按钮在约 1.5s 时显示完成（按钮动画约 0.5s）
            const totalDelay = 1000; // 1s 后开始播按钮动画
            setTimeout(() => {
                this.showAndAnimateButton();
            }, totalDelay);
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

        const buttonAnim = buttonNode.getComponent(BouncePopAnim);
        if (buttonAnim) {
            buttonAnim.play();
        } else {
            buttonNode.setScale(1, 1, 1);
        }
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

        if (this._resultData.success) {
            SoundManager.instance?.playOneShot('button');
        } else {
            SoundManager.instance?.playOneShot('refresh');
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

    public get isShowed(): boolean {
        return this._isShowed;
    }
}

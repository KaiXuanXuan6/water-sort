import { _decorator, Component, tween, Tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 弹窗缩放动画（通用）
 * 挂到弹窗的「内容节点」上（如 Dialog），由弹窗控制器在 show/hide 时调用 playShow / playHide。
 * 若节点因素材原因本身带有缩放（如 0.5），请设置 restScale 为该值，动画会与之相乘。
 */
@ccclass('PopInOutAnim')
export class PopInOutAnim extends Component {
    /** 弹窗完全展开时的缩放 */
    @property
    restScale: number = 1;

    /** 出现时起始缩放比例 */
    @property
    startScale: number = 0.1;

    /** 消失时结束缩放比例 */
    @property
    endScale: number = 0.1;

    /** 动画时长（秒） */
    @property
    duration: number = 0.25;

    /** 出现时缓动（可填 backOut 等） */
    @property
    showEasing: string = 'backOut';

    /** 消失时缓动 */
    @property
    hideEasing: string = 'sineIn';

    /**
     * 播放出现动画
     */
    playShow(onComplete?: () => void): void {
        Tween.stopAllByTarget(this.node);
        const start = this.restScale * this.startScale;
        this.node.setScale(start, start, 1);
        const target = new Vec3(this.restScale, this.restScale, 1);
        tween(this.node)
            .to(this.duration, { scale: target }, { easing: this.showEasing as any, onComplete: onComplete ?? undefined })
            .start();
    }

    /**
     * 无动画地设为隐藏状态（用于初始化等不需要播消失动画的场景）
     */
    setToHiddenState(): void {
        Tween.stopAllByTarget(this.node);
        const endVal = this.restScale * this.endScale;
        this.node.setScale(endVal, endVal, 1);
    }

    /**
     * 播放消失动画
     */
    playHide(onComplete?: () => void): void {
        Tween.stopAllByTarget(this.node);
        const endVal = this.restScale * this.endScale;
        const end = new Vec3(endVal, endVal, 1);
        tween(this.node)
            .to(this.duration, { scale: end }, { easing: this.hideEasing as any, onComplete: onComplete ?? undefined })
            .start();
    }
}

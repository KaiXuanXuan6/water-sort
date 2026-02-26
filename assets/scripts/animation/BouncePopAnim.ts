import { _decorator, Component, tween, Tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 结果页主按钮弹出动画（两段弹跳）
 * 挂到按钮节点上，由控制器在显示按钮时调用 play()。
 */
@ccclass('BouncePopAnim')
export class BouncePopAnim extends Component {
    /** 第一次弹起的最大缩放 */
    @property
    scaleUp: number = 1.2;

    @property
    durationUp: number = 0.15;

    @property
    durationDown: number = 0.1;

    @property
    durationSecondUp: number = 0.1;

    @property
    durationSecondDown: number = 0.15;

    /** 第一次弹起缓动 */
    @property
    easingUp: string = 'backOut';

    @property
    easingDown: string = 'quadOut';

    /**
     * 播放按钮弹出动画：0 -> scaleUp -> 1 -> 1.1 -> 1
     */
    play(onComplete?: () => void): void {
        Tween.stopAllByTarget(this.node);
        this.node.setScale(0, 0, 1);

        const up = new Vec3(this.scaleUp, this.scaleUp, 1);
        const one = new Vec3(1, 1, 1);
        const oneOne = new Vec3(1.1, 1.1, 1);

        tween(this.node)
            .to(this.durationUp, { scale: up }, { easing: this.easingUp as any })
            .to(this.durationDown, { scale: one }, { easing: this.easingDown as any })
            .to(this.durationSecondUp, { scale: oneOne }, { easing: this.easingDown as any })
            .to(this.durationSecondDown, { scale: one }, { easing: this.easingDown as any, onComplete: onComplete ?? undefined })
            .start();
    }
}

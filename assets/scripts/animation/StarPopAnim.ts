import { _decorator, Component, tween, Tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 结果页星星弹出动画
 * 挂到每颗星节点上：从偏移位置+缩放 0 变大到 scaleUp 并移到最终位置，再缩放到 1。
 * 由控制器在展示星星时调用 play(finalPosition, delay)。
 */
@ccclass('StarPopAnim')
export class StarPopAnim extends Component {
    /** 起始位置相对最终位置的偏移 */
    @property
    offset: Vec3 = new Vec3(-80, -100, 0);

    /** 中间放大倍数 */
    @property
    scaleUp: number = 1.3;

    @property
    durationUp: number = 0.5;

    @property
    durationDown: number = 0.2;

    @property
    easing: string = 'quadOut';

    /**
     * 播放星星弹出动画
     * @param finalPosition 星星最终位置（世界或本地，与节点一致）
     * @param delay 延迟秒数
     */
    play(finalPosition: Vec3, delay: number = 0, onComplete?: () => void): void {
        Tween.stopAllByTarget(this.node);

        const startPos = new Vec3(
            finalPosition.x + this.offset.x,
            finalPosition.y + this.offset.y,
            finalPosition.z
        );
        this.node.setPosition(startPos);
        this.node.setScale(0, 0, 1);

        const scaleUpVec = new Vec3(this.scaleUp, this.scaleUp, 1);
        const scaleOne = new Vec3(1, 1, 1);

        let tw = tween(this.node);
        if (delay > 0) tw = tw.delay(delay);
        tw.to(this.durationUp, { scale: scaleUpVec, position: finalPosition }, { easing: this.easing as any })
          .to(this.durationDown, { scale: scaleOne }, { easing: this.easing as any, onComplete: onComplete ?? undefined })
          .start();
    }
}

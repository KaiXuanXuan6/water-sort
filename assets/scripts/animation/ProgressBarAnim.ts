import { _decorator, Component, tween, Tween, UITransform, Widget } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 结果页进度条填充动画
 * 挂到进度条填充节点上，由控制器在需要时调用 play(targetWidth, targetHeight)。
 * 从当前 contentSize 过渡到目标宽高，onUpdate 中会刷新 Widget 对齐。
 */
@ccclass('ProgressBarAnim')
export class ProgressBarAnim extends Component {
    @property
    duration: number = 0.6;

    @property
    easing: string = 'quadOut';

    /**
     * 播放填充动画：从当前 contentSize 过渡到目标宽高
     */
    play(targetWidth: number, targetHeight: number, onComplete?: () => void): void {
        const ut = this.node.getComponent(UITransform);
        if (!ut) return;

        Tween.stopAllByTarget(ut);

        tween(ut)
            .to(this.duration, { width: targetWidth, height: targetHeight }, {
                easing: this.easing as any,
                onUpdate: () => {
                    const w = this.node.getComponent(Widget);
                    if (w) w.updateAlignment();
                },
                onComplete: onComplete ?? undefined
            })
            .start();
    }
}

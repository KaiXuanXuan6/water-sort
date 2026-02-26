import { _decorator, Component, tween, Tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 弹窗缩放动画（通用）
 * 挂到弹窗的「内容节点」上（如 Dialog），由弹窗控制器在 show/hide 时调用 playShow / playHide。
 * 其他弹窗（如 ResultPop）也可复用：给内容节点挂本组件并调用即可。
 */
@ccclass('PopupScaleAnim')
export class PopupScaleAnim extends Component {
    /** 出现时起始缩放（从小变大） */
    @property
    startScale: number = 0.3;

    /** 消失时结束缩放（从大变小） */
    @property
    endScale: number = 0.3;

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
     * 播放出现动画（假定节点已 active，会先把 scale 设为 startScale 再播到 1）
     */
    playShow(onComplete?: () => void): void {
        Tween.stopAllByTarget(this.node);
        this.node.setScale(this.startScale, this.startScale, 1);
        const one = new Vec3(1, 1, 1);
        tween(this.node)
            .to(this.duration, { scale: one }, { easing: this.showEasing as any, onComplete: onComplete ?? undefined })
            .start();
    }

    /**
     * 播放消失动画（播完后由调用方负责 active = false 等）
     */
    playHide(onComplete?: () => void): void {
        Tween.stopAllByTarget(this.node);
        const end = new Vec3(this.endScale, this.endScale, 1);
        tween(this.node)
            .to(this.duration, { scale: end }, { easing: this.hideEasing as any, onComplete: onComplete ?? undefined })
            .start();
    }
}

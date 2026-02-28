import { _decorator, Component, Node, tween, Tween } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 挂在 RewardPopup 下 Chest 节点上，驱动子节点 Glow 做绕 Z 轴无限旋转，实现宝箱内光泽旋转动画。
 * 需在编辑器中为 Chest 挂宝箱图（chest_open），为 Glow 挂光泽图（glow.png）。
 */
@ccclass('ChestGlowAnim')
export class ChestGlowAnim extends Component {
    /** 光泽子节点，不填则用 getChildByName('Glow') */
    @property(Node)
    glowNode: Node | null = null;

    /** 旋转一圈时长（秒） */
    @property
    duration: number = 3;

    protected onLoad(): void {
        const target = this.glowNode ?? this.node.getChildByName('Glow');
        if (!target) return;
        this.glowNode = target;
        this.startRotation();
    }

    private startRotation(): void {
        if (!this.glowNode?.isValid) return;
        Tween.stopAllByTarget(this.glowNode);
        tween(this.glowNode)
            .by(this.duration, { angle: 360 }, { easing: 'linear' })
            .repeatForever()
            .start();
    }

    protected onDestroy(): void {
        if (this.glowNode?.isValid) {
            Tween.stopAllByTarget(this.glowNode);
        }
    }
}

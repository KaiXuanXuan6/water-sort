import { _decorator, Component, Node, Toggle, tween, Tween, Vec3, UIOpacity } from 'cc';
import { SoundManager } from '../utils/SoundManager';

const { ccclass, property } = _decorator;

/** 滑块开关：根据 Toggle 状态对 Handle 做位移动画，对 OffBg/OnBg 做透明度过渡 */
@ccclass('SliderSwitch')
export class SliderSwitch extends Component {
    /** 滑块节点，会沿 x 方向在 offX 与 onX 之间移动 */
    @property(Node)
    handle: Node | null = null;

    /** 关状态背景（未选中时显示） */
    @property(Node)
    offBg: Node | null = null;

    /** 开状态背景（选中时显示） */
    @property(Node)
    onBg: Node | null = null;

    /** 滑块在「关」位置时 handle 的本地 x（默认 -48，轨道 160、滑块 64 时居中偏左） */
    @property
    offX: number = -48;

    /** 滑块在「开」位置时 handle 的本地 x（默认 48） */
    @property
    onX: number = 48;

    /** 滑动动画时长（秒） */
    @property
    slideDuration: number = 0.2;

    /** 背景透明度过渡时长（秒） */
    @property
    bgFadeDuration: number = 0.2;

    private _toggle: Toggle | null = null;

    onLoad(): void {
        this._toggle = this.getComponent(Toggle);
        if (!this._toggle) {
            return;
        }
        this.syncToState(this._toggle.isChecked, false);
        this._toggle.node.on(Toggle.EventType.TOGGLE, this.onToggle, this);
    }

    onDestroy(): void {
        if (this._toggle) {
            this._toggle.node.off(Toggle.EventType.TOGGLE, this.onToggle, this);
        }
        if (this.handle) {
            Tween.stopAllByTarget(this.handle);
        }
    }

    private onToggle(toggle: Toggle): void {
        SoundManager.instance?.playOneShot('select');
        this.syncToState(toggle.isChecked, true);
    }

    /**
     * 根据选中状态更新 Handle 位置与背景透明度
     * @param isChecked 是否选中（开）
     * @param animate 是否播放动画
     */
    private syncToState(isChecked: boolean, animate: boolean): void {
        const targetX = isChecked ? this.onX : this.offX;
        const handle = this.handle;

        if (handle) {
            Tween.stopAllByTarget(handle);
            const pos = handle.position.clone();
            const targetPos = new Vec3(targetX, pos.y, pos.z);
            if (animate) {
                tween(handle)
                    .to(this.slideDuration, { position: targetPos }, { easing: 'sineOut' })
                    .start();
            } else {
                handle.setPosition(targetPos);
            }
        }

        this.updateBgOpacity(isChecked, animate);
    }

    private updateBgOpacity(isChecked: boolean, animate: boolean): void {
        const offOpacity = isChecked ? 0 : 255;
        const onOpacity = isChecked ? 255 : 0;
        const duration = animate ? this.bgFadeDuration : 0;

        const setOpacity = (node: Node, value: number, dur: number) => {
            let comp = node.getComponent(UIOpacity);
            if (!comp) {
                comp = node.addComponent(UIOpacity);
            }
            if (dur <= 0) {
                comp.opacity = value;
                return;
            }
            Tween.stopAllByTarget(comp);
            tween(comp)
                .to(dur, { opacity: value }, { easing: 'sineOut' })
                .start();
        };

        if (this.offBg) {
            setOpacity(this.offBg, offOpacity, duration);
        }
        if (this.onBg) {
            setOpacity(this.onBg, onOpacity, duration);
        }
    }
}

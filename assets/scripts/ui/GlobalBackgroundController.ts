import { _decorator, Component, Sprite } from 'cc';
import { getSelectedBackgroundType } from '../data/UserProfile';
import { AssetLoader } from '../utils/AssetLoader';

const { ccclass } = _decorator;

/**
 * 场景全局背景控制器
 * 挂在 Canvas/Background 节点上，根据用户选中的背景类型加载并设置 Sprite。
 * 进入 Game/Map 时由对应控制器调用 refresh() 以应用从 Collection 返回后的最新选择。
 */
@ccclass('GlobalBackgroundController')
export class GlobalBackgroundController extends Component {
    private _sprite: Sprite | null = null;

    static instance: GlobalBackgroundController | null = null;

    protected onLoad(): void {
        GlobalBackgroundController.instance = this;
        this._sprite = this.node.getComponent(Sprite);
        this.applySelectedBackground();
    }

    protected onDestroy(): void {
        if (GlobalBackgroundController.instance === this) {
            GlobalBackgroundController.instance = null;
        }
    }

    /**
     * 根据当前选中的背景类型加载并设置 spriteFrame
     */
    public async refresh(): Promise<void> {
        await this.applySelectedBackground();
    }

    private async applySelectedBackground(): Promise<void> {
        if (!this._sprite) return;
        const bgId = getSelectedBackgroundType();
        const frame = await AssetLoader.loadBackgroundSprite(bgId);
        if (frame && this._sprite.isValid) {
            this._sprite.spriteFrame = frame;
        }
    }

}

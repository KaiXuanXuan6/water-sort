import { _decorator, Component, Button } from 'cc';
import { SoundManager } from '../utils/SoundManager';
import { addCoinCount, addAddTubeCount, addUndoCount, resetProgressBarSegment } from '../data/UserProfile';

const { ccclass, property } = _decorator;

/**
 * 奖励弹窗控制器（RewardPopup）
 * 进度条满后由 Result 页展示；点击领取按钮增加 25 金币、1 加管、1 回退并关闭，回到 Result 页。
 */
@ccclass('RewardPopupController')
export class RewardPopupController extends Component {
    /** 领取按钮（COLLECT），在编辑器中绑定 */
    @property(Button)
    collectButton: Button | null = null;

    protected onLoad(): void {
        this.node.active = false;
        if (this.collectButton) {
            this.collectButton.node.on(Button.EventType.CLICK, this.onCollectClick, this);
        }
    }

    protected onDestroy(): void {
        if (this.collectButton?.node?.isValid) {
            this.collectButton.node.off(Button.EventType.CLICK, this.onCollectClick, this);
        }
    }

    private onCollectClick(): void {
        SoundManager.instance?.playOneShot('button');
        resetProgressBarSegment();
        addCoinCount(25);
        addAddTubeCount(1);
        addUndoCount(1);
        this.node.active = false;
    }
}

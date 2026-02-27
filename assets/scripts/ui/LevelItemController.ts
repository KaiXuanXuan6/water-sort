import { _decorator, Color, Component, Label, Node } from 'cc';

const { ccclass, property } = _decorator;

/** 未解锁态 Label 颜色：深灰 */
const LABEL_COLOR_GRAY = new Color(80, 80, 80, 255);
/** 已解锁态 Label 颜色：深棕 */
const LABEL_COLOR_LIT = new Color(101, 67, 33, 255);
/** 当前关卡态 Label 颜色：纯黑 */
const LABEL_COLOR_CURRENT = new Color(0, 0, 0, 255);

/** 关卡项展示所需的最小数据（避免依赖 MapSceneController） */
export interface LevelItemData {
    levelNum: number;
    isUnlocked: boolean;
}

/**
 * 关卡按钮三态显示：未解锁灰 / 已解锁 / 当前关卡
 * 通过显隐三个子节点切换形态，并更新关卡号 Label。
 */
@ccclass('LevelItemController')
export class LevelItemController extends Component {
    @property(Node)
    grayNode: Node | null = null;

    @property(Node)
    litNode: Node | null = null;

    @property(Node)
    currentNode: Node | null = null;

    @property(Node)
    labelNode: Node | null = null;

    protected onLoad(): void {
        if (!this.grayNode) this.grayNode = this.node.getChildByName('Gray') ?? null;
        if (!this.litNode) this.litNode = this.node.getChildByName('Lit') ?? null;
        if (!this.currentNode) this.currentNode = this.node.getChildByName('Current') ?? null;
        if (!this.labelNode) this.labelNode = this.node.getChildByName('Label') ?? null;
    }

    /**
     * 根据关卡数据与当前关卡序号设置显示状态与关卡号
     * @param data 关卡项数据（至少 levelNum、isUnlocked）
     * @param currentLevelNum 当前应玩关卡序号（等于该序号时显示「当前」态）
     */
    public setData(data: LevelItemData, currentLevelNum: number): void {
        const isCurrent = data.levelNum === currentLevelNum;

        if (this.grayNode) this.grayNode.active = !data.isUnlocked;
        if (this.litNode) this.litNode.active = data.isUnlocked && !isCurrent;
        if (this.currentNode) this.currentNode.active = data.isUnlocked && isCurrent;

        if (this.labelNode) {
            const label = this.labelNode.getComponent(Label);
            if (label) {
                label.string = String(data.levelNum);
                if (!data.isUnlocked) {
                    label.color = LABEL_COLOR_GRAY;
                } else if (isCurrent) {
                    label.color = LABEL_COLOR_CURRENT;
                } else {
                    label.color = LABEL_COLOR_LIT;
                }
            }
        }
    }
}

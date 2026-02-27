import { _decorator, Color, Component, Label, Node } from 'cc';

const { ccclass, property } = _decorator;

/**
 * SemiCircleButton 状态切换：在 Active / Deactive 两态之间切换显示。
 * 同一 Label 节点文案不变，随状态切换 Label 颜色（activeColor/deactiveColor），不处理点击（由节点上的 Button 或父级处理）。
 */
@ccclass('SemiCircleButtonController')
export class SemiCircleButtonController extends Component {
    @property(Node)
    activeStateNode: Node | null = null;

    @property(Node)
    deactiveStateNode: Node | null = null;

    @property(Node)
    labelNode: Node | null = null;

    /** 留空则使用 Label 节点在编辑器中设置的文案 */
    @property
    labelText = '';

    @property(Color)
    activeColor: Color = new Color(255, 255, 255, 255);

    @property(Color)
    deactiveColor: Color = new Color(150, 150, 150, 255);

    private _isActive = true;

    protected onLoad(): void {
        if (!this.activeStateNode) this.activeStateNode = this.node.getChildByName('Active') ?? null;
        if (!this.deactiveStateNode) {
            this.deactiveStateNode = this.node.getChildByName('Deactive') ?? this.node.getChildByName('Deacitve') ?? null;
        }
        if (!this.labelNode) this.labelNode = this.node.getChildByName('Label') ?? null;
        if (this.labelText !== '' && this.labelNode) {
            const label = this.labelNode.getComponent(Label);
            if (label) label.string = this.labelText;
        }
        this.applyState();
    }

    /** 当前是否为 Active 态 */
    public get isActive(): boolean {
        return this._isActive;
    }

    public set isActive(value: boolean) {
        if (this._isActive === value) return;
        this._isActive = value;
        this.applyState();
    }

    /** 设置为 Active(true) 或 Deactive(false) */
    public setState(active: boolean): void {
        this.isActive = active;
    }

    /** 切换当前状态并返回新状态 */
    public toggle(): boolean {
        this._isActive = !this._isActive;
        this.applyState();
        return this._isActive;
    }

    private applyState(): void {
        if (this.activeStateNode) this.activeStateNode.active = this._isActive;
        if (this.deactiveStateNode) this.deactiveStateNode.active = !this._isActive;

        if (this.labelNode) {
            const label = this.labelNode.getComponent(Label);
            if (label) label.color = this._isActive ? this.activeColor : this.deactiveColor;
        }
    }
}

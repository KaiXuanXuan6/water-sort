import { _decorator, Component, Node, Prefab, instantiate, Vec3 } from 'cc';
import { BottleState } from '../data/LevelConfig';
import { BottleComponent } from '../ui/BottleComponent';
import { BottleCreator } from './BottleCreator';

const { ccclass, property } = _decorator;

@ccclass('BottleManager')
export class BottleManager extends Component {
    @property(Prefab)
    bottlePrefab: Prefab | null = null;

    @property(Node)
    bottleContainer: Node | null = null;

    private _bottleNodes: Node[] = [];
    private _bottleComponents: BottleComponent[] = [];

    /** 每行最多瓶子数 */
    private static readonly MAX_PER_ROW = 5;
    /** 瓶子水平间距 */
    private static readonly SPACING_H = 40;
    /** 行间距 */
    private static readonly SPACING_V = 40;

    public get bottleCount(): number {
        return this._bottleNodes.length;
    }

    protected onDestroy(): void {
        this.clearBottles();
    }

    /**
     * 异步创建瓶子（无预制体时用 BottleCreator 加载资源并创建，有预制体时同步实例化）
     */
    public async createBottles(bottleData: BottleState[]): Promise<void> {
        if (!this.bottleContainer) {
            console.error('[BottleManager] 瓶子容器未设置');
            return;
        }

        this.clearBottles();

        if (this.bottlePrefab) {
            for (let i = 0; i < bottleData.length; i++) {
                const bottleNode = instantiate(this.bottlePrefab);
                const comp = bottleNode.getComponent(BottleComponent);
                if (comp) {
                    comp.init(i, bottleData[i]);
                    this._bottleComponents.push(comp);
                }
                this.bottleContainer.addChild(bottleNode);
                this._bottleNodes.push(bottleNode);
            }
        } else {
            for (let i = 0; i < bottleData.length; i++) {
                const bottleNode = await BottleCreator.createBottle({
                    index: i,
                    data: bottleData[i]
                });
                this.bottleContainer.addChild(bottleNode);
                this._bottleNodes.push(bottleNode);
                const comp = bottleNode.getComponent(BottleComponent);
                if (comp) {
                    this._bottleComponents.push(comp);
                }
            }
        }

        this.layoutBottles();
        console.log(`[BottleManager] 创建了 ${bottleData.length} 个瓶子`);
    }

    /**
     * 手动排列瓶子：每行最多 MAX_PER_ROW 个，超出换行，每行水平居中。
     */
    private layoutBottles(): void {
        const n = this._bottleNodes.length;
        if (n === 0) return;

        const W = BottleComponent.BOTTLE_BODY_WIDTH;
        const H = BottleComponent.BOTTLE_BODY_HEIGHT;
        const MAX = BottleManager.MAX_PER_ROW;
        const SH = BottleManager.SPACING_H;
        const SV = BottleManager.SPACING_V;

        const numRows = Math.ceil(n / MAX);
        const totalHeight = numRows * H + (numRows - 1) * SV;
        const startY = (totalHeight - H) / 2;

        for (let i = 0; i < n; i++) {
            const row = Math.floor(i / MAX);
            const col = i % MAX;
            const countInRow = Math.min(MAX, n - row * MAX);
            const rowWidth = countInRow * W + (countInRow - 1) * SH;
            const firstX = -rowWidth / 2 + W / 2;
            const x = firstX + col * (W + SH);
            const y = startY - row * (H + SV);
            const pos = new Vec3(x, y, 0);
            this._bottleNodes[i].setPosition(pos);
            const comp = this._bottleComponents[i];
            if (comp && comp.setPosition) {
                comp.setPosition(pos);
            }
        }
    }

    public getBottle(index: number): Node | undefined {
        return this._bottleNodes[index];
    }

    public getBottleComponent(index: number): BottleComponent | undefined {
        return this._bottleComponents[index];
    }

    public updateBottle(index: number, data: BottleState): void {
        const comp = this.getBottleComponent(index);
        if (comp && comp.updateData) {
            comp.updateData(data);
        }
    }

    public updateAllBottles(bottleData: BottleState[]): void {
        for (let i = 0; i < bottleData.length; i++) {
            this.updateBottle(i, bottleData[i]);
        }
    }

    public clearBottles(): void {
        for (const node of this._bottleNodes) {
            node.destroy();
        }
        this._bottleNodes = [];
        this._bottleComponents = [];
    }

    public setAllBottlesEnabled(enabled: boolean): void {
        for (const comp of this._bottleComponents) {
            if (comp.setEnabled) {
                comp.setEnabled(enabled);
            }
        }
    }
}

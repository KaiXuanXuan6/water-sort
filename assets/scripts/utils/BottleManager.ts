import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
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

    @property({ tooltip: '瓶子水平间距' })
    bottleSpacing: number = 90;

    @property({ tooltip: '瓶子起始X坐标' })
    startX: number = 0;

    private _bottleNodes: Node[] = [];
    private _bottleComponents: BottleComponent[] = [];

    public get bottleCount(): number {
        return this._bottleNodes.length;
    }

    public get bottles(): Node[] {
        return this._bottleNodes;
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
        const positions = BottleCreator.calculateBottlePositions(bottleData.length, this.startX, this.bottleSpacing);

        if (this.bottlePrefab) {
            for (let i = 0; i < bottleData.length; i++) {
                const bottleNode = instantiate(this.bottlePrefab);
                bottleNode.setPosition(positions[i].x, positions[i].y, 0);
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
                    data: bottleData[i],
                    position: positions[i]
                });
                this.bottleContainer.addChild(bottleNode);
                this._bottleNodes.push(bottleNode);
                const comp = bottleNode.getComponent(BottleComponent);
                if (comp) {
                    this._bottleComponents.push(comp);
                }
            }
        }

        console.log(`[BottleManager] 创建了 ${bottleData.length} 个瓶子`);
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

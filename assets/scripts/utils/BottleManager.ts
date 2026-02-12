import { _decorator, Component, Node, Prefab, Sprite, UITransform, Mask, instantiate, SpriteFrame } from 'cc';
import { BottleState, WaterLayer } from '../data/LevelConfig';
import { AssetLoader } from './AssetLoader';

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

    @property({ tooltip: '是否自动加载瓶子图片' })
    autoLoadSprites: boolean = true;

    private _bottleNodes: Node[] = [];
    private _bottleComponents: any[] = [];
    private _spriteFrameCache: Map<string, SpriteFrame> = new Map();

    public get bottleCount(): number {
        return this._bottleNodes.length;
    }

    public get bottles(): Node[] {
        return this._bottleNodes;
    }

    protected start(): void {
        console.log('[BottleManager] 启动');
        if (this.autoLoadSprites) {
            this.preloadBottleFrames();
        }
    }

    protected onDestroy(): void {
        this.clearBottles();
    }

    private preloadBottleFrames(): void {
        const framesToLoad = new Set<string>();

        for (let i = 1; i <= 10; i++) {
            framesToLoad.add(`${i}_1`);
            framesToLoad.add(`${i}_2`);
        }

        console.log('[BottleManager] 预加载瓶子图片...');
    }

    public createBottles(bottleData: BottleState[]): void {
        if (!this.bottleContainer) {
            console.error('[BottleManager] 瓶子容器未设置');
            return;
        }

        this.clearBottles();
        const totalWidth = (bottleData.length - 1) * this.bottleSpacing;
        const offsetX = -totalWidth / 2;

        for (let i = 0; i < bottleData.length; i++) {
            const x = this.startX + offsetX + i * this.bottleSpacing;
            const bottleNode = this.createSingleBottle(i, bottleData[i], x);
            this.bottleContainer.addChild(bottleNode);
            this._bottleNodes.push(bottleNode);
        }

        console.log(`[BottleManager] 创建了 ${bottleData.length} 个瓶子`);
    }

    private createSingleBottle(index: number, data: BottleState, x: number): Node {
        const bottleNode = this.bottlePrefab ?
            instantiate(this.bottlePrefab) :
            this.createBottleFromScratch(index, data);

        bottleNode.setPosition(x, 0, 0);

        if (!this.bottlePrefab) {
            this.setupBottleNode(bottleNode, data);
        }

        return bottleNode;
    }

    private createBottleFromScratch(index: number, data: BottleState): Node {
        const bottleNode = new Node(`Bottle_${index}`);
        const bottleSprite = bottleNode.addComponent(Sprite);
        const bottleTransform = bottleNode.addComponent(UITransform);
        bottleTransform.setContentSize(80, 120);

        const waterContainer = new Node('WaterContainer');
        const waterTransform = waterContainer.addComponent(UITransform);
        waterTransform.setContentSize(70, 100);
        bottleNode.addChild(waterContainer);

        const mask = waterContainer.addComponent(Mask);
        mask.type = Mask.Type.RECT;

        this.setupBottleNode(bottleNode, data);

        return bottleNode;
    }

    private setupBottleNode(bottleNode: Node, data: BottleState): void {
        const sprite = bottleNode.getComponent(Sprite);
        const spriteFrame = this.getBottleSpriteFrame(data.bottleType, 1);
        if (spriteFrame && sprite) {
            sprite.spriteFrame = spriteFrame;
        }

        const comp = bottleNode.getComponent('BottleComponent') as any;
        if (comp && comp.init) {
            comp.init(0, data);
        }
    }

    private getBottleSpriteFrame(bottleType: number, state: number): SpriteFrame | null {
        const key = `Bottles/${bottleType}_${state}`;
        if (this._spriteFrameCache.has(key)) {
            return this._spriteFrameCache.get(key)!;
        }

        const frame = this._spriteFrameCache.get(key);
        if (frame) {
            console.log(`[BottleManager] 使用缓存的瓶子图片: ${key}`);
        }

        return frame || null;
    }

    public getBottle(index: number): Node | undefined {
        return this._bottleNodes[index];
    }

    public getBottleComponent(index: number): any | undefined {
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
        for (const node of this._bottleNodes) {
            const comp = node.getComponent('BottleComponent') as any;
            if (comp && comp.setEnabled) {
                comp.setEnabled(enabled);
            }
        }
    }
}

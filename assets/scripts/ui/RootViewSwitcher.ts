import { _decorator, Component, Node } from 'cc';
import { NavigationManager, NavigationEvent, SceneName } from '../utils/NavigationManager';

const { ccclass, property } = _decorator;

/**
 * 根视图切换器
 * 挂载在场景根节点，根据 NavigationManager.currentScene 显隐 HomeRoot/MapRoot/GameRoot
 * 监听 SCENE_LOAD_START 以在单场景模式下切换视图时更新显隐
 */
@ccclass('RootViewSwitcher')
export class RootViewSwitcher extends Component {
    @property(Node)
    homeRoot: Node | null = null;

    @property(Node)
    mapRoot: Node | null = null;

    @property(Node)
    gameRoot: Node | null = null;

    private _nav: NavigationManager | null = null;
    private _onSceneChange = (): void => this.applyCurrentScene();

    protected onLoad(): void {
        this._nav = NavigationManager.instance;
        if (!this._nav) {
            return;
        }
        this._nav.addListener(NavigationEvent.SCENE_LOAD_START, this._onSceneChange);
        this.applyCurrentScene();
    }

    protected onDestroy(): void {
        if (this._nav) {
            this._nav.removeListener(NavigationEvent.SCENE_LOAD_START, this._onSceneChange);
        }
    }

    private applyCurrentScene(): void {
        if (!this._nav) return;
        const scene = this._nav.currentScene;
        if (this.homeRoot) {
            this.homeRoot.active = scene === SceneName.HOME;
        }
        if (this.mapRoot) {
            this.mapRoot.active = scene === SceneName.MAP;
        }
        if (this.gameRoot) {
            this.gameRoot.active = scene === SceneName.GAME;
        }
    }
}

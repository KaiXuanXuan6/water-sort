import { _decorator, Component, Button, Label } from 'cc';
import { NavigationManager, NavigationEvent, SceneName } from '../utils/NavigationManager';
import { LevelConfig } from '../data/LevelConfig';

const { ccclass, property } = _decorator;

/**
 * TopBar 控制器
 * 统一管理返回按钮、设置按钮与标题：按场景显隐返回键、更新标题文案，点击分别调用 back() / showSettingsPopup()
 */
@ccclass('TopBarController')
export class TopBarController extends Component {
    @property(Button)
    backButton: Button | null = null;

    @property(Button)
    settingButton: Button | null = null;

    @property(Label)
    titleLabel: Label | null = null;

    private _nav: NavigationManager | null = null;
    private _onSceneChange = (): void => {
        this.applyBackButtonVisibility();
        this.applyTitle();
    };

    protected onLoad(): void {
        this._nav = NavigationManager.instance;
        if (this._nav) {
            this._nav.addListener(NavigationEvent.SCENE_LOAD_START, this._onSceneChange);
        }
        this.applyBackButtonVisibility();
        this.applyTitle();
        this.bindButtonClicks();
    }

    protected onDestroy(): void {
        if (this._nav) {
            this._nav.removeListener(NavigationEvent.SCENE_LOAD_START, this._onSceneChange);
        }
        if (this.backButton) {
            this.backButton.node.off(Button.EventType.CLICK, this.onBackClick, this);
        }
        if (this.settingButton) {
            this.settingButton.node.off(Button.EventType.CLICK, this.onSettingClick, this);
        }
    }

    private applyBackButtonVisibility(): void {
        if (!this.backButton) return;
        const showBack = this._nav && this._nav.currentScene !== SceneName.HOME;
        this.backButton.node.active = showBack;
    }

    private applyTitle(): void {
        if (!this.titleLabel || !this._nav) return;
        const scene = this._nav.currentScene;
        switch (scene) {
            case SceneName.HOME:
                this.titleLabel.string = '';
                break;
            case SceneName.MAP:
                this.titleLabel.string = '选择关卡';
                break;
            case SceneName.COLLECTION:
                this.titleLabel.string = '图鉴';
                break;
            case SceneName.GAME: {
                const levelId = this._nav.selectedLevelId || '';
                const num = levelId ? LevelConfig.levelIdToLevelNum(levelId) : 1;
                this.titleLabel.string = 'Level ' + num;
                break;
            }
            default:
                this.titleLabel.string = '';
        }
    }

    private bindButtonClicks(): void {
        if (this.backButton) {
            this.backButton.node.on(Button.EventType.CLICK, this.onBackClick, this);
        }
        if (this.settingButton) {
            this.settingButton.node.on(Button.EventType.CLICK, this.onSettingClick, this);
        }
    }

    private onBackClick(): void {
        this._nav?.back();
    }

    private onSettingClick(): void {
        this._nav?.showSettingsPopup();
    }
}

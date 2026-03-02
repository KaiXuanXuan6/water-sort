import { _decorator, Component, Button, Label, Layout } from 'cc';
import { NavigationManager, NavigationEvent, SceneName } from '../utils/NavigationManager';
import { SoundManager } from '../utils/SoundManager';
import { LevelConfig } from '../data/LevelConfig';
import { getCoinCount, setOnCoinCountChange } from '../data/UserProfile';

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

    @property(Label)
    coinNumLabel: Label | null = null;

    private _nav: NavigationManager | null = null;
    private _onSceneChange = (): void => {
        this.applyBackButtonVisibility();
        this.applyTitle();
        this.applyCoinCount();
    };

    protected onLoad(): void {
        this._nav = NavigationManager.instance;
        if (this._nav) {
            this._nav.addListener(NavigationEvent.SCENE_LOAD_START, this._onSceneChange);
        }
        setOnCoinCountChange(() => this.applyCoinCount());
        this.applyBackButtonVisibility();
        this.applyTitle();
        this.applyCoinCount();
        this.bindButtonClicks();
    }

    protected onDestroy(): void {
        setOnCoinCountChange(null);
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

    private applyCoinCount(): void {
        if (this.coinNumLabel) {
            this.coinNumLabel.string = String(getCoinCount());
        }
    }

    private applyBackButtonVisibility(): void {
        if (!this.backButton) return;
        const showBack = this._nav && this._nav.currentScene !== SceneName.HOME;
        this.backButton.node.active = showBack;
        // 触发布局重算，使隐藏返回按钮后设置按钮仍保持在容器左侧
        const leftButton = this.backButton.node.parent;
        const layout = leftButton?.getComponent(Layout);
        layout?.updateLayout();
    }

    private applyTitle(): void {
        if (!this.titleLabel || !this._nav) return;
        const scene = this._nav.currentScene;
        switch (scene) {
            case SceneName.HOME:
                this.titleLabel.string = '';
                break;
            case SceneName.MAP:
                this.titleLabel.string = 'Levels';
                break;
            case SceneName.COLLECTION:
                this.titleLabel.string = 'Collection';
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
        SoundManager.instance?.playOneShot('button');
        this._nav?.back();
    }

    private onSettingClick(): void {
        SoundManager.instance?.playOneShot('button');
        this._nav?.showSettingsPopup();
    }
}

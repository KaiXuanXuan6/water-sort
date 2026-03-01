import { _decorator, Component, Node, Button, Toggle, tween, Vec3 } from 'cc';
import { NavigationManager, NavigationEvent, PopupName } from '../utils/NavigationManager';
import { SoundManager } from '../utils/SoundManager';
import { loadFromStorage, getSoundEnabled, setSoundEnabled, getMusicEnabled, setMusicEnabled } from '../data/UserProfile';

const { ccclass, property } = _decorator;

/**
 * 用户设置数据
 */
interface UserSettings {
    /** 是否开启音效（短音效） */
    soundEnabled: boolean;
    /** 是否开启背景音乐 */
    musicEnabled: boolean;
}

/**
 * 设置弹窗控制器
 * 负责音效、震动开关等设置功能
 */
@ccclass('SettingPopupController')
export class SettingPopupController extends Component {
    // UI 组件绑定
    @property(Button)
    closeButton: Button | null = null;

    @property(Toggle)
    soundSwitch: Toggle | null = null;

    @property(Toggle)
    musicSwitch: Toggle | null = null;

    @property(Node)
    contentNode: Node | null = null;

    private _navManager: NavigationManager | null = null;
    private _isShowed: boolean = false;

    /**
     * 组件生命周期：加载
     */
    protected onLoad(): void {
        console.log('[SettingPopupController] 弹窗加载完成');

        this._navManager = NavigationManager.instance;

        if (!this._navManager) {
            console.error('[SettingPopupController] 未找到导航管理器');
            return;
        }

        this._isShowed = false;
        this.node.active = false;

        // 绑定事件
        this.bindEvents();

        // 加载用户设置
        this.loadUserSettings();

        // 更新UI显示
        this.updateUI();

        // 监听导航事件
        this.setupNavigationListeners();
    }

    /**
     * 组件生命周期：启动
     */
    protected start(): void {
        console.log('[SettingPopupController] 弹窗启动');
    }

    /**
     * 组件生命周期：销毁
     */
    protected onDestroy(): void {
        if (this._navManager) {
            this._navManager.removeListener(NavigationEvent.POPUP_OPEN, this.onPopupOpen);
        }
    }

    /**
     * 绑定按钮事件
     */
    private bindEvents(): void {
        if (this.closeButton) {
            this.closeButton.node.on(Button.EventType.CLICK, this.onCloseClick, this);
        }

        if (this.soundSwitch) {
            this.soundSwitch.node.on(Toggle.EventType.TOGGLE, this.onSoundSwitch, this);
        }

        if (this.musicSwitch) {
            this.musicSwitch.node.on(Toggle.EventType.TOGGLE, this.onMusicSwitch, this);
        }
    }

    /**
     * 设置导航事件监听
     */
    private setupNavigationListeners(): void {
        if (this._navManager) {
            this._navManager.addListener(NavigationEvent.POPUP_OPEN, this.onPopupOpen);
        }
    }

    /**
     * 加载用户设置
     */
    private loadUserSettings(): void {
        loadFromStorage();
    }

    /**
     * 更新UI显示
     */
    private updateUI(): void {
        if (this.soundSwitch) {
            this.soundSwitch.isChecked = getSoundEnabled();
        }

        if (this.musicSwitch) {
            this.musicSwitch.isChecked = getMusicEnabled();
        }
    }

    /**
     * 显示弹窗
     */
    public show(): void {
        this._isShowed = true;
        this.node.active = true;
        this.updateUI();

        // Dialog 出现动画：从 scale 0 到 scale 0.75，带 backOut 回弹效果
        if (this.contentNode) {
            this.contentNode.setScale(0, 0, 0);
            tween(this.contentNode)
                .to(0.3, { scale: new Vec3(0.75, 0.75, 0.75) }, { easing: 'backOut' })
                .start();
        }
    }

    /**
     * 隐藏弹窗
     */
    public hide(): void {
        this.finishHide();
    }

    private finishHide(): void {
        this._isShowed = false;
        this.node.active = false;
        this._navManager?.closePopup();
    }

    /**
     * 弹窗打开事件处理
     */
    private onPopupOpen = (data: any): void => {
        console.log('[SettingPopupController] 收到 POPUP_OPEN 事件:', data?.popupName);
        if (data.popupName === PopupName.SETTINGS) {
            this.show();
        }
    };

    /**
     * 关闭按钮点击
     */
    private onCloseClick(): void {
        SoundManager.instance?.playOneShot('button');
        this.hide();
    }

    /**
     * 音效开关切换
     */
    private onSoundSwitch(toggle: Toggle): void {
        setSoundEnabled(toggle.isChecked);
    }

    /**
     * 背景音乐开关切换
     */
    private onMusicSwitch(toggle: Toggle): void {
        setMusicEnabled(toggle.isChecked);
        SoundManager.instance?.applyMusicSetting();
    }

    /**
     * 获取是否显示中
     */
    public get isShowed(): boolean {
        return this._isShowed;
    }

    /**
     * 获取当前设置
     */
    public get userSettings(): UserSettings {
        return {
            soundEnabled: getSoundEnabled(),
            musicEnabled: getMusicEnabled()
        };
    }

    /**
     * 设置音效状态
     */
    public setSoundEnabled(enabled: boolean): void {
        setSoundEnabled(enabled);
        this.updateUI();
    }

    /**
     * 设置背景音乐状态
     */
    public setMusicEnabled(enabled: boolean): void {
        setMusicEnabled(enabled);
        SoundManager.instance?.applyMusicSetting();
        this.updateUI();
    }
}

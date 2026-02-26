import { _decorator, Component, Button, Toggle } from 'cc';
import { NavigationManager, NavigationEvent, PopupName } from '../utils/NavigationManager';
import { loadFromStorage, getSoundEnabled, setSoundEnabled, getVibrationEnabled, setVibrationEnabled } from '../data/UserProfile';
import { PopupScaleAnim } from '../animation/PopupScaleAnim';

const { ccclass, property } = _decorator;

/**
 * 用户设置数据
 */
interface UserSettings {
    /** 是否开启音效 */
    soundEnabled: boolean;
    /** 是否开启震动 */
    vibrationEnabled: boolean;
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

        // 初始隐藏弹窗
        this.hide();

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
            this.musicSwitch.isChecked = getVibrationEnabled();
        }
    }

    /**
     * 显示弹窗（带从小到大的缩放动画）
     */
    public show(): void {
        this._isShowed = true;
        this.node.active = true;
        this.updateUI();

        const content = this.node.children[0];
        const anim = content?.getComponent(PopupScaleAnim);
        if (anim) {
            anim.playShow();
        }
    }

    /**
     * 隐藏弹窗（播缩小动画后关闭）
     */
    public hide(): void {
        const content = this.node.children[0];
        const anim = content?.getComponent(PopupScaleAnim);
        if (anim) {
            anim.playHide(() => {
                this.finishHide();
            });
        } else {
            this.finishHide();
        }
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
        if (data.popupName === PopupName.SETTINGS) {
            console.log('[SettingPopupController] 收到打开设置弹窗请求');
            this.show();
        }
    };

    /**
     * 关闭按钮点击
     */
    private onCloseClick(): void {
        this.hide();
    }

    /**
     * 音效开关切换
     */
    private onSoundSwitch(toggle: Toggle): void {
        setSoundEnabled(toggle.isChecked);
    }

    /**
     * 音乐/震动开关切换
     */
    private onMusicSwitch(toggle: Toggle): void {
        setVibrationEnabled(toggle.isChecked);
        if (toggle.isChecked) {
            this.testVibration();
        }
    }

    /**
     * 测试震动
     */
    private testVibration(): void {
        // TODO: 实现设备震动
        console.log('[SettingPopupController] 测试震动');
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
            vibrationEnabled: getVibrationEnabled()
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
     * 设置震动状态
     */
    public setVibrationEnabled(enabled: boolean): void {
        setVibrationEnabled(enabled);
        this.updateUI();
    }
}

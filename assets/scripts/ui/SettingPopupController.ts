import { _decorator, Component, Node, Button, Label, Toggle } from 'cc';
import { NavigationManager, NavigationEvent, PopupName } from '../utils/NavigationManager';

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
    soundToggle: Toggle | null = null;

    @property(Toggle)
    vibrationToggle: Toggle | null = null;

    @property(Label)
    versionLabel: Label | null = null;

    private _navManager: NavigationManager | null = null;
    private _userSettings: UserSettings = {
        soundEnabled: true,
        vibrationEnabled: true
    };
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

        // 显示版本号
        this.updateVersionLabel();
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

        if (this.soundToggle) {
            this.soundToggle.node.on(Toggle.EventType.TOGGLE, this.onSoundToggle, this);
        }

        if (this.vibrationToggle) {
            this.vibrationToggle.node.on(Toggle.EventType.TOGGLE, this.onVibrationToggle, this);
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
        // TODO: 从本地存储加载用户设置
        // const savedSettings = localStorage.getItem('user_settings');
        // if (savedSettings) {
        //     this._userSettings = JSON.parse(savedSettings);
        // }

        console.log('[SettingPopupController] 加载用户设置:', this._userSettings);
    }

    /**
     * 保存用户设置
     */
    private saveUserSettings(): void {
        // TODO: 保存用户设置到本地存储
        // localStorage.setItem('user_settings', JSON.stringify(this._userSettings));

        console.log('[SettingPopupController] 保存用户设置:', this._userSettings);
    }

    /**
     * 更新UI显示
     */
    private updateUI(): void {
        if (this.soundToggle) {
            this.soundToggle.isChecked = this._userSettings.soundEnabled;
        }

        if (this.vibrationToggle) {
            this.vibrationToggle.isChecked = this._userSettings.vibrationEnabled;
        }
    }

    /**
     * 更新版本号显示
     */
    private updateVersionLabel(): void {
        if (this.versionLabel) {
            // TODO: 从项目配置获取版本号
            this.versionLabel.string = 'v1.0.0';
        }
    }

    /**
     * 显示弹窗
     */
    public show(): void {
        console.log('[SettingPopupController] 显示弹窗');

        this._isShowed = true;
        this.node.active = true;

        // 刷新UI显示
        this.updateUI();
    }

    /**
     * 隐藏弹窗
     */
    public hide(): void {
        console.log('[SettingPopupController] 隐藏弹窗');

        this._isShowed = false;
        this.node.active = false;
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
        console.log('[SettingPopupController] 点击关闭按钮');
        this.hide();
        this._navManager?.closePopup();
    }

    /**
     * 音效开关切换
     */
    private onSoundToggle(isChecked: boolean): void {
        console.log('[SettingPopupController] 音效开关:', isChecked);
        this._userSettings.soundEnabled = isChecked;
        this.saveUserSettings();
    }

    /**
     * 震动开关切换
     */
    private onVibrationToggle(isChecked: boolean): void {
        console.log('[SettingPopupController] 震动开关:', isChecked);
        this._userSettings.vibrationEnabled = isChecked;
        this.saveUserSettings();

        // 测试震动
        if (isChecked) {
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
        return { ...this._userSettings };
    }

    /**
     * 设置音效状态
     */
    public setSoundEnabled(enabled: boolean): void {
        this._userSettings.soundEnabled = enabled;
        this.updateUI();
        this.saveUserSettings();
    }

    /**
     * 设置震动状态
     */
    public setVibrationEnabled(enabled: boolean): void {
        this._userSettings.vibrationEnabled = enabled;
        this.updateUI();
        this.saveUserSettings();
    }
}

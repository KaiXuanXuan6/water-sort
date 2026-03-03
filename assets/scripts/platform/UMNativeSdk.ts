import { sys } from 'cc';

type Callback = (() => void) | null;

/**
 * 原生广告桥接：方法名需与原生反射回调保持一致。
 */
class _UMNativeSdk {
    private rewardSuccessCallback: Callback = null;
    private rewardFailCallback: Callback = null;
    private rewardErrorCallback: Callback = null;

    constructor() {
        (window as unknown as Record<string, unknown>)['UMNativeSdk'] = this;
    }

    /**
     * 播放视频
     */
    public ShowVideo(success: () => void, fail: Callback = null, error: Callback = null): void {
        this.CallJava('ShowVideo', '()V');
        this.rewardSuccessCallback = success;
        this.rewardFailCallback = fail;
        this.rewardErrorCallback = error;
    }

    /**
     * 原生回调：视频播放结果
     */
    public AfterPlayVideo(status: string): void {
        console.log('AfterPlayVideo', status);
        if (status === 'success') {
            this.rewardSuccessCallback?.();
        } else if (status === 'fail') {
            this.rewardFailCallback?.();
        } else {
            this.rewardErrorCallback?.();
        }
        this.clearVideoCallbacks();
    }

    /**
     * 展示开屏
     */
    public ShowSplash(): void {
        this.CallJava('ShowSplash', '()V');
    }

    /**
     * 展示 Banner
     */
    public ShowBanner(): void {
        this.CallJava('ShowBanner', '()V');
    }

    /**
     * 关闭 Banner
     */
    public CloseBanner(): void {
        this.CallJava('CloseBanner', '()V');
    }

    /**
     * 展示插屏
     */
    public ShowInterstitial(type: string = ''): void {
        this.CallJava('ShowInterstitial', '(Ljava/lang/String;)V', type);
    }

    /**
     * 原生回调：插屏播放结束
     */
    public AfterPlayInterstitial(type: string): void {
        console.log('AfterPlayInterstitial', type);
    }

    /**
     * 上报埋点
     */
    public LogEvent(name: string): void {
        this.CallJava('LogEvent', '(Ljava/lang/String;)V', name);
    }

    /**
     * 获得在线参数
     */
    public GetOnlineValue(key: string): string {
        return String(this.CallJava('GetOnlineValue', '(Ljava/lang/String;)Ljava/lang/String;', key) || '');
    }

    /**
     * 震动（复刻旧接口：单参数）
     */
    public PhoneShake(millisecond: number): void {
        this.CallJava('PhoneShake', '(I)V', millisecond);
    }

    public SetConfigVersion(version: string): void {
        this.CallJava('SetConfigVersion', '(Ljava/lang/String;)V', version);
    }

    public FetchConfig(): void {
        this.CallJava('FetchConfig', '()V');
    }

    public AfterFetchConfig(status: string): void {
        console.log(`AfterFetchConfig${status}`);
        if (status === 'success') {
            const gameController = (window as unknown as { GameController?: { SDKManager?: { FetchConfig?: () => void } } }).GameController;
            gameController?.SDKManager?.FetchConfig?.();
        }
    }

    /**
     * 通用原生调用
     */
    public CallJava(staticMethodName: string, methodSignature: string, ...parameters: unknown[]): unknown {
        console.log('CallJava', staticMethodName, methodSignature, ...parameters);
        if (sys.platform === sys.Platform.ANDROID) {
            const bridge = (jsb as unknown as {
                reflection?: { callStaticMethod: (...args: unknown[]) => unknown };
            }).reflection;
            if (!bridge || typeof bridge.callStaticMethod !== 'function') {
                return '';
            }
            return bridge.callStaticMethod(
                'com.gzcc.general.ad.AdSDK',
                staticMethodName,
                methodSignature,
                ...parameters
            );
        }
        return '';
    }

    private clearVideoCallbacks(): void {
        this.rewardSuccessCallback = null;
        this.rewardFailCallback = null;
        this.rewardErrorCallback = null;
    }
}

export const UMNativeSdk = new _UMNativeSdk();

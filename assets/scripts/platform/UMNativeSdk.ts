import { sys } from 'cc';

class _UMNativeSdk {
    private rewardSuccessCallback: Function
    private rewardFailCallback: Function
    private rewardErrorCallback: Function

    constructor() {
        window["UMNativeSdk"] = this;
    }
    /**
     *播放视频
     * @param {Function} success 播放完成回调
     * @param {Function} [fail=null]    播放未完成回调
     * @param {Function} [error=null]   播放失败回调
     * @memberof _UMSdk
     */
    ShowVideo(success: Function, fail: Function = null, error: Function = null) {
        this.CallJava("ShowVideo", '()V');
        this.rewardSuccessCallback = success
        this.rewardFailCallback = fail
        this.rewardErrorCallback = error
    }

    AfterPlayVideo(status: string) {
        console.log("AfterPlayVideo", status)
        if (status == "success") {
            if (this.rewardSuccessCallback) {
                this.rewardSuccessCallback()
            }
        } else if (status == "fail") {
            if (this.rewardFailCallback) {
                this.rewardFailCallback()
            }
        }
    }

    /**
     *展示banner
     * @memberof _UMSdk
     */
    ShowBanner() {
        this.CallJava("ShowBanner", '()V');
    }

    /**
     *关闭banner
     * @memberof _UMSdk
     */
    CloseBanner() {
        this.CallJava("CloseBanner", '()V');
    }

    /**
     *展示插屏
     *
     * @memberof _UMSdk
     */
    ShowInterstitial(type: string = "") {
        this.CallJava("ShowInterstitial", '(Ljava/lang/String;)V', type);
    }

    AfterPlayInterstitial(type: string) {
        console.log("AfterPlayInterstitial", type)
    }

    LogEvent(name: string) {
        this.CallJava("LogEvent", '(Ljava/lang/String;)V', name);
    }
    /***
     * 
     */
    GetOnlineValue(key: string): string {
        return String(this.CallJava("GetOnlineValue", '(Ljava/lang/String;)Ljava/lang/String;', key) ?? "");
    }

    PhoneShake(millisecond: number) {
        this.CallJava("PhoneShake", '(I)V', millisecond);
    }

    SetConfigVersion(version: string) {
        this.CallJava("SetConfigVersion", '(Ljava/lang/String;)V', version);
    }

    FetchConfig() {
        this.CallJava("FetchConfig", '()V');
    }

    AfterFetchConfig(status: string) {
        console.log("AfterFetchConfig" + status)
        if (status == "success") {
            const gameController = (window as unknown as {
                GameController?: { SDKManager?: { FetchConfig?: () => void } };
            }).GameController;
            gameController?.SDKManager?.FetchConfig?.();
        }
    }

    /**
     * 
     * @param className 类名 com/johnny/test/WxApiHelper
     * @param staticMethodName 静态方法名 
     * @param methodSignature 参数标识 ()V 
     * int        I
        float        F
        boolean        Z
        String        Ljava/lang/String;
    * @param parameters 参数
    */
    CallJava(staticMethodName: string, methodSignature: string, ...parameters: unknown[]) {
        console.log("CallJava", staticMethodName, methodSignature, ...parameters)
        if (sys.platform == sys.Platform.ANDROID) {
            const bridge = (jsb as unknown as {
                reflection?: { callStaticMethod: (...args: unknown[]) => unknown };
            }).reflection;
            if (!bridge || typeof bridge.callStaticMethod !== 'function') {
                return "";
            }
            return bridge.callStaticMethod("com.gzcc.general.ad.AdSDK", staticMethodName, methodSignature, ...parameters)
        } else {
            return ""
        }
    }
}
export const UMNativeSdk = new _UMNativeSdk()
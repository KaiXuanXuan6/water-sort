/**
 * 广告服务：集中广告触发策略，避免业务层重复实现。
 * 当前未接入任何广告 SDK，仅保留可替换的占位接口。
 */
class _AdService {
    /**
     * 应用回到前台时触发开屏广告。
     */
    public onAppForeground(): void {
        try {
            this.showSplash();
        } catch (err) {
            console.warn('[AdService] ShowSplash 调用失败', err);
        }
    }

    /**
     * 结算前展示插屏广告，然后继续原有流程。
     */
    public showInterstitialThen(next: () => void): void {
        try {
            this.showinterstitial();
        } catch (err) {
            console.warn('[AdService] ShowInterstitial 调用失败', err);
        }
        next();
    }

    /**
     * 占位：前台广告接口，后续接入真实 SDK 时替换此实现。
     */
    private showSplash(): void {
        // no-op
    }

    /**
     * 占位：结算插屏接口，后续接入真实 SDK 时替换此实现。
     */
    private showinterstitial(): void {
        // no-op
    }
}

export const AdService = new _AdService();

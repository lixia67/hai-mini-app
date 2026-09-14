export type WechatLoginIdentity = {
  openid: string;
  unionid?: string;
  sessionKey?: string;
};

export abstract class WechatLoginAdapter {
  abstract exchangeCode(code: string): Promise<WechatLoginIdentity>;
}

export class UnconfiguredWechatLoginAdapter extends WechatLoginAdapter {
  async exchangeCode(): Promise<WechatLoginIdentity> {
    throw new Error('WECHAT_LOGIN_NOT_CONFIGURED');
  }
}

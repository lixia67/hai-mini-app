import { Injectable, UnauthorizedException } from '@nestjs/common';

export type WechatLoginIdentity = {
  openid: string;
  unionid?: string;
  sessionKey?: string;
};

type Code2SessionResponse = {
  openid?: string;
  unionid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
};

export abstract class WechatLoginAdapter {
  abstract exchangeCode(code: string): Promise<WechatLoginIdentity>;
}

@Injectable()
export class HttpWechatLoginAdapter extends WechatLoginAdapter {
  async exchangeCode(code: string): Promise<WechatLoginIdentity> {
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;
    if (!appId || !appSecret) throw new Error('WECHAT_LOGIN_NOT_CONFIGURED');

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', appSecret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new UnauthorizedException('WeChat login unavailable');

    const payload = (await response.json()) as Code2SessionResponse;
    if (payload.errcode || !payload.openid) {
      throw new UnauthorizedException('Invalid WeChat login code');
    }

    return {
      openid: payload.openid,
      unionid: payload.unionid,
      sessionKey: payload.session_key,
    };
  }
}

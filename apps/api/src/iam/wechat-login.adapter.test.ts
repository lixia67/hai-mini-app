import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { HttpWechatLoginAdapter } from './wechat-login.adapter';

describe('HttpWechatLoginAdapter', () => {
  beforeEach(() => {
    process.env.WECHAT_APP_ID = 'test-app-id';
    process.env.WECHAT_APP_SECRET = 'test-app-secret';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.WECHAT_APP_ID;
    delete process.env.WECHAT_APP_SECRET;
  });

  it('maps code2Session success response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ openid: 'openid-1', unionid: 'union-1', session_key: 'server-only-key' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await new HttpWechatLoginAdapter().exchangeCode('wx-code');
    expect(result).toEqual({ openid: 'openid-1', unionid: 'union-1', sessionKey: 'server-only-key' });

    const calledUrl = fetchMock.mock.calls[0]?.[0] as URL;
    expect(calledUrl.searchParams.get('appid')).toBe('test-app-id');
    expect(calledUrl.searchParams.get('js_code')).toBe('wx-code');
  });

  it('rejects WeChat business errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ errcode: 40029, errmsg: 'invalid code' }),
    }));

    await expect(new HttpWechatLoginAdapter().exchangeCode('bad-code')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('requires server-side WeChat configuration', async () => {
    delete process.env.WECHAT_APP_SECRET;
    await expect(new HttpWechatLoginAdapter().exchangeCode('code')).rejects.toThrow('WECHAT_LOGIN_NOT_CONFIGURED');
  });
});

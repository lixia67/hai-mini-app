import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { requireString } from '../common/request-validation';
import { AuthorizationGuard, type AuthenticatedRequest } from './authorization';
import { ConsumerAuthService } from './consumer-auth.service';
import { StaffAuthService } from './staff-auth.service';

type RequestMeta = AuthenticatedRequest & { ip?: string };

@Controller('iam')
export class IamController {
  constructor(
    private readonly staffAuth: StaffAuthService,
    private readonly consumerAuth: ConsumerAuthService,
  ) {}

  private meta(request: RequestMeta) {
    const rawAgent = request.headers['user-agent'];
    return { ipAddress: request.ip, userAgent: Array.isArray(rawAgent) ? rawAgent[0] : rawAgent };
  }

  @Post('staff/login')
  login(@Body() body: { username?: unknown; password?: unknown }, @Req() request: RequestMeta) {
    const username = requireString(body.username, 'username', { min: 2, max: 64 });
    const password = requireString(body.password, 'password', { min: 8, max: 256 });
    return this.staffAuth.login(username, password, this.meta(request));
  }

  @Post('staff/refresh')
  refresh(@Body() body: { refreshToken?: unknown }, @Req() request: RequestMeta) {
    const refreshToken = requireString(body.refreshToken, 'refreshToken', { min: 20, max: 512 });
    return this.staffAuth.refresh(refreshToken, this.meta(request));
  }

  @Post('staff/logout')
  async logout(@Body() body: { refreshToken?: unknown }) {
    const refreshToken = requireString(body.refreshToken, 'refreshToken', { min: 20, max: 512 });
    await this.staffAuth.logout(refreshToken);
    return { ok: true };
  }

  @Post('consumer/wechat/login')
  consumerWechatLogin(@Body() body: { code?: unknown }, @Req() request: RequestMeta) {
    const code = requireString(body.code, 'code', { min: 1, max: 256 });
    return this.consumerAuth.loginWithWechatCode(code, this.meta(request));
  }

  @Get('session/me')
  @UseGuards(AuthorizationGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { identity: request.auth };
  }
}

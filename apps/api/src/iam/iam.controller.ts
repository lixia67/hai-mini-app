import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthorizationGuard, type AuthenticatedRequest } from './authorization';
import { StaffAuthService } from './staff-auth.service';

type RequestMeta = AuthenticatedRequest & { ip?: string };

@Controller('iam')
export class IamController {
  constructor(private readonly staffAuth: StaffAuthService) {}

  private meta(request: RequestMeta) {
    const rawAgent = request.headers['user-agent'];
    return { ipAddress: request.ip, userAgent: Array.isArray(rawAgent) ? rawAgent[0] : rawAgent };
  }

  @Post('staff/login')
  login(@Body() body: { username?: string; password?: string }, @Req() request: RequestMeta) {
    return this.staffAuth.login(body.username ?? '', body.password ?? '', this.meta(request));
  }

  @Post('staff/refresh')
  refresh(@Body() body: { refreshToken?: string }, @Req() request: RequestMeta) {
    return this.staffAuth.refresh(body.refreshToken ?? '', this.meta(request));
  }

  @Post('staff/logout')
  async logout(@Body() body: { refreshToken?: string }) {
    await this.staffAuth.logout(body.refreshToken ?? '');
    return { ok: true };
  }

  @Get('session/me')
  @UseGuards(AuthorizationGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { identity: request.auth };
  }
}

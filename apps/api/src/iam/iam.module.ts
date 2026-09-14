import { Controller, Get, Module, Req, UseGuards } from '@nestjs/common';
import { AuthorizationGuard, type AuthenticatedRequest } from './authorization';
import { UnconfiguredWechatLoginAdapter, WechatLoginAdapter } from './wechat-login.adapter';

@Controller('iam')
class IamController {
  @Get('session/me')
  @UseGuards(AuthorizationGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { identity: request.auth };
  }
}

@Module({
  controllers: [IamController],
  providers: [
    AuthorizationGuard,
    { provide: WechatLoginAdapter, useClass: UnconfiguredWechatLoginAdapter },
  ],
  exports: [WechatLoginAdapter],
})
export class IamModule {}

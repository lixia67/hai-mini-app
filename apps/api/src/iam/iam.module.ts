import { Module } from '@nestjs/common';
import { AuthorizationGuard } from './authorization';
import { ConsumerAuthService } from './consumer-auth.service';
import { IamController } from './iam.controller';
import { PrismaService } from './prisma.service';
import { StaffAuthService } from './staff-auth.service';
import { HttpWechatLoginAdapter, WechatLoginAdapter } from './wechat-login.adapter';

@Module({
  controllers: [IamController],
  providers: [
    PrismaService,
    StaffAuthService,
    ConsumerAuthService,
    AuthorizationGuard,
    { provide: WechatLoginAdapter, useClass: HttpWechatLoginAdapter },
  ],
  exports: [WechatLoginAdapter],
})
export class IamModule {}

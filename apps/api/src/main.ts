import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IamModule } from './iam/iam.module';

@Controller('health')
class HealthController {
  @Get()
  health() {
    return { status: 'ok', service: 'api' };
  }
}

@Module({
  imports: [IamModule],
  controllers: [HealthController],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(Number(process.env.API_PORT ?? 3000));
}

void bootstrap();

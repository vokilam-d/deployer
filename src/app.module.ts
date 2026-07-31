import { Module } from '@nestjs/common';
import { DeployerModule } from './deployer/deployer.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [DeployerModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

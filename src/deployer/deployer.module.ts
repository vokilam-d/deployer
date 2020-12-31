import { HttpModule, Module } from '@nestjs/common';
import { DeployerController } from './controllers/deployer.controller';
import { DeployerService } from './services/deployer.service';
import { RepositoryService } from './services/repository.service';
import { GithubApiService } from './services/github-api.service';

@Module({
  imports: [HttpModule],
  controllers: [DeployerController],
  providers: [DeployerService, RepositoryService, GithubApiService]
})
export class DeployerModule {}

import { HttpService, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { InstallationDto } from '../../dtos/installation.dto';
import { AccessTokenDto } from '../../dtos/access-token.dto';
import { mergeMap, retryWhen } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';


@Injectable()
export class GithubApiService implements OnApplicationBootstrap {

  private logger = new Logger(GithubApiService.name);
  private githubApiEndpoint = 'https://api.github.com';
  private githubJwt: string;
  private accessTokens: Map<number, AccessTokenDto> = new Map();

  constructor(private readonly http: HttpService) { }

  async onApplicationBootstrap(): Promise<any> {
    this.initJwt();
    await this.setAccessTokens();
  }

  async get(path: string, headers?: any, installId?: number, tryCount: number = 0): Promise<any> {
    console.log('start get', path);
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers, installId);

    try {
      const response = await this.http.get(url, options).toPromise();
      return response.data;
    } catch (error) {
      if (GithubApiService.shouldResetAccessToken(error, installId, tryCount)) {
        await this.resetAccessToken(installId);
        return this.get(path, headers, installId, tryCount + 1);
      } else {
        throw error;
      }
    }
  }

  async post(path: string, data?: any, headers?: any, installId?: number, tryCount: number = 0): Promise<any> {
    console.log('start post', path);
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers, installId);

    try {
      const response = await this.http.post(url, data, options).toPromise();
      return response.data;
    } catch (error) {
      if (GithubApiService.shouldResetAccessToken(error, installId, tryCount)) {
        await this.resetAccessToken(installId);
        return this.post(path, data, headers, installId, tryCount + 1);
      } else {
        throw error;
      }
    }
  }

  async put(path: string, data?: any, headers?: any, installId?: number, tryCount: number = 0): Promise<any> {
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers, installId);

    try {
      const response = await this.http.put(url, data, options).toPromise();
      return response.data;
    } catch (error) {
      if (GithubApiService.shouldResetAccessToken(error, installId, tryCount)) {
        await this.resetAccessToken(installId);
        return this.put(path, data, headers, installId, tryCount + 1);
      } else {
        throw error;
      }
    }
  }

  async patch(path: string, data?: any, headers?: any, installId?: number, tryCount: number = 0): Promise<any> {
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers, installId);

    try {
      const response = await this.http.patch(url, data, options).toPromise();
      return response.data;
    } catch (error) {
      if (GithubApiService.shouldResetAccessToken(error, installId, tryCount)) {
        await this.resetAccessToken(installId);
        return this.patch(path, data, headers, installId, tryCount + 1);
      } else {
        throw error;
      }
    }
  }

  async delete(path: string, headers?: any, installId?: number, tryCount: number = 0): Promise<any> {
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers, installId);

    try {
      const response = await this.http.delete(url, options).toPromise();
      return response.data;
    } catch (error) {
      if (GithubApiService.shouldResetAccessToken(error, installId, tryCount)) {
        await this.resetAccessToken(installId);
        return this.delete(path, headers, installId, tryCount + 1);
      } else {
        throw error;
      }
    }
  }

  private initJwt() {
    const key = process.env.GITHUB_PRIVATE_KEY.replace(/\\n/gm, '\n');

    const toSeconds = (date: Date): number => {
      const time = date.getTime();
      return Math.floor(time / 1000);
    }

    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 10);

    const payload = {
      iat: toSeconds(new Date()),
      exp: toSeconds(expiration),
      iss: process.env.GITHUB_APP_IDENTIFIER
    };

    this.githubJwt = sign(payload, key, { algorithm: 'RS256' });
  }

  private async setAccessTokens() {
    let installs: InstallationDto[] = [];
    try {
      installs = await this.get('/app/installations');
    } catch (e) {
      this.logger.error(`Could not fetch installations:`);
      this.logger.error(e);
    }

    for (const install of installs) {
      await this.setAccessToken(install.id);
    }
  }

  private async setAccessToken(installationId: number) {
    try {
      this.accessTokens.delete(installationId);
      const token: AccessTokenDto = await this.post(`/app/installations/${installationId}/access_tokens`);
      this.accessTokens.set(installationId, token);
      this.logger.log(`Set access token for installation id "${installationId}"`)
    } catch (e) {
      this.logger.error(`Could not create access token for installation "${installationId}":`);
      this.logger.error(e);
    }
  }

  private async resetAccessToken(installationId: number): Promise<void> {
    this.initJwt();

    return new Promise((async resolve => {
      await this.setAccessToken(installationId);
      setTimeout(() => resolve(), 10000); // 10 sec
    }));
  }

  private buildUrl(path: string): string {
    if (path.indexOf('/') === 0) {
      path = path.slice(1);
    }

    return `${this.githubApiEndpoint}/${path}`;
  }

  private buildReqOptions(headers: any = { }, installId?: number): any {
    let authHeader: string;
    const token = this.accessTokens.get(installId);

    if (installId && token) {
      authHeader = `token ${token.token}`;
    } else {
      authHeader = `Bearer ${this.githubJwt}`;
    }

    console.log({ authHeader });


    return {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: authHeader,
        ...headers
      }
    };
  }

  private static shouldResetAccessToken(error: AxiosError, installId: number, tryCount: number): boolean {
    const isUnauthorized = error.response?.status === 401;

    return isUnauthorized && installId && tryCount === 0;
  }
}

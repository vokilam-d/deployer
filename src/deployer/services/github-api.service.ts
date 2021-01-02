import { HttpService, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { InstallationDto } from '../../dtos/installation.dto';
import { AccessTokenDto } from '../../dtos/access-token.dto';


@Injectable()
export class GithubApiService implements OnApplicationBootstrap {

  private logger = new Logger(GithubApiService.name);
  private githubApiEndpoint = 'https://api.github.com';
  private githubJwt: string;
  private accessTokens: Map<number, AccessTokenDto> = new Map();

  constructor(private readonly http: HttpService) { }

  async onApplicationBootstrap(): Promise<any> {
    this.initJwt();
    await this.getAccessTokens();
  }

  async get(path: string, headers?: any, installId?: number): Promise<any> {
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers, installId);

    const response = await this.http.get(url, options).toPromise();
    return response.data;
  }

  async post(path: string, data?: any, headers?: any, installId?: number): Promise<any> {
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers, installId);

    const response = await this.http.post(url, data, options).toPromise();
    return response.data;
  }

  async put(path: string, data?: any, headers?: any, installId?: number): Promise<any> {
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers, installId);

    const response = await this.http.put(url, data, options).toPromise();
    return response.data;
  }

  async patch(path: string, data?: any, headers?: any, installId?: number): Promise<any> {
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers, installId);

    const response = await this.http.patch(url, data, options).toPromise();
    return response.data;
  }

  async delete(path: string, headers?: any, installId?: number): Promise<any> {
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers, installId);

    const response = await this.http.delete(url, options).toPromise();
    return response.data;
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

  private async getAccessTokens() {
    let installs: InstallationDto[];
    try {
      installs = await this.get('/app/installations');
    } catch (e) {
      this.logger.error(`Could not fetch installations:`);
      this.logger.error(e);
    }

    for (const install of installs) {
      let token: AccessTokenDto;
      try {
        token = await this.post(`/app/installations/${install.id}/access_tokens`);
      } catch (e) {
        this.logger.error(`Could not create access token for installation "${install.id}":`);
        this.logger.error(e);
      }

      this.accessTokens.set(install.id, token);
    }
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


    return {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: authHeader,
        ...headers
      }
    };
  }
}

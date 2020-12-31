import { HttpService, Injectable } from '@nestjs/common';

@Injectable()
export class GithubApiService {
  private githubApiEndpoint = 'https://api.github.com';

  constructor(private readonly http: HttpService) { }

  async get(path: string, headers?: any): Promise<any> {
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers);

    const response = await this.http.get(url, options).toPromise();
    return response.data;
  }

  async post(path: string, data?: any, headers?: any): Promise<any> {
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers);

    const response = await this.http.post(url, data, options).toPromise();
    return response.data;
  }

  async put(path: string, data?: any, headers?: any): Promise<any> {
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers);

    const response = await this.http.put(url, data, options).toPromise();
    return response.data;
  }

  async patch(path: string, data?: any, headers?: any): Promise<any> {
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers);

    const response = await this.http.patch(url, data, options).toPromise();
    return response.data;
  }

  async delete(path: string, headers?: any): Promise<any> {
    const url = this.buildUrl(path);
    const options = this.buildReqOptions(headers);

    const response = await this.http.delete(url, options).toPromise();
    return response.data;
  }

  private buildUrl(path: string): string {
    if (path.indexOf('/') === 0) {
      path = path.slice(1);
    }

    return `${this.githubApiEndpoint}/${path}`;
  }

  private buildReqOptions(headers: any = { }): any {
    const authHeader = `token ${process.env.GITHUB_ACCESS_TOKEN}`;

    return {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: authHeader,
        ...headers
      }
    };
  }
}

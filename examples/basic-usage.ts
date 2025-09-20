import { Injectable, Module } from '@nestjs/common';
import { RedisModule, RedisService } from '@liaoliaots/nestjs-redis';
import { XeroClientHelper } from 'xero-nestjs-helper';

// Example service using XeroClientHelper
@Injectable()
export class XeroService {
  constructor(private readonly xeroHelper: XeroClientHelper) {}

  /**
   * Step 1: Get authorization URL to redirect user to Xero
   */
  async getAuthUrl(): Promise<string> {
    return await this.xeroHelper.getAuthorizationUrl();
  }

  /**
   * Step 2: Handle the callback from Xero OAuth
   */
  async handleOAuthCallback(code: string): Promise<any> {
    try {
      const tokenSet = await this.xeroHelper.getTokenFromCode(code);
      console.log('Authentication successful:', tokenSet);
      return tokenSet;
    } catch (error) {
      console.error('OAuth callback failed:', error);
      throw error;
    }
  }

  /**
   * Step 3: Get available tenants/organizations
   */
  async getOrganizations(): Promise<any[]> {
    try {
      const tenants = await this.xeroHelper.getTenants();
      console.log('Available tenants:', tenants);
      return tenants;
    } catch (error) {
      console.error('Failed to get tenants:', error);
      throw error;
    }
  }
}

// Example module setup
@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
  ],
  providers: [XeroClientHelper, XeroService],
  exports: [XeroService],
})
export class XeroModule {}

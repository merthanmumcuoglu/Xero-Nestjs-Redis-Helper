import { XeroClient } from 'xero-node';
import { Injectable } from '@nestjs/common';
import { DEFAULT_REDIS_NAMESPACE, RedisService } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';

/**
 * XeroClientHelper - A comprehensive helper class for Xero API integration
 * 
 * This class provides a simplified interface for Xero API operations including:
 * - OAuth2 authentication flow
 * - Token management with Redis storage
 * - Automatic token refresh
 * - Tenant management
 * 
 * @example
 * ```typescript
 * const xeroHelper = new XeroClientHelper(redisService);
 * const authUrl = await xeroHelper.getAuthorizationUrl();
 * const tokenSet = await xeroHelper.getTokenFromCode(code);
 * const tenants = await xeroHelper.getTenants();
 * ```
 */
@Injectable()
export class XeroClientHelper {
  private readonly xeroClient: XeroClient;
  private readonly redis: Redis;
  private readonly TOKEN_SET_KEY = 'xero:oauth:tokenSet';

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getClient(DEFAULT_REDIS_NAMESPACE);
    const redirectUris = (process.env.XERO_REDIRECT_URIS || '')
      .split(',')
      .map((v) => v.trim())
      .filter((v) => !!v);

    const scopes = (process.env.XERO_SCOPES || 'openid profile email accounting.settings accounting.reports.read accounting.journals.read accounting.contacts accounting.attachments accounting.transactions offline_access')
      .split(' ')
      .map((v) => v.trim())
      .filter((v) => !!v);

    this.xeroClient = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET,
      redirectUris:redirectUris,
      scopes:scopes,
      httpTimeout: Number(process.env.XERO_HTTP_TIMEOUT) || 30000,
      clockTolerance: Number(process.env.XERO_CLOCK_TOLERANCE) || 5,
    });
  }

  /**
   * Generate the authorization URL for Xero OAuth2 flow
   * 
   * @returns Promise<string> The authorization URL that users should visit
   * @throws Error if URL generation fails
   */
  async getAuthorizationUrl(): Promise<string> {
    try {
      return this.xeroClient.buildConsentUrl();
    } catch (error) {
      throw new Error(`Failed to generate authorization URL: ${error}`);
    }
  }

  /**
   * Exchange authorization code for access tokens
   * 
   * @param code - The authorization code received from Xero OAuth callback
   * @returns Promise<any> The token set containing access and refresh tokens
   * @throws Error if token exchange fails or redirect URI not configured
   */
  async getTokenFromCode(code: string): Promise<any> {
    if (!code?.trim()) {
      throw new Error('Authorization code is required');
    }

    const redirectUri = (this as any).xeroClient?.config?.redirectUris?.[0];
    if (!redirectUri) {
      throw new Error('XERO_REDIRECT_URIS not configured');
    }

    try {
      const callbackUrl = `${redirectUri}?code=${encodeURIComponent(code)}`;
      const tokenSet = await (this.xeroClient as any).apiCallback(callbackUrl);
      
      await this.setClientTokenSet(tokenSet);
      await (this.xeroClient as any).updateTenants();
      await this.saveTokenSet(tokenSet);
      
      return tokenSet;
    } catch (error) {
      throw new Error(`Failed to exchange authorization code: ${error}`);
    }
  }

  /**
   * Get all connected Xero tenants/organizations
   * 
   * @returns Promise<any[]> Array of tenant objects
   * @throws Error if authentication fails or tenants cannot be retrieved
   */
  async getTenants(): Promise<any[]> {
    await this.ensureAuthenticated();
    
    try {
      const x = this.xeroClient as any;
      if (!x.tenants || x.tenants.length === 0) {
        await x.updateTenants();
      }
      return x.tenants || [];
    } catch (error) {
      throw new Error(`Failed to retrieve tenants: ${error}`);
    }
  }

  /**
   * Get the active tenant ID (uses second tenant by default)
   * 
   * @returns Promise<string> The tenant ID
   * @throws Error if no tenant is found
   * @private
   */
  private async getActiveTenantId(): Promise<string> {
    await this.ensureAuthenticated();
    const tenants = await this.getTenants();
    const tenantId = tenants?.[1]?.tenantId;
    if (!tenantId) {
      throw new Error('No connected Xero tenant found');
    }
    return tenantId;
  }

  /**
   * Save token set to Redis storage
   * 
   * @param tokenSet - The token set to save
   * @private
   */
  private async saveTokenSet(tokenSet: any): Promise<void> {
    try {
      const data = JSON.stringify(tokenSet || {});
      await this.redis.set(this.TOKEN_SET_KEY, data);
    } catch (error) {
      console.error('Failed to save token set:', error);
    }
  }

  /**
   * Load token set from Redis storage
   * 
   * @returns Promise<any | null> The stored token set or null if not found
   * @private
   */
  private async loadTokenSet(): Promise<any | null> {
    try {
      const raw = await this.redis.get(this.TOKEN_SET_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.error('Failed to load token set:', error);
      return null;
    }
  }

  /**
   * Set token set on the Xero client
   * 
   * @param tokenSet - The token set to apply
   * @private
   */
  private async setClientTokenSet(tokenSet: any): Promise<void> {
    if (!tokenSet) return;
    const client: any = this.xeroClient as any;
    if (typeof client.setTokenSet === 'function') {
      await client.setTokenSet(tokenSet);
    } else {
      client.tokenSet = tokenSet;
    }
  }

  /**
   * Check if token is expired or near expiry (within 60 seconds)
   * 
   * @param tokenSet - The token set to check
   * @returns boolean - True if expired or near expiry
   * @private
   */
  private isExpiredOrNearExpiry(tokenSet: any): boolean {
    try {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiresAt = Number(tokenSet?.expires_at) || 0;
      return !expiresAt || expiresAt - nowSeconds < 60;
    } catch {
      return true;
    }
  }

  /**
   * Ensure the client is authenticated with valid tokens
   * Automatically refreshes tokens if needed
   * 
   * @throws Error if authentication fails
   * @private
   */
  private async ensureAuthenticated(): Promise<void> {
    const client: any = this.xeroClient as any;

    // Check if current token is valid
    const currentTokenSet = client?.tokenSet;
    if (currentTokenSet && !this.isExpiredOrNearExpiry(currentTokenSet)) {
      return;
    }

    // Try to load stored tokens
    const stored = await this.loadTokenSet();
    if (stored) {
      await this.setClientTokenSet(stored);
      if (!this.isExpiredOrNearExpiry(stored)) {
        return;
      }
    }

    // Try to refresh tokens
    try {
      if (stored?.refresh_token) {
        const refreshed = await this.xeroClient.refreshWithRefreshToken(
          process.env.XERO_CLIENT_ID,
          process.env.XERO_CLIENT_SECRET,
          stored.refresh_token
        );
        if (refreshed) {
          await this.setClientTokenSet(refreshed);
          await this.saveTokenSet(refreshed);
          return;
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    throw new Error('Xero authentication required. Please connect via OAuth flow.');
  }
}
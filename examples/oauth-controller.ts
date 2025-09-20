import { Controller, Get, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { XeroClientHelper } from 'xero-nestjs-helper';

/**
 * Example controller demonstrating OAuth flow implementation
 */
@Controller('xero')
export class XeroController {
  constructor(private readonly xeroHelper: XeroClientHelper) {}

  /**
   * Endpoint to initiate OAuth flow
   * GET /xero/connect
   */
  @Get('connect')
  async connect(@Res() res: Response): Promise<void> {
    try {
      const authUrl = await this.xeroHelper.getAuthorizationUrl();
      res.redirect(authUrl);
    } catch (error) {
      throw new HttpException(
        'Failed to generate authorization URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * OAuth callback endpoint
   * GET /xero/callback?code=...
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    if (error) {
      throw new HttpException(
        `OAuth error: ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!code) {
      throw new HttpException(
        'Authorization code not provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const tokenSet = await this.xeroHelper.getTokenFromCode(code);
      
      // Redirect to success page or return JSON response
      res.json({
        success: true,
        message: 'Xero connection established successfully',
        tokenSet: {
          access_token: '***', // Don't expose actual tokens
          expires_at: tokenSet.expires_at,
        },
      });
    } catch (error) {
      throw new HttpException(
        `OAuth callback failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get connected organizations
   * GET /xero/organizations
   */
  @Get('organizations')
  async getOrganizations(): Promise<any[]> {
    try {
      return await this.xeroHelper.getTenants();
    } catch (error) {
      throw new HttpException(
        `Failed to get organizations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check connection status
   * GET /xero/status
   */
  @Get('status')
  async getStatus(): Promise<{ connected: boolean; organizations: number }> {
    try {
      const tenants = await this.xeroHelper.getTenants();
      return {
        connected: tenants.length > 0,
        organizations: tenants.length,
      };
    } catch (error) {
      return {
        connected: false,
        organizations: 0,
      };
    }
  }
}

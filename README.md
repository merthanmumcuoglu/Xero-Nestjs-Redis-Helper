# Xero NestJS REDIS Helper

[![npm version](https://badge.fury.io/js/xero-nestjs-helper.svg)](https://badge.fury.io/js/xero-nestjs-helper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


A comprehensive NestJS helper class for Xero API integration with OAuth2 authentication, automatic token management, and Redis storage.

## Features

- 🔐 **OAuth2 Authentication Flow** - Complete Xero OAuth2 implementation
- 🔄 **Automatic Token Refresh** - Seamless token management with automatic refresh
- 📦 **Redis Storage** - Secure token storage using Redis
- 🏢 **Multi-tenant Support** - Handle multiple Xero organizations
- 📝 **TypeScript Support** - Full TypeScript definitions included
- 🛡️ **Error Handling** - Comprehensive error handling and validation
- 📖 **Well Documented** - Extensive JSDoc comments and examples

## Installation

```bash
npm install xero-nestjs-helper
```

### Peer Dependencies

Make sure you have the following dependencies installed:

```bash
npm install @nestjs/common xero-node @liaoliaots/nestjs-redis ioredis
```

## Quick Start

### 1. Environment Configuration

Create a `.env` file with your Xero app credentials:

```env
# Xero API Configuration
XERO_CLIENT_ID=your_xero_client_id_here
XERO_CLIENT_SECRET=your_xero_client_secret_here
XERO_REDIRECT_URIS=http://localhost:3000/xero/callback

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 2. Module Setup

```typescript
import { Module } from '@nestjs/common';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { XeroClientHelper } from 'xero-nestjs-helper';

@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
  ],
  providers: [XeroClientHelper],
  exports: [XeroClientHelper],
})
export class XeroModule {}
```

### 3. Service Implementation

```typescript
import { Injectable } from '@nestjs/common';
import { XeroClientHelper } from 'xero-nestjs-helper';

@Injectable()
export class XeroService {
  constructor(private readonly xeroHelper: XeroClientHelper) {}

  async initiateConnection(): Promise<string> {
    return await this.xeroHelper.getAuthorizationUrl();
  }

  async handleCallback(code: string): Promise<any> {
    return await this.xeroHelper.getTokenFromCode(code);
  }

  async getOrganizations(): Promise<any[]> {
    return await this.xeroHelper.getTenants();
  }
}
```

### 4. Controller Example

```typescript
import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { XeroClientHelper } from 'xero-nestjs-helper';

@Controller('xero')
export class XeroController {
  constructor(private readonly xeroHelper: XeroClientHelper) {}

  @Get('connect')
  async connect(@Res() res: Response): Promise<void> {
    const authUrl = await this.xeroHelper.getAuthorizationUrl();
    res.redirect(authUrl);
  }

  @Get('callback')
  async callback(@Query('code') code: string): Promise<any> {
    const tokenSet = await this.xeroHelper.getTokenFromCode(code);
    return { success: true, tokenSet };
  }

  @Get('organizations')
  async getOrganizations(): Promise<any[]> {
    return await this.xeroHelper.getTenants();
  }
}
```

## API Reference

### XeroClientHelper

#### Constructor

```typescript
constructor(redisService: RedisService)
```

#### Methods

##### `getAuthorizationUrl(): Promise<string>`

Generates the authorization URL for Xero OAuth2 flow.

**Returns:** Promise that resolves to the authorization URL

**Throws:** Error if URL generation fails

---

##### `getTokenFromCode(code: string): Promise<any>`

Exchanges authorization code for access tokens.

**Parameters:**
- `code` - The authorization code received from Xero OAuth callback

**Returns:** Promise that resolves to the token set containing access and refresh tokens

**Throws:** Error if token exchange fails or redirect URI not configured

---

##### `getTenants(): Promise<any[]>`

Gets all connected Xero tenants/organizations.

**Returns:** Promise that resolves to an array of tenant objects

**Throws:** Error if authentication fails or tenants cannot be retrieved

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `XERO_CLIENT_ID` | Yes | - | Your Xero app's client ID |
| `XERO_CLIENT_SECRET` | Yes | - | Your Xero app's client secret |
| `XERO_REDIRECT_URIS` | Yes | - | Comma-separated list of redirect URIs |
| `XERO_SCOPES` | No | See below | Space-separated list of OAuth scopes |
| `XERO_HTTP_TIMEOUT` | No | 30000 | HTTP timeout in milliseconds |
| `XERO_CLOCK_TOLERANCE` | No | 5 | Clock tolerance in seconds |

### Default Scopes

```
openid profile email accounting.settings accounting.reports.read accounting.journals.read accounting.contacts accounting.attachments accounting.transactions offline_access
```

## Error Handling

The helper includes comprehensive error handling:

```typescript
try {
  const authUrl = await xeroHelper.getAuthorizationUrl();
  // Handle success
} catch (error) {
  if (error.message.includes('authentication required')) {
    // Handle authentication error
  } else {
    // Handle other errors
  }
}
```

## Advanced Usage

### Custom Token Storage

The helper uses Redis for token storage by default. You can extend the class for custom storage implementations.

### Multi-tenant Applications

```typescript
// Get all available tenants
const tenants = await xeroHelper.getTenants();

// Each tenant has the following structure:
{
  tenantId: 'uuid',
  tenantType: 'ORGANISATION',
  createdDateUtc: '2023-01-01T00:00:00Z',
  updatedDateUtc: '2023-01-01T00:00:00Z'
}
```

## Examples

See the `examples/` directory for complete implementation examples:

- `basic-usage.ts` - Basic service and module setup
- `oauth-controller.ts` - Complete OAuth controller implementation
- `environment-setup.env` - Environment configuration template

## Prerequisites

1. **Xero Developer Account**: Sign up at [developer.xero.com](https://developer.xero.com/)
2. **Create a Xero App**: Set up your app and get client credentials
3. **Redis Server**: For token storage (can be local or cloud-hosted)
4. **NestJS Application**: This helper is designed for NestJS applications

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 **Issues**: [GitHub Issues](https://github.com/yourusername/xero-nestjs-helper/issues)
- 📖 **Documentation**: [Xero API Documentation](https://developer.xero.com/documentation/)
- 💬 **Community**: [Stack Overflow](https://stackoverflow.com/questions/tagged/xero-api)

## Changelog

### v1.0.0
- Initial release
- OAuth2 authentication flow
- Automatic token refresh
- Redis token storage
- Multi-tenant support
- TypeScript support

---

Made with ❤️ for the NestJS and Xero developer community

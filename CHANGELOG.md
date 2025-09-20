# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-09-20

### Added
- Initial release of Xero NestJS Helper
- OAuth2 authentication flow implementation
- Automatic token refresh mechanism
- Redis-based token storage
- Multi-tenant support for Xero organizations
- Comprehensive error handling and validation
- TypeScript support with full type definitions
- Extensive JSDoc documentation
- Complete usage examples and documentation
- ESLint configuration for code quality
- Proper project structure for npm publishing

### Features
- `XeroClientHelper` class with OAuth2 flow management
- `getAuthorizationUrl()` method for generating auth URLs
- `getTokenFromCode()` method for token exchange
- `getTenants()` method for retrieving connected organizations
- Automatic token validation and refresh
- Configurable environment variables
- Redis integration for secure token storage
- Error handling with descriptive messages

### Documentation
- Comprehensive README with setup instructions
- API reference documentation
- Usage examples for common scenarios
- Environment configuration guide
- Contributing guidelines
- MIT license

### Development
- TypeScript configuration
- ESLint setup for code quality
- Build scripts for compilation
- Proper npm package structure
- Git ignore configuration

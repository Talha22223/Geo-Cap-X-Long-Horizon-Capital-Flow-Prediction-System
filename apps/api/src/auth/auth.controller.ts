/**
 * ============================================================================
 * AUTHENTICATION CONTROLLER (AuthController)
 * ============================================================================
 * WHAT:
 *   Handles all external HTTP authentication endpoints:
 *   - POST /api/v1/auth/register: User account & organization tenant provisioning
 *   - POST /api/v1/auth/login: Credential verification, JWT generation & cookie issuance
 *   - POST /api/v1/auth/logout: Token revocation and cookie clearing
 *   - GET  /api/v1/auth/me: Active session & live subscription verification (Source of Truth)
 *   - GET  /api/v1/auth/google/url: Google OAuth 2.0 authorization URL builder
 *   - POST /api/v1/auth/google/callback: Google OAuth code exchange & onboarding
 *   - POST /api/v1/auth/refresh: Single-use Refresh token rotation (HttpOnly)
 *   - POST /api/v1/auth/forgot-password: Password reset email trigger
 *   - POST /api/v1/auth/reset-password: Password reset completion
 *   - GET  /api/v1/auth/verify-email: Account email token verification
 *
 * WHY:
 *   Protects platform access using enterprise standards: argon2 hashing, JWT access tokens,
 *   cryptographically random refresh tokens, HttpOnly session cookies, and IP/UA audit logs.
 *
 * HOW IT CONNECTS:
 *   - Client: Called by frontend login/register forms and AuthGuard.
 *   - Service: Delegates business logic and DB transactions to AuthService.
 *   - Security: Cookies issued: `refreshToken` (HttpOnly), `geocapx_auth_token` (client-accessible).
 * ============================================================================
 */

import { Controller, Post, Body, Ip, Headers, Res, Req, Get, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsBoolean, Matches } from 'class-validator';
import { Throttle } from '@nestjs/throttler';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_MSG = 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.';

export class LoginDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class RegisterDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG })
  password!: string;

  @IsString()
  confirmPassword!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG })
  password!: string;

  @IsString()
  confirmPassword!: string;
}

export class GoogleCallbackDto {
  @IsString()
  code!: string;
}

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new enterprise/user account' })
  @ApiResponse({ status: 201, description: 'Registration completed successfully.' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') ua?: string
  ) {
    const result = await this.authService.register(dto, ip, ua);

    // Set secure cookies
    const cookieMaxAge = 7 * 24 * 60 * 60 * 1000;
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    res.cookie('geocapx_auth_token', result.accessToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    return {
      success: true,
      accessToken: result.accessToken,
      user: result.user,
      redirectTo: result.redirectTo,
      message: result.message,
    };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user credentials' })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') ua?: string
  ) {
    const result = await this.authService.login(dto, ip, ua);

    const isRemembered = !!dto.rememberMe;
    const cookieMaxAge = isRemembered ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    res.cookie('geocapx_auth_token', result.accessToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    return {
      success: true,
      accessToken: result.accessToken,
      user: result.user,
      subscription: result.subscription,
      redirectTo: result.redirectTo,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate active user session and revoke tokens' })
  @ApiResponse({ status: 200, description: 'Logout completed.' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') ua?: string
  ) {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const userId = (req as any).user?.id;

    await this.authService.logout(refreshToken, userId, ip, ua);

    res.clearCookie('refreshToken', { path: '/' });
    res.clearCookie('geocapx_auth_token', { path: '/' });
    res.clearCookie('accessToken', { path: '/' });

    return { success: true, message: 'Logged out successfully.' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile and subscription' })
  async getMe(@Req() req: any) {
    return this.authService.getCurrentUser(req.user.id);
  }

  @Get('google/url')
  @ApiOperation({ summary: 'Get Google OAuth 2.0 consent URL' })
  getGoogleUrl() {
    const url = this.authService.getGoogleAuthUrl();
    return { url };
  }

  @Post('google/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with Google OAuth authorization code' })
  async googleCallback(
    @Body() dto: GoogleCallbackDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') ua?: string
  ) {
    const result = await this.authService.handleGoogleCallback(dto.code, ip, ua);

    const cookieMaxAge = 7 * 24 * 60 * 60 * 1000;
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    res.cookie('geocapx_auth_token', result.accessToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    return {
      success: true,
      accessToken: result.accessToken,
      user: result.user,
      redirectTo: result.redirectTo,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate JWT access token using HttpOnly cookie' })
  @ApiResponse({ status: 200, description: 'Refresh successful.' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') ua?: string
  ) {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await this.authService.refresh(refreshToken, ip, ua);

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.cookie('geocapx_auth_token', result.accessToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      accessToken: result.accessToken,
    };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset token link' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset account password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email registration token' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }
}

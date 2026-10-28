import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeEmail, trim } from '../common/dto.js';

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RegisterDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  /** Optional profile image URL (e.g. from /auth/upload-avatar). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;
}

/**
 * Self-service profile update — limited to non-security fields.
 * Email, role, and status changes stay admin-only (users module).
 */
export class UpdateProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  /** Profile image URL (e.g. from /auth/me/avatar). Omit to remove it. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  image?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  newPassword!: string;
}

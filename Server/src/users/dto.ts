import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../generated/prisma/enums.js';
import {
  PaginationQueryDto,
  normalizeEmail,
  trim,
} from '../common/dto.js';

export class CreateUserDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  /** Omit to have the server generate a temporary password and email it. */
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password?: string;

  /** Defaults to CUSTOMER when omitted. */
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  /** Optional profile image URL or relative path. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  image?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  image?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  search?: string;
}

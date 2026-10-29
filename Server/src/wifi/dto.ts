import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  DeviceOwnership,
  InstallationSlot,
  InstallationType,
  WifiBand,
  WifiPlanType,
  WifiUnitStatus,
} from '../generated/prisma/enums.js';
import { PaginationQueryDto, trim } from '../common/dto.js';

export class ListWifiPlansQueryDto {
  @IsOptional()
  @IsEnum(WifiPlanType)
  type?: WifiPlanType;
}

export class WifiCheckoutDto {
  @IsUUID() deviceId: string;
  @IsEnum(DeviceOwnership) ownership: DeviceOwnership;
  @IsUUID() basePlanId: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  addOnPlanIds?: string[];

  @Transform(trim) @IsString() @MinLength(5) @MaxLength(200) addressLine: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) city: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) state: string;
  @Transform(trim) @Matches(/^\d{6}$/, { message: 'postalCode must be a 6-digit PIN code' }) postalCode: string;
  @Transform(trim) @Matches(/^[6-9]\d{9}$/, { message: 'contactPhone must be a valid 10-digit mobile number' }) contactPhone: string;

  @IsDateString() preferredDate: string;
  @IsEnum(InstallationSlot) preferredSlot: InstallationSlot;

  @IsOptional() @IsEnum(InstallationType) installationType?: InstallationType;
  @IsOptional() @IsUUID() simId?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300) customerNotes?: string;
}

export class RenewDto {
  /** Base plan to renew with. Defaults to the connection's current base plan. */
  @IsOptional() @IsUUID() wifiPlanId?: string;
}

export class AddOnDto {
  @IsUUID() wifiPlanId: string;
}

export class PauseDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(30) days: number;
}

export class RescheduleDto {
  @IsDateString() preferredDate: string;
  @IsEnum(InstallationSlot) preferredSlot: InstallationSlot;
}

export class CreateWifiTicketDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(120) subject: string;
  @Transform(trim) @IsString() @MinLength(5) @MaxLength(2000) description: string;
}

// ---------------------------------------------------------------- admin

export class UpsertWifiDeviceDto {
  @Transform(trim) @IsString() @MinLength(2) name: string;
  @Transform(trim) @IsString() @MinLength(2) sku: string;
  @IsOptional() @Transform(trim) @IsString() description?: string;
  @IsEnum(WifiBand) band: WifiBand;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(30) wifiStandard?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) maxDevices?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(16) ethernetPorts?: number;
  @IsOptional() @IsBoolean() isMesh?: boolean;
  @IsOptional() @IsUUID() imageFileId?: string | null;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) purchasePrice?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) rentalPerMonth?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) securityDeposit?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}

export class UpdateWifiDeviceDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) name?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) sku?: string;
  @IsOptional() @Transform(trim) @IsString() description?: string;
  @IsOptional() @IsEnum(WifiBand) band?: WifiBand;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(30) wifiStandard?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) maxDevices?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(16) ethernetPorts?: number;
  @IsOptional() @IsBoolean() isMesh?: boolean;
  @IsOptional() @IsUUID() imageFileId?: string | null;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) purchasePrice?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) rentalPerMonth?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) securityDeposit?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}

export class UpsertWifiPlanDto {
  @Transform(trim) @IsString() @MinLength(2) name: string;
  @IsOptional() @Transform(trim) @IsString() description?: string;
  @IsEnum(WifiPlanType) type: WifiPlanType;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) price: number;
  @Type(() => Number) @IsInt() @Min(1) validityDays: number;
  @Type(() => Number) @IsInt() @Min(1) speedMbps: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) dataLimitGb?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) postFupSpeedMbps?: number | null;
  @IsOptional() @IsBoolean() requiresTriBand?: boolean;
  @IsArray() @IsString({ each: true }) features: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}

export class UpdateWifiPlanDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) name?: string;
  @IsOptional() @Transform(trim) @IsString() description?: string;
  @IsOptional() @IsEnum(WifiPlanType) type?: WifiPlanType;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) validityDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) speedMbps?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) dataLimitGb?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) postFupSpeedMbps?: number | null;
  @IsOptional() @IsBoolean() requiresTriBand?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}

export class CreateUnitDto {
  @IsUUID() deviceId: string;
  @Transform(trim) @IsString() @MinLength(3) serialNumber: string;
  @Transform(trim) @IsString() @MinLength(8) macAddress: string;
  @IsOptional() @IsDateString() warrantyEndsAt?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateUnitDto {
  @IsOptional() @IsDateString() warrantyEndsAt?: string;
  @IsOptional() @IsString() notes?: string;
}

export class BulkImportUnitsDto {
  @IsUUID() deviceId: string;
  /** CSV with header: serialNumber,macAddress[,warrantyEndsAt,notes] */
  @IsString() @MaxLength(500_000) csv: string;
}

export class ListUnitsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(WifiUnitStatus) status?: WifiUnitStatus;
  @IsOptional() @IsUUID() deviceId?: string;
  @IsOptional() @Transform(trim) @IsString() search?: string;
}

export class ListWifiOrdersQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() status?: string;
}

export class ListWifiConnectionsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Transform(trim) @IsString() search?: string;
}

export class ListInstallationsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() status?: string;
}

export class AssignUnitDto {
  /** Omit to auto-pick the oldest IN_STOCK unit of the connection's device model. */
  @IsOptional() @IsUUID() unitId?: string;
}

export class ScheduleInstallationDto {
  @IsDateString() scheduledAt: string;
  @Transform(trim) @IsString() @MinLength(2) technicianName: string;
  @Transform(trim) @Matches(/^[6-9]\d{9}$/, { message: 'technicianPhone must be a valid 10-digit mobile number' }) technicianPhone: string;
}

export class FailInstallationDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(300) reason: string;
}

export class ReplaceUnitDto {
  /** Omit to auto-pick an IN_STOCK unit of the same device model. */
  @IsOptional() @IsUUID() newUnitId?: string;
}

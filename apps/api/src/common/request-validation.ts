import { BadRequestException } from '@nestjs/common';

export function requireString(value: unknown, field: string, options: { min?: number; max?: number } = {}): string {
  if (typeof value !== 'string') throw new BadRequestException({ code: 'VALIDATION_ERROR', field, message: `${field} must be a string` });
  const normalized = value.trim();
  if (!normalized) throw new BadRequestException({ code: 'VALIDATION_ERROR', field, message: `${field} is required` });
  if (options.min !== undefined && normalized.length < options.min) {
    throw new BadRequestException({ code: 'VALIDATION_ERROR', field, message: `${field} is too short` });
  }
  if (options.max !== undefined && normalized.length > options.max) {
    throw new BadRequestException({ code: 'VALIDATION_ERROR', field, message: `${field} is too long` });
  }
  return normalized;
}

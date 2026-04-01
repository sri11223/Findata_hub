import { Response } from 'express';
import { PaginationMeta } from '../types/common.types';

interface SuccessOptions<T> {
  res: Response;
  statusCode?: number;
  message: string;
  data?: T;
  pagination?: PaginationMeta;
  meta?: Record<string, unknown>;
}

/**
 * Sends a consistently shaped success response.
 *
 * Shape:
 *   { success: true, message, data?, meta?: { pagination? } }
 */
export function sendSuccess<T>({
  res,
  statusCode = 200,
  message,
  data,
  pagination,
  meta,
}: SuccessOptions<T>): void {
  const responseBody: Record<string, unknown> = {
    success: true,
    message,
  };

  if (data !== undefined) responseBody.data = data;

  const metaPayload: Record<string, unknown> = { ...meta };
  if (pagination) metaPayload.pagination = pagination;
  if (Object.keys(metaPayload).length > 0) responseBody.meta = metaPayload;

  res.status(statusCode).json(responseBody);
}

/**
 * Sends a consistently shaped error response.
 *
 * Shape:
 *   { success: false, message, error? }
 */
export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  error?: string,
): void {
  const body: Record<string, unknown> = { success: false, message };
  if (error) body.error = error;
  res.status(statusCode).json(body);
}

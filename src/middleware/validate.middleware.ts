import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { HttpStatus } from '../constants/http-status';

/**
 * validate(schema) — validates req.body, req.params, and req.query
 * against the provided Zod schema object.
 *
 * The schema should be shaped as:
 *   z.object({ body?: ..., params?: ..., query?: ... })
 *
 * Returns 422 with structured field errors on failure.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body:   req.body,
      params: req.params,
      query:  req.query,
    });

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Assign validated + coerced values back
    if (result.data.body   !== undefined) req.body   = result.data.body;
    if (result.data.params !== undefined) req.params = result.data.params;
    if (result.data.query  !== undefined) req.query  = result.data.query;

    next();
  };
}

function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    // Remove the leading 'body.', 'params.', or 'query.' prefix
    const path = issue.path.slice(1).join('.') || issue.path.join('.');
    if (!formatted[path]) formatted[path] = [];
    formatted[path].push(issue.message);
  }

  return formatted;
}

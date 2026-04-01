import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Must be a valid email address')
      .toLowerCase()
      .trim(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+[\]{}|;:'",.<>/?\\`~])/,
        'Password must contain uppercase, lowercase, a digit, and a special character',
      ),
    firstName: z
      .string({ required_error: 'First name is required' })
      .trim()
      .min(1, 'First name cannot be empty')
      .max(50, 'First name must be at most 50 characters'),
    lastName: z
      .string({ required_error: 'Last name is required' })
      .trim()
      .min(1, 'Last name cannot be empty')
      .max(50, 'Last name must be at most 50 characters'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Must be a valid email address')
      .toLowerCase()
      .trim(),
    password: z.string({ required_error: 'Password is required' }),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: 'Refresh token is required' }),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput    = z.infer<typeof loginSchema>['body'];

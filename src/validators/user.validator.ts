import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z
      .string()
      .min(8)
      .max(72)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+[\]{}|;:'",.<>/?\\`~])/,
        'Password must contain uppercase, lowercase, a digit, and a special character',
      ),
    firstName: z.string().trim().min(1).max(50),
    lastName:  z.string().trim().min(1).max(50),
    role: z.nativeEnum(Role).optional().default(Role.VIEWER),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  body: z
    .object({
      firstName: z.string().trim().min(1).max(50).optional(),
      lastName:  z.string().trim().min(1).max(50).optional(),
      email:     z.string().email().toLowerCase().trim().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    status: z.nativeEnum(UserStatus, { required_error: 'Status is required' }),
  }),
});

export const changeUserRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    role: z.nativeEnum(Role, { required_error: 'Role is required' }),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

export const listUsersSchema = z.object({
  query: z.object({
    role:   z.nativeEnum(Role).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    search: z.string().trim().optional(),
    page:   z.coerce.number().int().positive().optional(),
    limit:  z.coerce.number().int().positive().max(100).optional(),
  }),
});

import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';
import { authenticate } from '../../middleware/authenticate.middleware';
import { validate } from '../../middleware/validate.middleware';
import { authRateLimiter } from '../../middleware/rate-limiter.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../../validators/auth.validator';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:     { type: string, format: email }
 *               password:  { type: string, minLength: 8 }
 *               firstName: { type: string }
 *               lastName:  { type: string }
 *     responses:
 *       201:
 *         description: Account created successfully
 *       409:
 *         description: Email already in use
 *       422:
 *         description: Validation error
 */
router.post('/register', authRateLimiter, validate(registerSchema), authController.register.bind(authController));

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and receive JWT tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful — returns accessToken and refreshToken
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authRateLimiter, validate(loginSchema), authController.login.bind(authController));

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using a valid refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access + refresh tokens issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', validate(refreshTokenSchema), authController.refresh.bind(authController));

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Invalidate the current session
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', authenticate, authController.logout.bind(authController));

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current user's profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticate, authController.me.bind(authController));

export default router;

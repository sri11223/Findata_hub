import { Router } from 'express';
import { userController } from '../../controllers/user.controller';
import { authenticate } from '../../middleware/authenticate.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { validate } from '../../middleware/validate.middleware';
import { Permission } from '../../constants/permissions';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  changeUserRoleSchema,
  userIdParamSchema,
  listUsersSchema,
} from '../../validators/user.validator';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (Admin+)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { $ref: '#/components/schemas/Role' }
 *       - in: query
 *         name: status
 *         schema: { $ref: '#/components/schemas/UserStatus' }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       403:
 *         description: Forbidden
 */
router.get(
  '/',
  authorize(Permission.READ_ALL_USERS),
  validate(listUsersSchema),
  userController.listUsers.bind(userController),
);

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user (Admin+)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Email conflict
 */
router.post(
  '/',
  authorize(Permission.CREATE_USER),
  validate(createUserSchema),
  userController.createUser.bind(userController),
);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (Admin+ or self)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User object
 *       404:
 *         description: Not found
 */
router.get(
  '/:id',
  authorize(Permission.READ_ALL_USERS),
  validate(userIdParamSchema),
  userController.getUserById.bind(userController),
);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update user profile (Admin+ or self)
 *     security:
 *       - BearerAuth: []
 */
router.patch(
  '/:id',
  authorize(Permission.UPDATE_USER),
  validate(updateUserSchema),
  userController.updateUser.bind(userController),
);

/**
 * @openapi
 * /users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Update user status (Admin+)
 *     security:
 *       - BearerAuth: []
 */
router.patch(
  '/:id/status',
  authorize(Permission.UPDATE_USER_STATUS),
  validate(updateUserStatusSchema),
  userController.updateUserStatus.bind(userController),
);

/**
 * @openapi
 * /users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Change user role (Super Admin only)
 *     security:
 *       - BearerAuth: []
 */
router.patch(
  '/:id/role',
  authorize(Permission.CHANGE_USER_ROLE),
  validate(changeUserRoleSchema),
  userController.changeUserRole.bind(userController),
);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Soft-delete a user (Super Admin only)
 *     security:
 *       - BearerAuth: []
 */
router.delete(
  '/:id',
  authorize(Permission.DELETE_USER),
  validate(userIdParamSchema),
  userController.deleteUser.bind(userController),
);

export default router;

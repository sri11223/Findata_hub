import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FinData Hub API',
      version: '1.0.0',
      description:
        'Finance Data Processing and Access Control Backend — REST API Documentation',
      contact: {
        name: 'FinData Hub',
        email: 'support@findata.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: `${env.NODE_ENV} server`,
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNextPage: { type: 'boolean' },
            hasPrevPage: { type: 'boolean' },
          },
        },
        Role: {
          type: 'string',
          enum: ['VIEWER', 'ANALYST', 'ADMIN', 'SUPER_ADMIN'],
        },
        UserStatus: {
          type: 'string',
          enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
        },
        TransactionType: {
          type: 'string',
          enum: ['INCOME', 'EXPENSE'],
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication and session management' },
      { name: 'Users', description: 'User and role management (Admin+)' },
      { name: 'Financial Records', description: 'Financial transaction CRUD' },
      { name: 'Categories', description: 'Transaction category management' },
      { name: 'Dashboard', description: 'Aggregated analytics and summaries' },
    ],
  },
  apis: ['./src/routes/v1/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

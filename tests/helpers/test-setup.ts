/**
 * Shared test utilities.
 *
 * Sets up dotenv with the .env.test file so all tests use
 * the test database and safe JWT secrets.
 */
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables BEFORE any module imports that read process.env
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

export {};

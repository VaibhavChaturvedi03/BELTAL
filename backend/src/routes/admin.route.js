import express from 'express';
import { getStats, listIdentities } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/stats', getStats);
router.get('/identities', listIdentities);

export default router;

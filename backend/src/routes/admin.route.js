import express from 'express';
import multer from 'multer';
import {
  getStats,
  listIdentities,
  registerIdentity,
  updateRole,
  revokeIdentity,
  reinstateIdentity,
  listRegistrations,
  approveRegistration,
  rejectRegistration,
  listZones,
  upsertZone,
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import validate from '../middleware/validate.js';
import {
  registerIdentitySchema,
  updateRoleSchema,
  revokeIdentitySchema,
  listIdentitiesQuerySchema,
  listRegistrationsQuerySchema,
  approveRegistrationSchema,
  rejectRegistrationSchema,
  upsertZoneSchema,
} from '../validators/admin.validator.js';
import { validateBulkImport, runBulkImport } from '../controllers/bulkImport.controller.js';

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/stats', getStats);
router.get('/identities', validate(listIdentitiesQuerySchema, 'query'), listIdentities);
router.post('/identities', validate(registerIdentitySchema), registerIdentity);
router.patch('/identities/:id/role', validate(updateRoleSchema), updateRole);

// Quarantine & revocation: revoke on-chain (identity + role), or lift it again.
router.post('/identities/:id/revoke', validate(revokeIdentitySchema), revokeIdentity);
router.post('/identities/:id/reinstate', reinstateIdentity);

// Bulk HRMS import (issue #51). The CSV is held in memory and parsed, never
// written to disk; 5 MB comfortably covers a few thousand employee rows.
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
router.post('/identities/bulk-import/validate', csvUpload.single('file'), validateBulkImport);
router.post('/identities/bulk-import', csvUpload.single('file'), runBulkImport);

// Self-registration requests awaiting review
router.get('/registrations', validate(listRegistrationsQuerySchema, 'query'), listRegistrations);
router.post('/registrations/:id/approve', validate(approveRegistrationSchema), approveRegistration);
router.post('/registrations/:id/reject', validate(rejectRegistrationSchema), rejectRegistration);

// PACS facility zones (create/update by zoneId; on-chain via AccessControl.createZone)
router.get('/zones', listZones);
router.post('/zones', validate(upsertZoneSchema), upsertZone);

export default router;

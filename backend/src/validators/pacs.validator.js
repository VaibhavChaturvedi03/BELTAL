import { z } from 'zod';

export const badgeEventSchema = z.object({
  readerId: z.string({ required_error: 'readerId is required' }).trim().min(1),
  zoneId: z.string({ required_error: 'zoneId is required' }).trim().min(1),
  // Employee code (User.externalId), not the internal UUID — this is what a
  // physical badge encodes/what HRMS/PACS systems key on.
  employeeId: z.string({ required_error: 'employeeId is required' }).trim().min(1),
});

export const lockdownSchema = z.object({
  locked: z.boolean({ required_error: 'locked is required' }),
});

export default { badgeEventSchema, lockdownSchema };

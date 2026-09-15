import rateLimit from 'express-rate-limit';

/**
 * Distinct rate limit for machine-to-machine ingest traffic (PACS/HRMS,
 * issue #74) — separate from the general human-facing apiLimiter in app.js.
 * A single PACS gateway aggregating many badge readers can legitimately
 * generate far more requests per minute than an interactive human session,
 * so this uses a shorter window with its own ceiling rather than reusing the
 * 100-per-15-minutes human limit.
 */
export const machineIngestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many machine-ingest requests, slow down.' },
});

export default machineIngestLimiter;

import pacsService from '../services/pacs.service.js';

export const pacsController = {
  /**
   * POST /api/pacs/badge-event — live zone-access check on every badge tap
   * (issue #75). Restricted to the ROLE_SYSTEM_CONNECTOR machine identity.
   */
  async badgeEvent(req, res, next) {
    try {
      const result = await pacsService.evaluateBadgeEvent(req.body, req.user);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/pacs/zones/:zoneId/lockdown — admin emergency lockdown toggle
   * (issue #76).
   */
  async setZoneLockdown(req, res, next) {
    try {
      const result = await pacsService.setZoneLockdown(req.params.zoneId, req.body.locked, req.user);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default pacsController;

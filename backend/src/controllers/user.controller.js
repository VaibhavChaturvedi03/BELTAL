import prisma from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import scopeService from '../services/scope.service.js';

export const userController = {
  /**
   * GET /api/users/me — the caller's own identity, role, and wallet address.
   */
  async getMe(req, res, next) {
    try {
      if (!req.user.isRegistered) {
        throw new ApiError(404, 'No identity registered for this wallet yet');
      }
      if (!prisma) {
        throw new ApiError(503, 'Database unavailable');
      }

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) {
        throw new ApiError(404, 'Identity not found');
      }

      return res.status(200).json({
        success: true,
        data: {
          id: user.id,
          walletAddress: user.walletAddress,
          externalId: user.externalId,
          did: user.did,
          displayName: user.displayName,
          role: user.role,
          clearanceLevel: user.clearanceLevel,
          sbu: user.sbu,
          createdAt: user.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/users/transfer-recipients — candidate recipients other than the
   * caller, for the transfer forms and the manager's team roster.
   *
   * Scope: Admin/Auditor see everyone. Users and Managers see personnel of their
   * own SBU (plus SBUs opened by their active cross-SBU passes) and visitors
   * holding an active pass into their SBU. Only the fields the forms render are
   * returned; role and wallet address go to oversight roles (the manager roster
   * shows and searches them), never to plain users.
   */
  async listTransferRecipients(req, res, next) {
    try {
      if (!prisma) {
        throw new ApiError(503, 'Database unavailable');
      }

      const requestedLimit = Number.parseInt(req.query.limit, 10);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), 100)
        : 100;

      // A revoked identity cannot take custody (the contract rejects it), so
      // do not offer it as a recipient.
      const where = { id: { not: req.user.id }, revokedAt: null };
      const scope = await scopeService.getSbuScope(req.user);
      if (scope) {
        where.OR = [
          { sbu: { in: scope.sbus } },
          ...(scope.ownSbu
            ? [{ crossSbuPasses: { some: { targetSbu: scope.ownSbu, validUntil: { gt: new Date() } } } }]
            : []),
        ];
      }

      const showIdentity = ['ADMIN', 'MANAGER', 'AUDITOR'].includes(req.user.role);
      const users = await prisma.user.findMany({
        where,
        take: limit,
        orderBy: { displayName: 'asc' },
        select: {
          id: true,
          displayName: true,
          did: true,
          clearanceLevel: true,
          sbu: true,
          ...(showIdentity ? { walletAddress: true, role: true } : {}),
        },
      });

      return res.status(200).json({ success: true, data: { users } });
    } catch (err) {
      next(err);
    }
  },
};

export default userController;

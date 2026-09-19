import prisma from '../config/db.js';
import ApiError from '../utils/ApiError.js';

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
   * GET /api/users/transfer-recipients — registered users other than the
   * caller. This deliberately exposes only the fields needed by the form.
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

      const users = await prisma.user.findMany({
        where: { id: { not: req.user.id } },
        take: limit,
        orderBy: { displayName: 'asc' },
        select: {
          id: true,
          walletAddress: true,
          displayName: true,
          role: true,
          clearanceLevel: true,
          sbu: true,
        },
      });

      return res.status(200).json({ success: true, data: { users } });
    } catch (err) {
      next(err);
    }
  },
};

export default userController;

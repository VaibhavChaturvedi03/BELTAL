import prisma from '../config/db.js';
import identityService from '../services/identity.service.js';

export const getStats = async (req, res, next) => {
  try {
    const totalIdentities = await prisma.user.count();
    const activeAssets = await prisma.asset.count();
    const pendingTransfers = await prisma.transferRequest.count({
      where: { status: 'PENDING' }
    });

    res.status(200).json({
      success: true,
      data: {
        totalIdentities,
        activeAssets,
        pendingTransfers,
        consensusHealth: 'NOMINAL' // Hardcoded for now
      }
    });
  } catch (error) {
    next(error);
  }
};

export const listIdentities = async (req, res, next) => {
  try {
    const { search = '', sbu = '', clearance = '', page = '1', limit = '20' } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { walletAddress: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (sbu) where.sbu = sbu;
    if (clearance) where.clearanceLevel = parseInt(clearance, 10);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        take: parseInt(limit, 10),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          walletAddress: true,
          externalId: true,
          displayName: true,
          role: true,
          clearanceLevel: true,
          sbu: true,
          createdAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const registerIdentity = async (req, res, next) => {
  try {
    const { user, chain } = await identityService.registerIdentity(req.body);
    return res.status(201).json({
      success: true,
      data: {
        id: user.id,
        walletAddress: user.walletAddress,
        externalId: user.externalId,
        displayName: user.displayName,
        role: user.role,
        clearanceLevel: user.clearanceLevel,
        sbu: user.sbu,
        identityHash: user.identityHash,
        dossierCid: user.dossierCid,
        createdAt: user.createdAt,
        chain,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const { user, chain } = await identityService.updateRole(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        role: user.role,
        clearanceLevel: user.clearanceLevel,
        chain,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getStats,
  listIdentities,
  registerIdentity,
  updateRole,
};

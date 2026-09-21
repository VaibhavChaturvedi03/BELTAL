import { ethers } from 'ethers';
import prisma from '../config/db.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';
import passService from './pass.service.js';
import chainService from './chain.service.js';

export const transferService = {
  /**
   * Request transfer of an asset currently in custody (Issue #46)
   */
  async requestTransfer(callerUser, input) {
    if (!prisma) throw new ApiError(503, 'Database unavailable');

    // 1. Fetch Asset and Validate Current Custody
    const asset = await prisma.asset.findUnique({
      where: { id: input.assetId },
      include: { owner: true },
    });

    if (!asset) {
      throw new ApiError(404, 'Asset not found');
    }

    // Custody check: only current custodian, Manager, or Admin can initiate handover
    if (asset.ownerId !== callerUser.id && callerUser.role !== 'ADMIN' && callerUser.role !== 'MANAGER') {
      throw new ApiError(403, 'You can only request transfers for assets currently in your custody');
    }

    // 2. Resolve Target Recipient
    let toUser = null;
    if (input.toUserId) {
      toUser = await prisma.user.findUnique({ where: { id: input.toUserId } });
    } else if (input.toWalletAddress) {
      const checksumAddress = ethers.getAddress(input.toWalletAddress);
      toUser = await prisma.user.findUnique({ where: { walletAddress: checksumAddress } });
    }

    if (!toUser) {
      throw new ApiError(404, 'Target recipient personnel not found');
    }

    if (toUser.id === asset.ownerId) {
      throw new ApiError(400, 'Target recipient is already the current custodian of this asset');
    }

    // 3. Clearance Gate: toUser.clearanceLevel >= asset.classificationTier
    if (toUser.clearanceLevel < asset.classificationTier) {
      throw new ApiError(
        400,
        `Target recipient clearance level (Level ${toUser.clearanceLevel}) is insufficient for this asset (requires Level ${asset.classificationTier})`
      );
    }

    // 4. SBU Alignment / Cross-SBU Pass Check
    if (toUser.sbu !== asset.sbu) {
      const hasPass = await passService.hasActiveCrossSbuPass(toUser.id, asset.sbu);
      if (!hasPass) {
        throw new ApiError(
          400,
          `Target recipient belongs to SBU ${toUser.sbu} while asset belongs to ${asset.sbu}. An active Cross-SBU Pass is required for cross-department custody handover.`
        );
      }
    }

    // 5. Prevent Duplicate Pending Transfer Requests
    const existingPending = await prisma.transferRequest.findFirst({
      where: {
        assetId: asset.id,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      throw new ApiError(409, 'A transfer request is already pending approval for this asset');
    }

    // 6. Create TransferRequest
    const transferRequest = await prisma.transferRequest.create({
      data: {
        assetId: asset.id,
        fromUserId: asset.ownerId,
        toUserId: toUser.id,
        requestedById: callerUser.id,
        status: 'PENDING',
      },
      include: {
        asset: true,
        fromUser: { select: { id: true, displayName: true, walletAddress: true, sbu: true } },
        toUser: { select: { id: true, displayName: true, walletAddress: true, sbu: true } },
        requestedBy: { select: { id: true, displayName: true, role: true } },
      },
    });

    // 7. Audit Event: TRANSFER_REQUESTED
    await prisma.auditEvent
      .create({
        data: {
          type: 'TRANSFER_REQUESTED',
          actorId: callerUser.id,
          targetId: asset.id,
          txHash: `0xreq_${Date.now().toString(16)}`,
          blockNumber: BigInt(0),
          payload: {
            transferRequestId: transferRequest.id,
            assetId: asset.id,
            assetName: asset.name,
            fromUserId: asset.ownerId,
            toUserId: toUser.id,
            reason: input.reason || null,
          },
        },
      })
      .catch((err) => logger.warn(`Failed to log TRANSFER_REQUESTED audit event: ${err.message}`));

    return transferRequest;
  },

  /**
   * List transfer requests (incoming, outgoing, pending, or historical)
   */
  async listTransfers(callerUser, query) {
    if (!prisma) throw new ApiError(503, 'Database unavailable');

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.assetId) {
      where.assetId = query.assetId;
    }

    const isPrivileged = ['ADMIN', 'MANAGER', 'AUDITOR'].includes(callerUser.role);

    if (!isPrivileged) {
      if (query.type === 'incoming') {
        where.toUserId = callerUser.id;
      } else if (query.type === 'outgoing') {
        where.fromUserId = callerUser.id;
      } else {
        where.OR = [
          { fromUserId: callerUser.id },
          { toUserId: callerUser.id },
          { requestedById: callerUser.id },
        ];
      }
    } else if (query.type === 'pending') {
      where.status = 'PENDING';
    }

    const [total, transferRequests] = await Promise.all([
      prisma.transferRequest.count({ where }),
      prisma.transferRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: true,
          fromUser: { select: { id: true, displayName: true, walletAddress: true, sbu: true } },
          toUser: { select: { id: true, displayName: true, walletAddress: true, sbu: true } },
          requestedBy: { select: { id: true, displayName: true, role: true } },
          approvedBy: { select: { id: true, displayName: true, role: true } },
        },
      }),
    ]);

    return {
      transferRequests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Manager / Admin: Approve and execute on-chain custody handover (Issue #46)
   */
  async approveTransfer(callerUser, transferRequestId) {
    if (!prisma) throw new ApiError(503, 'Database unavailable');

    const transferRequest = await prisma.transferRequest.findUnique({
      where: { id: transferRequestId },
      include: {
        asset: true,
        toUser: true,
        fromUser: true,
      },
    });

    if (!transferRequest) {
      throw new ApiError(404, 'Transfer request not found');
    }

    if (transferRequest.status !== 'PENDING') {
      throw new ApiError(400, `Transfer request has already been processed with status: ${transferRequest.status}`);
    }

    // Re-verify clearance gate
    if (transferRequest.toUser.clearanceLevel < transferRequest.asset.classificationTier) {
      throw new ApiError(
        400,
        `Recipient clearance level (Level ${transferRequest.toUser.clearanceLevel}) is insufficient for this asset (requires Level ${transferRequest.asset.classificationTier})`
      );
    }

    // Re-verify SBU / Cross-SBU pass
    if (transferRequest.toUser.sbu !== transferRequest.asset.sbu) {
      const hasPass = await passService.hasActiveCrossSbuPass(
        transferRequest.toUserId,
        transferRequest.asset.sbu
      );
      if (!hasPass) {
        throw new ApiError(
          400,
          `Recipient requires an active Cross-SBU Pass for ${transferRequest.asset.sbu}`
        );
      }
    }

    // 1. Execute On-Chain Custody Reassignment (Issue #100 — EIP-712 signature)
    //
    // If the TransferRequest carries a pre-built EIP-712 custodian signature
    // (stored when the outgoing custodian accepted the handover on the frontend),
    // pass it through to chain.service so the verified transferCustody() path is used.
    //
    // If no signature is present (emergency / admin-initiated bypasses), the chain
    // service falls back to reassignCustody() — the admin-only path that stores an
    // empty signature in custodyHistory as a bypass marker.
    //
    // deadline: 1 hour from approval time — long enough for the tx to confirm.
    const signatureDeadline = Math.floor(Date.now() / 1000) + 3600;

    const chainResult = await chainService.reassignCustodyOnChain({
      tokenId: transferRequest.asset.tokenId,
      newCustodianWallet: transferRequest.toUser.walletAddress,
      reason: 'DUAL_AUTHORIZED_MANAGER_APPROVAL',
      signature: transferRequest.custodianSignature ?? null,  // hex EIP-712 sig from frontend
      deadline: signatureDeadline,
    });


    if (!chainResult.confirmed) {
      logger.warn(
        `Custody transfer for asset ${transferRequest.asset.name} updated off-chain pending smart contract integration.`
      );
    }

    // 2. Update PostgreSQL Asset Custodian (Read-Cache)
    await prisma.asset.update({
      where: { id: transferRequest.assetId },
      data: { ownerId: transferRequest.toUserId },
    });

    // 3. Mark TransferRequest as EXECUTED
    const updatedRequest = await prisma.transferRequest.update({
      where: { id: transferRequestId },
      data: {
        status: 'EXECUTED',
        approvedById: callerUser.id,
        txHash: chainResult.txHash,
      },
      include: {
        asset: true,
        fromUser: { select: { id: true, displayName: true, walletAddress: true } },
        toUser: { select: { id: true, displayName: true, walletAddress: true } },
        approvedBy: { select: { id: true, displayName: true, role: true } },
      },
    });

    // 4. Log Immutable Audit Log: OWNERSHIP_TRANSFERRED
    await prisma.auditEvent
      .create({
        data: {
          type: 'OWNERSHIP_TRANSFERRED',
          actorId: callerUser.id,
          targetId: transferRequest.assetId,
          txHash: chainResult.txHash || `0xxfer_${Date.now().toString(16)}`,
          blockNumber: chainResult.blockNumber ? BigInt(chainResult.blockNumber) : BigInt(0),
          payload: {
            transferRequestId: transferRequest.id,
            assetId: transferRequest.assetId,
            assetName: transferRequest.asset.name,
            fromUserId: transferRequest.fromUserId,
            toUserId: transferRequest.toUserId,
            approvedById: callerUser.id,
            txHash: chainResult.txHash,
          },
        },
      })
      .catch((err) => logger.warn(`Failed to log OWNERSHIP_TRANSFERRED audit event: ${err.message}`));

    return { transferRequest: updatedRequest, chain: chainResult };
  },

  /**
   * Reject a pending transfer request
   */
  async rejectTransfer(callerUser, transferRequestId, reason) {
    if (!prisma) throw new ApiError(503, 'Database unavailable');

    const transferRequest = await prisma.transferRequest.findUnique({
      where: { id: transferRequestId },
    });

    if (!transferRequest) {
      throw new ApiError(404, 'Transfer request not found');
    }

    if (transferRequest.status !== 'PENDING') {
      throw new ApiError(400, `Transfer request has already been processed with status: ${transferRequest.status}`);
    }

    // Only Admin, Manager, or the current custodian (fromUser) can reject
    const canReject =
      ['ADMIN', 'MANAGER'].includes(callerUser.role) || transferRequest.fromUserId === callerUser.id;

    if (!canReject) {
      throw new ApiError(403, 'Not authorized to reject this transfer request');
    }

    const updated = await prisma.transferRequest.update({
      where: { id: transferRequestId },
      data: {
        status: 'REJECTED',
        approvedById: callerUser.id,
      },
      include: {
        asset: true,
        fromUser: { select: { id: true, displayName: true } },
        toUser: { select: { id: true, displayName: true } },
      },
    });

    return updated;
  },
};

export default transferService;

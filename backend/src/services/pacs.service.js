import prisma from '../config/db.js';
import chainService from './chain.service.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

export const pacsService = {
  /**
   * Live PACS zone-access check invoked on every badge tap (issue #75).
   * Called only by the ROLE_SYSTEM_CONNECTOR machine identity.
   */
  async evaluateBadgeEvent({ readerId, zoneId, employeeId }, systemConnector) {
    if (!prisma) throw new ApiError(503, 'Database unavailable');

    const employee = await prisma.user.findUnique({ where: { externalId: employeeId } });
    if (!employee) {
      throw new ApiError(404, `No identity found for employee code ${employeeId}`);
    }

    const zone = await prisma.facilityZone.findUnique({ where: { zoneId } });
    if (!zone) {
      throw new ApiError(404, `Unknown facility zone ${zoneId}`);
    }

    const chainResult = await chainService.canAccessZoneOnChain({
      walletAddress: employee.walletAddress,
      zoneId,
    });

    let allowed = Boolean(chainResult.allowed);
    let reason = chainResult.reason || '';

    // Defense-in-depth: the on-chain canAccessZone() already encodes the
    // lockdown check (AccessControl.toggleEmergencyLockdown), but the
    // Postgres cache is what our own admin lockdown endpoint (issue #76)
    // writes to synchronously. If the two ever disagree — e.g. the lockdown
    // tx hasn't landed/been read yet — fail safe and deny rather than trust
    // an on-chain "allowed" that may be stale.
    if (zone.isEmergencyLocked && allowed) {
      logger.warn(
        `[PACS] Zone ${zoneId} is isEmergencyLocked in Postgres but canAccessZone() returned allowed on-chain — denying as a fail-safe.`
      );
      allowed = false;
      reason = 'ZONE_EMERGENCY_LOCKDOWN';
    } else if (!allowed && !reason) {
      reason = 'ACCESS_DENIED';
    }

    const badgeEvent = await prisma.pacsBadgeEvent.create({
      data: {
        readerId,
        zoneId: zone.zoneId,
        employeeId: employee.id,
        decision: allowed ? 'GRANTED' : 'DENIED',
        denialReason: allowed ? null : reason,
      },
    });

    // Fire-and-forget the on-chain audit write (signed by the system
    // connector's own custodial wallet, issue #74, so the resulting
    // AuditEvent is attributable to the machine identity, not a human) —
    // a physical door shouldn't hold the badge holder waiting on a ~12s
    // Sepolia confirmation. The badge event row is backfilled with the tx
    // hash once (if) it lands.
    chainService
      .logAuditEventOnChain({
        eventType: allowed ? 'PACS_ACCESS_GRANTED' : 'PACS_ACCESS_DENIED',
        actor: systemConnector?.walletAddress,
        target: employee.walletAddress,
        entityId: zoneId,
        details: JSON.stringify({ readerId, submittedBy: 'machine', source: 'SYSTEM_CONNECTOR' }),
        asSystemConnector: true,
      })
      .then(async (chainAudit) => {
        if (chainAudit.confirmed) {
          await prisma.pacsBadgeEvent
            .update({
              where: { id: badgeEvent.id },
              data: {
                onChainTxHash: chainAudit.txHash,
                blockNumber: chainAudit.blockNumber != null ? BigInt(chainAudit.blockNumber) : null,
              },
            })
            .catch((err) =>
              logger.warn(`[PACS] Failed to backfill on-chain tx hash for badge event ${badgeEvent.id}: ${err.message}`)
            );
        }
      })
      .catch((err) => logger.warn(`[PACS] On-chain audit log failed for badge event ${badgeEvent.id}: ${err.message}`));

    return {
      allowed,
      reason: allowed ? null : reason,
      badgeEventId: badgeEvent.id,
    };
  },

  /**
   * Admin-only emergency lockdown toggle (issue #76). Requires the zone to
   * already exist (there is no zone-creation endpoint in scope here).
   */
  async setZoneLockdown(zoneId, locked, adminUser) {
    if (!prisma) throw new ApiError(503, 'Database unavailable');

    const zone = await prisma.facilityZone.findUnique({ where: { zoneId } });
    if (!zone) {
      throw new ApiError(404, `Unknown facility zone ${zoneId} — it must already exist (no zone-creation endpoint in scope)`);
    }

    const chainResult = await chainService.toggleEmergencyLockdownOnChain({ zoneId, status: locked });
    if (!chainResult.confirmed) {
      logger.warn(`Emergency lockdown toggle for zone ${zoneId} applied off-chain only pending on-chain confirmation.`);
    }

    const updated = await prisma.facilityZone.update({
      where: { zoneId },
      data: { isEmergencyLocked: locked },
    });

    logger.info(
      `[PACS] Zone ${zoneId} emergency lockdown ${locked ? 'ENABLED' : 'DISABLED'} by admin ${adminUser?.walletAddress || adminUser?.id}`
    );

    return {
      zoneId: updated.zoneId,
      isEmergencyLocked: updated.isEmergencyLocked,
      chain: chainResult,
    };
  },
};

export default pacsService;

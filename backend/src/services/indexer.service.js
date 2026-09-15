import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/db.js';
import provider from '../config/blockchain.js';
import config from '../config/env.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const contractsDir = path.join(__dirname, '../config/contracts');

function loadAbi(name) {
  try {
    const file = path.join(contractsDir, `${name}.json`);
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed.abi || parsed;
    }
  } catch (err) {
    logger.warn(`[Indexer] Failed to load ${name} ABI: ${err.message}`);
  }
  return null;
}

const auditLogAbi = loadAbi('AuditLog');
const assetNftAbi = loadAbi('AssetNFT');
const identityRegistryAbi = loadAbi('IdentityRegistry');
const accessControlAbi = loadAbi('AccessControl');

// AccessControl.sol grants/revokes roles as keccak256(`ROLE_<NAME>`) rather than
// a readable bytes32 string, so build a reverse lookup for the app-level roles
// we know about (see ROLE_VALUES in admin.validator.js) purely for readable
// audit payloads — falls back to the raw hash for anything unrecognized.
const KNOWN_ROLES = ['ADMIN', 'MANAGER', 'AUDITOR', 'USER', 'SYSTEM_CONNECTOR'];
const roleHashToName = new Map(
  KNOWN_ROLES.map((name) => [ethers.keccak256(ethers.toUtf8Bytes(`ROLE_${name}`)), name])
);

async function upsertAuditEvent({ type, actorId, targetId, txHash, blockNumber, payload }) {
  if (!prisma) return;
  try {
    const existing = await prisma.auditEvent.findFirst({
      where: { txHash, type },
    });
    if (existing) return;

    await prisma.auditEvent.create({
      data: {
        type,
        actorId: actorId || null,
        targetId: targetId || null,
        txHash,
        blockNumber: BigInt(blockNumber || 0),
        payload: payload || {},
      },
    });
    logger.info(`[Indexer] Indexed ${type} event from tx ${txHash}`);
  } catch (err) {
    logger.warn(`[Indexer] Failed to upsert AuditEvent for ${txHash}: ${err.message}`);
  }
}

async function resolveUserByWallet(wallet) {
  if (!prisma || !wallet || wallet === ethers.ZeroAddress) return null;
  try {
    return await prisma.user.findUnique({
      where: { walletAddress: ethers.getAddress(wallet) },
      select: { id: true },
    });
  } catch {
    return null;
  }
}

async function resolveAssetByTokenId(tokenId) {
  if (!prisma || !tokenId) return null;
  try {
    return await prisma.asset.findUnique({
      where: { tokenId: tokenId.toString() },
      select: { id: true, ownerId: true },
    });
  } catch {
    return null;
  }
}

export async function startIndexer() {
  if (!provider) {
    logger.warn('[Indexer] Provider not available; indexer disabled.');
    return;
  }

  const latestBlock = await provider.getBlockNumber().catch(() => 0);
  const fromBlock = parseInt(process.env.INDEXER_FROM_BLOCK || '0', 10) || Math.max(0, latestBlock - 500);

  // 1. Subscribe to AuditLog.sol (Unified Security Stream)
  if (config.auditLogAddress && auditLogAbi) {
    try {
      const auditContract = new ethers.Contract(config.auditLogAddress, auditLogAbi, provider);

      auditContract.on('SecurityAuditLog', async (eventType, actor, target, entityId, timestamp, details, event) => {
        try {
          const txHash = event.log?.transactionHash || event.transactionHash;
          const blockNumber = event.log?.blockNumber ?? event.blockNumber ?? 0;
          const eventTypeStr = ethers.decodeBytes32String(eventType);

          logger.info(`[Indexer] SecurityAuditLog: ${eventTypeStr} (Actor: ${actor}, Target: ${target})`);

          let dbEventType = 'IDENTITY_CREATED';
          if (eventTypeStr.includes('MINT')) dbEventType = 'ASSET_MINTED';
          else if (eventTypeStr.includes('XFER') || eventTypeStr.includes('TRANSFER')) dbEventType = 'OWNERSHIP_TRANSFERRED';
          else if (eventTypeStr.includes('CLEARANCE') || eventTypeStr.includes('ROLE')) dbEventType = 'ROLE_ASSIGNED';
          else if (eventTypeStr.includes('PASS') || eventTypeStr.includes('OK') || eventTypeStr.includes('GRANTED')) dbEventType = 'PACS_ACCESS_GRANTED';
          else if (eventTypeStr.includes('DENY') || eventTypeStr.includes('LOCK')) dbEventType = 'PACS_ACCESS_DENIED';

          const actorUser = await resolveUserByWallet(actor);

          await upsertAuditEvent({
            type: dbEventType,
            actorId: actorUser?.id || null,
            targetId: target !== ethers.ZeroAddress ? target : null,
            txHash,
            blockNumber,
            payload: {
              rawEventType: eventTypeStr,
              actor,
              target,
              entityId,
              details,
              onChainTimestamp: timestamp.toString(),
            },
          });
        } catch (err) {
          logger.error(`[Indexer] SecurityAuditLog error: ${err.message}`);
        }
      });

      logger.info(`[Indexer] Subscribed to AuditLog (${config.auditLogAddress})`);
    } catch (err) {
      logger.warn(`[Indexer] Failed to attach AuditLog listener: ${err.message}`);
    }
  }

  // 2. Subscribe to AssetNFT.sol
  if (config.contractAddress && assetNftAbi) {
    try {
      const assetContract = new ethers.Contract(config.contractAddress, assetNftAbi, provider);

      assetContract.on('AssetMinted', async (tokenId, initialCustodian, assetTag, classificationTier, sbu, tokenURI, event) => {
        try {
          const txHash = event.log?.transactionHash || event.transactionHash;
          const blockNumber = event.log?.blockNumber ?? event.blockNumber ?? 0;
          const actorUser = await resolveUserByWallet(initialCustodian);
          const assetRec = await resolveAssetByTokenId(tokenId);

          await upsertAuditEvent({
            type: 'ASSET_MINTED',
            actorId: actorUser?.id || null,
            targetId: assetRec?.id || null,
            txHash,
            blockNumber,
            payload: {
              tokenId: tokenId.toString(),
              custodian: initialCustodian,
              assetTag,
              classificationTier: Number(classificationTier),
              sbu: ethers.decodeBytes32String(sbu),
              tokenURI,
            },
          });
        } catch (err) {
          logger.error(`[Indexer] AssetMinted error: ${err.message}`);
        }
      });

      assetContract.on('CustodyReassigned', async (tokenId, previousCustodian, newCustodian, reason, timestamp, event) => {
        try {
          const txHash = event.log?.transactionHash || event.transactionHash;
          const blockNumber = event.log?.blockNumber ?? event.blockNumber ?? 0;
          const newCustodianUser = await resolveUserByWallet(newCustodian);
          const assetRec = await resolveAssetByTokenId(tokenId);

          await upsertAuditEvent({
            type: 'OWNERSHIP_TRANSFERRED',
            actorId: newCustodianUser?.id || null,
            targetId: assetRec?.id || null,
            txHash,
            blockNumber,
            payload: {
              tokenId: tokenId.toString(),
              previousCustodian,
              newCustodian,
              reason,
              onChainTimestamp: timestamp.toString(),
            },
          });
        } catch (err) {
          logger.error(`[Indexer] CustodyReassigned error: ${err.message}`);
        }
      });

      logger.info(`[Indexer] Subscribed to AssetNFT (${config.contractAddress})`);
    } catch (err) {
      logger.warn(`[Indexer] Failed to attach AssetNFT listener: ${err.message}`);
    }
  }

  // 3. Subscribe to IdentityRegistry.sol
  if (config.identityRegistryAddress && identityRegistryAbi) {
    try {
      const identityContract = new ethers.Contract(config.identityRegistryAddress, identityRegistryAbi, provider);

      identityContract.on('IdentityCreated', async (user, did, hash, clearanceLevel, sbuCode, event) => {
        try {
          const txHash = event.log?.transactionHash || event.transactionHash;
          const blockNumber = event.log?.blockNumber ?? event.blockNumber ?? 0;
          const actorUser = await resolveUserByWallet(user);

          await upsertAuditEvent({
            type: 'IDENTITY_CREATED',
            actorId: actorUser?.id || null,
            targetId: did,
            txHash,
            blockNumber,
            payload: {
              user,
              did,
              identityHash: hash,
              clearanceLevel: Number(clearanceLevel),
              sbu: ethers.decodeBytes32String(sbuCode),
            },
          });
        } catch (err) {
          logger.error(`[Indexer] IdentityCreated error: ${err.message}`);
        }
      });

      identityContract.on('ClearanceUpdated', async (user, oldClearance, newClearance, event) => {
        try {
          const txHash = event.log?.transactionHash || event.transactionHash;
          const blockNumber = event.log?.blockNumber ?? event.blockNumber ?? 0;
          const actorUser = await resolveUserByWallet(user);

          await upsertAuditEvent({
            type: 'ROLE_ASSIGNED',
            actorId: actorUser?.id || null,
            targetId: user,
            txHash,
            blockNumber,
            payload: {
              user,
              oldClearance: Number(oldClearance),
              newClearance: Number(newClearance),
            },
          });
        } catch (err) {
          logger.error(`[Indexer] ClearanceUpdated error: ${err.message}`);
        }
      });

      logger.info(`[Indexer] Subscribed to IdentityRegistry (${config.identityRegistryAddress})`);
    } catch (err) {
      logger.warn(`[Indexer] Failed to attach IdentityRegistry listener: ${err.message}`);
    }
  }

  // 4. Subscribe to AccessControl.sol (Emergency lockdown toggles, issue #76)
  if (config.accessControlAddress && accessControlAbi) {
    try {
      const accessControlContract = new ethers.Contract(config.accessControlAddress, accessControlAbi, provider);

      accessControlContract.on('EmergencyLockdownToggled', async (zoneId, isLockedDown, actor, event) => {
        try {
          const txHash = event.log?.transactionHash || event.transactionHash;
          const blockNumber = event.log?.blockNumber ?? event.blockNumber ?? 0;
          const zoneIdStr = ethers.decodeBytes32String(zoneId);
          const actorUser = await resolveUserByWallet(actor);

          logger.info(`[Indexer] EmergencyLockdownToggled: zone ${zoneIdStr} -> ${isLockedDown ? 'LOCKED' : 'UNLOCKED'} (Actor: ${actor})`);

          // No dedicated AuditEventType for zone-lockdown admin actions exists
          // in the schema; ROLE_ASSIGNED is the closest existing bucket for
          // an access-control configuration change (same family as
          // ClearanceUpdated above) — payload.eventSource disambiguates it.
          await upsertAuditEvent({
            type: 'ROLE_ASSIGNED',
            actorId: actorUser?.id || null,
            targetId: zoneIdStr,
            txHash,
            blockNumber,
            payload: {
              eventSource: 'EMERGENCY_LOCKDOWN_TOGGLE',
              zoneId: zoneIdStr,
              isLockedDown,
              actor,
            },
          });
        } catch (err) {
          logger.error(`[Indexer] EmergencyLockdownToggled error: ${err.message}`);
        }
      });

      logger.info(`[Indexer] Subscribed to AccessControl (${config.accessControlAddress})`);
    } catch (err) {
      logger.warn(`[Indexer] Failed to attach AccessControl listener: ${err.message}`);
    }
  }

  logger.info('[Indexer] Multi-contract on-chain event indexer active on Ethereum Sepolia!');
}

export default { startIndexer };

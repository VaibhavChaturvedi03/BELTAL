import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
import provider from '../config/blockchain.js';
import config from '../config/env.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractsDir = path.join(__dirname, '../config/contracts');

// Load ABIs
function loadAbi(name) {
  try {
    const file = path.join(contractsDir, `${name}.json`);
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed.abi || parsed;
    }
  } catch (err) {
    logger.warn(`Failed to load ${name} ABI: ${err.message}`);
  }
  return null;
}

const auditLogAbi = loadAbi('AuditLog');
const identityRegistryAbi = loadAbi('IdentityRegistry');
const accessControlAbi = loadAbi('AccessControl');
const assetNftAbi = loadAbi('AssetNFT');

function isConfigured() {
  return Boolean(provider && config.contractAddress && assetNftAbi);
}

function getSigner() {
  if (!config.deployerPrivateKey || !provider) return null;
  try {
    const pk = config.deployerPrivateKey.trim();
    const formatted = pk.startsWith('0x') ? pk : `0x${pk}`;
    return new ethers.Wallet(formatted, provider);
  } catch {
    return null;
  }
}

/**
 * Custodial signer for the ROLE_SYSTEM_CONNECTOR machine identity (issue
 * #74) — a separate key from the admin deployer signer above, so automated
 * PACS/HRMS-submitted transactions are attributable to the machine identity
 * on-chain rather than the human admin service key. Falls back to the admin
 * deployer signer (with a warning) when SYSTEM_CONNECTOR_PRIVATE_KEY isn't
 * configured, so dev/demo environments without it don't crash.
 */
function getSystemConnectorSigner() {
  if (!provider) return null;
  if (!config.systemConnectorPrivateKey) {
    logger.warn(
      'SYSTEM_CONNECTOR_PRIVATE_KEY not set — falling back to the admin deployer signer for machine-submitted (PACS/HRMS) transactions. Set a dedicated key before production use (issue #74).'
    );
    return getSigner();
  }
  try {
    const pk = config.systemConnectorPrivateKey.trim();
    const formatted = pk.startsWith('0x') ? pk : `0x${pk}`;
    return new ethers.Wallet(formatted, provider);
  } catch {
    return null;
  }
}

function getContract(address, abi, withSigner = true) {
  if (!address || !abi || !provider) return null;
  const signerOrProvider = withSigner ? (getSigner() || provider) : provider;
  return new ethers.Contract(address, abi, signerOrProvider);
}

function getContractWithSigner(address, abi, signer) {
  if (!address || !abi || !signer) return null;
  return new ethers.Contract(address, abi, signer);
}

export const chainService = {
  isConfigured,

  getAuditLogContract(withSigner = true) {
    return getContract(config.auditLogAddress, auditLogAbi, withSigner);
  },

  getIdentityContract(withSigner = true) {
    return getContract(config.identityRegistryAddress, identityRegistryAbi, withSigner);
  },

  getAccessControlContract(withSigner = true) {
    return getContract(config.accessControlAddress, accessControlAbi, withSigner);
  },

  getAssetContract(withSigner = true) {
    return getContract(config.contractAddress || config.assetNftAddress, assetNftAbi, withSigner);
  },

  /**
   * Register employee DID and cryptographic hash on-chain (Issue #87)
   */
  async registerIdentityOnChain({ walletAddress, did, identityHash, clearanceLevel, sbu }) {
    const contract = this.getIdentityContract(true);
    if (!contract) {
      logger.warn(`On-chain identity registration skipped for ${walletAddress} — IdentityRegistry contract not configured.`);
      return { txHash: null, blockNumber: null, confirmed: false };
    }

    try {
      const formattedHash = identityHash.startsWith('0x') ? identityHash : `0x${identityHash}`;
      const sbuBytes32 = ethers.encodeBytes32String((sbu || 'SBU_RADAR').slice(0, 31));
      const employeeDid = did || `did:beltal:${walletAddress.toLowerCase()}`;

      const tx = await contract.registerIdentity(
        walletAddress,
        employeeDid,
        formattedHash,
        clearanceLevel || 1,
        sbuBytes32
      );
      const receipt = await tx.wait();

      logger.info(`Identity registered on Ethereum Sepolia for ${walletAddress}, Tx: ${receipt.hash}`);
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        confirmed: true,
      };
    } catch (err) {
      logger.error(`On-chain identity registration failed: ${err.message}`);
      return { txHash: null, blockNumber: null, confirmed: false, error: err.message };
    }
  },

  /**
   * Batch register employee identities on-chain (supports up to 250 records)
   */
  async batchRegisterIdentitiesOnChain({ users, dids, hashes, clearances, sbus }) {
    const contract = this.getIdentityContract(true);
    if (!contract) {
      return { confirmed: false, error: 'IdentityRegistry contract not configured' };
    }

    try {
      const formattedHashes = hashes.map((h) => (h.startsWith('0x') ? h : `0x${h}`));
      const formattedSbus = sbus.map((s) => ethers.encodeBytes32String((s || 'SBU_RADAR').slice(0, 31)));

      const tx = await contract.batchRegisterIdentities(
        users,
        dids,
        formattedHashes,
        clearances,
        formattedSbus
      );
      const receipt = await tx.wait();

      logger.info(`Batch registered ${users.length} identities on Sepolia, Tx: ${receipt.hash}`);
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        confirmed: true,
        count: users.length,
      };
    } catch (err) {
      logger.error(`Batch identity registration failed: ${err.message}`);
      return { confirmed: false, error: err.message };
    }
  },

  /**
   * Update clearance level on-chain (Issue #87)
   */
  async assignRoleOnChain({ walletAddress, role, clearanceLevel }) {
    const identityContract = this.getIdentityContract(true);
    const accessContract = this.getAccessControlContract(true);

    if (!identityContract && !accessContract) {
      logger.warn(`On-chain role/clearance assignment skipped for ${walletAddress} — contracts not configured.`);
      return { txHash: null, blockNumber: null, confirmed: false };
    }

    try {
      let txHash = null;
      let blockNumber = null;

      if (clearanceLevel && identityContract) {
        const tx = await identityContract.updateClearance(walletAddress, clearanceLevel);
        const receipt = await tx.wait();
        txHash = receipt.hash;
        blockNumber = receipt.blockNumber;
      }

      if (role && accessContract) {
        const roleBytes32 = ethers.keccak256(ethers.toUtf8Bytes(`ROLE_${role.toUpperCase()}`));
        const tx2 = await accessContract.grantRole(roleBytes32, walletAddress);
        const receipt2 = await tx2.wait();
        txHash = receipt2.hash;
        blockNumber = receipt2.blockNumber;
      }

      return { txHash, blockNumber, confirmed: true };
    } catch (err) {
      logger.error(`On-chain role/clearance update failed: ${err.message}`);
      return { txHash: null, blockNumber: null, confirmed: false, error: err.message };
    }
  },

  /**
   * Verify identity hash on-chain (Issue #87)
   */
  async verifyIdentityOnChain({ walletAddress, identityHash }) {
    const contract = this.getIdentityContract(false);
    if (!contract) {
      return { verified: false, error: 'IdentityRegistry contract not configured' };
    }

    try {
      const formattedHash = identityHash.startsWith('0x') ? identityHash : `0x${identityHash}`;
      const isMatch = await contract.verifyIdentity(walletAddress, formattedHash);
      const identity = await contract.getIdentity(walletAddress);

      return {
        verified: isMatch,
        isActive: identity.isActive,
        clearanceLevel: Number(identity.clearanceLevel),
        sbuCode: ethers.decodeBytes32String(identity.sbuCode),
        registeredAt: new Date(Number(identity.registeredAt) * 1000).toISOString(),
      };
    } catch (err) {
      return { verified: false, error: err.message };
    }
  },

  /**
   * Check physical access control zone gate on-chain (Issue #88)
   */
  async canAccessZoneOnChain({ walletAddress, zoneId }) {
    const contract = this.getAccessControlContract(false);
    if (!contract) {
      return { allowed: false, reason: 'AccessControl contract not configured' };
    }

    try {
      const zoneBytes32 = ethers.encodeBytes32String(zoneId.slice(0, 31));
      const [allowed, reason] = await contract.canAccessZone(walletAddress, zoneBytes32);
      return { allowed, reason };
    } catch (err) {
      return { allowed: false, reason: err.message };
    }
  },

  /**
   * Admin: flip a facility zone's emergency lockdown flag on-chain (Issue #76).
   * A locked zone denies all canAccessZone() checks regardless of clearance/SBU.
   */
  async toggleEmergencyLockdownOnChain({ zoneId, status }) {
    const contract = this.getAccessControlContract(true);
    if (!contract) {
      logger.warn(`On-chain emergency lockdown toggle skipped for zone ${zoneId} — AccessControl contract not configured.`);
      return { txHash: null, blockNumber: null, confirmed: false };
    }

    try {
      const zoneBytes32 = ethers.encodeBytes32String(zoneId.slice(0, 31));
      const tx = await contract.toggleEmergencyLockdown(zoneBytes32, status);
      const receipt = await tx.wait();

      logger.info(`Zone ${zoneId} emergency lockdown ${status ? 'ENABLED' : 'DISABLED'} on Ethereum Sepolia, Tx: ${receipt.hash}`);
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        confirmed: true,
      };
    } catch (err) {
      logger.error(`On-chain emergency lockdown toggle failed: ${err.message}`);
      return { txHash: null, blockNumber: null, confirmed: false, error: err.message };
    }
  },

  /**
   * Mint defence hardware soulbound custody NFT (Issue #89)
   */
  async mintAssetOnChain({ custodianWallet, assetTag, serialNumber, classificationTier, sbu, ipfsCid }) {
    const contract = this.getAssetContract(true);
    if (!contract) {
      logger.warn(`On-chain asset minting skipped for ${custodianWallet} (${assetTag}) — AssetNFT contract not configured.`);
      return { txHash: null, blockNumber: null, tokenId: null, confirmed: false };
    }

    try {
      const sbuBytes32 = ethers.encodeBytes32String((sbu || 'SBU_RADAR').slice(0, 31));
      const tx = await contract.mintAssetDetailed(
        custodianWallet,
        assetTag || 'BEL-ASSET',
        serialNumber || '',
        classificationTier,
        sbuBytes32,
        `ipfs://${ipfsCid || ''}`
      );
      const receipt = await tx.wait();

      let tokenId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === 'AssetMinted') {
            tokenId = parsed.args.tokenId.toString();
            break;
          }
        } catch {
          // ignore unparsed logs
        }
      }

      logger.info(`Asset minted on Ethereum Sepolia: Token #${tokenId}, Tx: ${receipt.hash}`);
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        tokenId,
        confirmed: true,
      };
    } catch (err) {
      logger.error(`On-chain asset minting failed: ${err.message}`);
      return { txHash: null, blockNumber: null, tokenId: null, confirmed: false, error: err.message };
    }
  },

  /**
   * Reassign soulbound asset custody on-chain (Issue #89)
   */
  async reassignCustodyOnChain({ tokenId, newCustodianWallet, reason, signature }) {
    const contract = this.getAssetContract(true);
    if (!contract || !tokenId) {
      logger.warn(`On-chain custody reassignment skipped for token #${tokenId} — contract not present.`);
      return { txHash: null, blockNumber: null, confirmed: false };
    }

    try {
      const sigBytes = signature ? ethers.getBytes(signature) : '0x';
      const tx = await contract.transferCustody(
        BigInt(tokenId),
        newCustodianWallet,
        reason || 'AUTHORIZED_HANDOVER',
        sigBytes
      );
      const receipt = await tx.wait();

      logger.info(`Custody reassigned on Ethereum Sepolia: Token #${tokenId} -> ${newCustodianWallet}, Tx: ${receipt.hash}`);
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        confirmed: true,
      };
    } catch (err) {
      logger.error(`On-chain custody reassignment failed: ${err.message}`);
      return { txHash: null, blockNumber: null, confirmed: false, error: err.message };
    }
  },

  /**
   * Read-only view call: fetch on-chain asset details and current custodian
   */
  async getAssetOnChain(tokenId) {
    const contract = this.getAssetContract(false);
    if (!contract) {
      return { found: false, error: 'Contract not configured' };
    }

    try {
      const [details, custodian] = await Promise.all([
        contract.getAssetDetails(BigInt(tokenId)),
        contract.getCustodian(BigInt(tokenId)),
      ]);

      return {
        found: true,
        tokenId: tokenId.toString(),
        assetTag: details.assetTag,
        serialNumber: details.serialNumber,
        classificationTier: Number(details.classificationTier),
        sbu: ethers.decodeBytes32String(details.sbu),
        tokenURI: details.tokenURI,
        mintedAt: new Date(Number(details.mintedAt) * 1000).toISOString(),
        isUnderMaintenance: details.isUnderMaintenance,
        custodian,
      };
    } catch (err) {
      return { found: false, error: err.message };
    }
  },

  /**
   * Log arbitrary security event directly into AuditLog.sol (Issue #86).
   * Pass `asSystemConnector: true` (issue #74) to sign with the dedicated
   * machine-identity custodial wallet instead of the admin deployer key —
   * used by automated PACS/HRMS ingest so the resulting on-chain event (and
   * the indexed AuditEvent it produces) is attributable to the machine
   * identity, not a human admin.
   */
  async logAuditEventOnChain({ eventType, actor, target, entityId, details, asSystemConnector = false }) {
    const contract = asSystemConnector
      ? getContractWithSigner(config.auditLogAddress, auditLogAbi, getSystemConnectorSigner())
      : this.getAuditLogContract(true);
    if (!contract) return { confirmed: false, error: 'AuditLog contract not configured' };

    try {
      const eventTypeBytes32 = ethers.encodeBytes32String((eventType || 'SECURITY_EVENT').slice(0, 31));
      const entityIdBytes32 = entityId ? (entityId.startsWith('0x') ? entityId : ethers.encodeBytes32String(entityId.slice(0, 31))) : ethers.ZeroHash;

      const tx = await contract.logEvent(
        eventTypeBytes32,
        actor || ethers.ZeroAddress,
        target || ethers.ZeroAddress,
        entityIdBytes32,
        details || ''
      );
      const receipt = await tx.wait();

      return { txHash: receipt.hash, blockNumber: receipt.blockNumber, confirmed: true };
    } catch (err) {
      logger.error(`On-chain audit logging failed: ${err.message}`);
      return { confirmed: false, error: err.message };
    }
  },
};

export default chainService;

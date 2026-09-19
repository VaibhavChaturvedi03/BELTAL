import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import config from '../config/env.js';
import logger from '../config/logger.js';
import prisma from '../config/db.js';
import nonceService from './nonce.service.js';
import ApiError from '../utils/ApiError.js';

export const authService = {
  /**
   * Request a single-use cryptographic sign-in challenge nonce
   * @param {string} walletAddress
   * @returns {{ walletAddress: string, nonce: string, message: string, expiresAt: string }}
   */
  requestNonce(walletAddress) {
    let checksumAddress;
    try {
      checksumAddress = ethers.getAddress(walletAddress);
    } catch {
      throw new ApiError(400, 'Invalid Ethereum wallet address');
    }

    const { nonce, message, expiresAt } = nonceService.generateNonce(checksumAddress);

    return {
      walletAddress: checksumAddress,
      nonce,
      message,
      expiresAt,
    };
  },

  /**
   * Verify an ECDSA signature against the active nonce challenge and issue a JWT
   * @param {{ walletAddress: string, signature: string }} param0
   * @returns {Promise<{ token: string, user: object }>}
   */
  async verifyWalletLogin({ walletAddress, signature }) {
    let checksumAddress;
    try {
      checksumAddress = ethers.getAddress(walletAddress);
    } catch {
      throw new ApiError(400, 'Invalid Ethereum wallet address format');
    }

    // Retrieve active challenge message
    const storedChallenge = nonceService.getStoredNonce(checksumAddress);
    if (!storedChallenge) {
      throw new ApiError(
        401,
        'No active authentication challenge found for this address or the challenge has expired. Please request a new nonce.'
      );
    }

    // Recover signer address from ECDSA signature using ethers
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(storedChallenge.message, signature);
    } catch (err) {
      throw new ApiError(401, `Cryptographic signature verification failed: ${err.message}`);
    }

    // Strict address match verification
    if (ethers.getAddress(recoveredAddress) !== checksumAddress) {
      throw new ApiError(401, 'Signature does not match the provided wallet address.');
    }

    // Immediately consume nonce to prevent replay attacks
    nonceService.consumeNonce(checksumAddress);

    // ── Dev override: ADMIN_WALLETS env var ─────────────────────────────────
    // A comma-separated list of checksummed wallet addresses that are always
    // granted ADMIN role without a DB lookup. Safe for local dev when
    // PostgreSQL is not running. Never set this in production.
    const adminWalletsRaw = process.env.ADMIN_WALLETS ?? '';
    const adminWallets = adminWalletsRaw
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)
      .map((a) => { try { return ethers.getAddress(a); } catch { return null; } })
      .filter(Boolean);

    if (adminWallets.includes(checksumAddress)) {
      logger.info(`[DEV] ADMIN_WALLETS override — granting ADMIN to ${checksumAddress}`);
      const devUser = {
        id: null,
        walletAddress: checksumAddress,
        displayName: 'Administrator (Dev Override)',
        externalId: null,
        role: 'ADMIN',
        clearanceLevel: 5,
        sbu: null,
        isRegistered: false,
      };
      const devToken = jwt.sign(
        { sub: checksumAddress, walletAddress: checksumAddress, role: 'ADMIN', clearanceLevel: 5, sbu: null, isRegistered: false },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );
      return { token: devToken, user: devUser };
    }
    // ── End dev override ─────────────────────────────────────────────────────

    // Resolve user profile from DB (or generate default authenticated session if pre-onboarded)
    let userRecord = null;
    if (prisma) {
      try {
        userRecord = await prisma.user.findUnique({
          where: { walletAddress: checksumAddress },
        });
      } catch (dbErr) {
        logger.warn(`Database query skipped or unavailable: ${dbErr.message}`);
      }
    }

    // SYSTEM_CONNECTOR identities are machine-only (PACS/HRMS ingest via a
    // backend-held custodial signer, see issue #74) — never reachable via the
    // human wallet-sign-in flow, even if someone controls that wallet's key.
    if (userRecord && userRecord.role === 'SYSTEM_CONNECTOR') {
      throw new ApiError(403, 'System-connector identities cannot authenticate via wallet sign-in');
    }

    const user = userRecord
      ? {
          id: userRecord.id,
          walletAddress: userRecord.walletAddress,
          displayName: userRecord.displayName,
          externalId: userRecord.externalId,
          role: userRecord.role,
          clearanceLevel: userRecord.clearanceLevel,
          sbu: userRecord.sbu,
          isRegistered: true,
        }
      : {
          id: null,
          walletAddress: checksumAddress,
          displayName: `Personnel (${checksumAddress.slice(0, 6)}...${checksumAddress.slice(-4)})`,
          externalId: null,
          role: 'USER',
          clearanceLevel: 1,
          sbu: null,
          isRegistered: false,
        };

    // Construct JWT claims
    const tokenPayload = {
      sub: user.id || user.walletAddress,
      walletAddress: user.walletAddress,
      role: user.role,
      clearanceLevel: user.clearanceLevel,
      sbu: user.sbu,
      isRegistered: user.isRegistered,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    logger.info(`Wallet authenticated successfully: ${checksumAddress} (Role: ${user.role})`);

    return {
      token,
      user,
    };
  },

  /**
   * Machine-only counterpart to verifyWalletLogin, for the ROLE_SYSTEM_CONNECTOR
   * custodial identity (issue #74). Uses the same nonce + ECDSA
   * proof-of-key-possession flow (request a nonce via POST /auth/nonce same
   * as any wallet), but is a distinct code path from the human sign-in above
   * — that path explicitly rejects SYSTEM_CONNECTOR identities so machine
   * credentials never share a route/rate-limit/audit trail with human
   * sign-in. Only succeeds for a wallet already provisioned with the
   * SYSTEM_CONNECTOR role (see POST /api/admin/identities).
   */
  async verifySystemConnectorLogin({ walletAddress, signature }) {
    let checksumAddress;
    try {
      checksumAddress = ethers.getAddress(walletAddress);
    } catch {
      throw new ApiError(400, 'Invalid Ethereum wallet address format');
    }

    const storedChallenge = nonceService.getStoredNonce(checksumAddress);
    if (!storedChallenge) {
      throw new ApiError(
        401,
        'No active authentication challenge found for this address or the challenge has expired. Please request a new nonce.'
      );
    }

    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(storedChallenge.message, signature);
    } catch (err) {
      throw new ApiError(401, `Cryptographic signature verification failed: ${err.message}`);
    }

    if (ethers.getAddress(recoveredAddress) !== checksumAddress) {
      throw new ApiError(401, 'Signature does not match the provided wallet address.');
    }

    nonceService.consumeNonce(checksumAddress);

    if (!prisma) throw new ApiError(503, 'Database unavailable');

    const userRecord = await prisma.user.findUnique({ where: { walletAddress: checksumAddress } });
    if (!userRecord || userRecord.role !== 'SYSTEM_CONNECTOR') {
      throw new ApiError(403, 'This login path is reserved for provisioned SYSTEM_CONNECTOR identities');
    }

    const user = {
      id: userRecord.id,
      walletAddress: userRecord.walletAddress,
      displayName: userRecord.displayName,
      externalId: userRecord.externalId,
      role: userRecord.role,
      clearanceLevel: userRecord.clearanceLevel,
      sbu: userRecord.sbu,
      isRegistered: true,
    };

    const tokenPayload = {
      sub: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      clearanceLevel: user.clearanceLevel,
      sbu: user.sbu,
      isRegistered: true,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    logger.info(`System-connector machine identity authenticated: ${checksumAddress}`);

    return { token, user };
  },
};

export default authService;

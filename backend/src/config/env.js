import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env explicitly from backend directory regardless of cwd
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// One service-level secret (like JWT_SECRET), not per-user. In production this
// would come from a KMS/secrets manager via envelope encryption (a master key
// wraps a small per-record data key, so rotation doesn't mean re-encrypting
// every dossier) with a distinct key per environment — never this literal
// process.env read against a plaintext .env file.
let dossierEncryptionKey = process.env.DOSSIER_ENCRYPTION_KEY;
if (!dossierEncryptionKey) {
  dossierEncryptionKey = crypto.randomBytes(32).toString('hex');
  console.warn(
    'DOSSIER_ENCRYPTION_KEY is unset — generated an ephemeral dev key; encrypted PII dossiers will not be decryptable after a restart. Set DOSSIER_ENCRYPTION_KEY (32-byte hex) in .env for real use.'
  );
}

export default {
  port: Number(process.env.PORT) || 4000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  rpcUrl: process.env.RPC_URL,
  contractAddress: process.env.CONTRACT_ADDRESS || process.env.ASSET_NFT_ADDRESS,
  assetNftAddress: process.env.ASSET_NFT_ADDRESS || process.env.CONTRACT_ADDRESS,
  auditLogAddress: process.env.AUDIT_LOG_ADDRESS,
  identityRegistryAddress: process.env.IDENTITY_REGISTRY_ADDRESS,
  accessControlAddress: process.env.ACCESS_CONTROL_ADDRESS,
  jwtSecret: process.env.JWT_SECRET || 'trustchain-dev-secret-key-32chars-min-len',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  ipfsApiKey: process.env.IPFS_API_KEY,
  pinataJwt: process.env.PINATA_JWT,
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataApiSecret: process.env.PINATA_API_SECRET,
  pinataGateway: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs',
  deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY,
  // Dedicated custodial wallet for the ROLE_SYSTEM_CONNECTOR machine identity
  // (issue #74) — kept separate from deployerPrivateKey so automated
  // PACS/HRMS-submitted transactions are attributable to the machine
  // identity on-chain, not the human admin service key.
  systemConnectorPrivateKey: process.env.SYSTEM_CONNECTOR_PRIVATE_KEY,
  dossierEncryptionKey,
};

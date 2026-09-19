import config from './src/config/env.js';
import app from './src/app.js';
import { startIndexer } from './src/services/indexer.service.js';

const server = app.listen(config.port, () => {
  console.log(`TrustChain backend listening on port ${config.port} (${config.port === 4000 ? 'dev' : 'prod'})`);

  // Start on-chain event indexer after HTTP server is ready
  startIndexer().catch((err) =>
    console.warn(`[Indexer] Startup error (non-fatal): ${err.message}`)
  );
});

export default server;

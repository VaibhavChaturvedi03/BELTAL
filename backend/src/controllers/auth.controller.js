import authService from '../services/auth.service.js';

export const authController = {
  /**
   * Request challenge nonce for wallet sign-in
   * POST /api/auth/nonce
   */
  getNonce(req, res, next) {
    try {
      const { walletAddress } = req.body;
      const result = authService.requestNonce(walletAddress);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Verify ECDSA signature and log in / issue JWT
   * POST /api/auth/verify (and POST /api/auth/login)
   */
  async verify(req, res, next) {
    try {
      const { walletAddress, signature } = req.body;
      const result = await authService.verifyWalletLogin({ walletAddress, signature });
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Machine login for the ROLE_SYSTEM_CONNECTOR custodial identity (issue #74).
   * Same nonce (POST /api/auth/nonce) + ECDSA-signature flow as human sign-in,
   * exchanged here instead of /api/auth/verify so machine credentials never
   * share a route with human sign-in.
   * POST /api/auth/system-connector/verify
   */
  async verifySystemConnector(req, res, next) {
    try {
      const { walletAddress, signature } = req.body;
      const result = await authService.verifySystemConnectorLogin({ walletAddress, signature });
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default authController;

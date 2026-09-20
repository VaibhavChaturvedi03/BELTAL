// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAuditLog {
    function logEvent(
        bytes32 eventType,
        address actor,
        address target,
        bytes32 entityId,
        string calldata details
    ) external returns (uint256);
}

interface IIdentityRegistry {
    struct IdentityRecord {
        bytes32 identityHash;
        bytes32 sbuCode;
        uint64 registeredAt;
        uint64 updatedAt;
        uint8 clearanceLevel;
        bool isActive;
    }
    function getIdentity(address user) external view returns (IdentityRecord memory);
}

interface IAccessControl {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function ROLE_SBU_MANAGER() external view returns (bytes32);
    function ROLE_SUPER_ADMIN() external view returns (bytes32);
}

/**
 * @title AssetNFT — Soulbound Defence Hardware Custody Provenance Token
 * @notice Represents physical military & defence hardware assets manufactured and tracked across
 *         Bharat Electronics Limited (BEL) units.
 * @dev Soulbound custody token: Standard ERC-721 transfers (transferFrom / safeTransferFrom) are disabled.
 *      Custody transfers are restricted to dual-authorized administrative reassignments.
 */
contract AssetNFT {
    string public name = "TrustChain BEL Defence Asset";
    string public symbol = "BEL-ASSET";

    address public admin;
    address public deployer;
    IAuditLog public auditLog;
    IIdentityRegistry public identityRegistry;
    IAccessControl public accessControl;

    uint256 private _nextTokenId = 1001;

    struct AssetDetails {
        string assetTag;          // e.g., "BEL-SDR-TAC-042"
        string serialNumber;      // e.g., "SN-99412-A"
        uint8 classificationTier; // 1 (Restricted) to 4 (Top Secret)
        bytes32 sbu;              // e.g., "SBU_RADAR", "SBU_MILCOMM"
        string tokenURI;          // IPFS CID metadata
        uint256 mintedAt;
        bool isUnderMaintenance;
    }

    struct CustodyRecord {
        address custodian;
        uint256 timestamp;
        string transferReason;
        bytes signature;          // Cryptographic handshake proof or memo
    }

    // tokenId => AssetDetails
    mapping(uint256 => AssetDetails) public assets;

    // tokenId => current custodian address
    mapping(uint256 => address) public custodians;

    // tokenId => list of historical custody handovers
    mapping(uint256 => CustodyRecord[]) public custodyHistory;

    // Authorized managers / CISOs permitted to mint and reassign custody
    mapping(address => bool) public isAuthorizedManager;

    // Events
    event AssetMinted(
        uint256 indexed tokenId,
        address indexed initialCustodian,
        string assetTag,
        uint8 classificationTier,
        bytes32 indexed sbu,
        string tokenURI
    );

    event CustodyReassigned(
        uint256 indexed tokenId,
        address indexed previousCustodian,
        address indexed newCustodian,
        string reason,
        uint256 timestamp
    );

    event MaintenanceStatusUpdated(uint256 indexed tokenId, bool isUnderMaintenance);

    modifier onlyAdmin() {
        require(msg.sender == admin || msg.sender == deployer, "AssetNFT: Caller is not admin or deployer");
        _;
    }

    modifier onlyAuthorized() {
        bool authorized = msg.sender == admin || msg.sender == deployer || isAuthorizedManager[msg.sender];
        if (!authorized && address(accessControl) != address(0)) {
            authorized = accessControl.hasRole(accessControl.ROLE_SUPER_ADMIN(), msg.sender) ||
                         accessControl.hasRole(accessControl.ROLE_SBU_MANAGER(), msg.sender);
        }
        require(authorized, "AssetNFT: Caller is not authorized manager");
        _;
    }

    constructor(
        address _initialAdmin,
        address _auditLog,
        address _identityRegistry,
        address _accessControl
    ) {
        deployer = msg.sender;
        admin = _initialAdmin != address(0) ? _initialAdmin : msg.sender;
        auditLog = IAuditLog(_auditLog);
        identityRegistry = IIdentityRegistry(_identityRegistry);
        accessControl = IAccessControl(_accessControl);

        isAuthorizedManager[admin] = true;
        isAuthorizedManager[deployer] = true;
    }

    function setAuditLog(address _auditLog) external onlyAdmin {
        auditLog = IAuditLog(_auditLog);
    }

    function setIdentityRegistry(address _identityRegistry) external onlyAdmin {
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }

    function setAccessControl(address _accessControl) external onlyAdmin {
        accessControl = IAccessControl(_accessControl);
    }

    function setAuthorizedManager(address manager, bool status) external onlyAdmin {
        isAuthorizedManager[manager] = status;
    }

    /**
     * @notice Mint a new defence asset NFT with metadata pinned to IPFS
     */
    function mintAsset(
        address initialCustodian,
        string calldata assetTag,
        uint8 classificationTier,
        bytes32 sbu,
        string calldata tokenURI
    ) external onlyAuthorized returns (uint256) {
        return mintAssetDetailed(initialCustodian, assetTag, "", classificationTier, sbu, tokenURI);
    }

    /**
     * @notice Mint a new defence asset NFT with full serial number details
     * @dev Clearance gate: the initial custodian MUST have an active identity in IdentityRegistry
     *      with clearanceLevel >= classificationTier. Unregistered wallets (getIdentity returns a
     *      zero-struct with isActive == false) and revoked identities are both rejected — this
     *      closes the bypass reported in issue #98 where the gate was wrapped in `if (id.isActive)`
     *      and therefore silently skipped for unregistered/revoked recipients.
     *
     *      Design decision — SBU enforcement: SBU confinement is a cross-department access policy
     *      enforced by AccessControl.canAccessZone (with tempPassExpiry). Baking sbuCode == asset.sbu
     *      into AssetNFT would block legitimate cross-SBU reassignments without a pass mechanism
     *      inside this contract, so SBU gating remains at the AccessControl layer.
     *
     *      Design decision — Signature field: the `signature` stored in CustodyRecord is a memo /
     *      audit-trail artefact. On-chain EIP-712 verification is deferred to a future issue;
     *      dual-approval is currently enforced off-chain by the backend before calling this function.
     */
    function mintAssetDetailed(
        address initialCustodian,
        string calldata assetTag,
        string memory serialNumber,
        uint8 classificationTier,
        bytes32 sbu,
        string calldata tokenURI
    ) public onlyAuthorized returns (uint256) {
        require(initialCustodian != address(0), "AssetNFT: Invalid custodian address");
        require(classificationTier >= 1 && classificationTier <= 4, "AssetNFT: Invalid classification tier");

        // On-chain clearance gate: recipient must have an active registered identity with
        // sufficient clearance. Unregistered wallets return isActive=false (zero-struct) and
        // are rejected by the first require, closing the bypass from issue #98.
        if (address(identityRegistry) != address(0)) {
            IIdentityRegistry.IdentityRecord memory id = identityRegistry.getIdentity(initialCustodian);
            require(id.isActive, "AssetNFT: Recipient has no active identity");
            require(
                id.clearanceLevel >= classificationTier,
                "AssetNFT: Recipient clearance insufficient for asset classification"
            );
        }

        uint256 tokenId = _nextTokenId++;

        assets[tokenId] = AssetDetails({
            assetTag: assetTag,
            serialNumber: serialNumber,
            classificationTier: classificationTier,
            sbu: sbu,
            tokenURI: tokenURI,
            mintedAt: block.timestamp,
            isUnderMaintenance: false
        });

        custodians[tokenId] = initialCustodian;

        custodyHistory[tokenId].push(CustodyRecord({
            custodian: initialCustodian,
            timestamp: block.timestamp,
            transferReason: "INITIAL_MINT_AND_CUSTODY_ASSIGNMENT",
            signature: ""
        }));

        emit AssetMinted(tokenId, initialCustodian, assetTag, classificationTier, sbu, tokenURI);

        if (address(auditLog) != address(0)) {
            try auditLog.logEvent("ASSET_MINT", msg.sender, initialCustodian, bytes32(tokenId), assetTag) {} catch {}
        }

        return tokenId;
    }

    /**
     * @notice Reassign physical and cryptographic custody of an asset
     * @dev Replaces standard transferFrom with a dual-authorized custody reassignment
     */
    function reassignCustody(
        uint256 tokenId,
        address newCustodian,
        string calldata reason
    ) external onlyAuthorized {
        transferCustody(tokenId, newCustodian, reason, "");
    }

    /**
     * @notice Transfer custody with cryptographic proof / signature
     * @dev Clearance gate: the new custodian MUST have an active identity in IdentityRegistry
     *      with clearanceLevel >= the asset's classificationTier. Unregistered wallets and revoked
     *      identities are both rejected — this closes the bypass from issue #98.
     *
     *      Design decision — Signature: the `signature` parameter is stored in custodyHistory as a
     *      memo / audit-trail artefact. On-chain EIP-712 verification is deferred; dual-approval
     *      is currently enforced off-chain by the backend before invoking this function.
     *
     *      Design decision — SBU: SBU confinement is enforced at the AccessControl layer via
     *      canAccessZone / tempPassExpiry, not inside this function.
     */
    function transferCustody(
        uint256 tokenId,
        address newCustodian,
        string calldata reason,
        bytes memory signature
    ) public onlyAuthorized {
        require(custodians[tokenId] != address(0), "AssetNFT: Asset does not exist");
        require(newCustodian != address(0), "AssetNFT: Invalid new custodian address");
        require(newCustodian != custodians[tokenId], "AssetNFT: New custodian is already current custodian");

        // Clearance-gate: new custodian must be an active identity with sufficient clearance.
        // Unregistered wallets return isActive=false (zero-struct) and are rejected by the first
        // require, closing the bypass from issue #98.
        if (address(identityRegistry) != address(0)) {
            IIdentityRegistry.IdentityRecord memory id = identityRegistry.getIdentity(newCustodian);
            require(id.isActive, "AssetNFT: Recipient has no active identity");
            require(
                id.clearanceLevel >= assets[tokenId].classificationTier,
                "AssetNFT: Recipient clearance insufficient for asset classification"
            );
        }

        address previousCustodian = custodians[tokenId];
        custodians[tokenId] = newCustodian;

        custodyHistory[tokenId].push(CustodyRecord({
            custodian: newCustodian,
            timestamp: block.timestamp,
            transferReason: reason,
            signature: signature
        }));

        emit CustodyReassigned(tokenId, previousCustodian, newCustodian, reason, block.timestamp);

        if (address(auditLog) != address(0)) {
            try auditLog.logEvent("CUSTODY_TRANSFERRED", msg.sender, newCustodian, bytes32(tokenId), reason) {} catch {}
        }
    }

    /**
     * @notice Set equipment maintenance flag
     */
    function setMaintenanceStatus(uint256 tokenId, bool isUnderMaintenance) external onlyAuthorized {
        require(custodians[tokenId] != address(0), "AssetNFT: Asset does not exist");
        assets[tokenId].isUnderMaintenance = isUnderMaintenance;
        emit MaintenanceStatusUpdated(tokenId, isUnderMaintenance);

        if (address(auditLog) != address(0)) {
            try auditLog.logEvent(
                "MAINTENANCE_STATUS",
                msg.sender,
                custodians[tokenId],
                bytes32(tokenId),
                isUnderMaintenance ? "ENTERED_MAINTENANCE" : "CLEARED_MAINTENANCE"
            ) {} catch {}
        }
    }

    /**
     * @notice Retrieve the full custody provenance trail for an asset
     */
    function getCustodyHistory(uint256 tokenId) external view returns (CustodyRecord[] memory) {
        require(custodians[tokenId] != address(0), "AssetNFT: Asset does not exist");
        return custodyHistory[tokenId];
    }

    /**
     * @notice Get current custodian address
     */
    function getCustodian(uint256 tokenId) external view returns (address) {
        return custodians[tokenId];
    }

    /**
     * @notice Get asset details
     */
    function getAssetDetails(uint256 tokenId) external view returns (AssetDetails memory) {
        require(custodians[tokenId] != address(0), "AssetNFT: Asset does not exist");
        return assets[tokenId];
    }

    // --- SOULBOUND RESTRICTIONS ---
    function transferFrom(address, address, uint256) external pure {
        revert("AssetNFT: SOULBOUND token. Standard transfers disabled; use reassignCustody.");
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert("AssetNFT: SOULBOUND token. Standard transfers disabled; use reassignCustody.");
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert("AssetNFT: SOULBOUND token. Standard transfers disabled; use reassignCustody.");
    }

    function approve(address, uint256) external pure {
        revert("AssetNFT: Approvals disabled on soulbound assets.");
    }

    function setApprovalForAll(address, bool) external pure {
        revert("AssetNFT: Approvals disabled on soulbound assets.");
    }
}

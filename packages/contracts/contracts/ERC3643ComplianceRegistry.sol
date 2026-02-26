// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IIdentityRegistry} from "./interfaces/IIdentityRegistry.sol";
import {IERC3643ComplianceModule} from "./interfaces/IERC3643ComplianceModule.sol";

contract ERC3643ComplianceRegistry is AccessControl, IERC3643ComplianceModule {
    bytes32 public constant POLICY_ADMIN_ROLE = keccak256("POLICY_ADMIN_ROLE");

    IIdentityRegistry public immutable identityRegistry;
    bool public transfersPaused;

    event TransfersPausedSet(bool paused);

    constructor(address admin, IIdentityRegistry registry) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POLICY_ADMIN_ROLE, admin);
        identityRegistry = registry;
    }

    function setTransfersPaused(bool paused) external onlyRole(POLICY_ADMIN_ROLE) {
        transfersPaused = paused;
        emit TransfersPausedSet(paused);
    }

    function canTransfer(address from, address to, uint256) external view returns (bool, string memory) {
        if (transfersPaused) return (false, "TRANSFER_PAUSED");
        if (from == address(0) || to == address(0)) return (true, "");
        if (!identityRegistry.isVerified(from)) return (false, "UNVERIFIED_SENDER");
        if (!identityRegistry.isVerified(to)) return (false, "UNVERIFIED_RECEIVER");
        return (true, "");
    }
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IIdentityRegistry} from "./interfaces/IIdentityRegistry.sol";

contract IdentityRegistry is AccessControl, IIdentityRegistry {
    bytes32 public constant COMPLIANCE_ADMIN_ROLE = keccak256("COMPLIANCE_ADMIN_ROLE");

    mapping(address => bool) private s_verified;

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN_ROLE, admin);
    }

    function setVerified(address account, bool verified) external onlyRole(COMPLIANCE_ADMIN_ROLE) {
        s_verified[account] = verified;
        emit IdentityUpdated(account, verified);
    }

    function isVerified(address account) external view returns (bool) {
        return s_verified[account];
    }
}


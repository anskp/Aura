// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IProofOfReserve} from "./interfaces/IProofOfReserve.sol";

contract ProofOfReserve is AccessControl, IProofOfReserve {
    bytes32 public constant COORDINATOR_ROLE = keccak256("COORDINATOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    IERC20 public immutable rwaToken;
    mapping(bytes32 => ReserveData) private s_reserveByAsset;
    bool private s_paused;

    constructor(address admin, IERC20 token) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COORDINATOR_ROLE, admin);
        _grantRole(GUARDIAN_ROLE, admin);
        rwaToken = token;
    }

    function setReserve(
        bytes32 assetId,
        uint256 reserve,
        uint256 timestamp,
        bytes32 reportId
    ) external onlyRole(COORDINATOR_ROLE) {
        s_reserveByAsset[assetId] = ReserveData({reserve: reserve, timestamp: timestamp, reportId: reportId});
        emit ReserveUpdated(assetId, reserve, timestamp, reportId);
        _syncPauseFromHealth(assetId);
    }

    function setPaused(bool paused, string calldata reason) external onlyRole(GUARDIAN_ROLE) {
        s_paused = paused;
        emit SystemPaused(paused, reason);
    }

    function latestReserve(bytes32 assetId) external view returns (uint256 reserve, uint256 timestamp, bytes32 reportId) {
        ReserveData memory data = s_reserveByAsset[assetId];
        return (data.reserve, data.timestamp, data.reportId);
    }

    function isSystemHealthy(bytes32 assetId) public view returns (bool) {
        return s_reserveByAsset[assetId].reserve >= rwaToken.totalSupply();
    }

    function isPaused() external view returns (bool) {
        return s_paused;
    }

    function _syncPauseFromHealth(bytes32 assetId) internal {
        bool shouldPause = !isSystemHealthy(assetId);
        if (shouldPause != s_paused) {
            s_paused = shouldPause;
            emit SystemPaused(shouldPause, shouldPause ? "RESERVE_BELOW_SUPPLY" : "SYSTEM_HEALTHY");
        }
    }
}


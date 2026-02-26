// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {INavOracle} from "./interfaces/INavOracle.sol";

contract NavOracle is AccessControl, INavOracle {
    bytes32 public constant COORDINATOR_ROLE = keccak256("COORDINATOR_ROLE");

    mapping(bytes32 => NavData) private s_navByPool;

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COORDINATOR_ROLE, admin);
    }

    function setNav(bytes32 poolId, uint256 nav, uint256 timestamp, bytes32 reportId) external onlyRole(COORDINATOR_ROLE) {
        s_navByPool[poolId] = NavData({nav: nav, timestamp: timestamp, reportId: reportId});
        emit NavUpdated(poolId, nav, timestamp, reportId);
    }

    function latestNav(bytes32 poolId) external view returns (uint256 nav, uint256 timestamp, bytes32 reportId) {
        NavData memory data = s_navByPool[poolId];
        return (data.nav, data.timestamp, data.reportId);
    }
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface INavOracle {
    struct NavData {
        uint256 nav;
        uint256 timestamp;
        bytes32 reportId;
    }

    event NavUpdated(bytes32 indexed poolId, uint256 nav, uint256 timestamp, bytes32 indexed reportId);

    function latestNav(bytes32 poolId) external view returns (uint256 nav, uint256 timestamp, bytes32 reportId);
}


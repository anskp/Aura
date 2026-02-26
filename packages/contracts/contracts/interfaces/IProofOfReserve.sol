// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IProofOfReserve {
    struct ReserveData {
        uint256 reserve;
        uint256 timestamp;
        bytes32 reportId;
    }

    event ReserveUpdated(bytes32 indexed assetId, uint256 reserve, uint256 timestamp, bytes32 indexed reportId);
    event SystemPaused(bool paused, string reason);

    function latestReserve(bytes32 assetId) external view returns (uint256 reserve, uint256 timestamp, bytes32 reportId);
    function isSystemHealthy(bytes32 assetId) external view returns (bool);
    function isPaused() external view returns (bool);
}


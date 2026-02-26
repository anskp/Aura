// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IOracleUpdateCoordinator {
    event OracleReportProcessed(bytes32 indexed poolId, bytes32 indexed assetId, uint256 nav, uint256 reserve, bytes32 reportId);

    function submitReport(bytes calldata payload, bytes calldata sigOrProof) external;
    function processScheduledUpdate() external;
}


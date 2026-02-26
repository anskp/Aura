// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {INavOracle} from "./interfaces/INavOracle.sol";
import {IProofOfReserve} from "./interfaces/IProofOfReserve.sol";
import {IOracleUpdateCoordinator} from "./interfaces/IOracleUpdateCoordinator.sol";
import {MockOracleProvider} from "./mocks/MockOracleProvider.sol";

interface INavOracleWritable is INavOracle {
    function setNav(bytes32 poolId, uint256 nav, uint256 timestamp, bytes32 reportId) external;
}

interface IProofOfReserveWritable is IProofOfReserve {
    function setReserve(bytes32 assetId, uint256 reserve, uint256 timestamp, bytes32 reportId) external;
}

contract OracleUpdateCoordinator is AccessControl, IOracleUpdateCoordinator {
    bytes32 public constant ORACLE_UPDATER_ROLE = keccak256("ORACLE_UPDATER_ROLE");
    bytes32 public constant AUTOMATION_ROLE = keccak256("AUTOMATION_ROLE");

    INavOracleWritable public navOracle;
    IProofOfReserveWritable public proofOfReserve;
    MockOracleProvider public mockProvider;
    bytes32 public poolId;
    bytes32 public assetId;

    error MalformedPayload();

    constructor(
        address admin,
        INavOracleWritable navOracle_,
        IProofOfReserveWritable proofOfReserve_,
        MockOracleProvider mockProvider_,
        bytes32 poolId_,
        bytes32 assetId_
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_UPDATER_ROLE, admin);
        _grantRole(AUTOMATION_ROLE, admin);
        navOracle = navOracle_;
        proofOfReserve = proofOfReserve_;
        mockProvider = mockProvider_;
        poolId = poolId_;
        assetId = assetId_;
    }

    function submitReport(bytes calldata payload, bytes calldata) external onlyRole(ORACLE_UPDATER_ROLE) {
        _processPayload(payload);
    }

    function processScheduledUpdate() external onlyRole(AUTOMATION_ROLE) {
        bytes memory payload = mockProvider.makePayload(poolId, assetId);
        _processPayload(payload);
    }

    function setTargets(
        INavOracleWritable navOracle_,
        IProofOfReserveWritable proofOfReserve_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        navOracle = navOracle_;
        proofOfReserve = proofOfReserve_;
    }

    function setMockProvider(MockOracleProvider mockProvider_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        mockProvider = mockProvider_;
    }

    function _processPayload(bytes memory payload) internal {
        if (payload.length != 192) revert MalformedPayload();
        (bytes32 _poolId, bytes32 _assetId, uint256 nav, uint256 reserve, uint256 timestamp, bytes32 reportId) =
            abi.decode(payload, (bytes32, bytes32, uint256, uint256, uint256, bytes32));

        navOracle.setNav(_poolId, nav, timestamp, reportId);
        proofOfReserve.setReserve(_assetId, reserve, timestamp, reportId);

        emit OracleReportProcessed(_poolId, _assetId, nav, reserve, reportId);
    }
}


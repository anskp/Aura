// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IOracleUpdateCoordinator} from "./interfaces/IOracleUpdateCoordinator.sol";

contract OracleConsumer is AccessControl {
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");

    IOracleUpdateCoordinator public coordinator;

    event ReportForwarded(bytes32 indexed reportHash, address indexed caller);

    constructor(address admin, IOracleUpdateCoordinator coordinator_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REPORTER_ROLE, admin);
        coordinator = coordinator_;
    }

    function setCoordinator(IOracleUpdateCoordinator coordinator_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        coordinator = coordinator_;
    }

    function onReport(bytes calldata metadata, bytes calldata report) external onlyRole(REPORTER_ROLE) {
        coordinator.submitReport(report, metadata);
        emit ReportForwarded(keccak256(report), msg.sender);
    }
}

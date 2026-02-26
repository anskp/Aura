// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IOracleUpdateCoordinator} from "./interfaces/IOracleUpdateCoordinator.sol";

contract AutomationFacade is AutomationCompatibleInterface, AccessControl {
    bytes32 public constant AUTOMATION_ADMIN_ROLE = keccak256("AUTOMATION_ADMIN_ROLE");

    IOracleUpdateCoordinator public coordinator;
    uint256 public minInterval;
    uint256 public lastExecution;

    event UpkeepExecuted(uint256 indexed timestamp);

    constructor(address admin, IOracleUpdateCoordinator coordinator_, uint256 minInterval_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AUTOMATION_ADMIN_ROLE, admin);
        coordinator = coordinator_;
        minInterval = minInterval_;
    }

    function setMinInterval(uint256 minInterval_) external onlyRole(AUTOMATION_ADMIN_ROLE) {
        minInterval = minInterval_;
    }

    function setCoordinator(IOracleUpdateCoordinator coordinator_) external onlyRole(AUTOMATION_ADMIN_ROLE) {
        coordinator = coordinator_;
    }

    function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData) {
        upkeepNeeded = block.timestamp >= lastExecution + minInterval;
        performData = "";
    }

    function performUpkeep(bytes calldata) external {
        require(block.timestamp >= lastExecution + minInterval, "UPKEEP_NOT_NEEDED");
        lastExecution = block.timestamp;
        coordinator.processScheduledUpdate();
        emit UpkeepExecuted(lastExecution);
    }
}


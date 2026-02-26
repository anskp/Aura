// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAuraCcipBridge} from "./interfaces/IAuraCcipBridge.sol";

contract CcipConsumer is AccessControl {
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");

    IAuraCcipBridge public bridge;

    event CcipInstructionForwarded(bytes32 indexed reportHash, address indexed caller, address receiver, uint256 amount);

    constructor(address admin, IAuraCcipBridge bridge_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REPORTER_ROLE, admin);
        bridge = bridge_;
    }

    function setBridge(IAuraCcipBridge bridge_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bridge = bridge_;
    }

    function onReport(bytes calldata, bytes calldata report) external onlyRole(REPORTER_ROLE) {
        (address receiver, uint256 amount, bytes memory data) = abi.decode(report, (address, uint256, bytes));
        bridge.bridgeToFuji(receiver, amount, data);
        emit CcipInstructionForwarded(keccak256(report), msg.sender, receiver, amount);
    }
}

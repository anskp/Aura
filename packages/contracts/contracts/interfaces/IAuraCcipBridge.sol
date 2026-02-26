// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAuraCcipBridge {
    event BridgeInitiated(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address indexed sender,
        address receiver,
        uint256 amount
    );
    event BridgeReceived(bytes32 indexed messageId, uint64 indexed sourceChainSelector, address receiver, uint256 amount);

    function bridgeToFuji(address receiver, uint256 amount, bytes calldata data) external returns (bytes32 messageId);
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockOracleProvider {
    uint256 public navBase;
    uint256 public reserveBase;
    uint256 public sequence;

    constructor(uint256 navBase_, uint256 reserveBase_) {
        navBase = navBase_;
        reserveBase = reserveBase_;
    }

    function setBases(uint256 newNavBase, uint256 newReserveBase) external {
        navBase = newNavBase;
        reserveBase = newReserveBase;
    }

    function makePayload(bytes32 poolId, bytes32 assetId) external returns (bytes memory payload) {
        sequence += 1;
        uint256 nav = navBase + sequence * 1e16;
        uint256 reserve = reserveBase + sequence * 10e18;
        uint256 timestamp = block.timestamp;
        bytes32 reportId = keccak256(abi.encodePacked(poolId, assetId, sequence, timestamp));
        payload = abi.encode(poolId, assetId, nav, reserve, timestamp, reportId);
    }
}


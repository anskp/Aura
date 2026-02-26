// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC3643ComplianceModule {
    function canTransfer(address from, address to, uint256 amount) external view returns (bool, string memory);
}


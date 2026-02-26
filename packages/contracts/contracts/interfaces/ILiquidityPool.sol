// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILiquidityPool {
    event PoolDeposited(address indexed caller, address indexed receiver, uint256 assets, uint256 sharesMinted);
    event PoolWithdrawn(address indexed caller, address indexed receiver, uint256 sharesBurned, uint256 assetsReturned);

    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 shares, address receiver) external returns (uint256 assets);
    function previewDeposit(uint256 assets) external view returns (uint256 shares);
    function previewWithdraw(uint256 shares) external view returns (uint256 assets);
}


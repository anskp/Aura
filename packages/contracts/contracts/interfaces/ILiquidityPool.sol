// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILiquidityPool {
    event CollateralDeposited(address indexed issuer, uint256 amount);
    event CollateralWithdrawn(address indexed issuer, uint256 amount);
    event PoolInvested(address indexed investor, uint256 assets, uint256 sharesMinted);
    event PoolRedeemed(address indexed investor, uint256 sharesBurned, uint256 assetsReturned);
    event BridgeMinted(address indexed to, uint256 amount);
    event BridgeBurned(address indexed from, uint256 amount);

    function depositCollateral(uint256 amount) external;
    function withdrawCollateral(uint256 amount) external;
    function invest(uint256 assets, address receiver) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver) external returns (uint256 assets);
    function bridgeMint(address to, uint256 amount) external;
    function bridgeBurn(address from, uint256 amount) external;
    function previewInvest(uint256 assets) external view returns (uint256 shares);
    function previewRedeem(uint256 shares) external view returns (uint256 assets);
}

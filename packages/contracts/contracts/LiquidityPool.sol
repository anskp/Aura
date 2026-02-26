// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ILiquidityPool} from "./interfaces/ILiquidityPool.sol";
import {INavOracle} from "./interfaces/INavOracle.sol";
import {IProofOfReserve} from "./interfaces/IProofOfReserve.sol";

contract LiquidityPool is ERC20, AccessControl, ILiquidityPool {
    using SafeERC20 for IERC20;

    bytes32 public constant POOL_ADMIN_ROLE = keccak256("POOL_ADMIN_ROLE");
    uint256 public constant NAV_SCALE = 1e18;

    IERC20 public immutable assetToken;
    INavOracle public navOracle;
    IProofOfReserve public proofOfReserve;
    bytes32 public immutable poolId;
    bytes32 public immutable assetId;
    uint256 public maxNavAge = 2 days;

    error StaleNav(uint256 timestamp);
    error SystemPaused();
    error ZeroAddress();

    constructor(
        address admin,
        IERC20 token,
        INavOracle navOracle_,
        IProofOfReserve proofOfReserve_,
        bytes32 poolId_,
        bytes32 assetId_
    ) ERC20("AURA Pool Share", "AURAPS") {
        if (address(token) == address(0) || address(navOracle_) == address(0) || address(proofOfReserve_) == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POOL_ADMIN_ROLE, admin);
        assetToken = token;
        navOracle = navOracle_;
        proofOfReserve = proofOfReserve_;
        poolId = poolId_;
        assetId = assetId_;
    }

    function setDependencies(INavOracle navOracle_, IProofOfReserve proofOfReserve_) external onlyRole(POOL_ADMIN_ROLE) {
        if (address(navOracle_) == address(0) || address(proofOfReserve_) == address(0)) revert ZeroAddress();
        navOracle = navOracle_;
        proofOfReserve = proofOfReserve_;
    }

    function setMaxNavAge(uint256 maxAge) external onlyRole(POOL_ADMIN_ROLE) {
        maxNavAge = maxAge;
    }

    function previewDeposit(uint256 assets) public view returns (uint256 shares) {
        _assertHealthyAndFresh();
        uint256 nav = _getNav();
        return (assets * NAV_SCALE) / nav;
    }

    function previewWithdraw(uint256 shares) public view returns (uint256 assets) {
        _assertHealthyAndFresh();
        uint256 nav = _getNav();
        return (shares * nav) / NAV_SCALE;
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        _assertHealthyAndFresh();
        shares = previewDeposit(assets);
        assetToken.safeTransferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
        emit PoolDeposited(msg.sender, receiver, assets, shares);
    }

    function withdraw(uint256 shares, address receiver) external returns (uint256 assets) {
        _assertHealthyAndFresh();
        assets = previewWithdraw(shares);
        _burn(msg.sender, shares);
        assetToken.safeTransfer(receiver, assets);
        emit PoolWithdrawn(msg.sender, receiver, shares, assets);
    }

    function _assertHealthyAndFresh() internal view {
        if (proofOfReserve.isPaused() || !proofOfReserve.isSystemHealthy(assetId)) revert SystemPaused();
        (, uint256 timestamp, ) = navOracle.latestNav(poolId);
        if (block.timestamp > timestamp + maxNavAge) revert StaleNav(timestamp);
    }

    function _getNav() internal view returns (uint256 nav) {
        (nav, , ) = navOracle.latestNav(poolId);
        require(nav > 0, "NAV_ZERO");
    }
}


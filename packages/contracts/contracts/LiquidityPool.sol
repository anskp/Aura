// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ILiquidityPool} from "./interfaces/ILiquidityPool.sol";
import {INavOracle} from "./interfaces/INavOracle.sol";
import {IProofOfReserve} from "./interfaces/IProofOfReserve.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IAuraRwaMintable {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

contract LiquidityPool is ERC20, AccessControl, ILiquidityPool {
    using SafeERC20 for IERC20;

    bytes32 public constant POOL_ADMIN_ROLE = keccak256("POOL_ADMIN_ROLE");
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    uint256 public constant NAV_SCALE = 1e18;

    IERC20 public immutable stablecoin;
    address public immutable rwaToken;
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
        IERC20 stablecoin_,
        address rwaToken_,
        INavOracle navOracle_,
        IProofOfReserve proofOfReserve_,
        bytes32 poolId_,
        bytes32 assetId_,
        string memory shareName_,
        string memory shareSymbol_
    ) ERC20(shareName_, shareSymbol_) {
        if (address(stablecoin_) == address(0) || rwaToken_ == address(0) || address(navOracle_) == address(0) || address(proofOfReserve_) == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POOL_ADMIN_ROLE, admin);
        _grantRole(BRIDGE_ROLE, admin);
        stablecoin = stablecoin_;
        rwaToken = rwaToken_;
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

    /**
     * @notice Deposit RWA Tokens as collateral/backing for the pool
     * @param amount Amount of RWA tokens to lock in the vault
     */
    function depositCollateral(uint256 amount) external onlyRole(POOL_ADMIN_ROLE) {
        IERC20(rwaToken).safeTransferFrom(msg.sender, address(this), amount);
        emit CollateralDeposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw RWA Tokens from the pool (Admin only)
     * @param amount Amount of RWA tokens to remove
     */
    function withdrawCollateral(uint256 amount) external onlyRole(POOL_ADMIN_ROLE) {
        IERC20(rwaToken).safeTransfer(msg.sender, amount);
        emit CollateralWithdrawn(msg.sender, amount);
    }

    function previewInvest(uint256 assets) public view returns (uint256 shares) {
        _assertHealthyAndFresh();
        uint256 nav = _getNav();
        
        // Normalize assets to 18 decimals before applying NAV
        uint256 stableDecimals = IERC20Metadata(address(stablecoin)).decimals();
        uint256 normalizedAssets = assets;
        if (stableDecimals < 18) {
            normalizedAssets = assets * (10 ** (18 - stableDecimals));
        } else if (stableDecimals > 18) {
            normalizedAssets = assets / (10 ** (stableDecimals - 18));
        }

        return (normalizedAssets * NAV_SCALE) / nav;
    }

    function previewRedeem(uint256 shares) public view returns (uint256 assets) {
        _assertHealthyAndFresh();
        uint256 nav = _getNav();
        uint256 normalizedAssets = (shares * nav) / NAV_SCALE;

        // Scale back to stablecoin decimals
        uint256 stableDecimals = IERC20Metadata(address(stablecoin)).decimals();
        if (stableDecimals < 18) {
            assets = normalizedAssets / (10 ** (18 - stableDecimals));
        } else if (stableDecimals > 18) {
            assets = normalizedAssets * (10 ** (stableDecimals - 18));
        } else {
            assets = normalizedAssets;
        }
    }

    /**
     * @notice Invest Stablecoins to receive Pool Shares (AURAPS)
     * @param assets Amount of stablecoins to invest
     * @param receiver The address to receive the pool shares
     */
    function invest(uint256 assets, address receiver) external returns (uint256 shares) {
        _assertHealthyAndFresh();
        shares = previewInvest(assets);
        
        // 1. Transfer stablecoins from investor to pool
        stablecoin.safeTransferFrom(msg.sender, address(this), assets);
        
        // 2. Mint Pool Shares (AURAPS) to track the investor's stake
        _mint(receiver, shares);
        
        emit PoolInvested(receiver, assets, shares);
    }

    /**
     * @notice Redeem Pool Shares for Stablecoins
     * @param shares Amount of pool shares to burn
     * @param receiver The address to receive the stablecoins
     */
    function redeem(uint256 shares, address receiver) external returns (uint256 assets) {
        _assertHealthyAndFresh();
        assets = previewRedeem(shares);
        
        // 1. Burn Pool Shares
        _burn(msg.sender, shares);

        // 2. Return Stablecoins
        stablecoin.safeTransfer(receiver, assets);
        
        emit PoolRedeemed(msg.sender, shares, assets);
    }

    function bridgeMint(address to, uint256 amount) external onlyRole(BRIDGE_ROLE) {
        _mint(to, amount);
        emit BridgeMinted(to, amount);
    }

    function bridgeBurn(address from, uint256 amount) external onlyRole(BRIDGE_ROLE) {
        _burn(from, amount);
        emit BridgeBurned(from, amount);
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

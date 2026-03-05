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
        bytes32 assetId_
    ) ERC20("AURA Pool Share", "AURAPS") {
        if (address(stablecoin_) == address(0) || rwaToken_ == address(0) || address(navOracle_) == address(0) || address(proofOfReserve_) == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POOL_ADMIN_ROLE, admin);
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

    function previewDeposit(uint256 assets) public view returns (uint256 shares) {
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

    function previewWithdraw(uint256 shares) public view returns (uint256 assets) {
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
     * @notice Deposit Stablecoins to MINT new RWA tokens
     * @param assets Amount of stablecoins to deposit
     * @param receiver The address to receive the minted RWA tokens
     */
    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        _assertHealthyAndFresh();
        shares = previewDeposit(assets);
        
        // 1. Transfer stablecoins from investor to pool
        stablecoin.safeTransferFrom(msg.sender, address(this), assets);
        
        // 2. MINT new RWA tokens directly to investor
        // Pool must have ISSUER_ROLE on the rwaToken contract
        try IAuraRwaMintable(rwaToken).mint(receiver, shares) {
            // Success
        } catch {
            revert("MINT_FAILED_CHECK_POOL_ROLES");
        }
        
        // 3. Mint Pool Shares (AURAPS) to track the investor's stake
        _mint(receiver, shares);
        
        emit PoolDeposited(msg.sender, receiver, assets, shares);
    }


    function withdraw(uint256 shares, address receiver) external returns (uint256 assets) {
        _assertHealthyAndFresh();
        assets = previewWithdraw(shares);
        
        // 1. Burn the RWA tokens from the user
        // Note: For simplicity, we assume the user has approved the pool to burn or we use a burnFrom logic
        // In AuraRwaToken, burn usually requires roles or owner.
        // If we want the pool to burn on behalf of the user, the pool needs BRIDGE_ROLE or similar.
        try IAuraRwaMintable(rwaToken).burn(msg.sender, shares) {
            // Success
        } catch {
            revert("BURN_FAILED_CHECK_POOL_ROLES");
        }

        // 2. Burn Pool Shares
        _burn(msg.sender, shares);

        // 3. Return Stablecoins
        stablecoin.safeTransfer(receiver, assets);
        
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


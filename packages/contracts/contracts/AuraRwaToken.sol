// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC3643ComplianceModule} from "./interfaces/IERC3643ComplianceModule.sol";
import {INavOracle} from "./interfaces/INavOracle.sol";

contract AuraRwaToken is ERC20, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    bytes32 public constant COMPLIANCE_ADMIN_ROLE = keccak256("COMPLIANCE_ADMIN_ROLE");

    IERC3643ComplianceModule public complianceModule;

    /// @notice The NAV oracle contract for this token
    INavOracle public navOracle;

    /// @notice The pool ID used to query the NAV oracle
    bytes32 public poolId;

    event ComplianceModuleUpdated(address indexed module);
    event ComplianceCheckFailed(address indexed from, address indexed to, uint256 amount, string reason);
    event NavOracleUpdated(address indexed oracle, bytes32 indexed poolId);

    error NonCompliantTransfer(string reason);

    constructor(
        string memory name_,
        string memory symbol_,
        address admin,
        IERC3643ComplianceModule module
    ) ERC20(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
        _grantRole(BRIDGE_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN_ROLE, admin);
        complianceModule = module;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin setters
    // ─────────────────────────────────────────────────────────────────────────

    function setComplianceModule(IERC3643ComplianceModule module) external onlyRole(COMPLIANCE_ADMIN_ROLE) {
        complianceModule = module;
        emit ComplianceModuleUpdated(address(module));
    }

    /// @notice Link this token to a NAV oracle and pool
    /// @dev Call this once after deployment to enable navPrice() reads
    function setNavOracle(INavOracle oracle, bytes32 _poolId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        navOracle = oracle;
        poolId = _poolId;
        emit NavOracleUpdated(address(oracle), _poolId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NAV price view — readable directly from Etherscan
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Returns the current NAV price of this RWA token (18 decimals, like ETH)
    /// @return nav       Price per token, e.g. 1010000000000000000 = 1.01
    /// @return timestamp Unix timestamp of the last oracle update
    /// @return reportId  ID of the report that set this price
    function navPrice() external view returns (uint256 nav, uint256 timestamp, bytes32 reportId) {
        require(address(navOracle) != address(0), "NavOracle not set");
        return navOracle.latestNav(poolId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Minting / Burning
    // ─────────────────────────────────────────────────────────────────────────

    function mint(address to, uint256 amount) external onlyRole(ISSUER_ROLE) {
        _mint(to, amount);
    }

    function bridgeMint(address to, uint256 amount) external onlyRole(BRIDGE_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(ISSUER_ROLE) {
        _burn(from, amount);
    }

    function bridgeBurn(address from, uint256 amount) external onlyRole(BRIDGE_ROLE) {
        _burn(from, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ERC-3643 compliance hook
    // ─────────────────────────────────────────────────────────────────────────

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && address(complianceModule) != address(0)) {
            (bool ok, string memory reason) = complianceModule.canTransfer(from, to, value);
            if (!ok) {
                emit ComplianceCheckFailed(from, to, value, reason);
                revert NonCompliantTransfer(reason);
            }
        }
        super._update(from, to, value);
    }
}

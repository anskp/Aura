// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC3643ComplianceModule} from "./interfaces/IERC3643ComplianceModule.sol";
import {IAuraCcipBridge} from "./interfaces/IAuraCcipBridge.sol";
import {IAny2EVMMessageReceiver} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract AuraCcipReceiver is CCIPReceiver, AccessControl, IAuraCcipBridge {
    using SafeERC20 for IERC20;

    bytes32 public constant BRIDGE_ADMIN_ROLE = keccak256("BRIDGE_ADMIN_ROLE");

    IERC20 public rwaToken;
    IERC3643ComplianceModule public complianceModule;
    mapping(uint64 => bytes) public trustedSenders;

    event SenderTrusted(uint64 indexed sourceChainSelector, bytes sender);

    constructor(
        address admin,
        address router,
        IERC20 rwaToken_,
        IERC3643ComplianceModule complianceModule_
    ) CCIPReceiver(router) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BRIDGE_ADMIN_ROLE, admin);
        rwaToken = rwaToken_;
        complianceModule = complianceModule_;
    }

    function bridgeToFuji(address, uint256, bytes calldata) external pure returns (bytes32) {
        revert("RECEIVER_ONLY");
    }

    function setTrustedSender(uint64 sourceChainSelector, bytes calldata sender) external onlyRole(BRIDGE_ADMIN_ROLE) {
        trustedSenders[sourceChainSelector] = sender;
        emit SenderTrusted(sourceChainSelector, sender);
    }

    function setComplianceModule(IERC3643ComplianceModule complianceModule_) external onlyRole(BRIDGE_ADMIN_ROLE) {
        complianceModule = complianceModule_;
    }

    function supportsInterface(bytes4 interfaceId) public pure override(CCIPReceiver, AccessControl) returns (bool) {
        return interfaceId == type(IAny2EVMMessageReceiver).interfaceId || interfaceId == type(IERC165).interfaceId
            || interfaceId == type(IAccessControl).interfaceId;
    }

    function _ccipReceive(Client.Any2EVMMessage memory any2EvmMessage) internal override {
        bytes memory trusted = trustedSenders[any2EvmMessage.sourceChainSelector];
        require(trusted.length != 0, "UNTRUSTED_SOURCE");
        require(keccak256(trusted) == keccak256(any2EvmMessage.sender), "UNTRUSTED_SENDER");

        (address receiver, ) = abi.decode(any2EvmMessage.data, (address, bytes));
        uint256 amount = any2EvmMessage.destTokenAmounts.length > 0 ? any2EvmMessage.destTokenAmounts[0].amount : 0;
        (bool ok, ) = complianceModule.canTransfer(address(this), receiver, amount);
        require(ok, "NON_COMPLIANT_RECEIVER");

        if (amount > 0) {
            rwaToken.safeTransfer(receiver, amount);
        }

        emit BridgeReceived(any2EvmMessage.messageId, any2EvmMessage.sourceChainSelector, receiver, amount);
    }
}

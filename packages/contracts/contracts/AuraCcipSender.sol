// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAuraCcipBridge} from "./interfaces/IAuraCcipBridge.sol";

contract AuraCcipSender is AccessControl, IAuraCcipBridge {
    using SafeERC20 for IERC20;

    bytes32 public constant BRIDGE_ADMIN_ROLE = keccak256("BRIDGE_ADMIN_ROLE");

    IRouterClient public router;
    LinkTokenInterface public linkToken;
    IERC20 public rwaToken;
    uint64 public fujiChainSelector;
    address public destinationReceiver;
    bool public payFeesInLink;

    constructor(
        address admin,
        IRouterClient router_,
        LinkTokenInterface linkToken_,
        IERC20 rwaToken_,
        uint64 fujiChainSelector_,
        address destinationReceiver_
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BRIDGE_ADMIN_ROLE, admin);
        router = router_;
        linkToken = linkToken_;
        rwaToken = rwaToken_;
        fujiChainSelector = fujiChainSelector_;
        destinationReceiver = destinationReceiver_;
    }

    function setConfig(
        IRouterClient router_,
        LinkTokenInterface linkToken_,
        IERC20 rwaToken_,
        uint64 fujiChainSelector_,
        address destinationReceiver_,
        bool payFeesInLink_
    ) external onlyRole(BRIDGE_ADMIN_ROLE) {
        router = router_;
        linkToken = linkToken_;
        rwaToken = rwaToken_;
        fujiChainSelector = fujiChainSelector_;
        destinationReceiver = destinationReceiver_;
        payFeesInLink = payFeesInLink_;
    }

    function bridgeToFuji(address receiver, uint256 amount, bytes calldata data) external returns (bytes32 messageId) {
        rwaToken.safeTransferFrom(msg.sender, address(this), amount);
        rwaToken.approve(address(router), amount);

        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({token: address(rwaToken), amount: amount});

        bytes memory payload = abi.encode(receiver, data);
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(destinationReceiver),
            data: payload,
            tokenAmounts: tokenAmounts,
            extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: 350_000})),
            feeToken: payFeesInLink ? address(linkToken) : address(0)
        });

        uint256 fee = router.getFee(fujiChainSelector, message);
        if (payFeesInLink) {
            require(linkToken.approve(address(router), fee), "LINK_APPROVE_FAILED");
            messageId = router.ccipSend(fujiChainSelector, message);
        } else {
            messageId = router.ccipSend{value: fee}(fujiChainSelector, message);
        }

        emit BridgeInitiated(messageId, fujiChainSelector, msg.sender, receiver, amount);
    }

    receive() external payable {}
}

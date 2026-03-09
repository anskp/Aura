// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAuraCcipBridge} from "./interfaces/IAuraCcipBridge.sol";

interface IAuraBridgeMintable {
    function bridgeBurn(address from, uint256 amount) external;
}

contract AuraCcipSender is AccessControl, IAuraCcipBridge {
    bytes32 public constant BRIDGE_ADMIN_ROLE = keccak256("BRIDGE_ADMIN_ROLE");

    IRouterClient public router;
    LinkTokenInterface public linkToken;
    IAuraBridgeMintable public rwaToken;
    uint64 public fujiChainSelector;
    address public destinationReceiver;
    bool public payFeesInLink;

    constructor(
        address admin,
        IRouterClient router_,
        LinkTokenInterface linkToken_,
        IAuraBridgeMintable rwaToken_,
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
        IAuraBridgeMintable rwaToken_,
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
        rwaToken.bridgeBurn(msg.sender, amount);

        // Message-only CCIP path: amount is encoded in payload and minted on destination chain.
        bytes memory payload = abi.encode(receiver, amount, data);
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(destinationReceiver),
            data: payload,
            tokenAmounts: new Client.EVMTokenAmount[](0),
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

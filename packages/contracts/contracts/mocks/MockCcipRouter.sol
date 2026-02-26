// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ICCIPReceiverLike {
    function ccipReceive(Client.Any2EVMMessage calldata message) external;
}

contract MockCcipRouter is IRouterClient {
    using SafeERC20 for IERC20;

    uint256 public flatFee = 1e15;
    uint64 public sourceSelector = 16015286601757825753;
    bytes32 public lastMessageId;
    bytes public lastReceiver;
    bytes public lastData;
    address public lastFeeToken;
    bytes public lastExtraArgs;
    uint64 public lastDestination;
    bytes public lastSender;
    address[] public lastTokens;
    uint256[] public lastAmounts;

    function setFlatFee(uint256 fee) external {
        flatFee = fee;
    }

    function isChainSupported(uint64) external pure returns (bool) {
        return true;
    }

    function getFee(uint64, Client.EVM2AnyMessage memory) external view returns (uint256) {
        return flatFee;
    }

    function ccipSend(uint64 destinationChainSelector, Client.EVM2AnyMessage memory message)
        external
        payable
        returns (bytes32)
    {
        if (message.feeToken == address(0)) {
            require(msg.value >= flatFee, "INSUFFICIENT_NATIVE_FEE");
        } else {
            IERC20(message.feeToken).safeTransferFrom(msg.sender, address(this), flatFee);
        }
        for (uint256 i = 0; i < message.tokenAmounts.length; i++) {
            IERC20(message.tokenAmounts[i].token).safeTransferFrom(msg.sender, address(this), message.tokenAmounts[i].amount);
        }
        lastDestination = destinationChainSelector;
        lastReceiver = message.receiver;
        lastData = message.data;
        lastFeeToken = message.feeToken;
        lastExtraArgs = message.extraArgs;
        delete lastTokens;
        delete lastAmounts;
        for (uint256 j = 0; j < message.tokenAmounts.length; j++) {
            lastTokens.push(message.tokenAmounts[j].token);
            lastAmounts.push(message.tokenAmounts[j].amount);
        }
        lastSender = abi.encode(msg.sender);
        lastMessageId = keccak256(abi.encode(block.number, destinationChainSelector, msg.sender, message.data));
        return lastMessageId;
    }

    function deliverLatest(address receiverContract) external {
        require(lastMessageId != bytes32(0), "NO_MESSAGE");

        Client.EVMTokenAmount[] memory amounts = new Client.EVMTokenAmount[](lastTokens.length);
        for (uint256 i = 0; i < lastTokens.length; i++) {
            amounts[i] = Client.EVMTokenAmount({token: lastTokens[i], amount: lastAmounts[i]});
            IERC20(amounts[i].token).safeTransfer(receiverContract, amounts[i].amount);
        }

        Client.Any2EVMMessage memory incoming = Client.Any2EVMMessage({
            messageId: lastMessageId,
            sourceChainSelector: sourceSelector,
            sender: lastSender,
            data: lastData,
            destTokenAmounts: amounts
        });
        ICCIPReceiverLike(receiverContract).ccipReceive(incoming);
    }
}

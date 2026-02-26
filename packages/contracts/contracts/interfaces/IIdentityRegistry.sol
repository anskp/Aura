// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIdentityRegistry {
    event IdentityUpdated(address indexed account, bool isVerified);

    function setVerified(address account, bool verified) external;
    function isVerified(address account) external view returns (bool);
}


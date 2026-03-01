const IDENTITY_REGISTRY_ABI = [
    "function setVerified(address account, bool verified) external",
    "function isVerified(address account) external view returns (bool)"
];

module.exports = {
    IDENTITY_REGISTRY_ABI
};

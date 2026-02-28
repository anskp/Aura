const prisma = require('../config/prisma');

const updateKYC = async (userId, status) => {
    return await prisma.user.update({
        where: { id: userId },
        data: { kycStatus: status }
    });
};

const getAllUsers = async () => {
    return await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            kycStatus: true,
            wallets: true
        }
    });
};

module.exports = {
    updateKYC,
    getAllUsers
};

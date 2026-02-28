const userService = require('../services/user.service');

const submitKYC = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await userService.updateKYC(userId, 'SUBMITTED');
        res.status(200).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getUsers = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const users = await userService.getAllUsers();
        res.status(200).json(users);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const approveKYC = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { userId, status } = req.body; // status: APPROVED or REJECTED
        const user = await userService.updateKYC(userId, status);
        res.status(200).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    submitKYC,
    getUsers,
    approveKYC
};

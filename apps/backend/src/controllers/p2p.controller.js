const p2pService = require('../services/p2p.service');

const getConfig = async (req, res) => {
    try {
        const data = await p2pService.getConfig();
        res.status(200).json(data);
    } catch (error) {
        console.error('[API Error] p2p.getConfig:', error.message);
        res.status(400).json({ error: error.message });
    }
};

const getOrderBook = async (req, res) => {
    try {
        const orders = await p2pService.getOrderBook();
        res.status(200).json(orders);
    } catch (error) {
        console.error('[API Error] p2p.getOrderBook:', error.message);
        res.status(400).json({ error: error.message });
    }
};

const createSellOrder = async (req, res) => {
    try {
        const order = await p2pService.createSellOrder(req.user, req.body);
        res.status(201).json(order);
    } catch (error) {
        console.error('[API Error] p2p.createSellOrder:', error.message);
        res.status(400).json({ error: error.message });
    }
};

const fillOrder = async (req, res) => {
    try {
        const result = await p2pService.fillOrder(req.user, req.body);
        res.status(200).json(result);
    } catch (error) {
        console.error('[API Error] p2p.fillOrder:', error.message);
        res.status(400).json({ error: error.message });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await p2pService.cancelOrder(req.user, orderId);
        res.status(200).json(order);
    } catch (error) {
        console.error('[API Error] p2p.cancelOrder:', error.message);
        res.status(400).json({ error: error.message });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const data = await p2pService.getMyOrders(req.user.id);
        res.status(200).json(data);
    } catch (error) {
        console.error('[API Error] p2p.getMyOrders:', error.message);
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getConfig,
    getOrderBook,
    createSellOrder,
    fillOrder,
    cancelOrder,
    getMyOrders
};

const geminiService = require('../services/gemini.service');

const chat = async (req, res) => {
    try {
        const { message, history } = req.body;
        const result = await geminiService.chatWithAgent({
            message,
            history,
            context: {
                userId: req.user?.id,
                role: req.user?.role,
                email: req.user?.email
            }
        });
        res.status(200).json(result);
    } catch (error) {
        console.error(`[API Error] ai.chat: ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    chat
};


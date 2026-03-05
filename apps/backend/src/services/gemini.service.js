const { GoogleGenAI } = require("@google/genai");

class GeminiService {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is not defined");
            return;
        }
        this.client = new GoogleGenAI({ apiKey });
    }

    async getAssetValuation(assetDetails, retries = 2) {
        try {
            const prompt = `
                Analyze this Real World Asset (RWA) for tokenization:
                - Name: ${assetDetails.name}
                - Type: ${assetDetails.type}
                - Description: ${assetDetails.description}
                - Location: ${assetDetails.location || "Not specified"}
                - Initial Valuation: $${assetDetails.valuation}
                
                IMPORTANT INSTRUCTIONS:
                1. DO NOT simply repeat or 'retain' the Initial Valuation provided by the user.
                2. Provide your own INDEPENDENT market assessment.
                3. If information is sparse (e.g. only 'boat'), use your internal knowledge of market averages for that specific asset category and location to provide a distinct, professional valuation.
                4. Your valuation will be used as the Net Asset Value (NAV) for a blockchain-based RWA token.
                5. Your reasoning must justify why your value might differ from the user's initial estimate.
                
                Respond in JSON: { "recommendedValuation": number, "confidenceScore": 0-1, "reasoning": "string" }
            `;

            console.log(`[Gemini] Analyzing asset: ${assetDetails.name} (Calling API)`);
            const result = await this.client.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: { response_mime_type: "application/json" }
            });

            // Log keys to see what we have
            console.log(`[Gemini] Result keys:`, Object.keys(result));

            // The new @google/genai SDK structure for Node.js
            let text = "";
            if (result.candidates && result.candidates.length > 0) {
                text = result.candidates[0].content.parts[0].text;
            } else if (result.response && typeof result.response.text === 'function') {
                text = result.response.text();
            } else if (typeof result.text === 'function') {
                text = result.text();
            }

            if (!text) {
                console.error("[Gemini] Could not extract text from response:", JSON.stringify(result));
                throw new Error("Empty AI response");
            }

            console.log(`[Gemini] Extracted Text:`, text.substring(0, 100) + "...");

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON in response");

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error(`[Gemini] Error:`, error.message);
            if (retries > 0) {
                console.log(`[Gemini] Retrying...`);
                return this.getAssetValuation(assetDetails, retries - 1);
            }
            return {
                recommendedValuation: assetDetails.valuation,
                confidenceScore: 0,
                reasoning: `AI Fallback: ${error.message}`
            };
        }
    }
}

module.exports = new GeminiService();

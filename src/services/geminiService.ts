import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const geminiService = {
  async calculateCompatibility(user1: any, user2: any) {
    const prompt = `
      Calculate a dating compatibility score (0-100) between two people based on their profiles:
      
      Person 1:
      - Interests: ${user1.interests?.join(', ')}
      - Bio: ${user1.bio}
      
      Person 2:
      - Interests: ${user2.interests?.join(', ')}
      - Bio: ${user2.bio}
      
      Return ONLY a JSON object with:
      {
        "score": number,
        "reason": "A short 1-sentence explanation of why they are a good match"
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      return JSON.parse(response.text || '{"score": 50, "reason": "Average compatibility"}');
    } catch (error) {
      console.error("Gemini AI error", error);
      return { score: 50, reasoning: "AI service unavailable" };
    }
  },

  async generateIcebreaker(user1: any, user2: any) {
    const prompt = `
      Generate a creative and engaging icebreaker message for Person 1 to send to Person 2.
      
      Person 1: ${user1.fullName}, Interests: ${user1.interests?.join(', ')}
      Person 2: ${user2.fullName}, Interests: ${user2.interests?.join(', ')}
      
      Return ONLY the message text.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      return response.text;
    } catch (error) {
      console.error("Gemini AI error", error);
      return "Hey! How's it going?";
    }
  }
};

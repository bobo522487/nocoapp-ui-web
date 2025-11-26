import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client
// Note: process.env.API_KEY is assumed to be available in the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const streamChatResponse = async function* (
  history: { role: 'user' | 'model'; text: string }[],
  newMessage: string
) {
  try {
    const model = 'gemini-2.5-flash';
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: "You are an expert coding assistant embedded within a CodeSandbox-like IDE. Keep your answers concise, helpful, and focused on React, TypeScript, and web development.",
      },
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }))
    });

    const result = await chat.sendMessageStream({ message: newMessage });

    for await (const chunk of result) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    yield "I encountered an error while processing your request. Please check your API key configuration.";
  }
};
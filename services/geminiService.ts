
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async polishJustification(draft: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Tukarkan draf alasan pinjaman aset kerajaan ini kepada bahasa formal yang sesuai untuk borang KEW.PA-9. Draf: "${draft}". Balas dengan teks formal sahaja.`,
      });
      return response.text?.trim() || draft;
    } catch (error) {
      console.error("Gemini Error:", error);
      return draft;
    }
  },

  async getDashboardSummary(formsCount: number, pendingCount: number): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Berikan satu ayat ringkasan motivasi pendek untuk pegawai yang menguruskan ${formsCount} borang pinjaman aset, di mana ${pendingCount} masih belum selesai. Gunakan nada profesional.`,
      });
      return response.text?.trim() || "Selamat bertugas.";
    } catch (error) {
      return "Selamat bertugas dan teruskan kecemerlangan.";
    }
  }
};

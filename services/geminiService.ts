
import { GoogleGenAI } from "@google/genai";

/* Guideline: Re-instantiate GoogleGenAI right before making a call to ensure updated API key usage. */
export const geminiService = {
  async polishJustification(draft: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Tukarkan draf alasan pinjaman aset kerajaan ini kepada bahasa formal yang sesuai untuk borang KEW.PA-9. Draf: "${draft}". Balas dengan teks formal sahaja.`,
      });
      /* Guideline: Access .text property directly, not as a method. */
      return response.text?.trim() || draft;
    } catch (error) {
      console.error("Gemini Error:", error);
      return draft;
    }
  },

  async getDashboardSummary(formsCount: number, pendingCount: number): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Berikan satu ayat ringkasan motivasi pendek untuk pegawai yang menguruskan ${formsCount} borang pinjaman aset, di mana ${pendingCount} masih belum selesai. Gunakan nada profesional.`,
      });
      /* Guideline: Access .text property directly, not as a method. */
      return response.text?.trim() || "Selamat bertugas.";
    } catch (error) {
      return "Selamat bertugas dan teruskan kecemerlangan.";
    }
  }
};

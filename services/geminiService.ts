
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
        contents: `Berikan satu ayat motivasi profesional pendek (maksimum 15 patah perkataan) untuk seorang pegawai kerajaan yang melihat dashboard peribadinya. Dia mempunyai ${formsCount} rekod pinjaman secara keseluruhan dan ${pendingCount} daripadanya masih menunggu kelulusan admin. Gunakan Bahasa Melayu formal yang mesra.`,
      });
      /* Guideline: Access .text property directly, not as a method. */
      return response.text?.trim() || "Selamat bertugas dan teruskan kecemerlangan.";
    } catch (error) {
      return "Selamat bertugas dan teruskan kecemerlangan.";
    }
  }
};

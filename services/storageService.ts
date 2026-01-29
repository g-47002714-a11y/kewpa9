
import { KEWPA9Form, User, Asset } from '../types';

/**
 * PANDUAN STRUKTUR GOOGLE SHEETS (Helaian 'forms'):
 * Pastikan kolum di baris pertama (Header) diletakkan TEPAT seperti berikut (case-sensitive):
 * id, userId, assetName, registrationNo, serialNo, purpose, locationTo, 
 * coe, dateOut, dateExpectedIn, dateActualIn, status, createdAt,
 * borrowerName, signature, approverName, approverDate, adminSignature,
 * returnUserSignature, returnAdminSignature, remarks
 * 
 * NOTA: Gunakan tajuk kolum 'coe' (semua huruf kecil) di Google Sheets anda.
 */

// GANTIKAN PAUTAN DI BAWAH DENGAN PAUTAN "WEB APP" BARU ANDA
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwsIvNruOKDpxYc-MH_SZlNggNsiwC5DeilU09Vx-suGWY_Avh5o8DBi-UNypMsuFBHRg/exec";
const LOCAL_FORMS_KEY = "kewpa9_forms_cache";

const fetchFromSheets = async (sheetName: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${SCRIPT_URL}?sheet=${sheetName}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`Gagal fetch sheet ${sheetName}:`, error);
    return [];
  }
};

const postToSheets = async (sheetName: string, data: any, action: 'save' | 'delete' = 'save') => {
  try {
    const payload = { sheet: sheetName, action, data };
    
    // DEBUG: Buka console browser (F12) untuk melihat data yang dihantar
    console.log(`[Cloud Sync] Menghantar ke Google Sheets (${sheetName}):`, payload);

    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Penting untuk Google Apps Script
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    
    return { status: "ok" };
  } catch (error) {
    console.error(`Ralat semasa post ke ${sheetName}:`, error);
    throw error;
  }
};

export const storageService = {
  checkConnection: () => SCRIPT_URL.includes('/exec'),

  getUsers: async (): Promise<User[]> => fetchFromSheets('users'),
  saveUser: async (user: User) => postToSheets('users', user),
  updateUser: async (updatedUser: User) => postToSheets('users', updatedUser),
  deleteUser: async (id: string) => postToSheets('users', { id }, 'delete'),

  getForms: async (): Promise<KEWPA9Form[]> => {
    const cloudForms = await fetchFromSheets('forms');
    const localData = localStorage.getItem(LOCAL_FORMS_KEY);
    const localForms: KEWPA9Form[] = localData ? JSON.parse(localData) : [];

    const mergedMap = new Map<string, KEWPA9Form>();
    cloudForms.forEach(f => mergedMap.set(f.id, f));
    localForms.forEach(f => mergedMap.set(f.id, f));

    return Array.from(mergedMap.values());
  },

  saveForm: async (form: KEWPA9Form) => {
    // 1. Simpan ke Cache Tempatan (Serta-merta)
    const localData = localStorage.getItem(LOCAL_FORMS_KEY);
    let localForms: KEWPA9Form[] = localData ? JSON.parse(localData) : [];
    
    const index = localForms.findIndex(f => f.id === form.id);
    if (index >= 0) {
      localForms[index] = form;
    } else {
      localForms.push(form);
    }
    localStorage.setItem(LOCAL_FORMS_KEY, JSON.stringify(localForms));

    // 2. Hantar ke Google Sheets (Pastikan 'coe' ada dalam 'form' object)
    return await postToSheets('forms', form);
  },

  deleteForm: async (id: string) => {
    const localData = localStorage.getItem(LOCAL_FORMS_KEY);
    if (localData) {
      const localForms: KEWPA9Form[] = JSON.parse(localData);
      localStorage.setItem(LOCAL_FORMS_KEY, JSON.stringify(localForms.filter(f => f.id !== id)));
    }
    return await postToSheets('forms', { id }, 'delete');
  },

  getAssets: async (): Promise<Asset[]> => fetchFromSheets('assets'),
  saveAsset: async (asset: Asset) => postToSheets('assets', asset),
  updateAssetStatus: async (registrationNo: string, newStatus: 'AVAILABLE' | 'LOANED' | 'MAINTENANCE') => {
    const assets = await storageService.getAssets();
    const asset = assets.find(a => a.registrationNo === registrationNo);
    if (asset) await postToSheets('assets', { ...asset, status: newStatus });
  },
  deleteAsset: async (id: string) => postToSheets('assets', { id }, 'delete')
};

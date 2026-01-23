
import { KEWPA9Form, User, Asset } from '../types';

/**
 * URL Web App Google Apps Script yang menghubungkan aplikasi ke Google Sheets.
 */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyDzDekm2TpH_3Tfqj5JnJ7SSResged_sp6mXbTba10NZk8uLw315VZQCJ_56BNvq1mBQ/exec";

const fetchFromSheets = async (sheetName: string) => {
  try {
    const response = await fetch(`${SCRIPT_URL}?sheet=${sheetName}`);
    if (!response.ok) throw new Error("Gagal mengambil data dari awan.");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(`Amaran: Gagal ambil data ${sheetName}.`, error);
    return [];
  }
};

const postToSheets = async (sheetName: string, data: any, action: 'save' | 'delete' = 'save') => {
  console.log(`Menghantar tindakan [${action}] ke [${sheetName}]...`, data);
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({ sheet: sheetName, action, data }),
    });
    
    // Kerana no-cors, kita tidak boleh baca response body, 
    // tetapi fetch akan resolve jika request berjaya dihantar.
    return { status: "ok" };
  } catch (error) {
    console.error("Ralat Penghantaran Cloud:", error);
    throw error;
  }
};

export const storageService = {
  checkConnection: () => {
    return SCRIPT_URL.includes('/exec') && SCRIPT_URL.startsWith('https://script.google.com');
  },

  getUsers: async (): Promise<User[]> => {
    return await fetchFromSheets('users');
  },

  saveUser: async (user: User) => {
    return await postToSheets('users', user);
  },

  updateUser: async (updatedUser: User) => {
    return await postToSheets('users', updatedUser);
  },

  deleteUser: async (id: string) => {
    return await postToSheets('users', { id }, 'delete');
  },

  getForms: async (): Promise<KEWPA9Form[]> => {
    return await fetchFromSheets('forms');
  },

  saveForm: async (form: KEWPA9Form) => {
    return await postToSheets('forms', form);
  },

  deleteForm: async (id: string) => {
    return await postToSheets('forms', { id }, 'delete');
  },

  getAssets: async (): Promise<Asset[]> => {
    return await fetchFromSheets('assets');
  },

  saveAsset: async (asset: Asset) => {
    return await postToSheets('assets', asset);
  },

  updateAssetStatus: async (registrationNo: string, newStatus: 'AVAILABLE' | 'LOANED' | 'MAINTENANCE') => {
    const assets = await storageService.getAssets();
    const asset = assets.find(a => a.registrationNo === registrationNo);
    if (asset) {
      await postToSheets('assets', { ...asset, status: newStatus });
    }
  },

  deleteAsset: async (id: string) => {
    return await postToSheets('assets', { id }, 'delete');
  }
};

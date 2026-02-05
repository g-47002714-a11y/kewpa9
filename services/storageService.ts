
import { KEWPA9Form, User, Asset } from '../types';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwsIvNruOKDpxYc-MH_SZlNggNsiwC5DeilU09Vx-suGWY_Avh5o8DBi-UNypMsuFBHRg/exec";
const LOCAL_FORMS_KEY = "kewpa9_forms_cache";
const LOGO_STORAGE_KEY = "kewpa9_custom_logo";

const fetchFromSheets = async (sheetName: string) => {
  const controller = new AbortController();
  // Tingkatkan timeout ke 30 saat kerana Google Apps Script kadangkala mengambil masa untuk "bangun" (cold start)
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${SCRIPT_URL}?sheet=${sheetName}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ralat! status: ${response.status}`);
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error(`Gagal fetch sheet ${sheetName}: Masa tamat (Timeout 30s). Pelayan Google lambat bertindak.`);
    } else {
      console.error(`Gagal fetch sheet ${sheetName}:`, error.message || error);
    }
    
    return [];
  }
};

const postToSheets = async (sheetName: string, data: any, action: 'save' | 'delete' = 'save') => {
  try {
    const payload = { sheet: sheetName, action, data };
    // Menggunakan mode 'no-cors' adalah standard untuk menghantar data ke Google Apps Script tanpa ralat preflight
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
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
    
    // Gabungkan data cloud dan local cache
    const mergedMap = new Map<string, KEWPA9Form>();
    cloudForms.forEach(f => mergedMap.set(f.id, f));
    localForms.forEach(f => mergedMap.set(f.id, f));
    
    return Array.from(mergedMap.values());
  },

  saveForm: async (form: KEWPA9Form) => {
    const localData = localStorage.getItem(LOCAL_FORMS_KEY);
    let localForms: KEWPA9Form[] = localData ? JSON.parse(localData) : [];
    const index = localForms.findIndex(f => f.id === form.id);
    if (index >= 0) {
      localForms[index] = form;
    } else {
      localForms.push(form);
    }
    localStorage.setItem(LOCAL_FORMS_KEY, JSON.stringify(localForms));
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
  deleteAsset: async (id: string) => postToSheets('assets', { id }, 'delete'),

  saveCustomLogo: (base64Data: string) => {
    localStorage.setItem(LOGO_STORAGE_KEY, base64Data);
    window.dispatchEvent(new Event('logoChanged'));
  },
  getCustomLogo: () => {
    return localStorage.getItem(LOGO_STORAGE_KEY);
  },
  resetLogo: () => {
    localStorage.removeItem(LOGO_STORAGE_KEY);
    window.dispatchEvent(new Event('logoChanged'));
  }
};

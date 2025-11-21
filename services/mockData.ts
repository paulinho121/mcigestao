import { Product } from '../types';

// This data represents a snapshot of the provided CSV for demonstration purposes.
// In production, this is replaced by Supabase queries.
export const MOCK_INVENTORY: Product[] = [
  { id: "1896", name: "Midia Xdcam Sony Pfd23 A", brand: "Sony", stock_ce: 3, stock_sc: 0, stock_sp: 0, total: 3, reserved: 0 },
  { id: "3001", name: "TRIPE ILUMINAÇÃO WT807", brand: "Greika", stock_ce: 11, stock_sc: 0, stock_sp: 4, total: 15, reserved: 0 },
  { id: "3319", name: "Maleta Sd Card Preta Tsunami", brand: "Tsunami", stock_ce: 44, stock_sc: 0, stock_sp: 0, total: 44, reserved: 0 },
  { id: "3348", name: "Cabo Hdmi Para Micro Hdmi 2.0m", brand: "Generic", stock_ce: 17, stock_sc: 0, stock_sp: 0, total: 17, reserved: 0 },
  { id: "3480", name: "Umount Suporte 360 Graus Enca", brand: "Ulanzi", stock_ce: 84, stock_sc: 0, stock_sp: 60, total: 144, reserved: 0 },
  { id: "3705", name: "Ls200t Tripe de Aluminio de 3 Secoes", brand: "C-Stand", stock_ce: 118, stock_sc: 0, stock_sp: 11, total: 129, reserved: 0 },
  { id: "3735", name: "Drone Dji Phanton 4 Advance (amostra)", brand: "DJI", stock_ce: 1, stock_sc: 0, stock_sp: 0, total: 1, reserved: 0 },
  { id: "3868", name: "Luminaria de Led Mc 4 Light Travel Kit", brand: "Aputure", stock_ce: 1, stock_sc: 4, stock_sp: 1, total: 6, reserved: 0 },
  { id: "3930", name: "Pj20 Trava Para Cabeça de Tripé Modelo Myt806", brand: "Miliboo", stock_ce: 39, stock_sc: 68, stock_sp: 0, total: 107, reserved: 0 },
  { id: "4303", name: "IP AMARAN 300C - Luminária de Led RGBWW", brand: "Amaran", stock_ce: 2, stock_sc: 30, stock_sp: 17, total: 49, reserved: 0 },
  { id: "4304", name: "IP AMARAN 150C - Luminária de Led RGBWW", brand: "Amaran", stock_ce: 3, stock_sc: 25, stock_sp: 12, total: 40, reserved: 0 },
  { id: "4859", name: "IP KUPO GRIP HEAD SOQUETE 16MM PRETO KUPO KCP 200B", brand: "Kupo", stock_ce: 5, stock_sc: 87, stock_sp: 61, total: 153, reserved: 0 },
  { id: "4879", name: "IP BATERIA PORTATIL V-MOUNT OMNI-99S", brand: "Swit", stock_ce: 5, stock_sc: 52, stock_sp: 33, total: 90, reserved: 0 },
  { id: "5120", name: "IP Amaran GO Módulos de diodos emissores de luz", brand: "Amaran", stock_ce: 24, stock_sc: 79, stock_sp: 49, total: 152, reserved: 0 },
  { id: "5385", name: "IP S-8192S V-MOUNT BATERIA LITHIUM ION", brand: "Swit", stock_ce: 0, stock_sc: 53, stock_sp: 0, total: 53, reserved: 0 },
  { id: "5430", name: "GERADOR DELTA PRO 220V + PAINEL 400W EF", brand: "EcoFlow", stock_ce: 1, stock_sc: 0, stock_sp: 3, total: 4, reserved: 0 },
  { id: "5454", name: "TRIPE DE ILUMINAÇÃO PROFISSIONAL - AÇO INOX", brand: "Generic", stock_ce: 6, stock_sc: 0, stock_sp: 0, total: 6, reserved: 0 },
  { id: "004585", name: "DIODO - SS26 - SCHOTTKY - 60V/2A - SMD", brand: "Elec", stock_ce: 0, stock_sc: 0, stock_sp: 20, total: 20, reserved: 0 },
  { id: "4936", name: "IP FP1-CHR-U - Conversor de energia CA para CC", brand: "Astera", stock_ce: 0, stock_sc: 0, stock_sp: 97, total: 97, reserved: 0 },
];
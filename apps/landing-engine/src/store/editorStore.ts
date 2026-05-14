import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BlockProps, SiteDocument } from '@/types/schema';
import { isValidHex } from '@/lib/color';
import { arrayMove } from '@dnd-kit/sortable';

interface EditorState {
  // === Documento del sitio (serializable, con Undo/Redo) ===
  document: SiteDocument;
  
  // === Estado del editor (efímero, sin Undo/Redo) ===
  selectedBlockId: string | null;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  viewSourceOpen: boolean;
  
  // === Historial ===
  history: SiteDocument[];
  historyIndex: number;
  
  // === Acciones del documento ===
  setBlocks: (blocks: BlockProps[], saveToHistory?: boolean) => void;
  addBlock: (block: BlockProps) => void;
  cloneBlock: (id: string) => void;
  toggleVisibility: (id: string) => void;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, props: Partial<BlockProps>, saveToHistory?: boolean) => void;
  reorderBlocks: (oldIndex: number, newIndex: number) => void;
  setBusinessName: (name: string) => void;
  setPrimaryColor: (color: string) => void;
  updateSeo: (seo: Partial<SiteSeo>) => void;
  
  // === Acciones del editor ===
  setSelectedBlockId: (id: string | null) => void;
  setPreviewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  setViewSourceOpen: (open: boolean) => void;
  
  // === Historial ===
  undo: () => void;
  redo: () => void;
  commitHistory: () => void;
  
  // === Importar/Exportar ===
  importDocument: (doc: SiteDocument) => void;
  exportDocument: () => SiteDocument;
  resetDocument: () => void;

}

function saveSnapshot(doc: SiteDocument, state: { history: SiteDocument[]; historyIndex: number }) {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(JSON.parse(JSON.stringify(doc)));
  if (newHistory.length > 50) newHistory.shift();
  return {
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

const DEFAULT_DOCUMENT: SiteDocument = {
  businessName: 'Mi Nuevo Negocio',
  primaryColor: '#6366f1',
  blocks: [],
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      document: { ...DEFAULT_DOCUMENT },
      selectedBlockId: null,
      previewMode: 'desktop',
      viewSourceOpen: false,
      history: [{ ...DEFAULT_DOCUMENT }],
      historyIndex: 0,


      // --- Bloques ---
      setBlocks: (blocks, save = true) => set((state) => {
        const newDoc = { ...state.document, blocks };
        if (save) return { document: newDoc, ...saveSnapshot(newDoc, state) };
        return { document: newDoc };
      }),

      addBlock: (block) => set((state) => {
        const newDoc = { ...state.document, blocks: [...state.document.blocks, block] };
        return { document: newDoc, ...saveSnapshot(newDoc, state), selectedBlockId: block.id };
      }),

      cloneBlock: (id) => set((state) => {
        const index = state.document.blocks.findIndex(b => b.id === id);
        if (index === -1) return state;
        const original = state.document.blocks[index];
        const clone = { ...JSON.parse(JSON.stringify(original)), id: `${original.id}-clone-${Date.now()}` };
        const newBlocks = [...state.document.blocks];
        newBlocks.splice(index + 1, 0, clone);
        const newDoc = { ...state.document, blocks: newBlocks };
        return { document: newDoc, ...saveSnapshot(newDoc, state), selectedBlockId: clone.id };
      }),

      toggleVisibility: (id) => set((state) => {
        const newBlocks = state.document.blocks.map(b => b.id === id ? { ...b, hidden: !b.hidden } : b);
        const newDoc = { ...state.document, blocks: newBlocks };
        return { document: newDoc, ...saveSnapshot(newDoc, state) };
      }),

      removeBlock: (id) => set((state) => {
        const newBlocks = state.document.blocks.filter(b => b.id !== id);
        const newDoc = { ...state.document, blocks: newBlocks };
        return { 
          document: newDoc, 
          ...saveSnapshot(newDoc, state),
          selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId 
        };
      }),

      updateBlock: (id, props, saveToHistory = false) => set((state) => {
        const newBlocks = state.document.blocks.map(b => b.id === id ? { ...b, ...props } as BlockProps : b);
        const newDoc = { ...state.document, blocks: newBlocks };
        if (saveToHistory) return { document: newDoc, ...saveSnapshot(newDoc, state) };
        return { document: newDoc };
      }),

      reorderBlocks: (oldIndex, newIndex) => set((state) => {
        const newBlocks = arrayMove(state.document.blocks, oldIndex, newIndex);
        const newDoc = { ...state.document, blocks: newBlocks };
        return { document: newDoc, ...saveSnapshot(newDoc, state) };
      }),

      // --- Propiedades globales ---
      setBusinessName: (name) => set((state) => {
        const newDoc = { ...state.document, businessName: name };
        return { document: newDoc }; // No guardamos historial en cada tecla
      }),

      setPrimaryColor: (color) => set((state) => {
        if (!isValidHex(color)) return state;
        const newDoc = { ...state.document, primaryColor: color };
        return { document: newDoc };
      }),

      updateSeo: (seo) => set((state) => {
        const newDoc = { 
          ...state.document, 
          seo: { ...state.document.seo, ...seo } 
        };
        return { document: newDoc };
      }),

      commitHistory: () => set((state) => ({
        ...saveSnapshot(state.document, state)
      })),

      // --- Editor ---
      setSelectedBlockId: (id) => set({ selectedBlockId: id }),
      setPreviewMode: (mode) => set({ previewMode: mode }),
      setViewSourceOpen: (open) => set({ viewSourceOpen: open }),

      // --- Historial ---
      undo: () => set((state) => {
        if (state.historyIndex <= 0) return state;
        const newIndex = state.historyIndex - 1;
        return { document: state.history[newIndex], historyIndex: newIndex };
      }),

      redo: () => set((state) => {
        if (state.historyIndex >= state.history.length - 1) return state;
        const newIndex = state.historyIndex + 1;
        return { document: state.history[newIndex], historyIndex: newIndex };
      }),

      // --- Import/Export ---
      importDocument: (doc) => set((state) => ({
        document: doc, ...saveSnapshot(doc, state)
      })),

      exportDocument: () => get().document,

      resetDocument: () => set((state) => {
        const fresh = { ...DEFAULT_DOCUMENT };
        return { 
          document: fresh, 
          ...saveSnapshot(fresh, state),
          selectedBlockId: null 
        };
      }),
    }),
    {
      name: 'landing-engine-storage',
      partialize: (state) => ({ document: state.document }),
    }
  )
);

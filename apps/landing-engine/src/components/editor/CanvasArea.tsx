'use client';
import { useEditorStore } from '@/store/editorStore';
import { useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { hexWithAlpha } from '@/lib/color';
import { CSS } from '@dnd-kit/utilities';
import BlockRenderer from '../BlockRenderer';
import { GripVertical, EyeOff } from 'lucide-react';
import NavBar from '../blocks/NavBar';
import Footer from '../blocks/Footer';

function SortableBlockWrapper({ block }: { block: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id });

  const setSelectedBlockId = useEditorStore((state) => state.setSelectedBlockId);
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const primaryColor = useEditorStore((state) => state.document.primaryColor);
  const isSelected = selectedBlockId === block.id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as any,
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        className="h-24 w-full rounded-[2rem] border-4 border-dashed flex items-center justify-center my-4 overflow-hidden"
        style={{ ...style, borderColor: hexWithAlpha(primaryColor, 0.4), backgroundColor: hexWithAlpha(primaryColor, 0.05) }}
      >
        <span className="font-bold uppercase tracking-widest text-sm" style={{ color: primaryColor }}>Arrastrando...</span>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group relative transition-all opacity-100 ${block.hidden ? 'opacity-30 grayscale saturate-0 pointer-events-none select-none h-12 overflow-hidden' : ''}`}
    >
      {/* Hidden Badge */}
      {block.hidden && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/10">
          <span className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-2">
            <EyeOff className="w-3 h-3" /> Bloque Oculto
          </span>
        </div>
      )}

      {/* Selection Overlay & Controls */}
      <div 
        onClick={(e) => {
          if (block.hidden) return;
          e.stopPropagation();
          setSelectedBlockId(block.id);
        }}
        className={`absolute inset-0 z-20 cursor-pointer transition-all ${
          isSelected 
            ? 'border-2 ring-4' 
            : 'border-2 border-transparent group-hover:border-slate-300 group-hover:bg-slate-900/5'
        }`}
        style={isSelected ? { 
          borderColor: primaryColor, 
          backgroundColor: hexWithAlpha(primaryColor, 0.05),
          boxShadow: `0 0 0 4px ${hexWithAlpha(primaryColor, 0.1)}`
        } : {}}
      />
      
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners}
        className={`absolute -left-10 top-1/2 -translate-y-1/2 z-30 p-2 bg-white rounded-lg border shadow-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity ${
          isSelected ? 'opacity-100' : 'text-slate-400'
        }`}
        style={isSelected ? { borderColor: primaryColor, color: primaryColor } : { borderColor: '#e2e8f0' }}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Actual Block Content */}
      <div className="pointer-events-none overflow-hidden">
        <BlockRenderer blocks={[block]} />
      </div>
    </div>
  );
}

export default function CanvasArea() {
  const blocks = useEditorStore((state) => state.document.blocks);
  const reorderBlocks = useEditorStore((state) => state.reorderBlocks);
  const previewMode = useEditorStore((state) => state.previewMode);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      reorderBlocks(oldIndex, newIndex);
    }
  };

  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;

  const getCanvasWidth = () => {
    if (previewMode === 'mobile') return 'max-w-[375px]';
    if (previewMode === 'tablet') return 'max-w-[768px]';
    return 'max-w-full';
  };

  return (
    <div 
      className="flex-1 bg-slate-100 overflow-y-auto p-4 sm:p-12 custom-scrollbar flex justify-center"
    >
      <div className={`w-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${getCanvasWidth()} ${
        previewMode !== 'desktop' ? 'bg-white shadow-2xl rounded-[3rem] border-[12px] border-slate-900 h-fit overflow-hidden ring-1 ring-slate-800' : 'min-h-full'
      }`}>
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 space-y-4">
            <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-200/50">
              <GripVertical className="w-12 h-12 opacity-10 mx-auto" />
              <div className="text-center mt-6">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Lienzo Vacío</p>
                <p className="text-xs text-slate-400">Comienza añadiendo bloques desde la izquierda</p>
              </div>
            </div>
          </div>
        ) : (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col relative">
                <NavBar />
                {blocks.map((block) => (
                  <SortableBlockWrapper key={block.id} block={block} />
                ))}
                <Footer />
              </div>
            </SortableContext>
            
            <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
              {activeBlock ? (
                <div className="bg-slate-900 rounded-2xl shadow-2xl p-4 flex items-center justify-center gap-4 w-64 ring-2 ring-indigo-500 cursor-grabbing">
                  <div className="bg-slate-800 p-2 rounded-lg text-slate-300">
                    <GripVertical className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-lg leading-tight truncate">
                      {activeBlock.type}
                    </p>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest truncate">
                      Moviendo Bloque
                    </p>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

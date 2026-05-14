'use client';
import { FaqAccordionBlockProps } from '@/types/schema';
import { HelpCircle } from 'lucide-react';
import SectionTitle from './SectionTitle';
import ArrayEditor from './ArrayEditor';

interface Props {
  block: FaqAccordionBlockProps;
  onArrayUpdate: (key: string, index: number, field: string, value: any) => void;
  onAddItem: (key: string, defaultValue: any) => void;
  onRemoveItem: (key: string, index: number) => void;
}

export default function FaqProperties({ block, onArrayUpdate, onAddItem, onRemoveItem }: Props) {
  return (
    <div>
      <SectionTitle title="Preguntas" icon={HelpCircle} />
      <ArrayEditor
        items={block.items}
        fields={[
          { key: 'question', label: 'Pregunta', type: 'text' },
          { key: 'answer', label: 'Respuesta', type: 'textarea' },
        ]}
        onUpdate={(idx, field, value) => onArrayUpdate('items', idx, field, value)}
        onAdd={() => onAddItem('items', { question: '¿Nueva Pregunta?', answer: 'Respuesta aquí.' })}
        onRemove={(idx) => onRemoveItem('items', idx)}
        addLabel="Añadir Pregunta"
      />
    </div>
  );
}

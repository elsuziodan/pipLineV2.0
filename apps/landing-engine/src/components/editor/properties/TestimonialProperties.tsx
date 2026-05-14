'use client';
import { TestimonialCarouselBlockProps } from '@/types/schema';
import { MessageSquare } from 'lucide-react';
import SectionTitle from './SectionTitle';
import ArrayEditor from './ArrayEditor';

interface Props {
  block: TestimonialCarouselBlockProps;
  onArrayUpdate: (key: string, index: number, field: string, value: any) => void;
  onAddItem: (key: string, defaultValue: any) => void;
  onRemoveItem: (key: string, index: number) => void;
}

export default function TestimonialProperties({ block, onArrayUpdate, onAddItem, onRemoveItem }: Props) {
  return (
    <div>
      <SectionTitle title="Testimonios" icon={MessageSquare} />
      <ArrayEditor
        items={block.testimonials}
        fields={[
          { key: 'authorName', label: 'Nombre', type: 'text' },
          { key: 'authorRole', label: 'Cargo/Empresa', type: 'text' },
          { key: 'quote', label: 'Testimonio', type: 'textarea' },
        ]}
        onUpdate={(idx, field, value) => onArrayUpdate('testimonials', idx, field, value)}
        onAdd={() => onAddItem('testimonials', { authorName: 'Juan Pérez', authorRole: 'CEO en Tech', quote: 'Excelente servicio.' })}
        onRemove={(idx) => onRemoveItem('testimonials', idx)}
        addLabel="Añadir Testimonio"
      />
    </div>
  );
}

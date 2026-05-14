'use client';
import { FeaturesBentoBlockProps } from '@/types/schema';
import { Zap } from 'lucide-react';
import SectionTitle from './SectionTitle';
import ArrayEditor from './ArrayEditor';

interface Props {
  block: FeaturesBentoBlockProps;
  onArrayUpdate: (key: string, index: number, field: string, value: any) => void;
  onAddItem: (key: string, defaultValue: any) => void;
  onRemoveItem: (key: string, index: number) => void;
}

export default function FeaturesProperties({ block, onArrayUpdate, onAddItem, onRemoveItem }: Props) {
  return (
    <div>
      <SectionTitle title="Características" icon={Zap} />
      <ArrayEditor
        items={block.features}
        fields={[
          { key: 'title', label: 'Título', type: 'text' },
          { key: 'iconName', label: 'Icono', type: 'mono', placeholder: 'Star' },
          { key: 'description', label: 'Descripción', type: 'textarea' },
        ]}
        onUpdate={(idx, field, value) => onArrayUpdate('features', idx, field, value)}
        onAdd={() => onAddItem('features', { title: 'Nueva Característica', description: 'Breve descripción.', iconName: 'Star' })}
        onRemove={(idx) => onRemoveItem('features', idx)}
        addLabel="Añadir Item"
      />
    </div>
  );
}

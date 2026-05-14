'use client';
import { PricingTableBlockProps } from '@/types/schema';
import { CreditCard } from 'lucide-react';
import SectionTitle from './SectionTitle';
import ArrayEditor from './ArrayEditor';

interface Props {
  block: PricingTableBlockProps;
  onArrayUpdate: (key: string, index: number, field: string, value: any) => void;
  onAddItem: (key: string, defaultValue: any) => void;
  onRemoveItem: (key: string, index: number) => void;
}

export default function PricingProperties({ block, onArrayUpdate, onAddItem, onRemoveItem }: Props) {
  return (
    <div>
      <SectionTitle title="Planes y Precios" icon={CreditCard} />
      <ArrayEditor
        items={block.tiers}
        fields={[
          { key: 'name', label: 'Nombre del Plan', type: 'text' },
          { key: 'price', label: 'Precio', type: 'text' },
          { key: 'description', label: 'Descripción', type: 'textarea' },
          { key: 'ctaText', label: 'Texto del Botón', type: 'text' },
        ]}
        onUpdate={(idx, field, value) => onArrayUpdate('tiers', idx, field, value)}
        onAdd={() => onAddItem('tiers', { name: 'Pro', price: '$29', description: 'Ideal para equipos.', features: [], ctaText: 'Elegir Plan' })}
        onRemove={(idx) => onRemoveItem('tiers', idx)}
        addLabel="Añadir Plan"
      />
    </div>
  );
}

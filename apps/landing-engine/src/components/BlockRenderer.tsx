import { BlockProps } from '@/types/schema';
import Hero from './blocks/Hero';
import FeaturesBento from './blocks/FeaturesBento';
import TestimonialCarousel from './blocks/TestimonialCarousel';
import PricingTable from './blocks/PricingTable';
import FaqAccordion from './blocks/FaqAccordion';
import CallToAction from './blocks/CallToAction';
import Gallery from './blocks/Gallery';
import VideoPlayer from './blocks/VideoPlayer';
import Team from './blocks/Team';
import LogoCloud from './blocks/LogoCloud';

import { useEditorStore } from '@/store/editorStore';

// A medida que creamos más bloques, los agregamos a este diccionario
const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  Hero: Hero,
  FeaturesBento: FeaturesBento,
  TestimonialCarousel: TestimonialCarousel,
  PricingTable: PricingTable,
  FaqAccordion: FaqAccordion,
  CallToAction: CallToAction,
  Gallery: Gallery,
  VideoPlayer: VideoPlayer,
  Team: Team,
  LogoCloud: LogoCloud,
};

export default function BlockRenderer({ blocks }: { blocks: BlockProps[] }) {
  const primaryColor = useEditorStore((state) => state.document.primaryColor);
  
  return (
    <div className="flex flex-col w-full">
      {blocks.map((block) => {
        const Component = COMPONENT_MAP[block.type];
        
        if (!Component) {
          console.warn(`Block type "${block.type}" is not registered in COMPONENT_MAP.`);
          return null;
        }

        return (
          <div key={block.id} id={block.id}>
            <Component {...block} primaryColor={primaryColor} />
          </div>
        );
      })}
    </div>
  );
}

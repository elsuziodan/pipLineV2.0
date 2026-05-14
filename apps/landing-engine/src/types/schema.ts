export type BlockType = 'Hero' | 'FeaturesBento' | 'TestimonialCarousel' | 'PricingTable' | 'FaqAccordion' | 'CallToAction' | 'Gallery' | 'VideoPlayer' | 'Team' | 'LogoCloud';

export interface BaseBlock {
  id: string;
  type: BlockType;
  theme?: 'light' | 'dark' | 'brand';
  hidden?: boolean;
}

export interface HeroBlockProps extends BaseBlock {
  type: 'Hero';
  layout?: 'centered' | 'split' | 'fullscreen';
  headline: string;
  subheadline: string;
  ctaText: string;
  media?: {
    type: 'image' | 'video' | 'solid';
    src?: string;
    color?: string;
  };
}

export interface FeatureItem {
  title: string;
  description: string;
  iconName?: string;
}

export interface FeaturesBentoBlockProps extends BaseBlock {
  type: 'FeaturesBento';
  title: string;
  subtitle?: string;
  features: FeatureItem[];
}

export interface TestimonialItem {
  authorName: string;
  authorRole?: string;
  quote: string;
  avatarUrl?: string;
  rating?: number;
}

export interface TestimonialCarouselBlockProps extends BaseBlock {
  type: 'TestimonialCarousel';
  title: string;
  testimonials: TestimonialItem[];
}

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  popular?: boolean;
}

export interface PricingTableBlockProps extends BaseBlock {
  type: 'PricingTable';
  title: string;
  subtitle?: string;
  tiers: PricingTier[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqAccordionBlockProps extends BaseBlock {
  type: 'FaqAccordion';
  title: string;
  items: FaqItem[];
}

export interface CallToActionBlockProps extends BaseBlock {
  type: 'CallToAction';
  title: string;
  subtitle: string;
  ctaText: string;
}

export interface GalleryImage {
  url: string;
  alt?: string;
  caption?: string;
}

export interface GalleryBlockProps extends BaseBlock {
  type: 'Gallery';
  title: string;
  subtitle?: string;
  columns: 2 | 3 | 4;
  images: GalleryImage[];
}

export interface VideoPlayerBlockProps extends BaseBlock {
  type: 'VideoPlayer';
  title: string;
  subtitle?: string;
  videoUrl: string; // YouTube o Vimeo URL
  posterUrl?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  image?: string;
}

export interface TeamBlockProps extends BaseBlock {
  type: 'Team';
  title: string;
  subtitle?: string;
  members: TeamMember[];
}

export interface LogoCloudBlockProps extends BaseBlock {
  type: 'LogoCloud';
  title?: string;
  logos: string[]; // URLs de imágenes
}

export type BlockProps = 
  | HeroBlockProps 
  | FeaturesBentoBlockProps 
  | TestimonialCarouselBlockProps
  | PricingTableBlockProps
  | FaqAccordionBlockProps
  | CallToActionBlockProps
  | GalleryBlockProps
  | VideoPlayerBlockProps
  | TeamBlockProps
  | LogoCloudBlockProps;

export interface SiteSchema {
  businessName: string;
  globalTheme: {
    primaryColor: string;
    fontFamily?: string;
  };
  blocks: BlockProps[];
}

export interface SiteSeo {
  title?: string;
  description?: string;
  ogImage?: string;
}

// Documento completo del sitio (serializable, para Undo/Redo global)
export interface SiteDocument {
  businessName: string;
  primaryColor: string;
  blocks: BlockProps[];
  seo?: SiteSeo;
}

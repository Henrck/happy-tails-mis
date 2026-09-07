import PhotoBanner from "./PhotoBanner";

export default function SpaBanner({ backgroundUrl, width, height }: { backgroundUrl?: string | null; width?: number | null; height?: number | null }) {
  return <PhotoBanner src={backgroundUrl || "/images/spa-banner-bg.png"} alt="Dog receiving an herbal Ayurvedic spa treatment" width={width || 552} height={height || 371} heading="Pet SPA Ayurveda Services" isRemote={!!backgroundUrl}>Pet Spa Ayurveda is a holistic pet grooming and wellness service inspired by Ayurvedic principles. It uses natural herbal products, gentle massages, and chemical-free treatments to improve your pet&apos;s skin and coat health while promoting relaxation, comfort, and overall well-being.</PhotoBanner>;
}

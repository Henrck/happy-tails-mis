import PhotoBanner from "./PhotoBanner";

export default function SpaBanner({ backgroundUrl, width, height, description }: {
  backgroundUrl?: string | null;
  width?: number | null;
  height?: number | null;
  description?: string;
}) {
  return <PhotoBanner src={backgroundUrl || "/images/spa-banner-bg.png"}
    alt="Dog receiving an herbal Ayurvedic spa treatment" width={width || 552} height={height || 371}
    heading="Pet SPA Ayurveda Services" isRemote={!!backgroundUrl}>
    {description ?? "Pet Spa Ayurveda uses natural herbal products, gentle massages, and chemical-free treatments to support skin, coat, and well-being."}
  </PhotoBanner>;
}

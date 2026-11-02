import PhotoBanner from "./PhotoBanner";

export default function GroomingBanner({ backgroundUrl, width, height, description }: {
  backgroundUrl?: string | null;
  width?: number | null;
  height?: number | null;
  description?: string;
}) {
  return <PhotoBanner src={backgroundUrl || "/images/grooming-banner-bg.png"}
    alt="Pet groomer trimming a dog's fur" width={width || 552} height={height || 368}
    heading="Pet Grooming Services" isRemote={!!backgroundUrl}>
    {description ?? "Because your pet means everything. We provide gentle, stress-free care focused on comfort and happiness."}
  </PhotoBanner>;
}

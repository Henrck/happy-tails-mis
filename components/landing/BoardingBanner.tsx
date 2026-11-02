import PhotoBanner from "./PhotoBanner";

export default function BoardingBanner({ backgroundUrl, width, height, description }: {
  backgroundUrl?: string | null;
  width?: number | null;
  height?: number | null;
  description?: string;
}) {
  return <PhotoBanner src={backgroundUrl || "/images/boarding-banner-bg.png"}
    alt="Three dogs waiting at the boarding facility window" width={width || 526} height={height || 369}
    heading="Pet Boarding Services" isRemote={!!backgroundUrl}>
    {description ?? "We provide a nurturing space designed for comfort, play, and restful sleep. Every pet receives gentle care and attention."}
  </PhotoBanner>;
}

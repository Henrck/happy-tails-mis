// Banner header for the Boarding Services section. Uses the shared
// PhotoBanner so the photo is never cropped. Falls back to the bundled
// default image/dimensions if no override exists in site_settings yet.
import PhotoBanner from "./PhotoBanner";

export default function BoardingBanner({
  backgroundUrl,
  width,
  height,
}: {
  backgroundUrl?: string | null;
  width?: number | null;
  height?: number | null;
}) {
  return (
    <PhotoBanner
      src={backgroundUrl || "/images/boarding-banner-bg.png"}
      alt="Three dogs waiting at the boarding facility window"
      width={width || 526}
      height={height || 369}
      heading="Pet Boarding Services"
      isRemote={!!backgroundUrl}
    >
      We provide a nurturing space designed for comfort, play, and restful
      sleep. Every pet receives gentle care and attention to ensure they
      feel safe, loved, and secure.
    </PhotoBanner>
  );
}

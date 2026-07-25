// Banner header for the Grooming Services section. Uses the shared
// PhotoBanner so the photo is never cropped. Falls back to the bundled
// default image/dimensions if no override exists in site_settings yet.
import PhotoBanner from "./PhotoBanner";

export default function GroomingBanner({
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
      src={backgroundUrl || "/images/grooming-banner-bg.png"}
      alt="Pet groomer trimming a dog's fur"
      width={width || 552}
      height={height || 368}
      heading="Pet Grooming Services"
      isRemote={!!backgroundUrl}
    >
      Because your pet means everything.
      <br />
      We provide gentle, stress-free care focused on comfort and happiness.
      From simple baths to complete grooming makeovers, we make sure every
      pet feels calm, cared for, and absolutely adored.
    </PhotoBanner>
  );
}

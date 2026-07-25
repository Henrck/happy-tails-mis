// Temporary gallery catalog — before/after grooming photos. Shared by the
// homepage carousel and the full /gallery page. No real photos yet
// (Josh confirmed these are TBD), so imageUrl stays null until the admin
// module lets the owner upload real before/after shots.
export type GalleryPhoto = {
  id: string;
  petName: string | null;
  imageUrl: string | null;
};

export const galleryPhotos: GalleryPhoto[] = Array.from(
  { length: 8 },
  (_, i) => ({ id: `placeholder-${i + 1}`, petName: null, imageUrl: null })
);

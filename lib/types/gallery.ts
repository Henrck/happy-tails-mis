export type GalleryService =
  | "grooming"
  | "boarding"
  | "dental"
  | "ear_cleaning"
  | "nail_trimming"
  | "other";

export type GalleryPhoto = {
  id: string;
  title: string | null;
  service: GalleryService;
  before_url: string;
  after_url: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Groomer = {
  id: string;
  name: string;
  status: "active" | "archived";
  created_at: string;
};
export type KennelSize = "small" | "big";
export type Kennel = {
  id: string;
  size: KennelSize;
  number: number;
  created_at: string;
  /** Added by the boarding capacity migration. Old objects default to active. */
  is_active?: boolean;
};

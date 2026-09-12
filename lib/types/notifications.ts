export type Notification = {
  id: string;
  customer_id: string;
  appointment_id: string | null;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

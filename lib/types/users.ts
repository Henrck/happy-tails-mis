export type AccountStatus = "active" | "inactive" | "archived";

export type StaffMember = {
  id: string;
  employee_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  username: string;
  email: string | null;
  phone_number: string | null;
  profile_picture_url: string | null;
  job_title: string;
  status: AccountStatus;
  created_at: string;
  archived_at: string | null;
};

export type Customer = {
  id: string;
  customer_id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  profile_picture_url: string | null;
  status: AccountStatus;
  registered_at: string;
  archived_at: string | null;
};

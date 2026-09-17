export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  user_id: string;
  name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  company_id: string | null;
  company_name: string;
  job_title: string;
  job_url: string | null;
  job_id: string | null;
  location: string | null;
  address: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  employment_type: string | null;
  status: string;
  application_date: string | null;
  next_follow_up_date: string | null;
  last_contact_date: string | null;
  source: string | null;
  referral_name: string | null;
  referral_contact: string | null;
  recruiter_notes: string | null;
  resume_version: string | null;
  cover_letter_version: string | null;
  job_description: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
}

export interface HRContact {
  id: string;
  user_id: string;
  job_id: string;
  name: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  job_id: string;
  file_name: string;
  storage_path: string;
  version_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface JobEvent {
  id: string;
  user_id: string;
  job_id: string;
  event_type: string;
  event_date: string;
  title: string;
  description: string | null;
  created_at: string;
}

type TableConfig<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableConfig<Profile>;
      companies: TableConfig<Company>;
      jobs: TableConfig<Job>;
      hr_contacts: TableConfig<HRContact>;
      resumes: TableConfig<Resume>;
      job_events: TableConfig<JobEvent>;
    };
    Views: Record<never, never>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: Record<never, never>;
  };
};
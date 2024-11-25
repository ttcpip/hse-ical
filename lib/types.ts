export interface Location {
  type?: "Point";
  coordinates?: [number, number];
}
export interface LecturerProfile {
  id?: string;
  email?: string;
  full_name?: string;
  description?: string;
}

export interface Lesson {
  id?: string;
  building?: string;
  type?: string;
  stream?: string;
  auditorium_id?: number;
  auditorium?: string;
  city?: string;
  date_start?: string;
  date_end?: string;
  created_at?: string;
  updated_at?: string;
  importance_level?: number;
  building_id?: number;
  location?: Location;
  discipline?: string;
  discipline_link?: string;
  lesson_number_start?: number;
  lesson_number_end?: number;
  duration?: number[];
  lecturer_emails?: string[];
  lecturer_profiles?: LecturerProfile[];
  kindOfWork?: string;
  hash?: string;
}

export type TimetableResponse = Lesson[];

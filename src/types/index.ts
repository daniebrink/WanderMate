// Application-level types matching the raw pg query results

export type UserType = "tourist" | "guide" | "driver" | "city_admin" | "super_admin";
export type BookingType = "activity" | "guide_hourly" | "driver_hourly" | "driver_distance" | "driver_own_car" | "package" | "surprise_me";
export type BookingStatus = "draft" | "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "declined" | "disputed" | "reviewed";
export type DifficultyLevel = "easy" | "moderate" | "challenging" | "extreme";
export type PriceType = "fixed" | "per_person";

export interface City {
  id: string;
  slug: string;
  name: string;
  country: string;
  currency_code: string;
  currency_symbol: string;
  map_center_lat: number;
  map_center_lng: number;
  timezone: string;
  whatsapp_country_code: string;
  hero_images: string[] | null;
  is_active: boolean;
  verification_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Profile {
  id: string;
  user_type: UserType;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  avatar_data?: Buffer | null;
  avatar_mime_type?: string | null;
  preferred_currency: string | null;
  home_city_id: string | null;
  bio: string | null;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Guide {
  id: string;
  profile_id: string;
  bio: string;
  tagline: string | null;
  hourly_rate: number | null;
  languages: string[] | null;
  certifications: string[] | null;
  specialisations: string[] | null;
  years_experience: number | null;
  gallery_images: string[] | null;
  is_available_hourly: boolean;
  is_active: boolean;
  is_verified: boolean;
  submitted_at: Date | null;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
  profile?: ProfileSubset;
}

export interface Driver {
  id: string;
  profile_id: string;
  bio: string;
  tagline: string | null;
  hourly_rate: number | null;
  distance_rate: number | null;
  languages: string[] | null;
  has_own_vehicle: boolean;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_seats: number | null;
  vehicle_images: string[] | null;
  vehicle_image_data?: Buffer | null;
  vehicle_image_mime_type?: string | null;
  has_vehicle_image_data?: boolean;
  is_available_hourly: boolean;
  is_available_distance: boolean;
  is_active: boolean;
  is_verified: boolean;
  submitted_at: Date | null;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
  profile?: ProfileSubset;
}

export interface ProfileSubset {
  id?: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  has_avatar_data?: boolean;
  bio?: string | null;
}

export interface Category {
  id: string;
  city_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
}

export interface Activity {
  id: string;
  city_id: string;
  guide_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  description: string;
  short_description: string | null;
  duration_hours: number | null;
  price: number;
  price_type: PriceType;
  min_group_size: number;
  max_group_size: number | null;
  difficulty_level: DifficultyLevel | null;
  included_items: string[] | null;
  excluded_items: string[] | null;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  images: string[] | null;
  video_url: string | null;
  languages_offered: string[] | null;
  is_active: boolean;
  is_featured: boolean;
  featured_order: number | null;
  avg_rating: number;
  review_count: number;
  created_at: Date;
  updated_at: Date;
  guide?: GuideSubset;
  category?: CategorySubset;
}

export interface GuideSubset {
  id: string;
  tagline: string | null;
  hourly_rate: number | null;
  bio?: string | null;
  languages?: string[] | null;
  certifications?: string[] | null;
  specialisations?: string[] | null;
  years_experience?: number | null;
  gallery_images?: string[] | null;
  is_available_hourly?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  verified_at?: Date | null;
}

export interface CategorySubset {
  name: string;
  slug: string;
}

export interface Package {
  id: string;
  city_id: string;
  title: string;
  slug: string;
  description: string;
  itinerary: any[] | null;
  guide_id: string | null;
  driver_id: string | null;
  total_price: number;
  duration_hours: number | null;
  max_group_size: number | null;
  images: string[] | null;
  whats_included: string[] | null;
  whats_not_included: string[] | null;
  pickup_address: string | null;
  is_active: boolean;
  is_featured: boolean;
  avg_rating: number;
  review_count: number;
  created_at: Date;
  updated_at: Date;
  guide?: { id: string; tagline: string | null };
  driver?: { id: string; tagline: string | null };
}

export interface Booking {
  id: string;
  city_id: string;
  tourist_id: string;
  booking_type: BookingType;
  activity_id: string | null;
  package_id: string | null;
  guide_id: string | null;
  driver_id: string | null;
  status: BookingStatus;
  travel_date: Date | null;
  start_time: string | null;
  duration_hours: number | null;
  group_size: number;
  total_price: number | null;
  special_requests: string | null;
  interests: string[] | null;
  distance_radius_km: number | null;
  pickup_location: string | null;
  tourist_has_vehicle: boolean;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  cancelled_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewee_type: "guide" | "driver";
  activity_id: string | null;
  rating: number;
  text: string | null;
  photos: string[] | null;
  is_approved: boolean;
  is_featured: boolean;
  helpful_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
}

export interface DistanceOption {
  id: string;
  city_id: string;
  radius_km: number;
  label: string;
  description: string | null;
  sort_order: number;
  created_at: Date;
}

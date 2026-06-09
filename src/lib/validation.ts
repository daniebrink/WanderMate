import { z } from "zod";

// ── Auth ──

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
});

// ── Bookings ──

export const createBookingSchema = z.object({
  cityId: z.string().uuid("Invalid city"),
  activityId: z.string().uuid("Invalid activity"),
  guideId: z.string().uuid("Invalid guide"),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  groupSize: z.coerce.number().int().min(1, "Group size must be at least 1").max(50),
  specialRequests: z.string().max(2000).optional(),
});

export const createGuideHourlyBookingSchema = z.object({
  cityId: z.string().uuid("Invalid city"),
  guideId: z.string().uuid("Invalid guide"),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format").optional(),
  durationHours: z.coerce.number().min(2, "Minimum 2 hours").max(24),
  groupSize: z.coerce.number().int().min(1).max(50),
  specialRequests: z.string().max(2000).optional(),
  interests: z.string().max(500).optional(),
});

export const createDriverBookingSchema = z.object({
  cityId: z.string().uuid("Invalid city"),
  driverId: z.string().uuid("Invalid driver"),
  bookingType: z.enum(["driver_hourly", "driver_distance", "driver_own_car"]),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format").optional(),
  durationHours: z.coerce.number().optional(),
  distanceRadiusKm: z.coerce.number().int().optional(),
  groupSize: z.coerce.number().int().min(1).max(50),
  specialRequests: z.string().max(2000).optional(),
});

export const createPackageBookingSchema = z.object({
  cityId: z.string().uuid("Invalid city"),
  packageId: z.string().uuid("Invalid package"),
  guideId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  groupSize: z.coerce.number().int().min(1).max(50),
  specialRequests: z.string().max(2000).optional(),
});

// ── Admin: Activities ──

export const createActivitySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000),
  shortDescription: z.string().max(500).optional(),
  price: z.coerce.number().int().min(0, "Price must be 0 or more"),
  priceType: z.enum(["fixed", "per_person"]),
  durationHours: z.coerce.number().min(0).optional(),
  cityId: z.string().uuid("Invalid city"),
  categoryId: z.string().uuid().optional(),
  guideId: z.string().uuid("Invalid guide"),
  minGroupSize: z.coerce.number().int().min(1).optional(),
  maxGroupSize: z.coerce.number().int().min(1).optional(),
  pickupAddress: z.string().max(500).optional(),
  includedItems: z.string().optional(),
  excludedItems: z.string().optional(),
  languagesOffered: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const updateActivitySchema = createActivitySchema.extend({
  activityId: z.string().uuid("Invalid activity"),
});

// ── Admin: Packages ──

export const createPackageSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000),
  itinerary: z.string().optional(),
  totalPrice: z.coerce.number().int().min(0, "Price must be 0 or more"),
  durationHours: z.coerce.number().min(0).optional(),
  maxGroupSize: z.coerce.number().int().min(1).optional(),
  cityId: z.string().uuid("Invalid city"),
  guideId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  whatsIncluded: z.string().optional(),
  whatsNotIncluded: z.string().optional(),
  pickupAddress: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const updatePackageSchema = createPackageSchema.extend({
  packageId: z.string().uuid("Invalid package"),
});

export const bookingTransitionSchema = z.object({
  bookingId: z.string().uuid("Invalid booking"),
});

export const declineBookingSchema = z.object({
  bookingId: z.string().uuid("Invalid booking"),
  reason: z.string().max(1000).optional(),
});

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid("Invalid booking"),
  reason: z.string().max(1000).optional(),
});

// ── Reviews ──

export const submitReviewSchema = z.object({
  bookingId: z.string().uuid("Invalid booking"),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().max(2000).optional(),
});

// ── Messages ──

export const sendMessageSchema = z.object({
  bookingId: z.string().uuid("Invalid booking"),
  content: z.string().min(1, "Message cannot be empty").max(5000),
});

// ── Admin ──

export const verifyGuideSchema = z.object({
  guideId: z.string().uuid("Invalid guide"),
});

export const verifyDriverSchema = z.object({
  driverId: z.string().uuid("Invalid driver"),
});

// ── Applications ──

export const applyAsGuideSchema = z.object({
  bio: z.string().min(10, "Bio must be at least 10 characters").max(5000),
  tagline: z.string().min(3, "Tagline is required").max(200),
  hourlyRate: z.coerce.number().int().min(0).optional(),
  languages: z.string().optional(),
  certifications: z.string().optional(),
  specialisations: z.string().optional(),
  yearsExperience: z.coerce.number().int().min(0).max(100).optional(),
});

export const applyAsDriverSchema = z.object({
  bio: z.string().min(10, "Bio must be at least 10 characters").max(5000),
  tagline: z.string().min(3, "Tagline is required").max(200),
  hourlyRate: z.coerce.number().int().min(0).optional(),
  distanceRate: z.coerce.number().int().min(0).optional(),
  languages: z.string().optional(),
  vehicleMake: z.string().max(100).optional(),
  vehicleModel: z.string().max(100).optional(),
  vehicleYear: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  vehicleSeats: z.coerce.number().int().min(1).max(100).optional(),
  hasOwnVehicle: z.boolean().optional(),
});

// ── Profile edits ──

export const updateGuideProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().max(50).optional(),
  bio: z.string().min(10, "Bio must be at least 10 characters").max(5000),
  tagline: z.string().min(3, "Tagline is required").max(200),
  hourlyRate: z.coerce.number().int().min(0).optional(),
  languages: z.string().optional(),
  certifications: z.string().optional(),
  specialisations: z.string().optional(),
  yearsExperience: z.coerce.number().int().min(0).max(100).optional(),
  isAvailableHourly: z.boolean().optional(),
  galleryImages: z.string().optional(),
});

export const updateDriverProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().max(50).optional(),
  avatarUrl: z.string().max(500).optional(),
  bio: z.string().min(10, "Bio must be at least 10 characters").max(5000),
  tagline: z.string().min(3, "Tagline is required").max(200),
  hourlyRate: z.coerce.number().int().min(0).optional(),
  distanceRate: z.coerce.number().int().min(0).optional(),
  languages: z.string().optional(),
  vehicleMake: z.string().max(100).optional(),
  vehicleModel: z.string().max(100).optional(),
  vehicleYear: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  vehicleSeats: z.coerce.number().int().min(1).max(100).optional(),
  isAvailableHourly: z.boolean().optional(),
  isAvailableDistance: z.boolean().optional(),
});


// ── Admin: City ──

export const createCitySchema = z.object({
  name: z.string().min(1, "City name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(100),
  country: z.string().min(1, "Country is required").max(100),
  currencyCode: z.string().min(1).max(10),
  currencySymbol: z.string().min(1).max(10),
  mapCenterLat: z.coerce.number(),
  mapCenterLng: z.coerce.number(),
  timezone: z.string().min(1),
  whatsappCountryCode: z.string().min(1).max(10),
});

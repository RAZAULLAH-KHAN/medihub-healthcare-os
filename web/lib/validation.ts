import { z } from "zod";

export const emailSchema = z.string().trim().email("Enter a valid email address");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{6,18}$/, "Enter a valid phone number")
  .optional()
  .or(z.literal(""));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const onboardHospitalSchema = z.object({
  hospitalName: z.string().trim().min(2),
  address: z.string().trim().min(4),
  subscriptionPlan: z.enum(["starter", "growth", "enterprise"]),
  adminName: z.string().trim().min(2),
  adminEmail: emailSchema,
  adminPassword: z.string().min(8),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(2),
});

export const staffSchema = z.object({
  name: z.string().trim().min(2),
  email: emailSchema,
  password: z.string().min(8),
  role: z.enum(["doctor", "receptionist", "hospital_admin", "lab_staff"]),
  departmentId: z.string().uuid().optional(),
  specialty: z.string().trim().optional(),
});

export const appointmentSchema = z.object({
  doctorId: z.string().uuid(),
  slotTime: z.string().datetime({ offset: true }),
});

export const reportSchema = z.object({
  appointmentId: z.string().uuid(),
  content: z.string().trim().min(10, "Report must be at least 10 characters"),
  prescription: z.string().trim().optional(),
});

export const triageSchema = z.object({
  symptoms: z.string().trim().min(3, "Describe symptoms briefly"),
});

export function fieldError(error: z.ZodError, field: string) {
  return error.issues.find((i) => i.path[0] === field)?.message;
}

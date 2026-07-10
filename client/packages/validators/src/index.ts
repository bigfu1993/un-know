import { z } from "zod";

export const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号");

export const campusLocationSchema = z.object({
  schoolId: z.string().min(1, "请选择学校"),
  building: z.string().optional(),
  floor: z.string().optional(),
  customLocation: z.string().optional()
});


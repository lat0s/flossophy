import { z } from 'zod';

export const Role = z.enum(['patient', 'dentist']);
export type Role = z.infer<typeof Role>;

const email = z
  .email('Enter a valid email')
  .max(254)
  .transform((e) => e.toLowerCase());
const password = z.string().min(10, 'Use at least 10 characters').max(128, 'Use at most 128 characters');

export const RegisterInput = z.strictObject({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email,
  password,
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.strictObject({
  email,
  password: z.string().min(1, 'Enter your password').max(128),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const Me = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: Role,
  title: z.string().optional(),
});
export type Me = z.infer<typeof Me>;

export const DemoLoginInput = z.strictObject({ as: Role });
export type DemoLoginInput = z.infer<typeof DemoLoginInput>;

export const MeResponse = z.object({ me: Me.nullable() });
export type MeResponse = z.infer<typeof MeResponse>;

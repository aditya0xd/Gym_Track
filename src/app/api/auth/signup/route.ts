import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";

import { seedDefaultDurationPricesForOwner } from "@/lib/auth/default-owner-pricing";
import { prisma } from "@/lib/prisma";
import { parseRequestBody, emailSchema } from "@/lib/validation";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function POST(request: Request) {
  const { data, error } = await parseRequestBody(request, signupSchema);
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: 400 });
  }

  const { name, email, password } = data;

  const existingUser = await prisma.adminUser.findUnique({ where: { email } });
  if (existingUser) {
    if (existingUser.deletedAt) {
      return NextResponse.json(
        { message: "This account was removed. Contact support to restore access." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { message: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await hash(password, 12);
  const trialEndsAt = new Date();
  trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + 14);

  const user = await prisma.adminUser.create({
    data: {
      name,
      email,
      passwordHash,
      subscriptionPlan: "TRIAL",
      trialEndsAt,
    },
  });

  await seedDefaultDurationPricesForOwner(user.id);

  return NextResponse.json({ message: "Account created successfully." }, { status: 201 });
}

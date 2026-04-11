import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { seedDefaultDurationPricesForOwner } from "@/lib/auth/default-owner-pricing";
import { prisma } from "@/lib/prisma";

type SignupPayload = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as SignupPayload;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!name || !email || !password || !confirmPassword) {
    return NextResponse.json(
      { message: "All fields are required." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { message: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ message: "Passwords do not match." }, { status: 400 });
  }

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

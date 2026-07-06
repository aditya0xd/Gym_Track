import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";

import { withGymOwner } from "@/lib/api-auth";
import { imageDataUrlSchema, parseRequestBody } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  profilePhoto: imageDataUrlSchema("Profile photo"),
  newPassword: z.string().trim().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
});

async function PUTHandler(request: Request, userId: string) {
  const { data, error } = await parseRequestBody(request, updateProfileSchema);
  
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: 400 });
  }

  // Check if email changed and if the new email is already taken
  const currentUser = await prisma.adminUser.findUnique({
    where: { id: userId }
  });

  if (!currentUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (data.email !== currentUser.email) {
    const existingEmail = await prisma.adminUser.findUnique({
      where: { email: data.email }
    });
    if (existingEmail) {
      return NextResponse.json({ message: "Email is already taken" }, { status: 400 });
    }
  }

  // Prepare update data
  const updateData: Prisma.AdminUserUpdateInput = {
    name: data.name,
    email: data.email,
    profilePhoto: data.profilePhoto,
  };

  // If a new password was provided and not empty, hash and update it
  if (data.newPassword) {
    updateData.passwordHash = await hash(data.newPassword, 12);
  }

  try {
    const updatedUser = await prisma.adminUser.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        profilePhoto: updatedUser.profilePhoto,
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { message: "Could not update profile", error: message },
      { status: 500 }
    );
  }
}

export const PUT = withGymOwner(PUTHandler);

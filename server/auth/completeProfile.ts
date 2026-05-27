"use server";

import { createClient } from "@/lib/supabase/server";

export async function verifyStudentProfile(
  fullName: string,
  deviceFingerprint: string,
  academicDetails?: {
    sessionId: string;
    programId: string;
    semesterId: string;
  }
) {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // Ensure the student profile exists, or create one if academic details are provided
  let { data: existing } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    if (!academicDetails) {
      return {
        error:
          "Access Denied: Your academic profile hasn't been provisioned by the Admin. Please contact HOD.",
      };
    }

    // Create student profile dynamically
    const { error: insertError } = await supabase
      .from("student_profiles")
      .insert({
        user_id: user.id,
        session_id: academicDetails.sessionId,
        program_id: academicDetails.programId,
        semester_id: academicDetails.semesterId,
      });

    if (insertError) {
      return { error: `Failed to create student profile: ${insertError.message}` };
    }
  }

  // Update User Metadata with their actual full name and locked Device Fingerprint
  const { error: updateErr } = await supabase.auth.updateUser({
    data: {
      full_name: fullName.trim(),
      device_id: deviceFingerprint,
    },
  });

  if (updateErr) {
    return { error: updateErr.message };
  }

  return { success: true };
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { verifyStudentProfile } from "@/server/auth/completeProfile";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { ShieldCheck, Smartphone, GraduationCap, Loader2 } from "lucide-react";
import { getDeviceFingerprint } from "@/lib/fingerprint";

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  
  const [fullName, setFullName] = useState("");
  const [academicContext, setAcademicContext] = useState<{program: string, sem: number} | null>(null);

  // Self-onboarding states
  const [sessions, setSessions] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);

  const [selectedSession, setSelectedSession] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

  const supabase = useMemo(() => createClient(), []);

  const filteredPrograms = useMemo(() => {
    if (!selectedSession) return [];
    return programs.filter((p) => p.session_id === selectedSession);
  }, [programs, selectedSession]);

  const filteredSemesters = useMemo(() => {
    if (!selectedProgram) return [];
    return semesters.filter((s) => s.program_id === selectedProgram);
  }, [semesters, selectedProgram]);

  // Fetch pre-provisioned data
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      const { data: profile } = await supabase
        .from("student_profiles")
        .select(`
           programs (name),
           semesters (semester_number)
        `)
        .eq("user_id", user.id)
        .single();
        
      if (profile) {
        setAcademicContext({
          program: (profile.programs as any)?.name || "Unknown Program",
          sem: (profile.semesters as any)?.semester_number || 0
        });
      } else {
        // Fetch active metadata so student can self-select
        const [sessionsRes, programsRes, semestersRes] = await Promise.all([
          supabase.from("academic_sessions").select("id, name").eq("status", "active"),
          supabase.from("programs").select("id, name, session_id").eq("status", "active"),
          supabase.from("semesters").select("id, semester_number, program_id").eq("status", "active")
        ]);

        if (sessionsRes.data) setSessions(sessionsRes.data);
        if (programsRes.data) setPrograms(programsRes.data);
        if (semestersRes.data) setSemesters(semestersRes.data);
      }
      
      if (user.user_metadata?.full_name) {
         setFullName(user.user_metadata.full_name);
      }
      setLoadingContext(false);
    }
    loadData();
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (!academicContext) {
      if (!selectedSession || !selectedProgram || !selectedSemester) {
        toast.error("Please select your academic session, program, and semester");
        return;
      }
    }

    setIsPending(true);

    try {
      // 1. Generate a robust Device Fingerprint using FingerprintJS
      const deviceFingerprint = await getDeviceFingerprint();
      
      const academicDetails = !academicContext
        ? {
            sessionId: selectedSession,
            programId: selectedProgram,
            semesterId: selectedSemester,
          }
        : undefined;

      const res = await verifyStudentProfile(fullName, deviceFingerprint, academicDetails);

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Profile verified securely!");
      router.push("/calendar-dashboard");
    } catch {
      toast.error("Something went wrong verifying your profile");
    } finally {
      setIsPending(false);
    }
  }

  if (loadingContext) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background p-4">
      {/* Background Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--tw-gradient-stops))] from-blue-500/10 via-background to-background pointer-events-none" />
      
      <div className="relative w-full max-w-md p-8 bg-card border shadow-xl rounded-3xl z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 text-green-600 flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to Acadence!</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Please verify your identity to access your academic dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {academicContext ? (
            /* Admin Provisioned Read-Only Context */
            <div className="p-4 bg-muted/50 rounded-xl border space-y-3">
               <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Provisioned Details</p>
               <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  <div>
                     <p className="font-semibold text-sm">{academicContext.program}</p>
                     <p className="text-xs text-muted-foreground">Semester {academicContext.sem}</p>
                  </div>
               </div>
            </div>
          ) : (
            /* Self-Selection Dropdowns */
            <div className="p-4 bg-muted/30 rounded-xl border border-dashed space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Academic Profile Setup</p>
              
              <div className="space-y-3">
                {/* Academic Session */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Academic Session</label>
                  <select
                    value={selectedSession}
                    onChange={(e) => {
                      setSelectedSession(e.target.value);
                      setSelectedProgram("");
                      setSelectedSemester("");
                    }}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                    required
                  >
                    <option value="">Select Session...</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Program */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Program</label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => {
                      setSelectedProgram(e.target.value);
                      setSelectedSemester("");
                    }}
                    disabled={!selectedSession}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">Select Program...</option>
                    {filteredPrograms.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Semester */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Semester</label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    disabled={!selectedProgram}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">Select Semester...</option>
                    {filteredSemesters.map((s) => (
                      <option key={s.id} value={s.id}>Semester {s.semester_number}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Your Full Legal Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 border rounded-xl bg-background focus:ring-2 focus:ring-primary focus:outline-none"
              required
            />
          </div>

          {/* GEO Device Warning */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Register this Smartphone as your Primary Attendance Device</p>
              <p className="text-xs text-blue-800/80 dark:text-blue-400/80 mt-1">
                By clicking verify, this device will be <b>locked</b>.
                This prevents proxy attendance using other devices.
              </p>
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full py-6 rounded-xl font-bold">
            {isPending ? (
               <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying Profile...</>
            ) : "Complete Verification & Access App"}
          </Button>
        </form>
      </div>
    </div>
  );
}

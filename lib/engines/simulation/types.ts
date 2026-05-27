// lib/engines/simulation/types.ts

export interface SubjectSimInput {
  subjectId: string;
  name: string;
  present: number;
  absent: number;
  cancelled: number;
  totalClasses: number; // present + absent
  remainingClasses: number; // estimated classes left in semester
  minAttendanceRequired: number; // e.g. 75
}

export interface SimAction {
  mode: "skip" | "attend";
  count: number;
}

export interface SubjectSimulationResult {
  subjectId: string;
  name: string;
  currentPct: number;
  simulatedPct: number;
  maxPossiblePct: number;
  minAttendanceRequired: number;
  
  isSafeAfterAction: boolean;
  wouldDropBelowThreshold: boolean;
  alreadyBelowThreshold: boolean;
  
  // Recovery
  classesNeededToRecover: number;
  isRecoveryPossible: boolean;
  isMathematicallyUnrecoverable: boolean; // if maxPossible < target
  
  // Confidence & Buffer
  totalClasses: number;
  remainingClasses: number;
  confidenceLevel: "Low" | "Medium" | "High";
  bufferPct: number; // distance from min requirement (can be negative)
}

export interface SimulationSummary {
  overallDecision: "Safe" | "Risky" | "Do Not Skip" | "Keep Attending";
  subjectsAffected: number; // Drops below threshold specifically due to action
  subjectsAlreadyAtRisk: number;
  subjectsBecomeUnrecoverable: number;
  action: SimAction;
}

export interface SimulationOutput {
  summary: SimulationSummary;
  subjects: SubjectSimulationResult[];
}

export interface RecoveryPlannerResult {
  subjectId: string;
  currentPct: number;
  targetPct: number;
  classesNeeded: number;
  isPossible: boolean;
  classesShortBy: number;
}

export type PriorityKey = "low" | "medium" | "high";

export interface PriorityConfig {
  key: PriorityKey;
  label: string;
}

export const PRIORITIES: PriorityConfig[] = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
];

export const priorityLabel = (k?: string | null): string => {
  if (k === "high" || k === "low") return k === "high" ? "High" : "Low";
  return "Medium";
};

export const isHighPriority = (k?: string | null) => k === "high";

export const DEFAULT_PRIORITY: PriorityKey = "medium";
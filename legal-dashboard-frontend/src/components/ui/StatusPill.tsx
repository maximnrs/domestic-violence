import { Badge } from "./Badge";

const labels: Record<string, string> = {
  open: "Open",
  in_review: "In Review",
  closed: "Closed",
  new: "New",
  reviewed: "Reviewed",
  archived: "Archived",
  verified: "Verified",
  restricted: "Restricted",
  not_requested: "Not requested",
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

const tones: Record<string, "default" | "success" | "warning" | "error" | "muted"> = {
  open: "success",
  in_review: "warning",
  closed: "muted",
  new: "success",
  reviewed: "warning",
  archived: "muted",
  verified: "success",
  restricted: "error",
  not_requested: "muted",
  queued: "warning",
  processing: "default",
  completed: "success",
  failed: "error",
};

type StatusPillProps = {
  status: string;
};

export function StatusPill({ status }: StatusPillProps) {
  return <Badge tone={tones[status] ?? "default"}>{labels[status] ?? status}</Badge>;
}

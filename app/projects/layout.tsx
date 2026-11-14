import { WorkspaceShell } from "@/features/projects/components/workspace-shell";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}

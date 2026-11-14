"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaskFormOutput, WorkLogFormOutput } from "../schemas/task.schema";
import { taskService, type TaskListParams, type TaskPortal } from "../services/task-service";
import type { TaskDetail } from "../types/task.types";

const listKey = (portal: TaskPortal) => [portal, "tasks"] as const;
const detailKey = (portal: TaskPortal, id: number) => [portal, "tasks", "detail", id] as const;

/** Anything that changes a task refreshes task lists, review queues, closing and the dashboard. */
function useInvalidateTaskViews() {
  const qc = useQueryClient();
  return () => {
    for (const key of [["admin", "tasks"], ["team", "tasks"], ["admin", "reviews"], ["team", "reviews"], ["admin", "closing"], ["admin", "dashboard"]]) {
      void qc.invalidateQueries({ queryKey: key });
    }
  };
}

export const useTasks = (params: TaskListParams, portal: TaskPortal = "admin") =>
  useQuery({ queryKey: [...listKey(portal), params], queryFn: () => taskService.list(portal, params), placeholderData: keepPreviousData });

export const useTask = (portal: TaskPortal, id: number | null) =>
  useQuery({ queryKey: detailKey(portal, id ?? 0), queryFn: () => taskService.get(portal, id!), enabled: id !== null });

export const useTaskOptions = (portal: TaskPortal, clientId: number | undefined, enabled: boolean) =>
  useQuery({ queryKey: [portal, "tasks", "options", clientId ?? null], queryFn: () => taskService.options(portal, clientId), enabled });

/** Every task mutation returns the fresh detail; store it, then refresh the lists that show it. */
function useTaskMutation<V>(portal: TaskPortal, fn: (v: V) => Promise<TaskDetail>) {
  const qc = useQueryClient();
  const invalidate = useInvalidateTaskViews();
  return useMutation({
    mutationFn: fn,
    onSuccess: (task) => qc.setQueryData(detailKey(portal, task.id), task),
    onSettled: invalidate,
  });
}

export const useCreateTask = (portal: TaskPortal) => useTaskMutation(portal, (v: TaskFormOutput) => taskService.create(portal, v));
export const useUpdateTask = (portal: TaskPortal, id: number) => useTaskMutation(portal, (v: TaskFormOutput) => taskService.update(portal, id, v));
export const useSetChecklist = (id: number) => useTaskMutation("team", (done: boolean[]) => taskService.setChecklist(id, done));
export const useLogWork = (id: number) => useTaskMutation("team", (v: WorkLogFormOutput) => taskService.logWork(id, v));
export const useSubmitTask = (id: number) => useTaskMutation("team", () => taskService.submit(id));

/** Work Queue moves: "start" (to do / returned → in progress) or "submit" (→ submitted, same rules as the Submit button). */
export const useMoveTask = () =>
  useTaskMutation("team", ({ id, to }: { id: number; to: "in_progress" | "submitted" }) => (to === "submitted" ? taskService.submit(id) : taskService.start(id)));

export function useGenerateTasks() {
  const onSuccess = useInvalidateTaskViews();
  return useMutation({ mutationFn: taskService.generate, onSuccess });
}

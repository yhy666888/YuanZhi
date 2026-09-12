import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TodosPage } from "./TodosPage";
import type { Todo } from "../api";

const { updateTodoMock } = vi.hoisted(() => ({ updateTodoMock: vi.fn() }));

vi.mock("../api", () => ({
  api: {
    updateTodo: (...args: unknown[]) => updateTodoMock(...args),
  },
}));

const todo: Todo = {
  id: 1, title: "写周报", priority: "high", due_at: null,
  completed: false, pomodoros: 0, pomodoro_target: 0, created_at: "2026-09-12T08:00:00",
};

describe("TodosPage", () => {
  afterEach(() => {
    cleanup();
    updateTodoMock.mockReset();
  });

  test("渲染待办卡片", () => {
    render(<TodosPage todos={[todo]} refresh={async () => {}} />);
    expect(screen.getByText("写周报")).toBeTruthy();
    expect(screen.getByText("高")).toBeTruthy();
  });

  test("点击勾选框切换完成状态后刷新", async () => {
    updateTodoMock.mockResolvedValue(undefined);
    const { container } = render(<TodosPage todos={[todo]} refresh={async () => {}} />);
    fireEvent.click(container.querySelector(".todo-check") as HTMLButtonElement);
    await waitFor(() => expect(updateTodoMock).toHaveBeenCalledWith(1, { completed: true }));
  });

  test("空列表显示占位文案", () => {
    render(<TodosPage todos={[]} refresh={async () => {}} />);
    expect(screen.getByText("这里还没有任务")).toBeTruthy();
  });
});

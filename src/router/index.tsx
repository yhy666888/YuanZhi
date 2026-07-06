import { createHashRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { HomePage } from "@/modules/home";
import { PomodoroPage } from "@/modules/pomodoro";
import { TodolistPage } from "@/modules/todolist";
import { MemoPage, MemoDetailPage } from "@/modules/memo";
import { AccountPage } from "@/modules/account";
import { PlanPage } from "@/modules/plan";
import { SettingsPage } from "@/modules/settings";

const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "pomodoro", element: <PomodoroPage /> },
      { path: "todolist", element: <TodolistPage /> },
      { path: "memo", element: <MemoPage /> },
      { path: "memo/:id", element: <MemoDetailPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "plan", element: <PlanPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <HomePage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

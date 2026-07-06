import { isTauri } from "@/lib/env";

export async function sendNotification(title: string, body?: string) {
  if (!isTauri()) {
    if ("Notification" in window) {
      let granted = Notification.permission === "granted";
      if (!granted && Notification.permission !== "denied") {
        granted = (await Notification.requestPermission()) === "granted";
      }
      if (granted) new Notification(title, { body });
    }
    return;
  }
  const mod = await import("@tauri-apps/plugin-notification");
  let granted = await mod.isPermissionGranted();
  if (!granted) {
    granted = (await mod.requestPermission()) === "granted";
  }
  if (granted) {
    await mod.sendNotification({ title, body });
  }
}

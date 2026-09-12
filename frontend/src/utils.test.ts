import { describe, expect, test } from "vitest";
import { localDateKey, pageFromHash, priorityLabels } from "./utils";

describe("localDateKey", () => {
  test("按本地时区补零格式化", () => {
    expect(localDateKey(new Date(2026, 8, 12))).toBe("2026-09-12");
    expect(localDateKey(new Date(2026, 0, 3))).toBe("2026-01-03");
  });
});

describe("pageFromHash", () => {
  test("解析 hash 路由", () => {
    window.location.hash = "#/todos";
    expect(pageFromHash()).toBe("todos");
  });

  test("未知路由回退到首页", () => {
    window.location.hash = "#/nowhere";
    expect(pageFromHash()).toBe("home");
  });
});

describe("priorityLabels", () => {
  test("覆盖三档优先级", () => {
    expect(priorityLabels.high).toBe("高");
    expect(priorityLabels.medium).toBe("中");
    expect(priorityLabels.low).toBe("低");
  });
});

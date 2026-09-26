import { describe, expect, it } from "vitest";
import {
  buildLoadTimeRangeOptions,
  buildPingTimeRangeOptions,
} from "@/components/instance/chartShared";

const ALL_STEPS = [
  { label: "1 小时", value: 1 },
  { label: "6 小时", value: 6 },
  { label: "12 小时", value: 12 },
  { label: "1 天", value: 24 },
  { label: "2 天", value: 48 },
  { label: "7 天", value: 168 },
  { label: "14 天", value: 336 },
  { label: "30 天", value: 720 },
];

const STEPS_UP_TO_7_DAYS = ALL_STEPS.slice(0, 6);

describe("detail chart time ranges", () => {
  it("offers every backend-supported step to a logged-in admin", () => {
    // ProbeDeck 的 /api/history/all 最长支持 720 小时（30 天），档位表跟着走到 30 天。
    expect(buildPingTimeRangeOptions(720)).toEqual(ALL_STEPS);
    expect(buildLoadTimeRangeOptions(720)).toEqual([
      { label: "实时", value: 0 },
      ...ALL_STEPS,
    ]);
  });

  it("hides the 14/30 day steps on backends capped at 7 days", () => {
    // 老后端（CF-Server-Monitor 原版）上限 168 小时，336 / 720 会被回 400。
    expect(buildPingTimeRangeOptions(168)).toEqual(STEPS_UP_TO_7_DAYS);
    expect(buildLoadTimeRangeOptions(168)).toEqual([
      { label: "实时", value: 0 },
      ...STEPS_UP_TO_7_DAYS,
    ]);
  });

  it("caps anonymous visitors at 24 hours", () => {
    // 未登录时 hours 超过站点配置的公开窗口会被后端拒绝，因此更长的档位不显示。
    expect(buildPingTimeRangeOptions(24)).toEqual([
      { label: "1 小时", value: 1 },
      { label: "6 小时", value: 6 },
      { label: "12 小时", value: 12 },
      { label: "1 天", value: 24 },
    ]);
    expect(buildLoadTimeRangeOptions(24)).toEqual([
      { label: "实时", value: 0 },
      { label: "1 小时", value: 1 },
      { label: "6 小时", value: 6 },
      { label: "12 小时", value: 12 },
      { label: "1 天", value: 24 },
    ]);
  });
});

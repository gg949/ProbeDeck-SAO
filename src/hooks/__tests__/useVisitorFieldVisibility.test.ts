import { describe, expect, it } from "vitest";
import { resolveVisitorFieldVisibility } from "@/hooks/useVisitorFieldVisibility";

const ALL_ON = { show_price: true, show_expire: true, show_tf: true };
const ALL_OFF = { show_price: false, show_expire: false, show_tf: false };

describe("resolveVisitorFieldVisibility", () => {
  it("keeps everything visible for a logged-in admin", () => {
    // 登录站长拿到的字段没被服务端剥离，站点开关只约束访客。
    expect(resolveVisitorFieldVisibility(true, ALL_OFF)).toEqual({
      showPrice: true,
      showExpire: true,
      showTraffic: true,
    });
  });

  it("follows the site switches for guests", () => {
    expect(resolveVisitorFieldVisibility(false, ALL_ON)).toEqual({
      showPrice: true,
      showExpire: true,
      showTraffic: true,
    });
    expect(resolveVisitorFieldVisibility(false, ALL_OFF)).toEqual({
      showPrice: false,
      showExpire: false,
      showTraffic: false,
    });
    // 只关掉一项时另外两项不受影响（后端也是逐项剥离）。
    expect(
      resolveVisitorFieldVisibility(false, { show_price: false, show_expire: true, show_tf: true }),
    ).toEqual({ showPrice: false, showExpire: true, showTraffic: true });
  });

  it("treats a missing switch as on (old backends never strip)", () => {
    expect(
      resolveVisitorFieldVisibility(false, {
        show_price: true,
        show_expire: true,
        show_tf: true,
      }),
    ).toEqual({ showPrice: true, showExpire: true, showTraffic: true });
  });
});

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSysConfig } from "@/hooks/useNode";
import type { SysConfig } from "@/types/cfsm";

export interface VisitorFieldVisibility {
  showPrice: boolean;
  showExpire: boolean;
  showTraffic: boolean;
}

/**
 * 纯函数部分（可单测）：登录站长拿到的字段本来就没被服务端剥离，三项恒为可见；
 * 访客按站点开关（缺省视为开）逐项判定。见 {@link useVisitorFieldVisibility}。
 */
export function resolveVisitorFieldVisibility(
  loggedIn: boolean,
  sys: Pick<SysConfig, "show_price" | "show_expire" | "show_tf">,
): VisitorFieldVisibility {
  if (loggedIn) return { showPrice: true, showExpire: true, showTraffic: true };
  return {
    showPrice: sys.show_price !== false,
    showExpire: sys.show_expire !== false,
    showTraffic: sys.show_tf !== false,
  };
}

/**
 * 访客可见字段（价格 / 到期 / 流量）能不能显示。
 *
 * ProbeDeck 与 CF-Server-Monitor 原版的差别：站长关掉「向访客公开」的字段是在**服务端直接剥离**
 * （原版只在前端隐藏，数据还在）。剥离后价格变成空串、账单周期变成空、流量上限整字段消失 ——
 * 前端照旧按「空 = 免费」「缺失 = 不限量」渲染，就会凭空造出「免费」「不限流量」这类假信息。
 *
 * 所以这里跟随后端 `/api/servers` 的 `sysConfig.show_price / show_expire / show_tf`：
 * 站长关掉哪一项，访客侧就按「不可用」渲染（价格行显示付费周期、流量显示「—」），
 * 而不是假值。到期时间本来就是「缺字段 → 显示 —」，无需额外处理。
 * 老后端 / 字段缺席时默认全开，行为与升级前一致。
 */
export function useVisitorFieldVisibility(): VisitorFieldVisibility {
  const { data: me } = useAuth();
  const sys = useSysConfig();
  const loggedIn = Boolean(me?.logged_in);
  return useMemo(() => resolveVisitorFieldVisibility(loggedIn, sys), [loggedIn, sys]);
}

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  focusRealtimeNode,
  retainStore,
  getAllNodeMetaSnapshot,
  getHomeNodeSummariesSnapshot,
  getNodeMetaSnapshot,
  getNodeMetricsSnapshot,
  getNodeTrafficTrendSnapshot,
  getRawServerSnapshot,
  getNodeOnlineSummariesSnapshot,
  subscribeHomeNodeSummaries,
  subscribeNodeOnlineSummaries,
  subscribeAllNodes,
  subscribeStoreStatus,
  subscribeToNodeMeta,
  subscribeToNodeMetrics,
  subscribeToNodeTrafficTrend,
  getStoreStatusSnapshot,
  getSysConfigSnapshot,
  subscribeSysConfig,
  type HomeNodeSummary,
  type NodeOnlineSummary,
} from "@/services/wsStore";
import type {
  CarrierNames,
  CfsmServer,
  NodeInfo,
  NodeMetrics,
  SysConfig,
  TrafficTrendSample,
} from "@/types/cfsm";
import { useAuth } from "@/hooks/useAuth";
import { useCarrierNames } from "@/hooks/usePublicConfig";
import { useHiddenNodeUuids } from "@/hooks/useVisibleNodes";
import { resolveServerCarrierNames } from "@/services/cfsm/probes";

const noopUnsubscribe = () => undefined;

function useEnsured(enabled = true) {
  useEffect(() => {
    if (enabled) return retainStore();
  }, [enabled]);
}

/** 详情页：实时订阅只留正在看的这一台，离开时恢复订阅全站（见 wsStore 的 focusRealtimeNode）。 */
export function useRealtimeFocus(uuid: string | undefined) {
  useEffect(() => {
    if (uuid) return focusRealtimeNode(uuid);
  }, [uuid]);
}

export function useNodeMeta(uuid: string): NodeInfo | undefined {
  useEnsured();
  return useNodeMetaSnapshot(uuid);
}

function useNodeMetaSnapshot(uuid: string): NodeInfo | undefined {
  const subscribe = useCallback(
    (callback: () => void) => subscribeToNodeMeta(uuid, callback),
    [uuid],
  );
  const getSnapshot = useCallback(() => getNodeMetaSnapshot(uuid), [uuid]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * 原始服务器对象（后端原字段：`probes[]`、`node_N_name`、扁平 `ping_*` 等）。
 *
 * 同时订阅两个来源：全量刷新走 meta、WS 增量合并走 metrics —— 只订 meta 的话，
 * 合并出来的新对象要等下一次全量刷新才能被看见（卡片上的延迟会慢一拍）。
 */
export function useRawServer(uuid: string): CfsmServer | undefined {
  useEnsured();
  const subscribe = useCallback(
    (callback: () => void) => {
      const offMeta = subscribeToNodeMeta(uuid, callback);
      const offMetrics = subscribeToNodeMetrics(uuid, callback);
      return () => {
        offMeta();
        offMetrics();
      };
    },
    [uuid],
  );
  const getSnapshot = useCallback(() => getRawServerSnapshot(uuid), [uuid]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * 这台机器的线路名：服务器对象上的逐机名字（`probes[].name` / `node_N_name`）优先，
 * 缺席时回退到站点级名字（`/api/config`）。没有覆盖时返回站点级那份（引用稳定）。
 */
export function useServerCarrierNames(uuid: string): CarrierNames {
  const siteNames = useCarrierNames();
  const server = useRawServer(uuid);
  return useMemo(
    () => resolveServerCarrierNames(server, siteNames),
    [server, siteNames],
  );
}

export function useNodeMetrics(uuid: string, enabled = true): NodeMetrics | undefined {
  useEnsured(enabled);
  return useNodeMetricsSnapshot(uuid, enabled);
}

function useNodeMetricsSnapshot(uuid: string, enabled = true): NodeMetrics | undefined {
  const subscribe = useCallback(
    (callback: () => void) =>
      enabled ? subscribeToNodeMetrics(uuid, callback) : noopUnsubscribe,
    [uuid, enabled],
  );
  const getSnapshot = useCallback(
    () => (enabled ? getNodeMetricsSnapshot(uuid) : undefined),
    [uuid, enabled],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function useNodeTrafficTrendSnapshot(
  uuid: string,
): { up: TrafficTrendSample[]; down: TrafficTrendSample[] } {
  const subscribe = useCallback(
    (callback: () => void) => subscribeToNodeTrafficTrend(uuid, callback),
    [uuid],
  );
  const getSnapshot = useCallback(() => getNodeTrafficTrendSnapshot(uuid), [uuid]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useNodeCardSnapshots(uuid: string) {
  useEnsured();
  return {
    meta: useNodeMetaSnapshot(uuid),
    metrics: useNodeMetricsSnapshot(uuid),
    trafficTrend: useNodeTrafficTrendSnapshot(uuid),
  };
}

export function useAllNodeMeta(): NodeInfo[] {
  useEnsured();
  return useSyncExternalStore(
    subscribeAllNodes,
    getAllNodeMetaSnapshot,
    getAllNodeMetaSnapshot,
  );
}

export function useVisibleNodeUuids(includeHidden = false): string[] {
  const allNodes = useAllNodeMeta();
  const { data: me } = useAuth();
  const hiddenUuids = useHiddenNodeUuids();
  return useMemo(
    () =>
      allNodes
        .filter(
          (node) =>
            (includeHidden || me?.logged_in === true || !node.hidden) &&
            !hiddenUuids.has(node.uuid),
        )
        .map((node) => node.uuid),
    [allNodes, hiddenUuids, includeHidden, me?.logged_in],
  );
}

export function useHomeNodeSummaries(): HomeNodeSummary[] {
  useEnsured();
  return useSyncExternalStore(
    subscribeHomeNodeSummaries,
    getHomeNodeSummariesSnapshot,
    getHomeNodeSummariesSnapshot,
  );
}

export function useNodeOnlineSummaries(): NodeOnlineSummary[] {
  useEnsured();
  return useSyncExternalStore(
    subscribeNodeOnlineSummaries,
    getNodeOnlineSummariesSnapshot,
    getNodeOnlineSummariesSnapshot,
  );
}

const EMPTY_STORE_STATUS = {
  failureStreak: 0,
  hydrated: false,
  nodeInfoError: false,
} as const;

/**
 * 后端 `/api/servers` 下发的 `sysConfig` 里那个开关：**是否输出首页的详细 ping/loss**。
 *
 * 关掉时后端不再下发 `servers[].ping[]` / `loss[]` 这一小时窗口，只剩每台节点当前的
 * 单条 `ping_ct/cu/cm/bd`。主题据此回退：三网那三条线不画（没数据可画），
 * 开页自检也不跑（本来就不下发，不是数据坏了）。老后端没有这个字段，默认按 true 走。
 */
export function useShowThreeNetDetails(): boolean {
  useEnsured();
  const getSnapshot = useCallback(() => getSysConfigSnapshot().show_three_net_details, []);
  return useSyncExternalStore(subscribeSysConfig, getSnapshot, getSnapshot);
}

/**
 * 后端 `/api/servers` 下发的站点开关（`show_price` / `show_expire` / `show_tf` 等）。
 * ProbeDeck 用它决定「向访客公开哪些字段」，见 `useVisitorFieldVisibility`。
 */
export function useSysConfig(): SysConfig {
  useEnsured();
  const getSnapshot = useCallback(() => getSysConfigSnapshot(), []);
  return useSyncExternalStore(subscribeSysConfig, getSnapshot, getSnapshot);
}

export function useNodeStoreStatus(enabled = true) {
  useEnsured(enabled);
  const subscribe = useCallback(
    (listener: () => void) => (enabled ? subscribeStoreStatus(listener) : noopUnsubscribe),
    [enabled],
  );
  const getSnapshot = useCallback(
    () => (enabled ? getStoreStatusSnapshot() : EMPTY_STORE_STATUS),
    [enabled],
  );
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );
}

import { CARRIER_TASKS, DEFAULT_CARRIER_NAMES, type CarrierTask } from "./mappers";
import { CARRIER_KEYS } from "@/types/cfsm";
import type { CarrierKey, CarrierNames, CfsmServer } from "@/types/cfsm";

/**
 * ProbeDeck（CF-Server-Monitor 2.13+）的探测槽位适配。
 *
 * 面板把「每台机器最多 24 个探测点」拆成两类信息下发：
 *
 * - **前 8 槽**（`ct/cu/cm/bd/node_1..4`）语义与老后端一致：目标可能来自站点级默认，
 *   公开接口里没有 `probes[]` 条目也会有数值 —— 所以「有没有这条线路」看的是**有没有值**；
 * - **扩展槽**（`node_5..node_20`）**只认 `servers[].probes[]`**：面板把「已启用」的槽位放进去
 *   （host 清空 / 填 `"0"` 就不在里面）。host 清空后历史数值会残留到探针下次上报（默认 60 秒一次），
 *   所以不能按「有值」判断，否则会出现「删掉的探测点还在画」。
 *
 * 名字回退链（逐槽）：`probes[].name` → 服务器对象上的 `node_N_name` / `custom_*_name`
 * → 站点级名字（`/api/config`，只有前 8 槽）→ 主题默认名。
 */

/** 扩展槽：前 8 槽之外的逐机槽位（`node_5..node_20`）。 */
const EXTENSION_SLOT_PATTERN = /^node_(?:[5-9]|1[0-9]|20)$/;

export function isExtensionSlot(key: CarrierKey): boolean {
  return EXTENSION_SLOT_PATTERN.test(key);
}

/** 服务器对象上这条槽位的名字列：前四条是 `custom_*_name`，其余（含 node_1..4）是 `node_N_name`。 */
export function carrierNameField(key: CarrierKey): string {
  return key === "ct" || key === "cu" || key === "cm" || key === "bd"
    ? `custom_${key}_name`
    : `${key}_name`;
}

type ServerRecord = Record<string, unknown>;

function asRecord(server: CfsmServer | null | undefined): ServerRecord | null {
  return server ? (server as unknown as ServerRecord) : null;
}

/**
 * 这台机器已启用的扩展槽集合（`probes[].id`）。
 *
 * 返回 `null` = 后端没有 `probes` 字段（老后端，或字段被裁掉的响应）：可见性未知，
 * 调用方按旧口径（看有没有数据）处理。
 */
export function serverProbeIds(
  server: CfsmServer | null | undefined,
): ReadonlySet<string> | null {
  const probes = server?.probes;
  if (!Array.isArray(probes)) return null;
  const ids = new Set<string>();
  for (const probe of probes) {
    const id = String(probe?.id ?? "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

/** 服务器对象上这条槽位「有值」：扁平 `ping_*` / `loss_*` 有一个不是 null 就算。 */
export function serverHasCarrierValue(
  server: CfsmServer | null | undefined,
  key: CarrierKey,
): boolean {
  const row = asRecord(server);
  if (!row) return false;
  return row[`ping_${key}`] != null || row[`loss_${key}`] != null;
}

/**
 * 这台机器可见的线路（按线路表顺序）。
 *
 * - 前 8 槽：有值就收；`probes[]` 里列了也算（刚启用、探针还没上报的槽位）。
 * - 扩展槽：只认 `probes[]`。
 *
 * 返回 `null` = 后端没有 `probes` 字段：调用方退回「按观测到的数据过滤」的旧口径，
 * 老后端行为与升级前完全一致。
 */
export function resolveVisibleCarrierTasks(
  server: CfsmServer | null | undefined,
): CarrierTask[] | null {
  const probeIds = serverProbeIds(server);
  if (!probeIds) return null;
  return CARRIER_TASKS.filter((task) =>
    isExtensionSlot(task.key)
      ? probeIds.has(task.key)
      : serverHasCarrierValue(server, task.key) || probeIds.has(task.key),
  );
}

/**
 * 这台机器的线路名（逐槽回退链，见文件头注释）。
 *
 * 和 `resolveCarrierNames` 一样：没有任何覆盖时原样返回传入的 `siteNames`
 * （引用稳定，调用方可以按引用比较 / 进缓存键）。
 */
export function resolveServerCarrierNames(
  server: CfsmServer | null | undefined,
  siteNames: CarrierNames = DEFAULT_CARRIER_NAMES,
): CarrierNames {
  const row = asRecord(server);
  if (!row) return siteNames;
  const probes = Array.isArray(server?.probes) ? server.probes : null;
  let resolved: CarrierNames | null = null;
  for (const task of CARRIER_TASKS) {
    const probeName =
      probes?.find((probe) => String(probe?.id ?? "").trim() === task.key)?.name?.trim() ?? "";
    const serverName = String(row[carrierNameField(task.key)] ?? "").trim();
    const name = probeName || serverName || siteNames[task.key];
    if (name && name !== siteNames[task.key]) {
      resolved ??= { ...siteNames };
      resolved[task.key] = name;
    }
  }
  return resolved ?? siteNames;
}

/**
 * 线路名表的稳定键：内容相同 → 键相同（默认名走同一个常量，键里只写个短标记）。
 * 用于判断「名字有没有真变」—— 服务器对象每秒都会被 WS 增量合并换引用（见下），
 * 光按对象引用比较会把没变的名字也当成新值。
 */
export function carrierNamesKey(names: CarrierNames): string {
  return names === DEFAULT_CARRIER_NAMES
    ? "default"
    : CARRIER_KEYS.map((key) => names[key]).join("|");
}

/**
 * 与 {@link resolveServerCarrierNames} 同口径，但**按内容稳定引用**：名字没变时返回同一个对象。
 *
 * 服务器对象每次 WS 增量合并都会换引用（ProbeDeck 每秒一帧），直接把它放进下游 `useMemo`
 * 的依赖里，会让 `tasks` → `chartBundle` → `options` 整条链每秒重建 —— 详情页的
 * uplot-react 遇到 `options` 引用变化会把整个图表销毁重建，表现为「延迟图每秒刷新一次」。
 * 按内容键缓存后，名字不变就是同一个引用，图表只在数据真的变化时才动。
 */
const serverCarrierNamesCache = new Map<string, CarrierNames>();

export function stableServerCarrierNames(
  server: CfsmServer | null | undefined,
  siteNames: CarrierNames = DEFAULT_CARRIER_NAMES,
): CarrierNames {
  const resolved = resolveServerCarrierNames(server, siteNames);
  const key = carrierNamesKey(resolved);
  const cached = serverCarrierNamesCache.get(key);
  if (cached) return cached;
  if (serverCarrierNamesCache.size > 256) serverCarrierNamesCache.clear();
  serverCarrierNamesCache.set(key, resolved);
  return resolved;
}

/**
 * 与 {@link resolveVisibleCarrierTasks} 同口径，但**按内容稳定引用**：可见集合没变时
 * 返回同一个 Set（原因同 {@link stableServerCarrierNames}）。返回 `null` = 后端没有
 * `probes` 字段（老后端），调用方不做过滤。
 */
const visibleTaskIdSetCache = new Map<string, ReadonlySet<number>>();

export function stableVisibleTaskIdSet(
  server: CfsmServer | null | undefined,
): ReadonlySet<number> | null {
  const visible = resolveVisibleCarrierTasks(server);
  if (!visible) return null;
  const key = visible.map((task) => task.id).join(",");
  const cached = visibleTaskIdSetCache.get(key);
  if (cached) return cached;
  if (visibleTaskIdSetCache.size > 256) visibleTaskIdSetCache.clear();
  const ids = new Set<number>(visible.map((task) => task.id));
  visibleTaskIdSetCache.set(key, ids);
  return ids;
}

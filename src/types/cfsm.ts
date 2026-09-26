import { z } from "zod";

/**
 * 上半部分是 CF-Server-Monitor 后端的原始响应结构（宽松解析，容忍字段缺失/类型漂移），
 * 下半部分是主题内部的展示模型。两者之间由 `@/services/cfsm/mappers` 转换。
 */

const looseString = z
  .union([z.string(), z.number(), z.boolean()])
  .transform((v) => String(v))
  .catch("");
const looseNumber = z
  .union([z.number(), z.string()])
  .transform((v) => {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const parsed = Number.parseFloat(v);
    return Number.isFinite(parsed) ? parsed : 0;
  })
  .catch(0);
const nullableNumber = z
  .union([z.number(), z.string(), z.null()])
  .transform((v) => {
    if (v == null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const parsed = Number.parseFloat(v);
    return Number.isFinite(parsed) ? parsed : null;
  })
  .nullish()
  .catch(null);
/**
 * ProbeDeck（2.13+）`servers[].probes[]` 的一条：一个已启用的探测槽位。
 *
 * 只用来回答「有哪些槽位、叫什么名字」，数值仍以扁平列（`ping_node_5` / `loss_node_5`）为准 ——
 * 面板自己也是这么合并的。`id` 是 `CARRIER_KEYS` 同名的字符串。
 */
export const ProbeSchema = z
  .object({
    id: looseString.default(""),
    name: looseString.nullish().transform((v) => v ?? ""),
    host: looseString.nullish().transform((v) => v ?? ""),
    ping: nullableNumber,
    loss: nullableNumber,
  })
  .passthrough();

export type Probe = z.output<typeof ProbeSchema>;

/** 磁盘 IO；旧探针或全零时后端不会下发该对象。 */
export const DiskIoSchema = z
  .object({
    read_bps: looseNumber.default(0),
    write_bps: looseNumber.default(0),
    read_iops: looseNumber.default(0),
    write_iops: looseNumber.default(0),
    await_ms: looseNumber.default(0),
    util: looseNumber.default(0),
  })
  .passthrough();

export type DiskIo = z.output<typeof DiskIoSchema>;

export const GpuEntrySchema = z
  .object({
    id: looseString.default(""),
    name: looseString.default(""),
    info: nullableNumber,
  })
  .passthrough();

export type GpuEntry = z.output<typeof GpuEntrySchema>;

/**
 * `/api/servers` 下发的一小时探测窗口中的一个点。
 *
 * 固定 30 个槽位、每 2 分钟一个，`ping` 与 `loss` 各一个数组。
 * 线路值可能是 `false`（该节点禁用了这条线路），这里统一归一成 null。
 */
export const LatencyPointSchema = z
  .object({
    ts: looseNumber.default(0),
    ct: nullableNumber,
    cu: nullableNumber,
    cm: nullableNumber,
    bd: nullableNumber,
    // 后端 2.8.5 Beta4 起多出来的四个自定义槽位。老后端不下发，读出来是 undefined → null。
    node_1: nullableNumber,
    node_2: nullableNumber,
    node_3: nullableNumber,
    node_4: nullableNumber,
  })
  .passthrough();

export type LatencyPoint = z.output<typeof LatencyPointSchema>;

/**
 * `/api/servers` 与 `/api/server` 的服务器对象。
 *
 * 单位约定（与后端一致）：`ram_*` / `swap_*` / `disk_*` 为 MiB，网络速率与累计量为字节，
 * `traffic_limit` 为 GB，`boot_time` / `last_updated` 为毫秒时间戳。
 */
export const CfsmServerSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    name: looseString.default(""),
    server_group: looseString.default(""),
    tags: looseString.default(""),
    price: looseString.default(""),
    billing_cycle: looseString.default(""),
    auto_renewal: looseString.default(""),
    currency: looseString.default(""),
    expire_date: looseString.default(""),
    traffic_limit: looseString.default(""),
    traffic_calc_type: looseString.default(""),
    reset_day: looseNumber.default(0),
    report_interval: looseNumber.default(0),
    is_hidden: looseString.default("0"),
    sort_order: looseNumber.default(0),

    cpu: looseNumber.default(0),
    load_avg: looseString.default(""),
    net_in_speed: looseNumber.default(0),
    net_out_speed: looseNumber.default(0),
    net_rx: looseNumber.default(0),
    net_tx: looseNumber.default(0),
    net_rx_monthly: looseNumber.default(0),
    net_tx_monthly: looseNumber.default(0),
    processes: looseNumber.default(0),
    tcp_conn: looseNumber.default(0),
    udp_conn: looseNumber.default(0),

    ping_ct: nullableNumber,
    ping_cu: nullableNumber,
    ping_cm: nullableNumber,
    ping_bd: nullableNumber,
    ping_node_1: nullableNumber,
    ping_node_2: nullableNumber,
    ping_node_3: nullableNumber,
    ping_node_4: nullableNumber,
    ping_node_5: nullableNumber,
    ping_node_6: nullableNumber,
    ping_node_7: nullableNumber,
    ping_node_8: nullableNumber,
    ping_node_9: nullableNumber,
    ping_node_10: nullableNumber,
    ping_node_11: nullableNumber,
    ping_node_12: nullableNumber,
    ping_node_13: nullableNumber,
    ping_node_14: nullableNumber,
    ping_node_15: nullableNumber,
    ping_node_16: nullableNumber,
    ping_node_17: nullableNumber,
    ping_node_18: nullableNumber,
    ping_node_19: nullableNumber,
    ping_node_20: nullableNumber,
    loss_ct: nullableNumber,
    loss_cu: nullableNumber,
    loss_cm: nullableNumber,
    loss_bd: nullableNumber,
    loss_node_1: nullableNumber,
    loss_node_2: nullableNumber,
    loss_node_3: nullableNumber,
    loss_node_4: nullableNumber,
    loss_node_5: nullableNumber,
    loss_node_6: nullableNumber,
    loss_node_7: nullableNumber,
    loss_node_8: nullableNumber,
    loss_node_9: nullableNumber,
    loss_node_10: nullableNumber,
    loss_node_11: nullableNumber,
    loss_node_12: nullableNumber,
    loss_node_13: nullableNumber,
    loss_node_14: nullableNumber,
    loss_node_15: nullableNumber,
    loss_node_16: nullableNumber,
    loss_node_17: nullableNumber,
    loss_node_18: nullableNumber,
    loss_node_19: nullableNumber,
    loss_node_20: nullableNumber,
    /**
     * ProbeDeck（2.13+）的扩展探测点表：每个**已启用**的槽位一条 `{ id, name, host, ping, loss }`。
     *
     * - `id` 与 `CARRIER_KEYS` 同名（`"ct"` / `"node_5"`）；前 8 槽用站点级默认目标时不在这里出现，
     *   所以「前 8 槽有没有这条线路」仍按有没有值判断，扩展槽则**只认这张表**。
     * - `host` 是公开字段（面板有意公开已启用探测点的目标），别拿它判可见性 —— 可见性只看
     *   这条 id 在不在表里（面板已经按「host 非空且不是 `"0"`」筛过一遍）。
     * - 老后端没有这个字段 → `undefined`，扩展槽一律视为未配置（行为同旧版）。
     */
    probes: z.array(ProbeSchema).optional(),
    /**
     * ProbeDeck 在历史行里把扩展槽数值塞进这个 JSON 字符串（`{"ping_node_5":40,"loss_node_5":0}`）；
     * 服务器对象上一般没有。扁平列缺席时用它兜底，见 mappers 的 `flattenExtraProbes`。
     */
    extra_probes: looseString.default(""),
    // Workers 2.8.3 Beta2 起下发的一小时探测窗口；旧版本没有这两个字段。
    ping: z.array(LatencyPointSchema).optional(),
    loss: z.array(LatencyPointSchema).optional(),

    ram_total: looseNumber.default(0),
    ram_used: looseNumber.default(0),
    swap_total: looseNumber.default(0),
    swap_used: looseNumber.default(0),
    disk_total: looseNumber.default(0),
    disk_used: looseNumber.default(0),
    disk: DiskIoSchema.optional(),

    cpu_cores: looseNumber.default(0),
    cpu_info: looseString.default(""),
    gpu_info: z.unknown().optional(),
    arch: looseString.default(""),
    os: looseString.default(""),
    kernel_version: looseString.default(""),
    region: looseString.default(""),
    ip_v4: looseString.default("0"),
    ip_v6: looseString.default("0"),
    boot_time: looseString.default(""),
    agent_version: looseString.default(""),
    last_updated: looseNumber.default(0),
    timestamp: looseNumber.default(0),
    is_online: z.boolean().optional(),
  })
  .passthrough();

export type CfsmServer = z.output<typeof CfsmServerSchema>;

/** WebSocket / latestReportUpdates 下发的增量样本，字段是 Server 的子集。 */
export const CfsmServerPatchSchema = CfsmServerSchema.partial().passthrough();

export type CfsmServerPatch = Partial<CfsmServer> & Record<string, unknown>;

export const LatestReportUpdateSchema = z
  .object({
    serverId: z.union([z.string(), z.number()]).transform((v) => String(v)),
    reportTs: looseNumber.optional(),
    reportAgeMs: looseNumber.optional(),
    samples: z
      .array(
        z
          .object({
            ts: looseNumber.optional(),
            data: z.record(z.string(), z.unknown()).optional(),
            payload: z.record(z.string(), z.unknown()).optional(),
            metrics: z.record(z.string(), z.unknown()).optional(),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

export type LatestReportUpdate = z.output<typeof LatestReportUpdateSchema>;

export const SysConfigSchema = z
  .object({
    show_price: z.boolean().default(true),
    show_expire: z.boolean().default(true),
    show_tf: z.boolean().default(true),
    show_time: z.boolean().default(true),
    /**
     * 后端是否输出首页的**详细** ping/loss（`servers[].ping[]` / `loss[]` 那一小时窗口）。
     *
     * 后端 2026-08-23 加的开关。关掉时那两个数组不再下发，只剩每台节点当前的
     * `ping_ct/cu/cm/bd` 单条值 —— 主题要据此回退，不然三网那三条线没有数据可画、
     * 开页自检也会把「本来就不下发」误判成「后端数据坏了」而反复弹窗。
     * 默认 true：老版本后端没有这个字段，而它们是一直输出详细数据的。
     */
    show_three_net_details: z.boolean().default(true),
    long_history_points: looseNumber.optional(),
    display_mode: looseString.optional(),
  })
  .passthrough();

export type SysConfig = z.output<typeof SysConfigSchema>;

export const ServersResponseSchema = z
  .object({
    servers: z.array(CfsmServerSchema).default([]),
    latestReportUpdates: z.array(LatestReportUpdateSchema).default([]),
    stats: z
      .object({
        total: looseNumber.default(0),
        online: looseNumber.default(0),
        offline: looseNumber.default(0),
        globalSpeedIn: looseNumber.default(0),
        globalSpeedOut: looseNumber.default(0),
        globalNetTx: looseNumber.default(0),
        globalNetRx: looseNumber.default(0),
      })
      .partial()
      .passthrough()
      .default({}),
    regionStats: z.record(z.string(), looseNumber).default({}),
    sysConfig: SysConfigSchema.default({}),
  })
  .passthrough();

export type ServersResponse = z.output<typeof ServersResponseSchema>;

export const SiteConfigSchema = z
  .object({
    version: looseString.default(""),
    last_workers_version: looseString.nullish().transform((v) => v ?? ""),
    last_agent_version: looseString.nullish().transform((v) => v ?? ""),
    is_public: z.boolean().default(true),
    authorization: z.boolean().default(false),
    turnstile_enabled: z.boolean().default(false),
    turnstile_login_enabled: z.boolean().default(false),
    turnstile_site_key: looseString.default(""),
    site_title: looseString.default(""),
    display_mode: looseString.default(""),
    /** 后台「外观设置 → 默认外观」：auto / dark / light。主题设置没写默认外观时拿它垫底。 */
    preferred_theme: looseString.default(""),
    theme_options: z.record(z.string(), z.unknown()).default({}),
    verified: z.boolean().default(false),
    turnstile_verified: looseString.nullish().transform((v) => v ?? ""),
    long_history_points: looseNumber.default(120),
    /**
     * 单次前端实时连接的时长上限（分钟，0 = 不限；后端 2026-08-20 加的站点设置）。后端只下发不执行：
     * 到点断开、问用户要不要继续都靠前端，见 wsStore 的 setRealtimeSessionLimitMinutes。
     */
    frontend_ws_timeout_minutes: looseNumber.default(0),
    /**
     * 未登录访客能查的历史窗口上限（小时）。ProbeDeck 由站点设置下发（默认 720），
     * 老后端（CF-Server-Monitor 原版）没有这个字段，缺席时按原版上限 168 兜底。
     */
    public_history_hours: looseNumber.default(168),
    /**
     * 在线判定阈值（秒）。ProbeDeck 由站点设置下发（默认 120，可改），老后端缺席时按原版写死的
     * 300 秒兜底。前端只拿它判断「这台是不是掉线了」——后端聚合统计用的是同一个值。
     */
    online_threshold_seconds: looseNumber.default(300),
    /**
     * 站长在后台给四条线路起的名字（后端后加的字段）。缺席 / 空串就用主题的默认名
     * （电信 / 联通 / 移动 / BD），见 mappers 的 `resolveCarrierNames` —— 老后端不下发这几个
     * 字段，默认名必须原样保留，否则存量站点的线路名会集体变空。
     */
    custom_ct_name: looseString.nullish().transform((v) => v ?? ""),
    custom_cu_name: looseString.nullish().transform((v) => v ?? ""),
    custom_cm_name: looseString.nullish().transform((v) => v ?? ""),
    custom_bd_name: looseString.nullish().transform((v) => v ?? ""),
    // 后端 2.8.5 Beta4 起多出来的四条自定义线路，名字键名和前四条不是一个风格。
    node_1_name: looseString.nullish().transform((v) => v ?? ""),
    node_2_name: looseString.nullish().transform((v) => v ?? ""),
    node_3_name: looseString.nullish().transform((v) => v ?? ""),
    node_4_name: looseString.nullish().transform((v) => v ?? ""),
    node_5_name: looseString.nullish().transform((v) => v ?? ""),
    node_6_name: looseString.nullish().transform((v) => v ?? ""),
    node_7_name: looseString.nullish().transform((v) => v ?? ""),
    node_8_name: looseString.nullish().transform((v) => v ?? ""),
    node_9_name: looseString.nullish().transform((v) => v ?? ""),
    node_10_name: looseString.nullish().transform((v) => v ?? ""),
    node_11_name: looseString.nullish().transform((v) => v ?? ""),
    node_12_name: looseString.nullish().transform((v) => v ?? ""),
    node_13_name: looseString.nullish().transform((v) => v ?? ""),
    node_14_name: looseString.nullish().transform((v) => v ?? ""),
    node_15_name: looseString.nullish().transform((v) => v ?? ""),
    node_16_name: looseString.nullish().transform((v) => v ?? ""),
    node_17_name: looseString.nullish().transform((v) => v ?? ""),
    node_18_name: looseString.nullish().transform((v) => v ?? ""),
    node_19_name: looseString.nullish().transform((v) => v ?? ""),
    node_20_name: looseString.nullish().transform((v) => v ?? ""),
    /**
     * 后端下发的首页延迟窗口口径：`points`=柱子格数、`hours`=窗口跨度（小时）。
     * 后端后加的字段，老后端 / 还没上线时缺席 —— 前端据 `hours` 定跨度，缺席就回退到
     * 「从数据时间戳自推」（见 usePingOverview 的 buildPingBuckets）。`points` 暂不驱动格数。
     */
    latency_window: z
      .object({
        points: looseNumber.optional(),
        hours: looseNumber.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type SiteConfig = z.output<typeof SiteConfigSchema>;

/** `/api/history/all` 的一行；字段随后端列定义，缺失时按 0 处理。 */
export const HistoryRowSchema = z
  .object({
    timestamp: looseNumber.default(0),
    cpu: looseNumber.default(0),
    gpu_info: z.unknown().optional(),
    ram_total: looseNumber.default(0),
    ram_used: looseNumber.default(0),
    swap_total: looseNumber.default(0),
    swap_used: looseNumber.default(0),
    disk_total: looseNumber.default(0),
    disk_used: looseNumber.default(0),
    disk: DiskIoSchema.optional(),
    disk_read_bps: looseNumber.optional(),
    disk_write_bps: looseNumber.optional(),
    disk_read_iops: looseNumber.optional(),
    disk_write_iops: looseNumber.optional(),
    disk_await_ms: looseNumber.optional(),
    disk_util: looseNumber.optional(),
    processes: looseNumber.default(0),
    net_in_speed: looseNumber.default(0),
    net_out_speed: looseNumber.default(0),
    tcp_conn: looseNumber.default(0),
    udp_conn: looseNumber.default(0),
    ping_ct: nullableNumber,
    ping_cu: nullableNumber,
    ping_cm: nullableNumber,
    ping_bd: nullableNumber,
    ping_node_1: nullableNumber,
    ping_node_2: nullableNumber,
    ping_node_3: nullableNumber,
    ping_node_4: nullableNumber,
    ping_node_5: nullableNumber,
    ping_node_6: nullableNumber,
    ping_node_7: nullableNumber,
    ping_node_8: nullableNumber,
    ping_node_9: nullableNumber,
    ping_node_10: nullableNumber,
    ping_node_11: nullableNumber,
    ping_node_12: nullableNumber,
    ping_node_13: nullableNumber,
    ping_node_14: nullableNumber,
    ping_node_15: nullableNumber,
    ping_node_16: nullableNumber,
    ping_node_17: nullableNumber,
    ping_node_18: nullableNumber,
    ping_node_19: nullableNumber,
    ping_node_20: nullableNumber,
    loss_ct: nullableNumber,
    loss_cu: nullableNumber,
    loss_cm: nullableNumber,
    loss_bd: nullableNumber,
    loss_node_1: nullableNumber,
    loss_node_2: nullableNumber,
    loss_node_3: nullableNumber,
    loss_node_4: nullableNumber,
    loss_node_5: nullableNumber,
    loss_node_6: nullableNumber,
    loss_node_7: nullableNumber,
    loss_node_8: nullableNumber,
    loss_node_9: nullableNumber,
    loss_node_10: nullableNumber,
    loss_node_11: nullableNumber,
    loss_node_12: nullableNumber,
    loss_node_13: nullableNumber,
    loss_node_14: nullableNumber,
    loss_node_15: nullableNumber,
    loss_node_16: nullableNumber,
    loss_node_17: nullableNumber,
    loss_node_18: nullableNumber,
    loss_node_19: nullableNumber,
    loss_node_20: nullableNumber,
    /**
     * ProbeDeck 把扩展槽数值同时塞进这个 JSON 字符串（键名就是扁平列名）；
     * 扁平列缺席（被裁剪 / 老版本）时用它兜底，见 mappers 的 `flattenExtraProbes`。
     */
    extra_probes: looseString.default(""),
    load_avg: looseString.default(""),
    kernel_version: looseString.default(""),
  })
  .passthrough();

export type HistoryRow = z.output<typeof HistoryRowSchema>;

/* ------------------------------------------------------------------ *
 * 展示模型
 * ------------------------------------------------------------------ */

/** 节点静态信息。字节口径已在 mapper 中统一换算，UI 层不再关心后端单位。 */
export interface NodeInfo {
  uuid: string;
  name: string;
  group: string;
  region: string;
  hidden: boolean;
  cpu_name: string;
  cpu_cores: number;
  arch: string;
  os: string;
  kernel_version: string;
  gpu_name: string;
  mem_total: number;
  swap_total: number;
  disk_total: number;
  weight: number;
  price: number;
  billing_cycle: string;
  auto_renewal: boolean;
  currency: string;
  expired_at: string;
  tags: string;
  public_remark: string;
  /** 流量配额，字节；0 表示不限。 */
  traffic_limit: number;
  /** 归一化后的配额口径：sum / up / down / max。 */
  traffic_limit_type: string;
  /** 每月流量重置日（1–31），0 表示未设置。 */
  traffic_reset_day: number;
  /** 探针上报间隔，秒。 */
  report_interval: number;
  agent_version: string;
  /** CF-Server-Monitor 只下发可达性，不下发具体地址。 */
  ipv4: string;
  ipv6: string;
  created_at: string;
  updated_at: string;
}

/** 节点实时指标。所有容量字段为字节，速率为字节/秒。 */
export interface NodeMetrics {
  online: boolean | null;
  cpuPct: number;
  ramUsed: number;
  ramTotal: number;
  ramPct: number;
  swapUsed: number;
  swapTotal: number;
  diskUsed: number;
  diskTotal: number;
  diskPct: number;
  netUp: number;
  netDown: number;
  /** 累计上/下行（探针生命周期）。 */
  trafficUp: number;
  trafficDown: number;
  /** 本计费周期内的上/下行，配额进度以此为准。 */
  trafficUpMonthly: number;
  trafficDownMonthly: number;
  uptime: number;
  load1: number;
  load5: number;
  load15: number;
  process: number;
  connectionsTcp: number;
  connectionsUdp: number;
  gpuPct: number;
  gpuName: string;
  diskIo: DiskIo | null;
  /** 各线路实时延迟/丢包（见 CARRIER_KEYS），缺测为 null。 */
  ping: CarrierPingSnapshot;
  updatedAt: number;
}

/**
 * 后端探测线路的 key，**顺序即线路顺序**（对应 task id 1..N）。
 *
 * 后端 2.8.5 Beta4 起从四条加到八条：原来的电信/联通/移动/BGP 之外多了四个自定义槽位
 * （`/api/servers` 的 `ping_node_1..4`、窗口点里的 `node_1..4`、名字在 `/api/config` 的
 * `node_1_name..node_4_name`）。
 *
 * **ProbeDeck（CF-Server-Monitor 2.13+）把槽位扩到 24 个**：前 8 槽语义不变（站点级默认目标、
 * 有值就收），`node_5..node_20` 是逐机的扩展槽 —— 面板把「已启用」的槽位放进 `servers[].probes[]`，
 * 名字也随之下发到服务器对象（`node_5_name..node_20_name`），扩展槽**只认 `probes[]`**
 * （历史数值会残留到探针下次上报，不能按「有值」判断）。判定与名字回退见
 * `services/cfsm/probes.ts`。
 *
 * **以后再加线路只改这张表**——线路名、快照类型、窗口解析、紧凑存储、设置页的选项和上限
 * 全部由它推导（上限那条有 `pingTasks.test.ts` 的断言钉着）。
 */
export const CARRIER_KEYS = [
  "ct",
  "cu",
  "cm",
  "bd",
  "node_1",
  "node_2",
  "node_3",
  "node_4",
  "node_5",
  "node_6",
  "node_7",
  "node_8",
  "node_9",
  "node_10",
  "node_11",
  "node_12",
  "node_13",
  "node_14",
  "node_15",
  "node_16",
  "node_17",
  "node_18",
  "node_19",
  "node_20",
] as const;

export type CarrierKey = (typeof CARRIER_KEYS)[number];

/**
 * 快照里丢包字段的名字。原来四条是手写的 camelCase（`lossCt`…），新加的沿用同一风格；
 * 单独一张表而不是模板字面量，是为了不动既有字段名（改名会波及一大片消费端与测试）。
 */
export const CARRIER_LOSS_KEYS = {
  ct: "lossCt",
  cu: "lossCu",
  cm: "lossCm",
  bd: "lossBd",
  node_1: "lossNode1",
  node_2: "lossNode2",
  node_3: "lossNode3",
  node_4: "lossNode4",
  node_5: "lossNode5",
  node_6: "lossNode6",
  node_7: "lossNode7",
  node_8: "lossNode8",
  node_9: "lossNode9",
  node_10: "lossNode10",
  node_11: "lossNode11",
  node_12: "lossNode12",
  node_13: "lossNode13",
  node_14: "lossNode14",
  node_15: "lossNode15",
  node_16: "lossNode16",
  node_17: "lossNode17",
  node_18: "lossNode18",
  node_19: "lossNode19",
  node_20: "lossNode20",
} as const satisfies Record<CarrierKey, string>;

export type CarrierLossKey = (typeof CARRIER_LOSS_KEYS)[CarrierKey];

/**
 * 线路的显示名。id / key 由后端固定，只有名字可由站长改（`/api/config` 的
 * `custom_*_name` 与 `node_N_name`），默认名与归一化逻辑在 `services/cfsm/mappers` 的
 * `DEFAULT_CARRIER_NAMES` / `resolveCarrierNames`。
 */
export type CarrierNames = Record<CarrierKey, string>;

export type CarrierPingSnapshot = Record<CarrierKey, number | null> &
  Record<CarrierLossKey, number | null>;

export const EMPTY_CARRIER_PING: CarrierPingSnapshot = Object.freeze(
  Object.fromEntries([
    ...CARRIER_KEYS.map((key) => [key, null]),
    ...CARRIER_KEYS.map((key) => [CARRIER_LOSS_KEYS[key], null]),
  ]),
) as CarrierPingSnapshot;

export interface ThemeSettings {
  defaultAppearance?: "system" | "light" | "dark";
  desktopNodeViewMode?: "large" | "compact" | "mini" | "list";
  mobileNodeViewMode?: "large" | "compact" | "mini" | "list";
  enableAdminButton?: boolean;
  showPingChart?: boolean;
  homepagePingBindings?: Record<string, string[]>;
  homepageDefaultPingTaskId?: number;
  enableHomepageMultiPing?: boolean;
  homepageMultiPingTaskIds?: number[];
  /** 站长在卡片上换好、「保存到后端」写上来的逐节点换线：`{ uuid: { 行号: 线路 id } }`。 */
  homepagePingLineOverrides?: Record<string, Record<string, number>>;
  fakePingForUnbound?: boolean;
  showHomeOverview?: boolean;
  showGroupTabs?: boolean;
  showRegionBar?: boolean;
  showCardGroup?: boolean;
  homeGroupOrder?: string[];
  enableHomeSort?: boolean;
  homeSortField?: "default" | "name" | "speed" | "traffic" | "price";
  homeSortDirection?: "asc" | "desc";
  showCostSummary?: boolean;
  showCostSummaryFloatingButton?: boolean;
  showOverviewRatings?: boolean;
  showBandwidthRating?: boolean;
  showAssetRating?: boolean;
  bandwidthRatingLabels?: string;
  assetRatingLabels?: string;
  compactShowTrafficTotal?: boolean;
  compactShowBilling?: boolean;
  compactShowUptime?: boolean;
  showConnections?: boolean;
  hiddenNodes?: string[];
  costIgnoredNodes?: string[];
  // 值支持旧版纯数字(自动升格)或 { amount, paidCny?, acquiredAt? } 条目,见 normalizeCostPremiums。
  costPremiums?: Record<
    string,
    number | { amount?: number; paidCny?: number; acquiredAt?: string }
  >;
  costRateApiUrl?: string;
  surfaceOpacity?: number;
  enableBackgroundImage?: boolean;
  backgroundMediaType?: "image" | "video";
  backgroundImage?: string;
  backgroundImageMobile?: string;
  backgroundVideo?: string;
  backgroundVideoDark?: string;
  showPriceForGuests?: boolean;
}

/** 图表用的一行历史负载记录，单位与 NodeMetrics 一致。 */
export interface LoadRecord {
  cpu: number;
  gpu: number;
  ram: number;
  ram_total: number;
  swap: number;
  swap_total: number;
  load: number;
  temp: number;
  disk: number;
  disk_total: number;
  /** 磁盘 IO 速率（字节/秒）。旧探针/旧后端不下发时为 null —— 0 表示真的没有读写。 */
  disk_read: number | null;
  disk_write: number | null;
  net_in: number;
  net_out: number;
  /** CF-Server-Monitor 历史不保存累计流量，恒为 0。 */
  net_total_up: number;
  net_total_down: number;
  process: number;
  connections: number;
  connections_udp: number;
  time: number;
  client: string;
}

export interface LoadRecordsResponse {
  count: number;
  records: LoadRecord[];
  rangeStartMs?: number;
  rangeEndMs?: number;
  intervalSeconds?: number;
}

export interface PingRecord {
  task_id: number;
  time: number;
  value: number;
  client: string;
  count?: number;
  loss?: number | null;
}

export interface PingTask {
  id: number;
  interval: number;
  name: string;
  loss: number;
  clients: string[];
  type: string;
  target: string;
  weight: number;
}

export interface PingRecordsResponse {
  count: number;
  records: PingRecord[];
  tasks: PingTask[];
  intervalSeconds?: number;
  rangeStartMs?: number;
  rangeEndMs?: number;
  stats?: PingTaskStats[];
}

export interface PingTaskStats {
  client: string;
  taskId: number;
  name: string;
  type: string;
  interval: number;
  total: number;
  valid: number;
  loss: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  latest: number | null;
  p50: number | null;
  p99: number | null;
  stddev: number | null;
  p99P50Ratio: number;
}

export type PingOverviewTaskLoadState = "pending" | "ready" | "error";

export interface PingOverviewItem {
  client: string;
  isAssigned: boolean;
  /** 当前任务本轮请求状态；模拟 Ping 不设置此字段。 */
  loadState?: PingOverviewTaskLoadState;
  lastValue: number | null;
  /** 聚合桶的真实宽度。 */
  metricIntervalMs?: number;
  samples: Array<{
    time: number;
    value: number;
    count?: number;
    loss?: number | null;
  }>;
  /**
   * 明确「测过但没有值」的时间点。
   *
   * 后端一小时窗口会为没测到的槽位下发 null，这些点必须和「后端压根没给点」区分开：
   * 前者是真的空档，要留空；后者（例如窗口最新一格不在 2 分钟网格上）应该由上一个
   * 样本延续过去，否则图表会凭空缺一格。
   */
  emptyTimes?: number[];
  max: number;
  loss: number | null;
}

export interface HomepagePingLine extends PingOverviewItem {
  taskId: number;
  taskName: string;
}

export interface HomepagePingDisplayLine extends HomepagePingLine {
  buckets: PingOverviewBucket[];
}

export interface TrafficTrendSample {
  value: number;
  level: number;
  opacity: number;
}

export interface PingOverviewBucket {
  index: number;
  value: number | null;
  loss: number | null;
  total: number;
  lost: number;
  startAt: number | null;
  endAt: number | null;
  /** 整格都落在节点掉线之后：柱子涂红，而不是当成「没采到」的空格。 */
  offline?: boolean;
}

/** 登录态。CF-Server-Monitor 没有 /api/me，由 /api/config 的 authorization 推导。 */
export interface Me {
  logged_in: boolean;
  username: string;
  uuid: string;
}

/** 站点配置的展示模型，字段名沿用主题内既有约定。 */
export interface PublicConfig {
  sitename: string;
  description: string;
  version: string;
  latestVersion: string;
  private_site: boolean;
  turnstile_enabled: boolean;
  turnstile_site_key: string;
  verified: boolean;
  theme_settings: Record<string, unknown>;
  sys: SysConfig;
  /** 后端下发的首页延迟窗口口径；缺席时前端从数据自推跨度。见 `SiteConfigSchema.latency_window`。 */
  latencyWindow?: { points?: number; hours?: number };
  /** 单次实时连接的时长上限（分钟，0 = 不限）。见 `SiteConfigSchema.frontend_ws_timeout_minutes`。 */
  frontendWsTimeoutMinutes?: number;
  /** 未登录访客的历史窗口上限（小时）。见 `SiteConfigSchema.public_history_hours`。 */
  publicHistoryHours: number;
  /** 在线判定阈值（毫秒）。见 `SiteConfigSchema.online_threshold_seconds`。 */
  onlineThresholdMs: number;
  /** 后台「默认外观」换算成主题的外观值；老后端不下发时缺席。见 `resolvePreferredAppearance`。 */
  preferredAppearance?: "system" | "light" | "dark";
  /**
   * 各条线路的显示名：后端 `custom_*_name` / `node_N_name` 逐条覆盖，缺的沿用主题默认名。
   * 后端没下发任何一条时是 `DEFAULT_CARRIER_NAMES` 那个常量本身（引用稳定）。
   */
  carrierNames: CarrierNames;
}

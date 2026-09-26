import { describe, expect, it } from "vitest";
import {
  carrierNameField,
  isExtensionSlot,
  resolveServerCarrierNames,
  resolveVisibleCarrierTasks,
  serverHasCarrierValue,
  serverProbeIds,
} from "@/services/cfsm/probes";
import { DEFAULT_CARRIER_NAMES, resolveCarrierNames } from "@/services/cfsm/mappers";
import type { CfsmServer } from "@/types/cfsm";

/**
 * 造一台「原样形状」的服务器对象：这里只关心探测槽位相关的字段，
 * 其余字段补上 schema 的默认值即可（判定逻辑不读它们）。
 */
function server(overrides: Record<string, unknown> = {}): CfsmServer {
  return {
    id: "node-a",
    name: "测试机",
    ...overrides,
  } as unknown as CfsmServer;
}

describe("isExtensionSlot", () => {
  it("treats node_5..node_20 as extension slots only", () => {
    expect(isExtensionSlot("node_5")).toBe(true);
    expect(isExtensionSlot("node_20")).toBe(true);
    expect(isExtensionSlot("node_4")).toBe(false);
    expect(isExtensionSlot("node_21" as never)).toBe(false);
    expect(isExtensionSlot("ct")).toBe(false);
  });
});

describe("carrierNameField", () => {
  it("maps the first four to custom_*_name and the rest to node_N_name", () => {
    expect(carrierNameField("ct")).toBe("custom_ct_name");
    expect(carrierNameField("bd")).toBe("custom_bd_name");
    expect(carrierNameField("node_1")).toBe("node_1_name");
    expect(carrierNameField("node_20")).toBe("node_20_name");
  });
});

describe("serverProbeIds", () => {
  it("is null when the backend does not send probes at all", () => {
    // 老后端：可见性未知，调用方退回「按观测到的数据过滤」。
    expect(serverProbeIds(server())).toBeNull();
    expect(serverProbeIds(null)).toBeNull();
  });

  it("collects the ids of an empty list into an empty set", () => {
    // 新后端但一个扩展槽都没启用：空集合（而不是 null）—— 扩展槽一条都不画。
    expect(serverProbeIds(server({ probes: [] }))?.size).toBe(0);
  });
});

describe("serverHasCarrierValue", () => {
  it("counts either the ping or the loss column", () => {
    expect(serverHasCarrierValue(server({ ping_node_5: 40 }), "node_5")).toBe(true);
    expect(serverHasCarrierValue(server({ loss_node_5: 0 }), "node_5")).toBe(true);
    expect(serverHasCarrierValue(server({ ping_node_5: null }), "node_5")).toBe(false);
    expect(serverHasCarrierValue(server(), "node_5")).toBe(false);
  });
});

describe("resolveVisibleCarrierTasks", () => {
  it("returns null on backends without the probes field", () => {
    expect(resolveVisibleCarrierTasks(server({ ping_ct: 12 }))).toBeNull();
  });

  it("keeps the first eight slots by value and the extension slots by probes only", () => {
    const tasks = resolveVisibleCarrierTasks(
      server({
        ping_ct: 12,
        ping_node_4: 30,
        // 已删掉的扩展槽：历史数值还在，但不在 probes[] 里 → 不画。
        ping_node_5: 44,
        probes: [{ id: "node_6", name: "广移", ping: 12 }],
      }),
    );

    expect(tasks?.map((task) => task.key)).toEqual(["ct", "node_4", "node_6"]);
  });

  it("keeps a first-eight slot listed in probes even before it has a value", () => {
    const tasks = resolveVisibleCarrierTasks(
      server({ probes: [{ id: "node_2", name: "东京" }] }),
    );

    expect(tasks?.map((task) => task.key)).toEqual(["node_2"]);
  });

  it("returns an empty list when nothing is configured", () => {
    expect(resolveVisibleCarrierTasks(server({ probes: [] }))).toEqual([]);
  });
});

describe("resolveServerCarrierNames", () => {
  it("returns the site names object itself when the server adds nothing", () => {
    const site = resolveCarrierNames({ ct: "CT" });
    expect(resolveServerCarrierNames(server(), site)).toBe(site);
    expect(resolveServerCarrierNames(null, site)).toBe(site);
  });

  it("prefers probes[].name, then the server's node_N_name, then the site name", () => {
    const site = resolveCarrierNames({ ct: "CT", node_1: "站点一号" });
    const names = resolveServerCarrierNames(
      server({
        // 三条来源各覆盖一条：扩展槽（只有 probes 里有名字）、逐机名、站点名。
        probes: [{ id: "node_5", name: "广移" }],
        node_5_name: "被 probes 压过的名字",
        node_1_name: "逐机一号",
        custom_ct_name: "  ",
      }),
      site,
    );

    expect(names.node_5).toBe("广移");
    expect(names.node_1).toBe("逐机一号");
    expect(names.ct).toBe("CT");
    expect(names.node_20).toBe(DEFAULT_CARRIER_NAMES.node_20);
  });
});

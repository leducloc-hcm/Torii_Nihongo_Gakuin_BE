import { Logger } from "@nestjs/common";
import { ClaudeTool } from "src/mcp-client/mcp.model";
import { AgentRole } from "src/mcp-client/shared/agent-routing.utils";

export interface ToolRegistryItem {
  serverKey: string;
  serverUrl: string;
  tool: ClaudeTool;
}

export interface RoleServerPolicy {
  allowedServers: string[];
  fallbackServers: string[];
}

export function selectToolsForRoles(
  allTools: ClaudeTool[],
  toolRegistry: ToolRegistryItem[],
  roleServerPolicies: Record<AgentRole, RoleServerPolicy>,
  primaryRole?: AgentRole,
  collaboratorRoles: AgentRole[] = [],
  logger?: Logger,
): ClaudeTool[] {
  if (!primaryRole && collaboratorRoles.length === 0) {
    return allTools;
  }

  const targetRoles = [primaryRole, ...collaboratorRoles].filter(
    (role): role is AgentRole => !!role,
  );

  const allowedServers = new Set<string>();
  const fallbackServers = new Set<string>();

  for (const role of targetRoles) {
    const policy = roleServerPolicies[role];
    if (!policy) {
      continue;
    }

    for (const server of policy.allowedServers) {
      allowedServers.add(server);
    }

    for (const server of policy.fallbackServers) {
      fallbackServers.add(server);
    }
  }

  if (allowedServers.size === 0 && fallbackServers.size === 0) {
    return allTools;
  }

  const allowedTools = toolRegistry
    .filter((item) => allowedServers.has(item.serverKey))
    .map((item) => item.tool);

  const fallbackTools = toolRegistry
    .filter((item) => fallbackServers.has(item.serverKey))
    .map((item) => item.tool);

  const seenToolNames = new Set<string>();
  const filteredTools = [...allowedTools, ...fallbackTools].filter((tool) => {
    if (seenToolNames.has(tool.name)) {
      return false;
    }

    seenToolNames.add(tool.name);
    return true;
  });

  if (filteredTools.length === 0) {
    logger?.warn(
      `No server-policy tools matched for roles [${targetRoles.join(", ")}]. Falling back to full toolset (${allTools.length} tools).`,
    );
    return allTools;
  }

  logger?.log(
    `Primary role ${primaryRole || "N/A"} with collaborators [${collaboratorRoles.join(", ") || "none"}] using ${filteredTools.length}/${allTools.length} tools.`,
  );

  return filteredTools;
}

import {
  QueryType,
  detectMultiToolRequirement,
} from "src/mcp-client/shared/query-detection.utils";

export enum AgentRole {
  SENSEI = "SENSEI",
  ASSESSMENT = "ASSESSMENT",
  ANALYTICS = "ANALYTICS",
}

export interface AgentRoutingDecision {
  primaryRole: AgentRole;
  collaboratorRoles: AgentRole[];
  forceTools: boolean;
  reason: string;
}

const ROLE_PRIORITY: AgentRole[] = [
  AgentRole.ASSESSMENT,
  AgentRole.ANALYTICS,
  AgentRole.SENSEI,
];

function uniqueRoles(roles: AgentRole[]): AgentRole[] {
  return [...new Set(roles)];
}

function roleForQueryType(queryType: QueryType): AgentRole {
  if (
    queryType === QueryType.ASSESSMENT ||
    queryType === QueryType.ASSESSMENT_HISTORY
  ) {
    return AgentRole.ASSESSMENT;
  }

  if (queryType === QueryType.ENROLLMENT || queryType === QueryType.PROGRESS) {
    return AgentRole.ANALYTICS;
  }

  if (queryType === QueryType.GRAMMAR || queryType === QueryType.TRANSLATION) {
    return AgentRole.SENSEI;
  }

  return AgentRole.SENSEI;
}

function pickPrimaryRole(roles: AgentRole[]): AgentRole {
  for (const priorityRole of ROLE_PRIORITY) {
    if (roles.includes(priorityRole)) {
      return priorityRole;
    }
  }

  return AgentRole.SENSEI;
}

export function routeAgentForQuery(
  queryType: QueryType,
  query: string,
): AgentRoutingDecision {
  const baseRole = roleForQueryType(queryType);
  const multiTool = detectMultiToolRequirement(query);

  const candidateRoles: AgentRole[] = [baseRole];

  if (multiTool.requiresAssessment) {
    candidateRoles.push(AgentRole.ASSESSMENT);
  }

  if (
    multiTool.requiresCourse ||
    multiTool.requiresLesson ||
    multiTool.requiresFlashcard ||
    multiTool.requiresBlog
  ) {
    candidateRoles.push(AgentRole.SENSEI);
  }

  // Only push ANALYTICS for explicit enrollment/progress queries.
  // Do NOT push ANALYTICS just because requiresCourse=true — that would
  // make ANALYTICS the primary (higher ROLE_PRIORITY than SENSEI) for plain
  // COURSE/LESSON/BLOG/FLASHCARD queries, which gives Claude the wrong
  // system prompt ("learning analyst" instead of "tutor").
  if (queryType === QueryType.ENROLLMENT || queryType === QueryType.PROGRESS) {
    candidateRoles.push(AgentRole.ANALYTICS);
  }

  const uniqueCandidateRoles = uniqueRoles(candidateRoles);

  // Keep SENSEI as primary for all SENSEI-native query types.
  // Without this guard, ROLE_PRIORITY would promote ANALYTICS/ASSESSMENT
  // even for pure COURSE/BLOG/FLASHCARD/GRAMMAR/TRANSLATION queries.
  const isSenseiNative =
    baseRole === AgentRole.SENSEI &&
    queryType !== QueryType.ENROLLMENT &&
    queryType !== QueryType.PROGRESS;

  const primaryRole = isSenseiNative
    ? AgentRole.SENSEI
    : pickPrimaryRole(uniqueCandidateRoles);

  const collaboratorRoles = uniqueCandidateRoles.filter(
    (role) => role !== primaryRole,
  );

  const forceTools =
    queryType === QueryType.ASSESSMENT_HISTORY ||
    queryType === QueryType.ENROLLMENT ||
    queryType === QueryType.PROGRESS ||
    queryType === QueryType.GRAMMAR ||
    queryType === QueryType.TRANSLATION ||
    queryType === QueryType.COURSE ||
    queryType === QueryType.BLOG ||
    queryType === QueryType.ASSESSMENT ||
    (queryType === QueryType.FLASHCARD &&
      /tạo|create|generate|make|作成|生成/i.test(query));

  const reasonParts = [
    `Primary role selected by queryType=${queryType}: ${baseRole}`,
    multiTool.toolCategories.length > 1
      ? `Multi-domain query detected (${multiTool.toolCategories.join(", ")})`
      : "Single-domain query",
    collaboratorRoles.length > 0
      ? `Collaborators: ${collaboratorRoles.join(", ")}`
      : "No collaborator role needed",
  ];

  return {
    primaryRole,
    collaboratorRoles,
    forceTools,
    reason: reasonParts.join(" | "),
  };
}

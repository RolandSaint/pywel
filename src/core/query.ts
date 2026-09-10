import { canonicalJson } from "./canonical-json.js";
import type {
  Claim,
  Entity,
  Evidence,
  EvidencePacket,
  KnowledgeStore,
  Platform,
  SpoilerLevel,
  Strategy,
  Validity,
} from "./types.js";
import { comparePatchVersions, latestPatch, patchInRange } from "./version.js";

const SPOILER_ORDER: Record<SpoilerLevel, number> = {
  none: 0,
  discovery: 1,
  quest_minor: 2,
  quest_major: 3,
  ending: 4,
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "the",
  "to",
  "what",
  "when",
  "who",
  "with",
]);

export interface QueryContext {
  patch?: string | null;
  platform?: Platform;
  locale?: string;
  spoilerCeiling?: SpoilerLevel;
  includeRetracted?: boolean;
  includeSuperseded?: boolean;
}

export interface ResolvedQueryContext {
  patch: string | null;
  platform: Platform;
  locale: string;
  spoilerCeiling: SpoilerLevel;
  includeRetracted: boolean;
  includeSuperseded: boolean;
  usedLatestPatchDefault: boolean;
}

export interface KnowledgeSearchHit {
  kind: "entity" | "claim" | "strategy";
  id: string;
  score: number;
  title: string;
  snippet: string;
  entity_id: string | null;
  canonical_path: string;
  patch: string | null;
  status: string;
}

export interface KnowledgeRelationshipGraph {
  schema_version: "pywel.relationship_graph.v1";
  root_entity_id: string;
  depth: number;
  nodes: Entity[];
  edges: Array<{
    claim_id: string;
    subject_entity_id: string;
    predicate: string;
    object_entity_id: string;
    status: Claim["status"];
    confidence: number;
    evidence_ids: string[];
    validity: Validity;
  }>;
  truncated: boolean;
}

function tokenize(input: string): string[] {
  return [
    ...new Set(
      input
        .normalize("NFKC")
        .toLocaleLowerCase("en-US")
        .replaceAll(/[^a-z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
    ),
  ];
}

function searchableEntityText(entity: Entity): string {
  return [
    entity.slug,
    entity.canonical_name.text,
    entity.summary,
    ...entity.aliases.map((alias) => alias.text),
    ...entity.tags,
  ]
    .join(" ")
    .toLocaleLowerCase("en-US");
}

function searchableEntityIdentityText(entity: Entity): string {
  return [entity.slug, entity.canonical_name.text, ...entity.aliases.map((alias) => alias.text)]
    .join(" ")
    .toLocaleLowerCase("en-US");
}

function normalizedPhrase(input: string): string {
  return input
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

function explicitPatchVersion(query: string): string | undefined {
  const match = /\bpatch(?:\s+version)?\s+v?([0-9]+(?:[._-][0-9]+){1,3})\b/i.exec(query);
  return match?.[1]?.replaceAll(/[ _-]/g, ".");
}

function containsRoleInstructionMarkup(query: string): boolean {
  return /<\s*\/?\s*(?:system|developer|assistant|tool|user)(?:\s|>)/i.test(query) ||
    /^\s*(?:system|developer|assistant|tool)\s*:/im.test(query);
}

function queryIntentAliases(query: string): string[] {
  const normalized = normalizedPhrase(query);
  const aliases = new Set<string>();
  if (
    /\b(where|how)\b.*\b(get|find|obtain|acquire)\b/.test(normalized) ||
    /\b(get|find|obtain|acquire)\b.*\b(where|how)\b/.test(normalized)
  ) {
    aliases.add("acquisition");
    aliases.add("obtained");
  }
  if (/\b(buy|purchase|purchased|vendor|shop)\b/.test(normalized)) {
    aliases.add("acquisition");
    aliases.add("obtained");
    aliases.add("vendor");
  }
  if (/\bwhat\b.*\bdoes\b|\b(effect|effects|stat|stats|bonus|bonuses)\b/.test(normalized)) {
    aliases.add("effect");
    aliases.add("summary");
  }
  if (hasEntityUseIntent(normalized) || hasItemInteractionIntent(normalized)) {
    aliases.add("effect");
    aliases.add("summary");
    aliases.add("required");
  }
  if (/\b(craft|crafted|crafting|recipe|recipes|ingredient|ingredients|material|materials)\b/.test(normalized)) {
    aliases.add("crafted");
    aliases.add("recipe");
  }
  if (/\b(require|requires|required|requirement|requirements|equip|equipped|socket|socketed|slot|slots|compatible|compatibility)\b/.test(normalized)) {
    aliases.add("requirement");
  }
  if (/\b(dye|dyed|dyeable|dyeing|color|colour)\b/.test(normalized)) {
    aliases.add("dye");
  }
  if (/\b(selector|selectors|dye parts?|color parts?|colour parts?)\b/.test(normalized)) {
    aliases.add("selector");
  }
  if (
    /\b(what|which|change|changes|control|controls|affect|affects)\b/.test(normalized) &&
    (
      /\bpart\s+\d+\b/.test(normalized) ||
      (/\b(dye|color|colour)\b/.test(normalized) && /\bparts?\b/.test(normalized))
    )
  ) {
    aliases.add("dye");
    aliases.add("selector");
    aliases.add("map");
  }
  if (/\b(how many|count|number of)\b/.test(normalized)) {
    aliases.add("count");
  }
  if (/\b(reward|rewards|rewarded|earn|earned)\b/.test(normalized)) {
    aliases.add("reward");
  }
  if (
    /\b(?:missing|unavailable|unresponsive|not responding|does not respond|stuck|bugged)\b/.test(normalized) &&
    /\b(?:quest|request|commission|mission)\b/.test(normalized)
  ) {
    aliases.add("availability");
    aliases.add("objective");
  }
  if (hasSolutionIntent(normalized)) {
    aliases.add("solution");
    aliases.add("objective");
    aliases.add("sequence");
    aliases.add("route");
  }
  if (/\bwhere\b/.test(normalized) || /\b(located|location|route|reach)\b/.test(normalized)) {
    aliases.add("location");
    aliases.add("route");
  }
  if (/\b(drop rate|drop chance|chance to drop|probability of drops?)\b/.test(normalized)) {
    aliases.add("drop");
    aliases.add("rate");
    aliases.add("chance");
  }
  if (/^(?:what|who)\s+(?:is|are)\b/.test(normalized) || /^explain\b/.test(normalized)) {
    aliases.add("purpose");
    aliases.add("description");
    aliases.add("summary");
    aliases.add("category");
  }
  if (/\b(can|supported|available|dyeable)\b/.test(normalized) && /\b(dye|dyed|dyeable|dyeing|color|colour)\b/.test(normalized)) {
    aliases.add("supported");
  }
  return [...aliases];
}

interface RequestedFactIntent {
  code:
    | "quest_reward"
    | "entity_location"
    | "drop_rate"
    | "entity_definition"
    | "entity_classification"
    | "controller_remapping"
    | "item_acquisition"
    | "item_interaction"
    | "entity_use"
    | "crafting_recipe"
    | "recipe_ingredients"
    | "prerequisite"
    | "ability_cost"
    | "unlock_condition"
    | "patch_history"
    | "quest_objective"
    | "quest_sequence"
    | "quest_availability"
    | "solution"
    | "vendor_availability";
  label: string;
}

const ITEM_ACQUISITION_AFTER_WHERE_OR_HOW = /\b(?:where|how)(?:\s+[a-z0-9]+){0,5}\s+(?:get|find|obtain|acquire)\b/;
const WHERE_OR_HOW_AFTER_ITEM_ACQUISITION = /\b(?:get|find|obtain|acquire)(?:\s+[a-z0-9]+){0,5}\s+(?:where|how)\b/;

function hasItemAcquisitionIntent(normalized: string): boolean {
  return ITEM_ACQUISITION_AFTER_WHERE_OR_HOW.test(normalized) ||
    WHERE_OR_HOW_AFTER_ITEM_ACQUISITION.test(normalized);
}

function hasEntityUseIntent(normalized: string): boolean {
  return /\b(?:use|used|uses|using)\b.*\bfor\b/.test(normalized) ||
    /\bwhat\b.*\b(?:use|used|uses)\b/.test(normalized) ||
    /\bwhat does\b.*\bdo(?:\s*(?:$|\?)|\s+and\b)/.test(normalized) ||
    /\b(effect|effects|stat|stats|bonus|bonuses)\b/.test(normalized);
}

function hasItemInteractionIntent(normalized: string): boolean {
  return /\bhow(?:\s+[a-z0-9]+){0,10}\s+(?:activate|consume|examine|inspect|open|read)\b/.test(normalized) ||
    (
      /\b(?:document|inventory|quest item)\b/.test(normalized) &&
      /\b(?:cannot|cant|find|hidden|locate|missing|stuck)\b/.test(normalized)
    );
}

function hasPrerequisiteIntent(normalized: string): boolean {
  return /\b(?:prerequisite|prerequisites|require|requires|required|requirement|requirements|need|needs|needed)\b/.test(normalized);
}

function hasExplicitPrerequisiteIntent(normalized: string): boolean {
  return /\b(?:prerequisite|prerequisites|require|requires|required|requirement|requirements|before)\b/.test(normalized);
}

function hasQuestObjectiveIntent(normalized: string): boolean {
  return /\b(?:objective|objectives|step|steps|deliver|delivers|delivered|turn in|turned in|hand in|handed in)\b/.test(normalized) ||
    /\bhow(?:\s+[a-z0-9]+){0,6}\s+(?:cook|make|prepare)(?:\s+[a-z0-9]+){0,8}\s+for\b/.test(normalized) ||
    /\bhow(?:\s+[a-z0-9]+){0,6}\s+(?:bring|deliver|give|hand)(?:\s+[a-z0-9]+){0,8}\s+to\b/.test(normalized) ||
    (
      /\b(?:quest|request|commission|mission)\b/.test(normalized) &&
      /\bhow(?:\s+[a-z0-9]+){0,6}\s+(?:catch|chop|collect|cook|defeat|deliver|equip|find|fish|gather|give|hand|harvest|make|mine|mining|prepare|reach|retrieve|speak|talk|use)\b/.test(normalized)
    );
}

function hasQuestCompletionIntent(normalized: string): boolean {
  return /\bhow(?:\s+[a-z0-9]+){0,6}\s+(?:complete|completes|completed|completing|finish|finishes|finished|finishing)\b/.test(normalized) ||
    /\b(?:need|have|required)(?:\s+[a-z0-9]+){0,3}\s+to\s+(?:win|complete|finish)\b/.test(normalized);
}

function hasQuestTroubleshootingIntent(normalized: string): boolean {
  return /\b(?:quest|request|commission|mission)\b/.test(normalized) &&
    /\b(?:missing|unavailable|unresponsive|not responding|does not respond|stuck|bugged)\b/.test(normalized);
}

function hasSolutionIntent(normalized: string): boolean {
  return /\b(?:solve|solves|solved|solving|solution|walkthrough)\b/.test(normalized) ||
    hasQuestCompletionIntent(normalized);
}

function requestedFactIntent(query: string): RequestedFactIntent | null {
  const normalized = normalizedPhrase(query);
  if (/\b(?:is|are)\b.+\b(?:a|an)\s+(?:game|system|item|effect|skill|ability|actor|quest|location|faction|organization|activity|resource|recipe|mechanic)\b/.test(normalized)) {
    return { code: "entity_classification", label: "classification" };
  }
  if (
    explicitPatchVersion(query) !== undefined &&
    /\b(?:change|changed|changes|fix|fixed|fixes|update|updated|updates)\b/.test(normalized)
  ) return { code: "patch_history", label: "patch history" };
  if (/\b(drop rate|drop chance|chance to drop|probability of drops?)\b/.test(normalized)) {
    return { code: "drop_rate", label: "drop-rate" };
  }
  if (hasQuestTroubleshootingIntent(normalized)) {
    return { code: "quest_availability", label: "quest availability or blocker" };
  }
  if (/\b(buy|purchase|purchased)\b/.test(normalized) && /\b(vendor|shop|where|can)\b/.test(normalized)) {
    return { code: "vendor_availability", label: "vendor-availability" };
  }
  if (hasItemAcquisitionIntent(normalized)) {
    return { code: "item_acquisition", label: "acquisition" };
  }
  if (hasEntityUseIntent(normalized)) {
    return { code: "entity_use", label: "use" };
  }
  if (hasItemInteractionIntent(normalized)) {
    return { code: "item_interaction", label: "item interaction" };
  }
  if (/\bingredients?\b/.test(normalized)) {
    return { code: "recipe_ingredients", label: "recipe ingredient" };
  }
  if (/\b(craft|crafted|crafting|recipe)\b/.test(normalized)) {
    return { code: "crafting_recipe", label: "crafting" };
  }
  if (hasQuestCompletionIntent(normalized)) {
    return { code: "solution", label: "solution or route" };
  }
  if (hasPrerequisiteIntent(normalized)) {
    return { code: "prerequisite", label: "prerequisite" };
  }
  if (/\b(cost|costs)\b/.test(normalized)) {
    return { code: "ability_cost", label: "cost" };
  }
  if (/\b(unlock|unlocks|unlocked|unlocking)\b/.test(normalized)) {
    return { code: "unlock_condition", label: "unlock condition" };
  }
  if (/\b(changed|changes|updated|updates)\b.*\b(patch|patches|history)\b/.test(normalized)) {
    return { code: "patch_history", label: "patch history" };
  }
  if (hasSolutionIntent(normalized)) {
    return { code: "solution", label: "solution or route" };
  }
  if (hasQuestObjectiveIntent(normalized)) {
    return { code: "quest_objective", label: "objective" };
  }
  if (
    /\b(reward|rewards)\b/.test(normalized) &&
    /\b(what|which|give|gives|get|gets|receive|receives|earn|earns)\b/.test(normalized)
  ) {
    return { code: "quest_reward", label: "reward" };
  }
  if (/\b(sequence|order|before|after|precede|precedes|follow|follows)\b/.test(normalized)) {
    return { code: "quest_sequence", label: "sequence" };
  }
  if (
    /^(?:where)\b/.test(normalized) ||
    /\bwhere\b.*\b(is|are|find|located|reach)\b/.test(normalized)
  ) {
    return { code: "entity_location", label: "location or route" };
  }
  if (
    /\bremap(?:ped|ping)?\b/.test(normalized) &&
    /\b(?:controller|inputs?|controls?)\b/.test(normalized) &&
    /\b(?:can|available|availability|supported|possible|exists?)\b/.test(normalized)
  ) {
    return { code: "controller_remapping", label: "controller-remapping availability" };
  }
  if (/^(?:what|who)\s+(?:is|are)\b/.test(normalized) || /^explain\b/.test(normalized)) {
    return { code: "entity_definition", label: "definition" };
  }
  return null;
}

function requestedFactIntents(query: string): RequestedFactIntent[] {
  const primary = requestedFactIntent(query);
  if (primary === null) return [];
  const normalized = normalizedPhrase(query);
  const intents = [primary];
  const add = (intent: RequestedFactIntent): void => {
    if (!intents.some(({ code }) => code === intent.code)) intents.push(intent);
  };
  if (hasItemAcquisitionIntent(normalized)) {
    add({ code: "item_acquisition", label: "acquisition" });
  }
  if (hasEntityUseIntent(normalized)) {
    add({ code: "entity_use", label: "use" });
  }
  if (hasItemInteractionIntent(normalized)) {
    add({ code: "item_interaction", label: "item interaction" });
  }
  if (primary.code !== "recipe_ingredients" && /\b(craft|crafted|crafting|recipe)\b/.test(normalized)) {
    add({ code: "crafting_recipe", label: "crafting" });
  }
  if (
    hasPrerequisiteIntent(normalized) &&
    (primary.code !== "recipe_ingredients" || /\b(?:prerequisites?|requirements?)\b/.test(normalized)) &&
    (!hasQuestCompletionIntent(normalized) || hasExplicitPrerequisiteIntent(normalized))
  ) {
    add({ code: "prerequisite", label: "prerequisite" });
  }
  if (/\b(cost|costs)\b/.test(normalized)) {
    add({ code: "ability_cost", label: "cost" });
  }
  if (/\b(unlock|unlocks|unlocked|unlocking)\b/.test(normalized)) {
    add({ code: "unlock_condition", label: "unlock condition" });
  }
  if (/\b(changed|changes|updated|updates)\b.*\b(patch|patches|history)\b/.test(normalized)) {
    add({ code: "patch_history", label: "patch history" });
  }
  if (hasSolutionIntent(normalized)) {
    add({ code: "solution", label: "solution or route" });
  }
  if (hasQuestObjectiveIntent(normalized)) {
    add({ code: "quest_objective", label: "objective" });
  }
  if (
    /\b(reward|rewards)\b/.test(normalized) &&
    /\b(what|which|give|gives|get|gets|receive|receives|earn|earns)\b/.test(normalized)
  ) {
    add({ code: "quest_reward", label: "reward" });
  }
  if (/\b(sequence|order|before|after|precede|precedes|follow|follows)\b/.test(normalized)) {
    add({ code: "quest_sequence", label: "sequence" });
  }
  return intents;
}

function keepDisputedPeersAdjacent<T extends { claim: Claim }>(scores: T[]): T[] {
  const disputedBySubjectAndPredicate = new Map<string, T[]>();
  for (const scored of scores) {
    if (scored.claim.status !== "disputed") continue;
    const key = `${scored.claim.subject_entity_id}\u0000${scored.claim.predicate}`;
    const peers = disputedBySubjectAndPredicate.get(key) ?? [];
    peers.push(scored);
    disputedBySubjectAndPredicate.set(key, peers);
  }

  const ordered: T[] = [];
  const emitted = new Set<string>();
  for (const scored of scores) {
    if (emitted.has(scored.claim.claim_id)) continue;
    if (scored.claim.status !== "disputed") {
      ordered.push(scored);
      emitted.add(scored.claim.claim_id);
      continue;
    }
    const key = `${scored.claim.subject_entity_id}\u0000${scored.claim.predicate}`;
    for (const peer of disputedBySubjectAndPredicate.get(key) ?? [scored]) {
      if (emitted.has(peer.claim.claim_id)) continue;
      ordered.push(peer);
      emitted.add(peer.claim.claim_id);
    }
  }
  return ordered;
}

function claimAnswersRequestedFact(claim: Claim, intent: RequestedFactIntent): boolean {
  const predicate = claim.predicate.toLocaleLowerCase("en-US");
  if (intent.code === "entity_classification") {
    return predicate === "catalog.community_indexed_type" || predicate === "catalog.source_indexed_type";
  }
  if (intent.code === "controller_remapping") return predicate === "controls.remapping_available";
  if (intent.code === "quest_reward") {
    return /(?:^|\.)(?:reward|rewards)(?:$|\.)/.test(predicate);
  }
  if (intent.code === "quest_objective") return predicate === "quest.objective";
  if (intent.code === "quest_sequence") return predicate === "quest.sequence";
  if (intent.code === "quest_availability") return predicate === "quest.availability";
  if (intent.code === "solution") {
    return predicate === "quest.objective" ||
      predicate === "quest.sequence" ||
      predicate === "location.route" ||
      predicate === "system.interaction" ||
      predicate.startsWith("mechanic.");
  }
  if (intent.code === "entity_location") {
    return predicate.endsWith(".location") ||
      predicate === "location.parent" ||
      predicate === "location.route" ||
      predicate === "relation.located_at";
  }
  if (intent.code === "entity_definition") {
    return predicate === "system.purpose" ||
      predicate === "location.description" ||
      predicate === "item.category" ||
      predicate === "item.effect_summary" ||
      predicate === "mount.category" ||
      predicate === "recipe.category" ||
      predicate === "actor.role" ||
      predicate === "organization.role";
  }
  if (intent.code === "item_acquisition") {
    return predicate === "item.acquisition" ||
      predicate === "relation.obtained_from" ||
      predicate === "relation.purchased_from" ||
      predicate === "quest.objective";
  }
  if (intent.code === "vendor_availability") {
    return predicate === "item.acquisition" ||
      predicate === "relation.obtained_from" ||
      predicate === "relation.purchased_from";
  }
  if (intent.code === "entity_use") {
    return predicate === "item.effect_summary" ||
      predicate === "ability.effect" ||
      predicate.startsWith("effect.") ||
      predicate === "relation.required_for" ||
      predicate === "recipe.output";
  }
  if (intent.code === "item_interaction") {
    return predicate === "item.effect_summary" ||
      predicate === "item.requirement" ||
      predicate === "relation.required_for";
  }
  if (intent.code === "recipe_ingredients") {
    return predicate === "recipe.input" || predicate === "relation.crafted_from";
  }
  if (intent.code === "crafting_recipe") {
    return predicate === "item.acquisition" ||
      predicate === "relation.crafted_from" ||
      predicate === "recipe.input" ||
      predicate === "recipe.output";
  }
  if (intent.code === "prerequisite") {
    return predicate.endsWith(".prerequisite") ||
      predicate.endsWith(".requirement") ||
      predicate === "relation.required_for";
  }
  if (intent.code === "ability_cost") return predicate === "ability.cost";
  if (intent.code === "unlock_condition") {
    return predicate === "ability.unlock_condition" ||
      predicate === "quest.prerequisite" ||
      predicate === "relation.unlocks";
  }
  if (intent.code === "patch_history") return predicate.startsWith("patch.");
  return /drop[_\.]?(?:rate|chance)|(?:rate|chance)[_\.]?drop/.test(predicate);
}

function requestedFactSpecificity(claim: Claim, intent: RequestedFactIntent): number {
  if (intent.code === "recipe_ingredients") return claim.predicate === "recipe.input" ? 0 : 1;
  if (intent.code === "quest_reward") return claim.predicate === "quest.reward" ? 0 : 1;
  if (intent.code === "unlock_condition") {
    return claim.predicate === "ability.unlock_condition" || claim.predicate === "relation.unlocks" ? 0 : 1;
  }
  if (intent.code === "quest_availability") {
    const value = claim.object.kind === "string" ? normalizedPhrase(claim.object.value) : "";
    return /\b(?:missing|unavailable|unresponsive|stuck|bug|bugged|dispatch)\b/.test(value) ? 0 : 1;
  }
  if (intent.code === "solution") {
    if (claim.predicate === "quest.sequence") return 0;
    if (claim.predicate === "location.route") return 1;
    if (claim.predicate === "quest.objective" && claim.status === "disputed") return 1;
    return 2;
  }
  return 0;
}

function explicitIdentityAnchors(query: string, entities: Entity[]): Set<string> {
  const normalizedQuery = normalizedPhrase(query);
  const haystack = ` ${normalizedQuery} `;
  const queryTokens = tokenize(query);
  const matches = entities.flatMap((entity) =>
    [entity.canonical_name.text, ...entity.aliases.map((alias) => alias.text)]
      .map(normalizedPhrase)
      .filter((name) => {
        if (name.length < 3) return false;
        if (haystack.includes(` ${name} `)) return true;
        const nameParts = name.split(" ");
        const terminalRomanTier = nameParts.at(-1);
        const tierBaseToken = nameParts.at(-2);
        const queriedTier = tierBaseToken === undefined
          ? undefined
          : new RegExp(`\\b${tierBaseToken}\\s+(i|ii|iii|iv|v|vi|vii|viii|ix|x)\\b`).exec(normalizedQuery)?.[1];
        if (
          terminalRomanTier !== undefined &&
          /^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(terminalRomanTier) &&
          queriedTier !== undefined &&
          queriedTier !== terminalRomanTier
        ) return false;
        const nameTokens = tokenize(name);
        return (
          nameTokens.length >= 2 &&
          nameTokens.every((nameToken) =>
            queryTokens.some((queryToken) => tokenMatches(queryToken, nameToken, true)),
          )
        );
      })
      .map((name) => ({ entity_id: entity.entity_id, name })),
  );
  if (matches.length === 0) return new Set();
  // Remove embedded short names before preferring literal matches, so a typo
  // in a longer name cannot substitute its separately indexed short neighbor.
  const specificMatches = matches.filter(
    (match) => !matches.some(
      (candidate) => candidate.name.length > match.name.length &&
        ` ${candidate.name} `.includes(` ${match.name} `),
    ),
  );
  const exactMatches = specificMatches.filter(({ name }) => haystack.includes(` ${name} `));
  return new Set(
    (exactMatches.length > 0 ? exactMatches : specificMatches).map((match) => match.entity_id),
  );
}

function expandDirectedQuestAnchors(
  directAnchors: ReadonlySet<string>,
  requestedFacts: readonly RequestedFactIntent[],
  entityById: ReadonlyMap<string, Entity>,
  claims: readonly Claim[],
): Set<string> {
  const expanded = new Set(directAnchors);
  if (
    directAnchors.size < 2 ||
    !requestedFacts.some(({ code }) => code === "quest_objective" || code === "solution")
  ) return expanded;

  const linkedAnchorsByQuest = new Map<string, Set<string>>();
  for (const claim of claims) {
    const subject = entityById.get(claim.subject_entity_id);
    if (subject?.entity_type !== "quest" || claim.object.kind !== "entity") continue;
    const object = entityById.get(claim.object.entity_id);
    const canonicalObjectId = object?.redirect_entity_id ?? claim.object.entity_id;
    if (!directAnchors.has(canonicalObjectId)) continue;
    const linked = linkedAnchorsByQuest.get(claim.subject_entity_id) ?? new Set<string>();
    linked.add(canonicalObjectId);
    linkedAnchorsByQuest.set(claim.subject_entity_id, linked);
  }
  for (const [questId, linkedAnchors] of linkedAnchorsByQuest) {
    if (linkedAnchors.size >= 2) expanded.add(questId);
  }
  return expanded;
}

function tokenMatches(queryToken: string, indexedToken: string, allowTypo = false): boolean {
  if (queryToken === indexedToken) return true;
  const shorterLength = Math.min(queryToken.length, indexedToken.length);
  if (
    shorterLength >= 4 &&
    (queryToken.startsWith(indexedToken) || indexedToken.startsWith(queryToken))
  ) return true;
  if (!allowTypo) return false;
  const maximumDistance = shorterLength >= 8 ? 2 : shorterLength >= 5 ? 1 : 0;
  return maximumDistance > 0 && editDistanceAtMost(queryToken, indexedToken, maximumDistance);
}

function editDistanceAtMost(left: string, right: string, maximum: number): boolean {
  if (Math.abs(left.length - right.length) > maximum) return false;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    let rowMinimum = row;
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      const value = Math.min(
        (current[column - 1] ?? Number.MAX_SAFE_INTEGER) + 1,
        (previous[column] ?? Number.MAX_SAFE_INTEGER) + 1,
        (previous[column - 1] ?? Number.MAX_SAFE_INTEGER) + cost,
      );
      current[column] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > maximum) return false;
    previous = current;
  }
  return (previous[right.length] ?? Number.MAX_SAFE_INTEGER) <= maximum;
}

function scoreText(tokens: readonly string[], text: string, allowTypo = false): number {
  const indexedTokens = tokenize(text);
  return tokens.reduce(
    (score, token) =>
      score + (indexedTokens.some((indexedToken) => tokenMatches(token, indexedToken, allowTypo)) ? 1 : 0),
    0,
  );
}

function scoreAcross(tokens: readonly string[], texts: readonly string[], allowTypo = false): number {
  return scoreText(tokens, texts.join(" "), allowTypo);
}

function requiredTokenMatches(tokens: readonly string[]): number {
  return tokens.length <= 1 ? tokens.length : 2;
}

function contextMatches(validity: Validity, context: ResolvedQueryContext): boolean {
  if (context.patch !== null && !patchInRange(context.patch, validity.from_patch, validity.through_patch)) {
    return false;
  }
  if (
    context.platform !== "all" &&
    !(validity.platforms.includes("all") || validity.platforms.includes(context.platform))
  ) {
    return false;
  }
  return validity.locales.includes(context.locale);
}

function contextBeyondReview(validity: Validity, context: ResolvedQueryContext): boolean {
  return (
    context.patch !== null &&
    (validity.reviewed_through_patch === null ||
      comparePatchVersions(context.patch, validity.reviewed_through_patch) > 0)
  );
}

const PATCH_NEUTRAL_IDENTITY_PREDICATES = new Set([
  "catalog.community_indexed_category",
  "catalog.community_indexed_type",
  "catalog.source_indexed_type",
]);

function isPatchNeutralIdentityClaim(claim: Claim): boolean {
  return PATCH_NEUTRAL_IDENTITY_PREDICATES.has(claim.predicate);
}

export function resolveQueryContext(
  store: KnowledgeStore,
  requested: QueryContext = {},
): ResolvedQueryContext {
  const hasExplicitPatch = requested.patch !== undefined;
  return {
    patch:
      requested.patch === undefined
        ? latestPatch(store.patches.map((patch) => patch.version))
        : requested.patch,
    platform: requested.platform ?? "all",
    locale: requested.locale ?? "en-US",
    spoilerCeiling: requested.spoilerCeiling ?? "none",
    includeRetracted: requested.includeRetracted ?? false,
    includeSuperseded: requested.includeSuperseded ?? false,
    usedLatestPatchDefault: !hasExplicitPatch,
  };
}

export class KnowledgeIndex {
  readonly entityById: Map<string, Entity>;
  readonly entityBySlug: Map<string, Entity>;
  readonly evidenceById: Map<string, Evidence>;
  readonly latestPatch: string | null;
  readonly multiValuedPredicates: Set<string>;
  readonly supersededClaimIds: Set<string>;

  constructor(readonly store: KnowledgeStore) {
    this.entityById = new Map(store.entities.map((entity) => [entity.entity_id, entity]));
    this.entityBySlug = new Map(store.entities.map((entity) => [entity.slug, entity]));
    this.evidenceById = new Map(store.evidence.map((evidence) => [evidence.evidence_id, evidence]));
    this.latestPatch = latestPatch(store.patches.map((patch) => patch.version));
    this.multiValuedPredicates = new Set(
      store.predicateRegistry.predicates
        .filter((definition) => definition.cardinality === "many")
        .map((definition) => definition.predicate),
    );
    this.supersededClaimIds = new Set(store.claims.flatMap((claim) => claim.supersedes_claim_ids ?? []));
  }

  getEntity(idOrSlug: string): Entity | undefined {
    return this.entityById.get(idOrSlug) ?? this.entityBySlug.get(idOrSlug);
  }

  private canonicalEntity(entity: Entity): Entity {
    return entity.redirect_entity_id === undefined
      ? entity
      : this.entityById.get(entity.redirect_entity_id) ?? entity;
  }

  private claimIsSuperseded(claimId: string, context: ResolvedQueryContext): boolean {
    return this.supersededClaimIds.has(claimId) && this.store.claims.some((claim) =>
      claim.status !== "retracted" &&
      contextMatches({ ...claim.validity, through_patch: null }, context) &&
      claim.supersedes_claim_ids?.includes(claimId));
  }

  searchEntities(query: string, limit = 20, includeRedirects = false): Entity[] {
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];
    const minimum = requiredTokenMatches(tokens);
    return this.store.entities
      .filter((entity) => includeRedirects || entity.redirect_entity_id === undefined)
      .map((entity) => ({
        entity,
        score: scoreText(tokens, searchableEntityText(entity)),
        identityScore: scoreText(tokens, searchableEntityIdentityText(entity), true),
      }))
      .filter(({ score, identityScore }) => score >= minimum || identityScore > 0)
      .sort(
        (left, right) =>
          right.score - left.score || left.entity.entity_id.localeCompare(right.entity.entity_id),
      )
      .slice(0, Math.max(0, Math.min(limit, 10_000)))
      .map(({ entity }) => entity);
  }

  search(
    query: string,
    requested: QueryContext = {},
    limit = 20,
    offset = 0,
  ): { context: ResolvedQueryContext; total: number; hits: KnowledgeSearchHit[] } {
    const context = resolveQueryContext(this.store, requested);
    const tokens = tokenize(query);
    if (tokens.length === 0) return { context, total: 0, hits: [] };
    const minimum = requiredTokenMatches(tokens);
    const phrase = normalizedPhrase(query);
    const hits: KnowledgeSearchHit[] = [];

    for (const entity of this.store.entities.filter((record) => record.redirect_entity_id === undefined)) {
      const score = scoreText(tokens, searchableEntityText(entity));
      const identityScore = scoreText(tokens, searchableEntityIdentityText(entity), true);
      if (score < minimum && identityScore === 0) continue;
      const canonicalName = normalizedPhrase(entity.canonical_name.text);
      const exactBonus = canonicalName === phrase || entity.aliases.some((alias) => normalizedPhrase(alias.text) === phrase) ? 10 : 0;
      hits.push({
        kind: "entity",
        id: entity.entity_id,
        score: score * 4 + identityScore * 3 + exactBonus,
        title: entity.canonical_name.text,
        snippet: entity.summary,
        entity_id: entity.entity_id,
        canonical_path: `/v1/entities/${entity.entity_id}`,
        patch: context.patch,
        status: "canonical",
      });
    }

    for (const claim of this.store.claims) {
      if (!contextMatches(claim.validity, context)) continue;
      if (SPOILER_ORDER[claim.spoiler_level] > SPOILER_ORDER[context.spoilerCeiling]) continue;
      if (!context.includeRetracted && claim.status === "retracted") continue;
      if (!context.includeSuperseded && this.claimIsSuperseded(claim.claim_id, context)) continue;
      const entity = this.entityById.get(claim.subject_entity_id);
      if (entity === undefined) continue;
      if (entity.redirect_entity_id !== undefined) continue;
      const score = scoreAcross(tokens, [
        searchableEntityText(entity),
        claim.predicate,
        renderClaimObject(claim, this.entityById),
      ]);
      if (score < minimum) continue;
      hits.push({
        kind: "claim",
        id: claim.claim_id,
        score: score * 4 + (scoreText(tokens, searchableEntityIdentityText(entity), true) > 0 ? 2 : 0),
        title: `${entity.canonical_name.text}: ${claim.predicate}`,
        snippet: `${renderClaimObject(claim, this.entityById)} [${claim.status}/${claim.behavior_kind}]`,
        entity_id: entity.entity_id,
        canonical_path: `/v1/claims?subject=${encodeURIComponent(entity.entity_id)}&predicate=${encodeURIComponent(claim.predicate)}`,
        patch: context.patch,
        status: claim.status,
      });
    }

    for (const strategy of this.store.strategies) {
      if (!contextMatches(strategy.validity, context)) continue;
      if (SPOILER_ORDER[strategy.spoiler_level] > SPOILER_ORDER[context.spoilerCeiling]) continue;
      if (!context.includeRetracted && strategy.status === "retracted") continue;
      const score = scoreAcross(tokens, [
        strategy.title,
        strategy.slug,
        ...strategy.nodes.flatMap((node) => [node.action, node.instruction]),
      ]);
      if (score < minimum) continue;
      hits.push({
        kind: "strategy",
        id: strategy.strategy_id,
        score: score * 4,
        title: strategy.title,
        snippet: strategy.nodes[0]?.instruction ?? "Ordered strategy graph.",
        entity_id: strategy.goal_entity_id,
        canonical_path: `/v1/strategies/${strategy.strategy_id}`,
        patch: context.patch,
        status: strategy.status,
      });
    }

    hits.sort(
      (left, right) =>
        right.score - left.score ||
        left.kind.localeCompare(right.kind) ||
        left.id.localeCompare(right.id),
    );
    const boundedOffset = Math.max(0, offset);
    const boundedLimit = Math.max(1, Math.min(limit, 100));
    return {
      context,
      total: hits.length,
      hits: hits.slice(boundedOffset, boundedOffset + boundedLimit),
    };
  }

  relationshipGraph(
    idOrSlug: string,
    requested: QueryContext = {},
    requestedDepth = 1,
    requestedLimit = 100,
  ): KnowledgeRelationshipGraph | null {
    const requestedRoot = this.getEntity(idOrSlug);
    if (requestedRoot === undefined) return null;
    const root = this.canonicalEntity(requestedRoot);
    const context = resolveQueryContext(this.store, requested);
    const depth = Math.max(1, Math.min(requestedDepth, 3));
    const limit = Math.max(1, Math.min(requestedLimit, 500));
    const nodes = new Set<string>([root.entity_id]);
    const edges = new Map<string, KnowledgeRelationshipGraph["edges"][number]>();
    let frontier = new Set<string>([root.entity_id]);
    let truncated = false;
    for (let level = 0; level < depth && frontier.size > 0; level += 1) {
      const next = new Set<string>();
      const candidates = this.store.claims
        .filter((claim) => claim.object.kind === "entity")
        .filter((claim) => claim.predicate !== "relation.same_as")
        .filter((claim) => frontier.has(claim.subject_entity_id) || (claim.object.kind === "entity" && frontier.has(claim.object.entity_id)))
        .filter((claim) => contextMatches(claim.validity, context))
        .filter((claim) => SPOILER_ORDER[claim.spoiler_level] <= SPOILER_ORDER[context.spoilerCeiling])
        .filter((claim) => context.includeRetracted || claim.status !== "retracted")
        .filter((claim) => context.includeSuperseded || !this.claimIsSuperseded(claim.claim_id, context))
        .sort((left, right) => left.predicate.localeCompare(right.predicate) || left.claim_id.localeCompare(right.claim_id));
      for (const claim of candidates) {
        if (claim.object.kind !== "entity") continue;
        if (edges.has(claim.claim_id)) continue;
        if (edges.size >= limit) {
          truncated = true;
          break;
        }
        edges.set(claim.claim_id, {
          claim_id: claim.claim_id,
          subject_entity_id: claim.subject_entity_id,
          predicate: claim.predicate,
          object_entity_id: claim.object.entity_id,
          status: claim.status,
          confidence: claim.confidence,
          evidence_ids: claim.evidence_ids,
          validity: claim.validity,
        });
        for (const entityId of [claim.subject_entity_id, claim.object.entity_id]) {
          if (!nodes.has(entityId)) next.add(entityId);
          nodes.add(entityId);
        }
      }
      frontier = next;
    }
    return {
      schema_version: "pywel.relationship_graph.v1",
      root_entity_id: root.entity_id,
      depth,
      nodes: [...nodes]
        .map((entityId) => this.entityById.get(entityId))
        .filter((entity): entity is Entity => entity !== undefined)
        .sort((left, right) => left.entity_id.localeCompare(right.entity_id)),
      edges: [...edges.values()],
      truncated,
    };
  }

  claimsForEntity(entityId: string, requested: QueryContext = {}): Claim[] {
    const context = resolveQueryContext(this.store, requested);
    return this.store.claims.filter(
      (claim) =>
        claim.subject_entity_id === entityId &&
        contextMatches(claim.validity, context) &&
        SPOILER_ORDER[claim.spoiler_level] <= SPOILER_ORDER[context.spoilerCeiling] &&
        (context.includeRetracted || claim.status !== "retracted") &&
        (context.includeSuperseded || !this.claimIsSuperseded(claim.claim_id, context)),
    );
  }

  filterClaims(filters: {
    subjectEntityId?: string;
    predicate?: string;
    status?: Claim["status"];
    context?: QueryContext;
    limit?: number;
    offset?: number;
  }): Claim[] {
    return this.filterClaimsPage(filters).claims;
  }

  filterClaimsPage(filters: {
    subjectEntityId?: string;
    predicate?: string;
    status?: Claim["status"];
    context?: QueryContext;
    limit?: number;
    offset?: number;
  }): { total: number; claims: Claim[] } {
    const context = resolveQueryContext(this.store, filters.context);
    const matched = this.store.claims
      .filter(
        (claim) =>
          (filters.subjectEntityId === undefined || claim.subject_entity_id === filters.subjectEntityId) &&
          (filters.predicate === undefined || claim.predicate === filters.predicate) &&
          (filters.status === undefined || claim.status === filters.status) &&
          contextMatches(claim.validity, context) &&
          SPOILER_ORDER[claim.spoiler_level] <= SPOILER_ORDER[context.spoilerCeiling] &&
          (context.includeRetracted || claim.status !== "retracted") &&
          (context.includeSuperseded || !this.claimIsSuperseded(claim.claim_id, context)),
      );
    const offset = Math.max(0, filters.offset ?? 0);
    const limit = Math.max(1, Math.min(filters.limit ?? 50, 200));
    return { total: matched.length, claims: matched.slice(offset, offset + limit) };
  }

  strategiesForEntity(entityId: string, requested: QueryContext = {}): Strategy[] {
    const context = resolveQueryContext(this.store, requested);
    return this.store.strategies.filter(
      (strategy) =>
        strategy.goal_entity_id === entityId &&
        contextMatches(strategy.validity, context) &&
        SPOILER_ORDER[strategy.spoiler_level] <= SPOILER_ORDER[context.spoilerCeiling] &&
        (context.includeRetracted || strategy.status !== "retracted"),
    );
  }

  entityBundle(idOrSlug: string, requested: QueryContext = {}): {
    entity: Entity;
    redirected_from: Entity | null;
    claims: Claim[];
    strategies: Strategy[];
    evidence: Evidence[];
    context: ResolvedQueryContext;
    freshness: {
      latest_known_patch: string | null;
      context_patch_coverage: "identity_only" | "partial" | "exhaustive" | null;
      review_gap_record_ids: string[];
    };
    warnings: string[];
    relationships: KnowledgeRelationshipGraph;
  } | null {
    const requestedEntity = this.getEntity(idOrSlug);
    if (requestedEntity === undefined) return null;
    const entity = this.canonicalEntity(requestedEntity);
    const redirectedFrom = requestedEntity.redirect_entity_id === undefined ? null : requestedEntity;
    const context = resolveQueryContext(this.store, requested);
    const claims = this.claimsForEntity(entity.entity_id, context);
    const strategies = this.strategiesForEntity(entity.entity_id, context);
    const evidenceIds = new Set([
      ...claims.flatMap((claim) => claim.evidence_ids),
      ...strategies.flatMap((strategy) => strategy.evidence_ids),
    ]);
    const evidence = [...evidenceIds]
      .map((id) => this.evidenceById.get(id))
      .filter((item): item is Evidence => item !== undefined);
    const reviewGapRecordIds = [
      ...claims
        .filter((claim) => !isPatchNeutralIdentityClaim(claim) && contextBeyondReview(claim.validity, context))
        .map((claim) => claim.claim_id),
      ...strategies
        .filter((strategy) => contextBeyondReview(strategy.validity, context))
        .map((strategy) => strategy.strategy_id),
    ];
    const contextPatch =
      context.patch === null
        ? undefined
        : this.store.patches.find((patch) => patch.version === context.patch);
    const warnings = [
      ...(contextPatch === undefined
        ? [context.patch === null
            ? "No patch context is resolved; returned records do not establish version applicability."
            : `Patch ${context.patch} is not indexed; returned records do not establish applicability to it.`]
        : []),
      ...(redirectedFrom === null
        ? []
        : [`Entity ${redirectedFrom.entity_id} redirects to canonical entity ${entity.entity_id}.`]),
      ...(reviewGapRecordIds.length === 0 || context.patch === null
        ? []
        : [`Records have not been reviewed through patch ${context.patch}.`]),
      ...(contextPatch?.content_coverage.level === "identity_only"
        ? [`Patch ${contextPatch.version} has identity-only content coverage.`]
        : []),
      ...(claims.some((claim) => claim.status === "disputed") ||
      (() => {
        const valuesByPredicate = new Map<string, Set<string>>();
        for (const claim of claims) {
          if (claim.predicate.startsWith("patch.") || this.multiValuedPredicates.has(claim.predicate)) continue;
          const values = valuesByPredicate.get(claim.predicate) ?? new Set<string>();
          values.add(canonicalJson(claim.object));
          valuesByPredicate.set(claim.predicate, values);
        }
        return [...valuesByPredicate.values()].some((values) => values.size > 1);
      })()
        ? ["Conflicting or disputed claims are returned without forced resolution."]
        : []),
    ];
    return {
      entity,
      redirected_from: redirectedFrom,
      claims,
      strategies,
      evidence,
      context,
      freshness: {
        latest_known_patch: this.latestPatch,
        context_patch_coverage: contextPatch?.content_coverage.level ?? null,
        review_gap_record_ids: reviewGapRecordIds,
      },
      warnings,
      relationships: this.relationshipGraph(entity.entity_id, context, 1, 100)!,
    };
  }

  answer(query: string, requested: QueryContext = {}): EvidencePacket {
    const instructionShapedQuery = containsRoleInstructionMarkup(query);
    const requestedFacts = requestedFactIntents(query);
    const patchFromQuery = explicitPatchVersion(query);
    const patchContextConflict = patchFromQuery !== undefined && requested.patch !== undefined && requested.patch !== patchFromQuery;
    const context = resolveQueryContext(this.store, {
      ...requested,
      ...(requested.patch !== undefined || patchFromQuery === undefined ? {} : { patch: patchFromQuery }),
    });
    const tokens = tokenize(query);
    const naturalIntentTokens = queryIntentAliases(query);
    const semanticIntentFamilies = Math.max(requestedFacts.length, [
      ["acquisition", "obtained"],
      ["effect", "summary"],
      ["crafted", "recipe"],
      ["requirement", "required"],
      ["dye", "selector", "supported"],
      ["reward"],
      ["solution", "objective", "sequence", "route"],
      ["location", "route"],
      ["drop", "rate", "chance"],
      ["purpose", "description", "summary", "category"],
    ].filter((family) => family.some((token) => naturalIntentTokens.includes(alias => false)))).length);
    const minimum = requiredTokenMatches(tokens);
    const directExplicitAnchors = new Set(
      [...explicitIdentityAnchors(query, this.store.entities)].map((entityId) => {
        const entity = this.entityById.get(entityId);
        return entity?.redirect_entity_id ?? entityId;
      }),
    );
    const explicitAnchors = expandDirectedQuestAnchors(
      directExplicitAnchors,
      requestedFacts,
      this.entityById,
      this.store.claims,
    );
    const normalizedQuery = ` ${normalizedPhrase(query)} `;
    const explicitConflictIntent = /\b(?:conflict|conflicting|disagree|disputed|unresolved source)\b/.test(normalizedQuery);
    const explicitPatchHistoryIntent = explicitPatchVersion(query) !== undefined &&
      requestedFacts.some(({ code }) => code === "patch_history");
    const strongExplicitAnchors = new Set(
      [...directExplicitAnchors].filter((entityId) => {
        const entity = this.entityById.get(entityId);
        return entity !== undefined &&
          [entity.canonical_name.text, ...entity.aliases.map((alias) => alias.text)]
            .map(normalizedPhrase)
            .some((name) => tokenize(name).length >= 2 && normalizedQuery.includes(` ${name} `));
      }),
    );
    const entityScores = (instructionShapedQuery || tokens.length === 0 ? [] : this.store.entities)
      .filter((entity) => entity.redirect_entity_id === undefined)
      .map((entity) => ({
        entity,
        score: scoreText(tokens, searchableEntityText(entity)),
        identityScore: scoreText(tokens, searchableEntityIdentityText(entity), true),
      }))
      // Loose token hits belong in search, not evidence-backed answers.
      .filter(({ entity }) => explicitAnchors.has(entity.entity_id));
    const eligibleClaimScores = (instructionShapedQuery || tokens.length === 0 ? [] : this.store.claims)
      .filter(
        (claim) =>
          explicitAnchors.has(claim.subject_entity_id) &&
          contextMatches(claim.validity, context) &&
          SPOILER_ORDER[claim.spoiler_level] <= SPOILER_ORDER[context.spoilerCeiling] &&
          (context.includeRetracted || claim.status !== "retracted") &&
          (context.includeSuperseded || !this.claimIsSuperseded(claim.claim_id, context)),
      )
      .map((claim) => {
        const entity = this.entityById.get(claim.subject_entity_id)!;
        const identityText = searchableEntityIdentityText(entity);
        const identityTokens = tokens.filter((token) => scoreText([token], identityText, true) > 0);
        const intentTokens = [
          ...new Set([
            ...tokens.filter((token) => !identityTokens.includes(token)),
            ...naturalIntentTokens,
          ]),
        ];
        const identityScore = identityTokens.length;
        const intentScore = scoreText(
          intentTokens,
          `${claim.predicate} ${renderClaimObject(claim, this.entityById)}`.toLocaleLowerCase("en-US"),
        );
        return {
          claim,
          identityScore,
          intentScore,
          score: scoreAcross(tokens, [
            claim.predicate.toLocaleLowerCase("en-US"),
            searchableEntityText(entity),
            renderClaimObject(claim, this.entityById).toLocaleLowerCase("en-US"),
          ]),
          eligible:
            identityScore > 0
              ? intentTokens.length === 0 ||
                intentScore > 0 ||
                requestedFacts.some((intent) => claimAnswersRequestedFact(claim, intent))
              : false,
        };
      })
      .filter(({ score, eligible, identityScore }) => eligible || (identityScore === 0 && score >= minimum));
    const anchoredClaimsExist = eligibleClaimScores.some(
      ({ identityScore, eligible }) => identityScore > 0 && eligible,
    );
    let claimScores = anchoredClaimsExist
      ? eligibleClaimScores.filter(({ identityScore, eligible }) => identityScore > 0 && eligible)
      : eligibleClaimScores;
    if (explicitPatchHistoryIntent) {
      claimScores = claimScores.filter(({ claim }) => claim.validity.from_patch === context.patch);
    }
    if (requestedFacts.length > 0) {
      claimScores = claimScores.filter(({ claim }) =>
        requestedFacts.some((intent) => claimAnswersRequestedFact(claim, intent)));
    }
    const strongestAnchoredIntent = Math.max(0, ...claimScores.map(({ intentScore }) => intentScore));
    if (
      strongExplicitAnchors.size > 0 &&
      semanticIntentFamilies <= 1 &&
      strongestAnchoredIntent >= 2
    ) {
      claimScores = claimScores.filter(({ intentScore }) => intentScore === strongestAnchoredIntent);
    }
    const topEntityScore = Math.max(0, ...entityScores.map(({ score }) => score));
    const topClaimScore = Math.max(0, ...claimScores.map(({ score }) => score));
    const topScore = Math.max(0, topEntityScore, topClaimScore);
    const selectedEntities = entityScores
      .filter(({ score, identityScore }) =>
        score >= Math.max(1, topScore - 1) || identityScore > 0,
      )
      .sort((left, right) => right.score - left.score)
      .slice(0, 5)
      .map(({ entity }) => entity);
    const selectedEntityIds = new Set(selectedEntities.map((entity) => entity.entity_id));
    claimScores = claimScores
      .sort(
        (left, right) => {
          const leftConflictPriority = explicitConflictIntent && left.claim.status === "disputed" ? 0 : 1;
          const rightConflictPriority = explicitConflictIntent && right.claim.status === "disputed" ? 0 : 1;
          const leftFactPriority = requestedFacts.findIndex((intent) =>
            claimAnswersRequestedFact(left.claim, intent));
          const rightFactPriority = requestedFacts.findIndex((intent) =>
            claimAnswersRequestedFact(right.claim, intent));
          const leftFactSpecificity = leftFactPriority < 0
            ? Number.MAX_SAFE_INTEGER
            : requestedFactSpecificity(left.claim, requestedFacts[leftFactPriority]!);
          const rightFactSpecificity = rightFactPriority < 0
            ? Number.MAX_SAFE_INTEGER
            : requestedFactSpecificity(right.claim, requestedFacts[rightFactPriority]!);
          return leftConflictPriority - rightConflictPriority ||
          (leftFactPriority < 0 ? requestedFacts.length : leftFactPriority) -
            (rightFactPriority < 0 ? requestedFacts.length : rightFactPriority) ||
          leftFactSpecificity - rightFactSpecificity ||
          right.intentScore - left.intentScore ||
          right.score - left.score ||
          right.claim.confidence - left.claim.confidence;
        },
      );
    claimScores = keepDisputedPeersAdjacent(claimScores);
    if (requestedFacts.length > 1) {
      const balanced: typeof claimScores = [];
      const selectedClaimIds = new Set<string>();
      const primaryMatches: Array<{
        match: (typeof claimScores)[number];
        intent: RequestedFactIntent;
      }> = [];
      for (const intent of requestedFacts) {
        const match = claimScores
          .filter(({ claim }) =>
            !selectedClaimIds.has(claim.claim_id) && claimAnswersRequestedFact(claim, intent))
          .sort((left, right) =>
            requestedFactSpecificity(left.claim, intent) - requestedFactSpecificity(right.claim, intent))[0];
        if (match === undefined) continue;
        balanced.push(match);
        selectedClaimIds.add(match.claim.claim_id);
        primaryMatches.push({ match, intent });
      }
      for (const { match, intent } of primaryMatches) {
        if (!this.multiValuedPredicates.has(match.claim.predicate)) continue;
        const peers = claimScores.filter(({ claim }) =>
          claim.subject_entity_id === match.claim.subject_entity_id &&
          claim.predicate === match.claim.predicate &&
          claimAnswersRequestedFact(claim, intent));
        for (const peer of peers) {
          if (selectedClaimIds.has(peer.claim.claim_id)) continue;
          balanced.push(peer);
          selectedClaimIds.add(peer.claim.claim_id);
        }
      }
      for (const scored of claimScores) {
        if (selectedClaimIds.has(scored.claim.claim_id)) continue;
        balanced.push(scored);
      }
      claimScores = balanced;
    }
    const matchedClaims = claimScores.map(({ claim }) => claim);
    const claims = matchedClaims.slice(0, 20);
    for (const claim of claims) selectedEntityIds.add(claim.subject_entity_id);
    const strategyGoalEntityIds = new Set(selectedEntityIds);
    for (const claim of claims) {
      if (claim.object.kind === "entity") selectedEntityIds.add(claim.object.entity_id);
    }
    const entities = [...selectedEntityIds]
      .map((id) => this.entityById.get(id))
      .filter((entity): entity is Entity => entity !== undefined);
    const matchedStrategies = this.store.strategies
      .filter(
        (strategy) =>
          strategyGoalEntityIds.has(strategy.goal_entity_id) &&
          contextMatches(strategy.validity, context) &&
          SPOILER_ORDER[strategy.spoiler_level] <= SPOILER_ORDER[context.spoilerCeiling] &&
          (context.includeRetracted || strategy.status !== "retracted"),
      )
      .map((strategy) => ({
        strategy,
        relevance: scoreAcross(tokens, [
          strategy.title,
          strategy.slug,
          ...strategy.nodes.flatMap((node) => [node.action, node.instruction]),
        ]),
      }))
      .sort((left, right) =>
        right.strategy.verification.independent_sources - left.strategy.verification.independent_sources ||
        right.relevance - left.relevance ||
        left.strategy.strategy_id.localeCompare(right.strategy.strategy_id))
      .map(({ strategy }) => strategy);
    const strategies = matchedStrategies.slice(0, 8);
    const selection = {
      claims: { matched: matchedClaims.length, returned: claims.length },
      strategies: { matched: matchedStrategies.length, returned: strategies.length },
    };
    const truncated = matchedClaims.length > claims.length || matchedStrategies.length > strategies.length;
    const evidenceIds = new Set([
      ...claims.flatMap((claim) => claim.evidence_ids),
      ...strategies.flatMap((strategy) => strategy.evidence_ids),
    ]);
    const evidence = [...evidenceIds]
      .map((id) => this.evidenceById.get(id))
      .filter((item): item is Evidence => item !== undefined);
    const missingRequestedFacts = requestedFacts.filter((intent) =>
      !claims.some((claim) => claimAnswersRequestedFact(claim, intent)));
    const requestedFactSupported = missingRequestedFacts.length === 0;
    const requestedFact = missingRequestedFacts[0] ?? null;
    const catalogDefinitionEntity =
      !requestedFactSupported && requestedFact?.code === "entity_definition"
        ? entities.find((entity) => strongExplicitAnchors.has(entity.entity_id)) ?? selectedEntities[0]
        : undefined;
    const objectGroups = new Map<string, Set<string>>();
    for (const claim of matchedClaims) {
      if (claim.predicate.startsWith("patch.") || this.multiValuedPredicates.has(claim.predicate)) continue;
      const key = `${claim.subject_entity_id}:${claim.predicate}`;
      const values = objectGroups.get(key) ?? new Set<string>();
      values.add(canonicalJson(claim.object));
      objectGroups.set(key, values);
    }
    const conflict =
      matchedClaims.some((claim) => claim.status === "disputed") ||
      [...objectGroups.values()].some((values) => values.size > 1);
    const reviewGap =
      matchedClaims.some((claim) => !isPatchNeutralIdentityClaim(claim) && contextBeyondReview(claim.validity, context)) ||
      matchedStrategies.some((strategy) => contextBeyondReview(strategy.validity, context));
    const contextPatch =
      context.patch === null
        ? undefined
        : this.store.patches.find((patch) => patch.version === context.patch);
    const warnings: string[] = [];
    if (instructionShapedQuery) {
      warnings.push("Role or instruction markup is untrusted query text; factual records are withheld.");
    }
    if (context.usedLatestPatchDefault && context.patch !== null) {
      warnings.push(`No patch was supplied; latest known stable patch ${context.patch} was assumed.`);
    }
    if (matchedClaims.some((claim) => claim.status === "stale")) {
      warnings.push("One or more matching claims are stale; returned stale claims are explicitly labeled.");
    }
    if (matchedClaims.some((claim) => claim.status === "inferred")) {
      warnings.push("Matching claims include inferred statements; treat them as bounded hypotheses, not direct observations.");
    }
    if (reviewGap && context.patch !== null) {
      warnings.push(
        `One or more matching records have not been reviewed through patch ${context.patch}; treat them as version-drift candidates.`,
      );
    }
    if (contextPatch?.content_coverage.level === "identity_only") {
      warnings.push(
        `Patch ${contextPatch.version} has identity-only coverage; its contents have not been normalized.`,
      );
    }
    if (matchedClaims.some((claim) => claim.status === "official" && claim.behavior_kind === "intended")) {
      warnings.push("Official claims describe publisher-stated intent, not independently observed behavior.");
    }
    if (conflict) warnings.push("Conflicting or disputed claims are present among matching records and remain unresolved.");
    const gaps: EvidencePacket["gaps"] = [];
    if (truncated) {
      gaps.push({
        code: "result_truncated",
        message: "The answer returns at most 20 claims and 8 strategies. Selection counts include omitted matches; use narrower queries or entity claim pagination to inspect remaining records.",
      });
    }
    if (claims.length === 0) {
      gaps.push({
        code: "no_supported_claim",
        message: "The current corpus has no patch- and context-matching claim for this query.",
        suggested_contribution: "Submit an atomic observation or coverage-gap packet with version, platform, and evidence locators.",
      });
    }
    if (catalogDefinitionEntity !== undefined) {
      gaps.push({
        code: "requested_fact_catalog_summary_only",
        message: "A canonical catalog summary is available, but no evidence-backed definition claim matches this query and context.",
        suggested_contribution: "Normalize a definition or purpose claim with patch, platform, and evidence context.",
      });
    } else {
      for (const missingFact of missingRequestedFacts) {
        gaps.push({
          code: "requested_fact_not_supported",
          message: "Pywel recognizes related records but has no supported " + missingFact.label + " claim for this query and context.",
          suggested_contribution: "Submit a normalized " + missingFact.label + " claim with patch, platform, and evidence context.",
        });
      }
    }
    if (patchContextConflict) {
      const message = `Query names patch ${patchFromQuery}, but the supplied patch context is ${context.patch ?? "unresolved"}; clarify which patch is intended.`;
      gaps.push({ code: "patch_context_conflict", message });
      warnings.push(message);
    }
    if (contextPatch === undefined) {
      const message = context.patch === null
        ? "No patch context is resolved; version applicability is unknown."
        : `Patch ${context.patch} is not indexed; applicability to that patch is unknown.`;
      gaps.push({ code: "patch_unknown", message });
      warnings.push(message);
    }
    if (reviewGap && context.patch !== null) {
      gaps.push({
        code: "post_patch_review_needed",
        message: `Relevant records have not been reviewed through patch ${context.patch}. Patch-note coverage does not refresh a claim.`,
        suggested_contribution: "Review the affected claims against intervening evidence and record claim-specific confirmations or supersessions.",
      });
    }
    if (contextPatch?.content_coverage.level === "identity_only") {
      gaps.push({
        code: "patch_content_not_normalized",
        message: `Only the identity and official source locator are indexed for patch ${contextPatch.version}.`,
      });
    }
    const answerState: EvidencePacket["answer_state"] = instructionShapedQuery
      ? "partial"
      : contextPatch === undefined || patchContextConflict
      ? "unknown"
      : conflict
        ? "conflicting"
      : catalogDefinitionEntity !== undefined
      ? "partial"
      : !requestedFactSupported
        ? claims.length > 0 ? "partial" : "unknown"
      : claims.length > 0 && claims.every((claim) => claim.object.kind === "unknown")
        ? "unknown"
      : truncated || reviewGap || matchedClaims.some((claim) => claim.status === "stale" || claim.status === "retracted" || claim.object.kind === "unknown")
        ? "partial"
      : claims.length > 0
        ? "supported"
        : entities.length > 0 || strategies.length > 0
          ? "partial"
          : "unknown";
    return {
      schema_version: "pywel.answer.v1",
      answer_state: answerState,
      query,
      assumptions: {
        patch: context.patch,
        platform: context.platform,
        locale: context.locale,
        spoiler_ceiling: context.spoilerCeiling,
      },
      concise_answer:
        patchContextConflict
          ? `Unknown: the query patch ${patchFromQuery} conflicts with the supplied patch context ${context.patch ?? "unresolved"}.`
          : contextPatch === undefined
          ? `Unknown: ${context.patch === null ? "no patch context is resolved" : `patch ${context.patch} is not indexed`}; returned records do not establish applicability.`
          : catalogDefinitionEntity !== undefined
          ? catalogDefinitionEntity.canonical_name.text + ": " + catalogDefinitionEntity.summary + " [catalog summary; not a gameplay observation]"
          : !requestedFactSupported && requestedFact !== null
          ? [
              ...renderConciseClaims(claims.slice(0, 5), this.entityById),
              "Unknown: no supported " + missingRequestedFacts.map(({ label }) => label).join(" or ") + " claim matches the requested entity and context.",
            ].join(" ")
          : claims.length === 0
          ? "Unknown: no supported claim matches the requested context."
          : renderConciseClaims(claims.slice(0, 5), this.entityById).join(" "),
      selection,
      entities,
      claims,
      evidence,
      strategies,
      warnings,
      gaps,
      freshness: {
        latest_known_patch: this.latestPatch,
        generated_from_corpus_at: corpusTimestamp(this.store),
      },
    };
  }
}

function renderConciseClaims(claims: Claim[], entityById: ReadonlyMap<string, Entity>): string[] {
  const groups: Array<{
    key: string;
    subjectEntityId: string;
    name: string;
    predicate: string;
    status: Claim["status"];
    behaviorKind: Claim["behavior_kind"];
    values: string[];
  }> = [];
  for (const claim of claims) {
    const key = [claim.subject_entity_id, claim.predicate, claim.status, claim.behavior_kind].join("\u0000");
    const prior = groups.at(-1);
    const value = renderClaimObject(claim, entityById).replace(/\.$/, "");
    if (prior?.key === key) {
      prior.values.push(value);
      continue;
    }
    groups.push({
      key,
      subjectEntityId: claim.subject_entity_id,
      name: entityById.get(claim.subject_entity_id)?.canonical_name.text ?? claim.subject_entity_id,
      predicate: claim.predicate,
      status: claim.status,
      behaviorKind: claim.behavior_kind,
      values: [value],
    });
  }
  let previousSubjectEntityId: string | undefined;
  return groups.map((group) => {
    const subjectPrefix = group.subjectEntityId === previousSubjectEntityId ? "" : `${group.name}: `;
    previousSubjectEntityId = group.subjectEntityId;
    return `${subjectPrefix}${group.predicate} = ${group.values.join("; ")} [${group.status}/${group.behaviorKind}]`;
  });
}

function renderClaimObject(claim: Claim, entityById?: ReadonlyMap<string, Entity>): string {
  const object = claim.object;
  if (object.kind === "entity") return entityById?.get(object.entity_id)?.canonical_name.text ?? object.entity_id;
  if (object.kind === "range") {
    return `${object.minimum}..${object.maximum}${object.unit === undefined ? "" : ` ${object.unit}`}`;
  }
  if (object.kind === "unknown") return `${object.state}${object.reason === undefined ? "" : ` (${object.reason})`}`;
  return `${String(object.value)}${object.unit === undefined ? "" : ` ${object.unit}`}`;
}

export function corpusTimestamp(store: KnowledgeStore): string {
  const timestamps = [
    ...store.entities.flatMap((record) => [record.provenance.updated_at, record.provenance.created_at]),
    ...store.claims.flatMap((record) => [record.provenance.updated_at, record.provenance.created_at]),
    ...store.evidence.flatMap((record) => [record.provenance.updated_at, record.provenance.created_at]),
    ...store.patches.flatMap((record) => [record.provenance.updated_at, record.provenance.created_at]),
    ...store.strategies.flatMap((record) => [record.provenance.updated_at, record.provenance.created_at]),
    ...store.receipts.map((record) => record.created_at),
  ].filter((value): value is string => value !== undefined);
  return timestamps.sort((left, right) => Date.parse(left) - Date.parse(right)).at(-1) ?? new Date(0).toISOString();
}

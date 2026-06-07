/**
 * policy_lookup — the Curator/Writer/Verifier's window onto Le Kyoto's POLICY canon.
 *
 * Reads `@weavehacks/truth`'s `POLICY` (gesture limits, required disclosures, forbidden
 * over-promises). Every call is a Weave op, so a reply's "15% credit" traces to the exact policy
 * field that authorizes it — the gesture is grounded the same mechanical way a POS figure is.
 */
import { traced } from "@weavehacks/observability";
import type { ToolSpec } from "@weavehacks/runtime";
import { POLICY } from "@weavehacks/truth";

type PolicyTopic = "gesture" | "disclosures" | "forbidden_claims" | "all";

export const policyLookupTool: ToolSpec = {
  name: "policy_lookup",
  description:
    "Le Kyoto's recovery POLICY: the goodwill gesture limit (a % credit on the customer's NEXT " +
    "order), the over-promises that are forbidden (free meal, full/cash refund, delivery-time " +
    "guarantee), the required disclosure wording (no-refund-promise, allergen), and the HITL rule. " +
    "Call this to back any gesture, refund, or disclosure in a reply. Optionally pass a topic to " +
    "narrow the result.",
  parameters: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        enum: ["gesture", "disclosures", "forbidden_claims", "all"],
        description: "which slice of the policy to return (default 'all')",
      },
    },
    additionalProperties: false,
  },
  execute: traced("tool.policy_lookup", ({ topic }: { topic?: PolicyTopic } = {}) => {
    switch (topic) {
      case "gesture":
        return { gesture: POLICY.gesture, hitl: POLICY.hitl };
      case "disclosures":
        return { disclosures: POLICY.disclosures };
      case "forbidden_claims":
        return { forbiddenClaims: POLICY.forbiddenClaims, forbiddenGestures: POLICY.gesture.forbiddenGestures };
      default:
        return POLICY;
    }
  }),
};

export const POLICY_TOOLS: ToolSpec[] = [policyLookupTool];

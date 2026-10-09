import { cookies } from "next/headers";
import { agentCookieName, isValidAgentSession } from "@/lib/admin-auth";
import AgentLogin from "./login";
import AgentPortal from "./portal";

export default async function AgentPage() {
  const session = (await cookies()).get(agentCookieName)?.value;

  if (!isValidAgentSession(session)) return <AgentLogin />;

  return <AgentPortal />;
}
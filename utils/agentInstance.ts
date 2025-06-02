import { TradingAgent } from "./TradingAgent";

export class AgentInstance{
   private static instance: TradingAgent | null = null;

   public static getInstance(): TradingAgent {
      if (AgentInstance.instance === null) {
         AgentInstance.instance = new TradingAgent();
      }
      
      return AgentInstance.instance;
   }

   private constructor() {}
}

export const agentInstance = AgentInstance.getInstance();
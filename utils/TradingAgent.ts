import * as db from "./db";
import axios from "axios";
import { ChatSecret, Secret } from "secret-ai-sdk-ts";
import { Wallet, SecretNetworkClient, TxResponse } from "secretjs";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  BaseMessageLike,
} from "@langchain/core/messages";
import { msgBuyScrt } from "./shade";
import { storageClient } from "./arweaveStorageClient";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class TradingAgent {
  private secretClient: Secret;
  private models: string[] = [];
  private urls: string[] = [];
  private secretAiLlm: ChatSecret;
  private lcdClient: SecretNetworkClient;
  private wallet: Wallet;
  public isInitialized: boolean = false;

  private readonly LCD_URL =
    process.env.LCD_URL || "https://rpc.ankr.com/http/scrt_cosmos";
  private readonly CHAIN_ID = process.env.CHAIN_ID || "secret-4";
  private readonly MNEMONIC = process.env.MNEMONIC;

  constructor() {
    if (!this.MNEMONIC) {
      throw new Error("MNEMONIC environment variable is not set.");
    }

    this.secretClient = new Secret();

    this.wallet = new Wallet(this.MNEMONIC);

    this.lcdClient = new SecretNetworkClient({
      url: this.LCD_URL,
      chainId: this.CHAIN_ID,
      wallet: this.wallet,
      walletAddress: this.wallet.address,
    });

    this.secretAiLlm = {} as ChatSecret;
  }

  async initialize(): Promise<void> {
    console.log("Initializing Trading Agent...");

    try {
      this.models = await this.secretClient.getModels();
      if (this.models.length === 0) {
        throw new Error("No models found via Secret client.");
      }
      console.log("Available models:", this.models);

      this.urls = await this.secretClient.getUrls(this.models[0]);
      if (this.urls.length === 0) {
        throw new Error(`No URLs found for model ${this.models[0]}.`);
      }
      console.log(`URLs for model ${this.models[0]}:`, this.urls);

      this.secretAiLlm = new ChatSecret({
        baseUrl: this.urls[0],
        model: this.models[0],
        temperature: 1.0,
      });
      console.log("Secret AI LLM Initialized.");
    } catch (error) {
      console.error("Error initializing Secret AI components:", error);
      throw new Error(
        "Failed to initialize Secret AI components. Check network connection and contract addresses.",
      );
    }

    console.log("Trading Agent Initialized Successfully.");
    console.log("Secret Wallet Address:", this.wallet.address);
    this.isInitialized = true;
  }

  async loadPersistentMemory(user_id: string): Promise<BaseMessageLike[]> {
    let history = await storageClient.getMemoryFromArweave(user_id);
    if (history.length > 0) {
      console.log("History from Arweave found(entries): ", history.length);
    }

    if (history.length === 0) {
      history = await db.getMemory(user_id);
      console.log("History from DB found(entries): ", history.length);
    }

    const messages: BaseMessageLike[] = [];
    history.forEach((item) => {
      messages.push(new HumanMessage(item.message));
      messages.push(new AIMessage(item.response));
    });

    return messages;
  }

  async getHistory(user_id: string): Promise<{
    message: string;
    response: string;
  }[]> {
    let history = await storageClient.getMemoryFromArweave(user_id);
    if (history.length > 0) {
      console.log("History from Arweave found(entries): ", history.length);
    }

    if (history.length === 0) {
      history = await db.getMemory(user_id);
    }

    return history;
  }

  private async getKanyeQuote(): Promise<string> {
    try {
      const response = await axios.get<{ quote: string }>(
        "https://api.kanye.rest/",
      );
      return response.data.quote || "Kanye is beyond words.";
    } catch (error) {
      console.warn("Failed to fetch Kanye quote:", error);
      return "Kanye is beyond words.";
    }
  }

  async chat(user_id: string, user_message: string): Promise<string> {
    if (user_message.toLowerCase() === "you have convinced me") {
      await db.updateConvinced(user_id);

      const tradeResult = await this.trade(user_id);
      const aiResponseContent = `I have convinced you to trade. Here is the result of the trade:\n\n${tradeResult}`;
      await db.storeMemory(user_id, user_message, aiResponseContent);
      await storageClient.storeMemoryOnArweave(
        user_id,
        user_message,
        aiResponseContent,
      );
      return aiResponseContent;
    }

    const pastConversations = await this.loadPersistentMemory(user_id);

    const messages: BaseMessageLike[] = [
      new SystemMessage(
        "You are my $SCRT trading agent. You must convince me to let you trade USDC for SCRT.",
      ),
      ...pastConversations,
      new HumanMessage(user_message),
    ];

    let aiResponseContent = "";
    try {
      // Ensure LLM is initialized
      if (!this.secretAiLlm?.invoke) {
        console.error("LLM not initialized yet. Call initialize() first.");
        return "Error: AI Agent is not fully initialized.";
      }
      const response = await this.secretAiLlm.invoke(messages); // stream=False is default
      aiResponseContent =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      // Easter egg: If user mentions Kanye, append a quote
      if (user_message.toLowerCase().includes("kanye")) {
        const quote = await this.getKanyeQuote();
        aiResponseContent += `\n\nKanye says: "${quote}"`;
      }
    } catch (error: any) {
      console.error("Error invoking LLM:", error);
      aiResponseContent = `Sorry, I encountered an error: ${error.message}`;
    }

    await db.storeMemory(user_id, user_message, aiResponseContent);
    await storageClient.storeMemoryOnArweave(
      user_id,
      user_message,
      aiResponseContent,
    );
    return aiResponseContent;
  }

  async getUser(user_id: string) {
    const user = await db.getUser(user_id);

    return user;
  }

  async createUser(user_id: string) {
    const user = await db.getUser(user_id);
    console.log("user --->", user);
    if (!user) {
      await db.createUser(user_id);
    }

    return await db.getUser(user_id)!;
  }

  async checkAllowedToSpend(user_id: string): Promise<void> {
    const sScrtCodeHash = "af74387e276be8874f07bec3a87023ee49b0e7ebe08178c49d0a49c3c98ed60e";
    const sScrtAddress = "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek";
    const sUsdcAddress = "secret1vkq022x4q8t8kx9de3r84u669l65xnwf2lg3e6";
    const sUsdcCodeHash =
      "638a3e1d50175fbcb8373cf801565283e3eb23d88a9b7b7f99fcc5eb1e6b561e"; // From python code

    const user = await db.getUser(user_id);
    if (!user) {
      throw new Error("User not found");
    }
    let hasAllowedToSpendSscrt = false;
    let hasAllowedToSpendSusdc = false;
    try {
      const sscrtAllowance = await this.lcdClient.query.snip20.GetAllowance({
        contract: {
          address: sScrtAddress,
          code_hash: sScrtCodeHash,
        },
        owner: user.wallet_address,
        spender: this.wallet.address,
        auth: {
          key: user.sscrt_key || "",
        },
      })
      console.log("sscrtAllowance", sscrtAllowance);
      if (parseFloat(sscrtAllowance.allowance.allowance) > 0) {
        hasAllowedToSpendSscrt = true;
      }
      const susdcAllowance = await this.lcdClient.query.snip20.GetAllowance({
        owner: user_id,
        spender: this.wallet.address,
        auth: {
          key: user.susdc_key || "",
        },
        contract: {
          address: sUsdcAddress,
          code_hash: sUsdcCodeHash,
        },
      })
      console.log("susdcAllowance", susdcAllowance);
      if (parseFloat(susdcAllowance.allowance.allowance) > 0) {
        hasAllowedToSpendSusdc = true;
      }

      if (hasAllowedToSpendSscrt && hasAllowedToSpendSusdc) {
        await db.setAllowedToSpend(user_id);
      }

    } catch (error) {
      console.error("Error checking sscrt allowance:", error);
      throw error;
    }
  }

  async setViewingKeys(user_id: string, sscrt_key: string, susdc_key: string) {
    await db.setViewingKeys(user_id, sscrt_key, susdc_key);
  }

  async checkTradingStatus(user_id: string): Promise<number> {
    return db.checkConvinced(user_id);
  }

  getAgentSecretAddress(): string {
    if (!this.wallet.address) throw Error("Wallet address not initialized");

    return this.wallet.address;
  }

  async trade(user_id: string): Promise<string> {
    const isConvinced = await db.checkConvinced(user_id);
    if (isConvinced === 1) {
      try {
        console.log("Executing transaction...");
        const amountUsdc = "300000";
        const buyMsg = msgBuyScrt(this.wallet.address, amountUsdc, user_id);

        const tx = await this.lcdClient.tx.broadcast([buyMsg], {
          gasLimit: 3_500_000,
          gasPriceInFeeDenom: 0.1,
          feeDenom: "uscrt",
        });

        console.log("Transaction broadcasted:", tx.transactionHash);

        console.log(
          "Waiting for transaction confirmation (approx 8 seconds)...",
        );
        await sleep(8000);

        let txInfo: TxResponse | null = null;
        try {
          txInfo = await this.lcdClient.query.getTx(tx.transactionHash);
          console.log("Transaction Info:", txInfo);
        } catch (fetchError: any) {
          console.warn(
            `Could not fetch TxInfo after 8s: ${fetchError.message}. Transaction might still be processing.`,
          );
        }

        if (tx.code === 0) {
          return `Transaction executed successfully!\nHash: ${tx.transactionHash}\nRaw Log: ${tx.rawLog}\nTxInfo: ${txInfo ? JSON.stringify(txInfo) : "Not available yet"}`;
        } else {
          return `Transaction failed with code ${tx.code}.\nHash: ${tx.transactionHash}\nRaw Log: ${tx.rawLog}`;
        }
      } catch (error: any) {
        console.error("Error executing transaction:", error);
        const errorMessage =
          error.response?.data?.message || error.message || "Unknown error";
        return `Error executing transaction: ${errorMessage}`;
      }
    } else {
      return "Trading is not yet enabled. Convince me first!";
    }
  }
}

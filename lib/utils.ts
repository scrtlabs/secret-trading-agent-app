import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ChainInfo, OfflineAminoSigner } from "@keplr-wallet/types"
import { chainRegistryChainToKeplr } from "@chain-registry/keplr"
import { assets, chains } from 'chain-registry';
import { SigningStargateClient } from "@cosmjs/stargate";
import { SecretNetworkClient } from "secretjs";
import { BalanceResponse } from "./types";
import { SECRET_CHAIN_ID } from "./constants";
import { SECRET_LCD } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const setupKeplr = async () => {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const secretChain = chains.find(({ chain_name }) => chain_name === 'secretnetwork');
  const nobleChain = chains.find(({ chain_name }) => chain_name === 'noble');
  while (
    !window.keplr ||
    !window.getEnigmaUtils ||
    !window.getOfflineSignerOnlyAmino
  ) {
    await sleep(50);
  }

  if (!secretChain) throw Error("Failed to find secret network chain info.")
  if (!nobleChain) throw Error("Failed to find noble chain info.")

  const keplrSecretChain: ChainInfo = chainRegistryChainToKeplr(secretChain, assets, {
    getExplorer: () => "https://www.mintscan.io/secret",
    getRestEndpoint: (chain) => chain.apis?.rest?.[1]?.address ?? "",
    getRpcEndpoint: (chain) => chain.apis?.rpc?.[1]?.address ?? "",
  });
  const keplrNobleChain: ChainInfo = chainRegistryChainToKeplr(nobleChain, assets, {
    getExplorer: () => "https://www.mintscan.io/noble",
    getRestEndpoint: (chain) => chain.apis?.rest?.[1]?.address ?? "",
    getRpcEndpoint: (chain) => chain.apis?.rpc?.[1]?.address ?? "",
  });

  await window.keplr.experimentalSuggestChain(keplrSecretChain)
  await window.keplr.experimentalSuggestChain(keplrNobleChain)

  await window.keplr.enable(secretChain.chain_id);
  await window.keplr.enable(nobleChain.chain_id);
  window.keplr.defaultOptions = {
    sign: {
      preferNoSetFee: false,
      disableBalanceCheck: true,
    },
  };

  const keplrSecretOfflineSigner =
    window.getOfflineSignerOnlyAmino(secretChain.chain_id);
  const keplrNobleOfflineSigner =
    window.getOfflineSignerOnlyAmino(nobleChain.chain_id);
  const secretAccounts = await keplrSecretOfflineSigner.getAccounts();
  const nobleAccounts = await keplrNobleOfflineSigner.getAccounts();

  const secretAddress = secretAccounts[0].address;
  const nobleAddress = nobleAccounts[0].address;

  // const secretjs = new SecretNetworkClient({
  //   url: SECRET_LCD,
  //   chainId: SECRET_CHAIN_ID,
  //   wallet: keplrOfflineSigner,
  //   walletAddress: secretAddress,
  //   encryptionUtils: window.getEnigmaUtils(SECRET_CHAIN_ID),
  // });

  return { secretAddress, nobleAddress, secretSigner: keplrSecretOfflineSigner, nobleSigner: keplrNobleOfflineSigner, secretChain: keplrSecretChain, nobleChain: keplrNobleChain };

  // setSecretjs(secretjs);
}

export const createStarGateClient = async (chain: ChainInfo, signer: OfflineAminoSigner) => {
  const signingClient = await SigningStargateClient.connectWithSigner(
    chain.rpc,
    signer,
  )

  return signingClient;
}

export const formatAmount = (amount: string, decimals: number) => {
  return Number(amount) / 10 ** decimals
}

export const truncateAddress = (address: string) => {
  return address.slice(0, 8) + "..." + address.slice(-8);
}

export const getSnip20Balance = async (tokenAddress: string, viewingKey: string | undefined, lcdClient: SecretNetworkClient, userAddress: string): Promise<string> => {
  if (!viewingKey) {
    throw new Error("Viewing key not set");
  }

  try {
    const query = { balance: { address: userAddress, key: viewingKey } }
    const result = await lcdClient.query.compute.queryContract({ contract_address: tokenAddress, query }) as BalanceResponse;
    debugger
    return result.balance.amount;
  } catch (error: any) {
    console.error(`Error querying balance for ${tokenAddress}:`, error.message);
    return `Error querying balance (${error.message})`;
  }
}

export const generateViewingKey = async() => {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0")
  ).join("");
}

export const secretLCDClient = (secretAddress: string, secretSigner: OfflineAminoSigner) => {
  return new SecretNetworkClient({
    url: SECRET_LCD,
    chainId: SECRET_CHAIN_ID,
    wallet: secretSigner,
    walletAddress: secretAddress,
  })
}
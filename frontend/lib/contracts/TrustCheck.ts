"use client";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  type Address,
} from "viem";

import {
  getEthereumProvider,
  getContractAddress,
  switchToGenLayerNetwork,
} from "@/lib/genlayer/client";

const GENLAYER_CHAIN = {
  id: 61999,
  name: "GenLayer Studio",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://studio.genlayer.com/api"],
    },
  },
} as const;

const TRUST_CHECK_ABI = [
  {
    type: "function",
    name: "verify",
    stateMutability: "nonpayable",
    inputs: [
      { name: "url", type: "string" },
      { name: "claim", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "get_result",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export type ConsensusStatus =
  | "PENDING"
  | "PROPOSING"
  | "COMMITTING"
  | "REVEALING"
  | "ACCEPTED"
  | "FINALIZED"
  | "CANCELED"
  | "UNDETERMINED"
  | "UNKNOWN";

export type VerificationResult = {
  verdict: "TRUE" | "FALSE" | "UNCERTAIN";
  reason: string;
};

export async function verifyClaim(
  url: string,
  claim: string,
  address: Address
): Promise<`0x${string}`> {
  const provider = getEthereumProvider();

  if (!provider) {
    throw new Error("MetaMask is not installed");
  }

  const contractAddress = getContractAddress();

  if (!contractAddress) {
    throw new Error("TrustCheck contract address is not configured");
  }

  await switchToGenLayerNetwork();

  const walletClient = createWalletClient({
    account: address,
    chain: GENLAYER_CHAIN as any,
    transport: custom(provider),
  });

  const hash = await (walletClient.writeContract as any)({
    address: contractAddress as Address,
    abi: TRUST_CHECK_ABI,
    functionName: "verify",
    args: [url, claim],
  });

  return hash;
}

export async function getTransactionStatus(
  txHash: string
): Promise<{ status: ConsensusStatus }> {
  const response = await fetch(
    "https://studio.genlayer.com/api",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionReceipt",
        params: [txHash],
        id: Date.now(),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `RPC request failed: ${response.status}`
    );
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(
      data.error.message || "Failed to get transaction status"
    );
  }

  const receipt = data.result;

  if (!receipt) {
    return {
      status: "PENDING",
    };
  }

  const status = Number(receipt.status);

  if (status === 1 || status === 7) {
    return {
      status: "FINALIZED",
    };
  }

  if (status === 6) {
    return {
      status: "ACCEPTED",
    };
  }

  return {
    status: "UNKNOWN",
  };
}

export async function getVerificationResult(): Promise<VerificationResult> {
  const contractAddress = getContractAddress();

  if (!contractAddress) {
    throw new Error("TrustCheck contract address is not configured");
  }

  try {
    const config: any = {
      chain: studionet,
    };

    const studioUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL;

    if (studioUrl) {
      config.endpoint = studioUrl;
    }

    const client: any = createClient(config);

    const result = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: "get_result",
      args: [],
    });

    console.log("GenLayer get_result:", result);

    if (typeof result !== "string") {
      throw new Error("Unexpected verification result type.");
    }

    const parsed = JSON.parse(result) as VerificationResult;

    if (
      parsed.verdict !== "TRUE" &&
      parsed.verdict !== "FALSE" &&
      parsed.verdict !== "UNCERTAIN"
    ) {
      throw new Error("Invalid verification verdict.");
    }

    return parsed;
  } catch (error) {
    console.error("Failed to read verification result:", error);
    throw new Error("Failed to read verification result.");
  }
}

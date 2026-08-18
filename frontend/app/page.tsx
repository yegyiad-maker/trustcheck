"use client";

import { useState } from "react";
import {
  verifyClaim,
  getTransactionStatus,
  getVerificationResult,
  type ConsensusStatus,
} from "@/lib/contracts/TrustCheck";
import { useWallet } from "@/lib/genlayer/wallet";

type Step = "idle" | "submit" | "consensus" | "result" | "error";

type VerificationResult = {
  verdict: "TRUE" | "FALSE" | "UNCERTAIN";
  reason: string;
};

export default function HomePage() {
  const { address, isConnected, connectWallet } = useWallet();

  const [url, setUrl] = useState("");
  const [claim, setClaim] = useState("");

  const [step, setStep] = useState<Step>("idle");
  const [status, setStatus] = useState<ConsensusStatus>("UNKNOWN");

  const [txHash, setTxHash] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const waitForFinalization = async (hash: string) => {
    const maxAttempts = 120;

    for (let i = 0; i < maxAttempts; i++) {
      const txStatus = await getTransactionStatus(hash);

      const currentStatus = txStatus.status || "UNKNOWN";
      setStatus(currentStatus);

      if (currentStatus === "FINALIZED") {
        return;
      }

      if (
        currentStatus === "CANCELED" ||
        currentStatus === "UNDETERMINED"
      ) {
        throw new Error(
          `Transaction ended with status: ${currentStatus}`
        );
      }

      await sleep(5000);
    }

    throw new Error(
      "Verification is taking too long. Please check the transaction later."
    );
  };

  const handleVerify = async () => {
    if (!isConnected || !address) {
      try {
        await connectWallet();
      } catch (err: any) {
        setError(err?.message || "Failed to connect wallet.");
      }
      return;
    }

    if (!url.trim()) {
      setError("Please enter a source URL.");
      return;
    }

    if (!claim.trim()) {
      setError("Please enter a claim to verify.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);
      setTxHash("");
      setStatus("UNKNOWN");

      setStep("submit");

      const hash = await verifyClaim(
        url.trim(),
        claim.trim(),
        address as `0x${string}`
      );

      setTxHash(hash);

      setStep("consensus");

      await waitForFinalization(hash);

      const verification = await getVerificationResult();

      setResult(verification);
      setStep("result");
    } catch (err: any) {
      console.error(err);

      setStep("error");
      setError(
        err?.message ||
          "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (value: ConsensusStatus) => {
    switch (value) {
      case "PENDING":
        return "Transaction pending";
      case "PROPOSING":
        return "Validators are proposing";
      case "COMMITTING":
        return "Validators are committing";
      case "REVEALING":
        return "Validators are revealing";
      case "ACCEPTED":
        return "Consensus accepted";
      case "FINALIZED":
        return "Transaction finalized";
      default:
        return "Waiting for validators...";
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12">

        {/* Header */}
        <div className="text-center">
          <div className="mb-4 text-sm font-semibold tracking-[0.3em] text-primary">
            GENLAYER PROJECT
          </div>

          <h1 className="text-5xl font-bold tracking-tight">
            TrustCheck
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            AI-powered fact checking with GenLayer Intelligent
            Contracts. Submit a source and claim, then let
            decentralized AI consensus determine whether the claim
            is supported.
          </p>
        </div>

        {/* Form */}
        <div className="mt-12 rounded-2xl border bg-card p-8 shadow-sm">
          <div className="space-y-6">

            <div>
              <label className="mb-2 block text-sm font-medium">
                Source URL
              </label>

              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                disabled={loading}
                className="w-full rounded-lg border bg-background px-4 py-3 outline-none focus:ring-2 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Claim to Verify
              </label>

              <textarea
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                placeholder="Enter the statement you want to fact-check..."
                rows={4}
                disabled={loading}
                className="w-full resize-none rounded-lg border bg-background px-4 py-3 outline-none focus:ring-2 disabled:opacity-60"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
                {error}
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full rounded-lg bg-primary px-6 py-4 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : isConnected
                  ? "Verify Claim"
                  : "Connect Wallet"}
            </button>
          </div>
        </div>

        {/* Progress */}
        {(step === "submit" || step === "consensus" || step === "result") && (
          <div className="mt-10 rounded-2xl border bg-card p-8">

            <h2 className="text-xl font-bold">
              Verification Progress
            </h2>

            <div className="mt-8 space-y-6">

              {/* Step 1 */}
              <div className="flex gap-4">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    step === "submit" || step === "consensus" || step === "result"
                      ? "bg-green-500 text-white"
                      : "border"
                  }`}
                >
                  ✓
                </div>

                <div>
                  <h3 className="font-semibold">
                    1. Submit
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Transaction submitted to GenLayer.
                  </p>

                  {txHash && (
                    <p className="mt-2 break-all text-xs text-muted-foreground">
                      {txHash}
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    step === "consensus"
                      ? "animate-pulse bg-yellow-500 text-white"
                      : step === "result"
                        ? "bg-green-500 text-white"
                        : "border"
                  }`}
                >
                  {step === "result" ? "✓" : "2"}
                </div>

                <div>
                  <h3 className="font-semibold">
                    2. AI Consensus
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {step === "consensus"
                      ? statusLabel(status)
                      : step === "result"
                        ? "Validators reached final consensus."
                        : "Waiting for transaction submission."}
                  </p>

                  {step === "consensus" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        "PENDING",
                        "PROPOSING",
                        "COMMITTING",
                        "REVEALING",
                        "FINALIZED",
                      ].map((item) => (
                        <span
                          key={item}
                          className={`rounded-full border px-3 py-1 text-xs ${
                            status === item
                              ? "border-primary bg-primary/10 text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    result
                      ? "bg-green-500 text-white"
                      : "border"
                  }`}
                >
                  {result ? "✓" : "3"}
                </div>

                <div className="w-full">
                  <h3 className="font-semibold">
                    3. Result
                  </h3>

                  {!result && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Waiting for consensus result...
                    </p>
                  )}

                  {result && (
                    <div className="mt-4 rounded-xl border p-6">

                      <div
                        className={`text-center text-4xl font-black ${
                          result.verdict === "TRUE"
                            ? "text-green-500"
                            : result.verdict === "FALSE"
                              ? "text-red-500"
                              : "text-yellow-500"
                        }`}
                      >
                        {result.verdict}
                      </div>

                      <div className="mt-5">
                        <p className="text-sm font-semibold">
                          Reason
                        </p>

                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {result.reason}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-10 grid gap-4 md:grid-cols-3">

          <div className="rounded-xl border p-5">
            <h3 className="font-semibold">
              1. Submit
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Provide a webpage and the claim you want to verify.
            </p>
          </div>

          <div className="rounded-xl border p-5">
            <h3 className="font-semibold">
              2. AI Consensus
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              GenLayer validators independently analyze the
              webpage and reach consensus.
            </p>
          </div>

          <div className="rounded-xl border p-5">
            <h3 className="font-semibold">
              3. Result
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Receive a TRUE, FALSE, or UNCERTAIN verdict with
              an explanation.
            </p>
          </div>

        </div>

        <footer className="mt-16 text-center text-sm text-muted-foreground">
          Powered by GenLayer Intelligent Contracts
        </footer>
      </div>
    </main>
  );
}

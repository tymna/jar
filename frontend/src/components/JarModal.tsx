"use client";

import { useEffect, useRef, useState } from "react";
import {
  type BaseError,
  erc20Abi,
  formatUnits,
  parseUnits,
  zeroAddress,
} from "viem";
import {
  useAccount,
  useReadContracts,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { jarAbi } from "@/constants";
import { schema } from "@/lib/ponder";
import { config } from "@/wagmi";

type Jar = typeof schema.jar.$inferSelect;

export default function JarModal({
  jar,
  onClose,
}: {
  jar: Jar | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = jar !== null;

  // Native <dialog> is imperative; keep it in sync with the `jar` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // onClose also catches the native Esc-key dismiss.
    <dialog ref={dialogRef} onClose={onClose}>
      {/* Keyed so all action state resets when another jar is opened. */}
      {jar && <JarActions key={`${jar.chainId}-${jar.address}`} jar={jar} />}
      <button type="button" onClick={onClose}>
        close
      </button>
    </dialog>
  );
}

function JarActions({ jar }: { jar: Jar }) {
  const { address, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const chain = config.chains.find((c) => c.id === jar.chainId);

  const [amount, setAmount] = useState("");
  const [goal, setGoal] = useState("");

  const isClosed = jar.status === "CLOSED";

  // Symbol/decimals live on the token contract; allowance gates deposit.
  // allowFailure keeps a single failing call from wedging the modal on "…".
  const { data: token, refetch: refetchToken } = useReadContracts({
    contracts: [
      {
        address: jar.token,
        abi: erc20Abi,
        functionName: "symbol",
        chainId: jar.chainId,
      },
      {
        address: jar.token,
        abi: erc20Abi,
        functionName: "decimals",
        chainId: jar.chainId,
      },
      {
        address: jar.token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address ?? zeroAddress, jar.address],
        chainId: jar.chainId,
      },
    ],
    allowFailure: true,
    query: { enabled: address !== undefined },
  });
  const symbol = token?.[0]?.result;
  const decimals = token?.[1]?.result;
  const allowance = token?.[2]?.result;

  const {
    mutate: write,
    data: txHash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash, chainId: jar.chainId });
  const busy = isPending || isConfirming;

  // A confirmed approve changes the allowance, which flips the deposit
  // button's label. Jar balance/goal update on their own via the live query.
  useEffect(() => {
    if (isConfirmed) refetchToken();
  }, [isConfirmed, refetchToken]);

  const parsedAmount =
    decimals !== undefined && amount !== ""
      ? parseUnits(amount, decimals)
      : undefined;
  const needsApprove =
    parsedAmount !== undefined &&
    allowance !== undefined &&
    allowance < parsedAmount;

  function handleDeposit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (parsedAmount === undefined) return;
    // Clear any prior action's success/error before starting a new one.
    reset();
    if (needsApprove) {
      write({
        address: jar.token,
        abi: erc20Abi,
        functionName: "approve",
        args: [jar.address, parsedAmount],
        chainId: jar.chainId,
      });
    } else {
      write(
        {
          address: jar.address,
          abi: jarAbi,
          functionName: "deposit",
          args: [parsedAmount],
          chainId: jar.chainId,
        },
        // Signed and sent — clear the input for the next action.
        { onSuccess: () => setAmount("") },
      );
    }
  }

  function handleChangeGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (decimals === undefined || goal === "") return;
    const parsedGoal = parseUnits(goal, decimals);
    if (parsedGoal <= 0n) return; // reverts on-chain otherwise
    reset();
    write(
      {
        address: jar.address,
        abi: jarAbi,
        functionName: "changeGoal",
        args: [parsedGoal],
        chainId: jar.chainId,
      },
      { onSuccess: () => setGoal("") },
    );
  }

  function handleWithdrawAll() {
    // withdrawAll empties the jar AND permanently closes it — confirm first.
    if (!window.confirm("Withdraw everything and permanently close this jar?"))
      return;
    reset();
    write({
      address: jar.address,
      abi: jarAbi,
      functionName: "withdrawAll",
      chainId: jar.chainId,
    });
  }

  return (
    <div className="flex w-72 flex-col gap-4 text-center">
      <header className="flex items-center justify-between">
        <span>{chain ? chain.name : `chain ${jar.chainId}`}</span>
        <span>
          {decimals !== undefined
            ? `${formatUnits(jar.balance, decimals)}/${formatUnits(jar.goal, decimals)}`
            : "…"}
        </span>
        <span>{symbol ?? "…"}</span>
      </header>
      <p>{jar.name}</p>
      {isClosed ? (
        <p>this jar is closed</p>
      ) : chainId !== jar.chainId ? (
        <button
          type="button"
          disabled={isSwitching}
          onClick={() => switchChain({ chainId: jar.chainId })}
        >
          {isSwitching
            ? "switching…"
            : `switch to ${chain ? chain.name : jar.chainId}`}
        </button>
      ) : (
        <>
          <form onSubmit={handleDeposit} className="flex justify-center gap-2">
            <input
              type="number"
              required
              min="0"
              step="any"
              placeholder="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button type="submit" disabled={busy || parsedAmount === undefined}>
              {busy ? "…" : needsApprove ? "approve" : "deposit"}
            </button>
          </form>
          <button type="button" disabled={busy} onClick={handleWithdrawAll}>
            {busy ? "…" : "withdraw all (closes jar)"}
          </button>
          <form
            onSubmit={handleChangeGoal}
            className="flex justify-center gap-2"
          >
            <input
              type="number"
              required
              min="0"
              step="any"
              placeholder="new goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            <button type="submit" disabled={busy || goal === ""}>
              {busy ? "…" : "change goal"}
            </button>
          </form>
        </>
      )}
      {error && <p>{(error as BaseError).shortMessage ?? error.message}</p>}
      {isConfirmed && <p>done ✓</p>}
    </div>
  );
}

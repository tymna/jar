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

import { useToast } from "@/components/Toast";
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

  // Close on backdrop tap: the dialog only receives the click itself when
  // the press lands outside its children, and the rect check excludes the
  // dialog's own padding — so only true outside-the-box clicks dismiss.
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const inside =
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom;
    if (!inside) e.currentTarget.close();
  }

  return (
    // onClose also catches the native Esc-key dismiss. Plain rounded card —
    // only jar cards get the jar silhouette; the modal stays a neutral block.
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleBackdropClick}
      className="m-auto scale-125 rounded-2xl border-2 border-black bg-white p-10 backdrop:bg-black/30 backdrop:backdrop-blur-md"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="close"
        className="absolute top-4 right-4 text-xl leading-none text-neutral-400 transition-colors duration-100 hover:text-black"
      >
        ×
      </button>
      {/* Keyed so all action state resets when another jar is opened. */}
      {jar && (
        <JarActions
          key={`${jar.chainId}-${jar.address}`}
          jar={jar}
          onClose={onClose}
        />
      )}
    </dialog>
  );
}

function JarActions({ jar, onClose }: { jar: Jar; onClose: () => void }) {
  const { address, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const chain = config.chains.find((c) => c.id === jar.chainId);
  // Deep-link to the jar contract on the chain's explorer, when it has one.
  const explorerUrl = chain?.blockExplorers?.default?.url
    ? `${chain.blockExplorers.default.url}/address/${jar.address}`
    : undefined;

  const [amount, setAmount] = useState("");
  const [goal, setGoal] = useState("");
  // The goal input is tucked behind an edit button next to the target, so the
  // modal isn't dominated by a form most people touch once.
  const [editingGoal, setEditingGoal] = useState(false);

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
      {
        address: jar.token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address ?? zeroAddress],
        chainId: jar.chainId,
      },
    ],
    allowFailure: true,
    query: { enabled: address !== undefined },
  });
  const symbol = token?.[0]?.result;
  const decimals = token?.[1]?.result;
  const allowance = token?.[2]?.result;
  const walletBalance = token?.[3]?.result;

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
  // Every confirmed tx is announced via toast (with its hash) and closes the
  // modal — EXCEPT approve, which is a mid-flow step: the user still has to
  // press deposit, so the modal stays open for it.
  const lastActionRef = useRef<"approve" | "tx">("tx");
  // One toast per tx: the effect's deps (onClose, refetchToken) change
  // identity across renders, so without this guard a confirmed tx would
  // re-toast on every parent re-render.
  const toastedTxRef = useRef<string | null>(null);
  const toast = useToast();
  useEffect(() => {
    if (!isConfirmed || txHash === toastedTxRef.current) return;
    toastedTxRef.current = txHash ?? null;
    refetchToken();
    if (txHash) {
      const txUrl = chain?.blockExplorers?.default?.url
        ? `${chain.blockExplorers.default.url}/tx/${txHash}`
        : undefined;
      const shortHash = `${txHash.slice(0, 10)}…${txHash.slice(-6)}`;
      toast({
        message:
          lastActionRef.current === "approve"
            ? "✓ approved — now deposit"
            : "✓ transaction confirmed",
        link: txUrl ? { label: shortHash, href: txUrl } : undefined,
      });
      if (lastActionRef.current !== "approve") onClose();
    }
  }, [isConfirmed, refetchToken, txHash, toast, chain, onClose]);

  const parsedAmount =
    decimals !== undefined && amount !== ""
      ? parseUnits(amount, decimals)
      : undefined;
  const needsApprove =
    parsedAmount !== undefined &&
    allowance !== undefined &&
    allowance < parsedAmount;
  // Can't deposit more than the wallet holds — the transfer would revert.
  const exceedsBalance =
    parsedAmount !== undefined &&
    walletBalance !== undefined &&
    parsedAmount > walletBalance;

  function handleDeposit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (parsedAmount === undefined || exceedsBalance) return;
    // Clear any prior action's success/error before starting a new one.
    reset();
    lastActionRef.current = needsApprove ? "approve" : "tx";
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
    lastActionRef.current = "tx";
    write(
      {
        address: jar.address,
        abi: jarAbi,
        functionName: "changeGoal",
        args: [parsedGoal],
        chainId: jar.chainId,
      },
      {
        onSuccess: () => {
          setGoal("");
          setEditingGoal(false);
        },
      },
    );
  }

  // An empty jar has nothing to withdraw — withdrawAll just closes it, so the
  // wording shifts from "withdraw" to "close".
  const isEmpty = jar.balance === 0n;

  // No confirmation step — the wallet prompt is the confirmation.
  function handleWithdrawAll() {
    reset();
    lastActionRef.current = "tx";
    write({
      address: jar.address,
      abi: jarAbi,
      functionName: "withdrawAll",
      chainId: jar.chainId,
    });
  }

  // Same clamped fill as the card, as a slim bar here.
  const pct =
    jar.goal > 0n ? Math.min(100, Number((jar.balance * 100n) / jar.goal)) : 0;

  const inputClass =
    "w-full min-w-0 border-2 border-black px-3 py-2 text-sm focus:border-cherry focus:outline-none";

  return (
    <div className="flex w-80 flex-col gap-5">
      <header className="pr-6">
        <p className="line-clamp-2 font-display text-3xl leading-tight break-words">
          {jar.name}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {chain ? chain.name : `chain ${jar.chainId}`}
          {explorerUrl && (
            <>
              {" · "}
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-cherry"
              >
                {`${jar.address.slice(0, 6)}…${jar.address.slice(-4)}`}
              </a>
            </>
          )}
        </p>
      </header>
      <div>
        <div className="h-3 border-2 border-black">
          <div
            className="h-full bg-cherry transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="text-xs font-bold">
            {decimals !== undefined
              ? `${formatUnits(jar.balance, decimals)} / ${formatUnits(jar.goal, decimals)} ${symbol ?? "…"}`
              : "…"}
          </p>
          {!isClosed && chainId === jar.chainId && (
            <button
              type="button"
              onClick={() => setEditingGoal((v) => !v)}
              aria-label="edit goal"
              aria-expanded={editingGoal}
              className="text-xs text-neutral-400 transition-colors hover:text-cherry"
            >
              {editingGoal ? "cancel" : "✎ edit goal"}
            </button>
          )}
        </div>
        {editingGoal && (
          <form onSubmit={handleChangeGoal} className="mt-2 flex gap-2">
            <input
              type="number"
              required
              autoFocus
              min="0"
              step="any"
              placeholder="new goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={busy || goal === ""}
              className="block-btn shrink-0 bg-white px-4 py-2 text-sm"
            >
              {busy ? "…" : "save"}
            </button>
          </form>
        )}
      </div>
      {isClosed ? (
        <p className="text-sm text-neutral-500">this jar is closed</p>
      ) : chainId !== jar.chainId ? (
        <button
          type="button"
          disabled={isSwitching}
          onClick={() => switchChain({ chainId: jar.chainId })}
          className="block-btn bg-white px-4 py-2 text-sm"
        >
          {isSwitching
            ? "switching…"
            : `switch to ${chain ? chain.name : jar.chainId}`}
        </button>
      ) : (
        <>
          <form onSubmit={handleDeposit} className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <input
                type="number"
                required
                min="0"
                step="any"
                placeholder="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
              <button
                type="submit"
                disabled={busy || parsedAmount === undefined || exceedsBalance}
                className="block-btn shrink-0 bg-cherry px-4 py-2 text-sm text-white"
              >
                {busy ? "…" : needsApprove ? "approve" : "deposit"}
              </button>
            </div>
            {/* refetched together with allowance after each confirmed tx */}
            <p
              className={`text-xs ${exceedsBalance ? "font-bold text-cherry" : "text-neutral-500"}`}
            >
              {exceedsBalance
                ? "amount exceeds your balance"
                : `available: ${
                    walletBalance !== undefined && decimals !== undefined
                      ? `${formatUnits(walletBalance, decimals)} ${symbol ?? ""}`
                      : "…"
                  }`}
            </p>
          </form>
          <button
            type="button"
            disabled={busy}
            onClick={handleWithdrawAll}
            className="self-center text-xs text-neutral-500 underline hover:text-black disabled:opacity-50"
          >
            {busy
              ? "…"
              : isEmpty
                ? "jar is empty — close it?"
                : "withdraw all (closes jar)"}
          </button>
        </>
      )}
      {error && (
        <p className="text-xs break-words text-cherry">
          {(error as BaseError).shortMessage ?? error.message}
        </p>
      )}
    </div>
  );
}

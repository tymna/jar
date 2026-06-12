"use client";

import { and, eq } from "@ponder/client";
import { usePonderQuery } from "@ponder/react";
import { useEffect, useRef, useState } from "react";
import { type BaseError, erc20Abi, parseUnits } from "viem";
import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { useToast } from "@/components/Toast";
import { FACTORY_ADDRESS, jarFactoryAbi } from "@/constants";
import { schema } from "@/lib/ponder";
import { config } from "@/wagmi";

// Jar creation is scoped to chains with a factory deployment.
const supportedChains = config.chains.filter((c) => c.id in FACTORY_ADDRESS);

export default function CreateJarModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { chainId: walletChainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const [name, setName] = useState("");
  const [token, setToken] = useState<`0x${string}` | "">("");
  const [goal, setGoal] = useState("");

  // The target chain is picked in the form, defaulting to the wallet's chain
  // when that one is supported — switching happens at submit time, not before.
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  // No default — the user picks a chain explicitly ("pick a chain").
  const chainId = selectedChainId ?? undefined;
  const factory = chainId !== undefined ? FACTORY_ADDRESS[chainId] : undefined;
  const needsSwitch = chainId !== undefined && walletChainId !== chainId;

  // Native <dialog> is imperative; keep it in sync with the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const { data: tokens } = usePonderQuery({
    queryFn: (db) =>
      db
        .select()
        .from(schema.allowedToken)
        .where(
          and(
            eq(schema.allowedToken.chainId, chainId ?? 0),
            eq(schema.allowedToken.allowed, true),
          ),
        ),
    enabled: chainId !== undefined,
    // Fallback poll — the live SSE stream dies silently on indexer restarts.
    refetchInterval: 10_000,
  });

  // Goal is entered in human units; decimals come from the token itself.
  const { data: decimals } = useReadContract({
    address: token === "" ? undefined : token,
    abi: erc20Abi,
    functionName: "decimals",
    chainId,
    query: { enabled: token !== "" },
  });

  const {
    mutate: createJar,
    data: txHash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash, chainId });

  // A zero goal passes the form's `required` but reverts on-chain
  // (AmountMustBeGreaterThanZero), so guard for a strictly-positive amount.
  const parsedGoal =
    decimals !== undefined && goal !== "" ? parseUnits(goal, decimals) : undefined;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      needsSwitch ||
      !factory ||
      token === "" ||
      parsedGoal === undefined ||
      parsedGoal <= 0n
    )
      return;
    createJar({
      address: factory,
      abi: jarFactoryAbi,
      functionName: "createJar",
      args: [name, token, parsedGoal],
      chainId,
    });
  }

  function handleClose() {
    reset();
    setName("");
    setToken("");
    setGoal("");
    setSelectedChainId(null);
    onClose();
  }

  // On confirmation the modal closes itself and the toast (with the tx hash)
  // takes over as the success signal — same pattern as JarModal.
  const toast = useToast();
  useEffect(() => {
    if (!isConfirmed || !txHash) return;
    const explorer = supportedChains.find((c) => c.id === chainId)
      ?.blockExplorers?.default?.url;
    toast({
      message: "jar created 🎉",
      link: explorer
        ? {
            label: `${txHash.slice(0, 10)}…${txHash.slice(-6)}`,
            href: `${explorer}/tx/${txHash}`,
          }
        : undefined,
    });
    handleClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleClose is recreated each render
  }, [isConfirmed, txHash, chainId, toast]);

  // Close on backdrop tap — same rect check as JarModal: only clicks outside
  // the dialog box dismiss, never clicks on its own padding.
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const inside =
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom;
    if (!inside) e.currentTarget.close();
  }

  const inputClass =
    "w-full min-w-0 border-2 border-black px-3 py-2 text-sm font-normal focus:border-cherry focus:outline-none";
  const labelClass = "flex flex-col gap-1.5 text-xs font-bold";

  return (
    // onClose also catches the native Esc-key dismiss. Matches JarModal: plain
    // rounded card, blurred backdrop, × in the corner.
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={handleBackdropClick}
      className="m-auto scale-125 rounded-2xl border-2 border-black bg-white p-10 backdrop:bg-black/30 backdrop:backdrop-blur-md"
    >
      <button
        type="button"
        onClick={handleClose}
        aria-label="close"
        className="absolute top-4 right-4 text-xl leading-none text-neutral-400 transition-colors duration-100 hover:text-black"
      >
        ×
      </button>
      {supportedChains.length === 0 ? (
        <p className="w-80 py-8 text-center text-sm text-neutral-500">
          no jar factory deployed yet
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-80 flex-col gap-5 pt-2">
          <label className={labelClass}>
            name
            <input
              type="text"
              required
              maxLength={22}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            chain
            <select
              required
              value={selectedChainId ?? ""}
              onChange={(e) => {
                setSelectedChainId(Number(e.target.value));
                setToken(""); // the token list is per-chain
              }}
              className={`${inputClass} ${selectedChainId == null ? "text-neutral-400" : ""}`}
            >
              <option value="" disabled>
                pick a chain
              </option>
              {supportedChains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            token
            <select
              required
              disabled={chainId === undefined}
              value={token}
              onChange={(e) => setToken(e.target.value as `0x${string}`)}
              className={`${inputClass} disabled:opacity-50 ${token === "" ? "text-neutral-400" : ""}`}
            >
              <option value="" disabled>
                {chainId === undefined
                  ? "pick a chain first"
                  : tokens === undefined
                    ? "loading tokens…"
                    : tokens.length === 0
                      ? "no allowed tokens"
                      : "pick a token"}
              </option>
              {tokens?.map((t) => (
                <option key={t.address} value={t.address}>
                  {t.address}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            goal
            <input
              type="number"
              required
              min="0"
              step="any"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className={inputClass}
            />
          </label>
          {needsSwitch ? (
            // Wallet is on another chain — switch first, then create. Same
            // explicit two-step as JarModal: no silent mid-submit switching.
            <button
              type="button"
              disabled={isSwitching}
              onClick={() => chainId !== undefined && switchChain({ chainId })}
              className="block-btn bg-white px-4 py-2 text-sm"
            >
              {isSwitching
                ? "switching…"
                : `switch to ${supportedChains.find((c) => c.id === chainId)?.name ?? chainId}`}
            </button>
          ) : (
            <button
              type="submit"
              // Stay dimmed until every field is filled with a valid value —
              // not just relying on the form's `required` to block submit.
              disabled={
                isPending ||
                isConfirming ||
                name.trim() === "" ||
                token === "" ||
                parsedGoal === undefined ||
                parsedGoal <= 0n
              }
              className="block-btn bg-cherry px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {isPending
                ? "confirm in wallet…"
                : isConfirming
                  ? "creating…"
                  : "create"}
            </button>
          )}
          {error && (
            <p className="text-xs break-words text-cherry">
              {(error as BaseError).shortMessage ?? error.message}
            </p>
          )}
        </form>
      )}
    </dialog>
  );
}

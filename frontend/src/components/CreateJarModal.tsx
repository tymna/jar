"use client";

import { and, eq } from "@ponder/client";
import { usePonderQuery } from "@ponder/react";
import { useEffect, useRef, useState } from "react";
import { type BaseError, erc20Abi, parseUnits } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { FACTORY_ADDRESS, jarFactoryAbi } from "@/constants";
import { schema } from "@/lib/ponder";

export default function CreateJarModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { chainId } = useAccount();
  const factory = chainId !== undefined ? FACTORY_ADDRESS[chainId] : undefined;

  const [name, setName] = useState("");
  const [token, setToken] = useState<`0x${string}` | "">("");
  const [goal, setGoal] = useState("");

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
  });

  // Goal is entered in human units; decimals come from the token itself.
  const { data: decimals } = useReadContract({
    address: token === "" ? undefined : token,
    abi: erc20Abi,
    functionName: "decimals",
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
    useWaitForTransactionReceipt({ hash: txHash });

  // A zero goal passes the form's `required` but reverts on-chain
  // (AmountMustBeGreaterThanZero), so guard for a strictly-positive amount.
  const parsedGoal =
    decimals !== undefined && goal !== "" ? parseUnits(goal, decimals) : undefined;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!factory || token === "" || parsedGoal === undefined || parsedGoal <= 0n)
      return;
    createJar({
      address: factory,
      abi: jarFactoryAbi,
      functionName: "createJar",
      args: [name, token, parsedGoal],
    });
  }

  function handleClose() {
    reset();
    setName("");
    setToken("");
    setGoal("");
    onClose();
  }

  return (
    // onClose also catches the native Esc-key dismiss.
    <dialog ref={dialogRef} onClose={handleClose}>
      {!factory ? (
        <p>unsupported chain — no jar factory deployed here</p>
      ) : isConfirmed ? (
        <p>jar created 🎉</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>
            name
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            token
            <select
              required
              value={token}
              onChange={(e) => setToken(e.target.value as `0x${string}`)}
            >
              <option value="" disabled>
                {tokens === undefined
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
          <label>
            goal
            <input
              type="number"
              required
              min="0"
              step="any"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={
              isPending ||
              isConfirming ||
              (token !== "" && decimals === undefined) ||
              (goal !== "" && parsedGoal !== undefined && parsedGoal <= 0n)
            }
          >
            {isPending
              ? "confirm in wallet…"
              : isConfirming
                ? "creating…"
                : "create"}
          </button>
          {error && <p>{(error as BaseError).shortMessage ?? error.message}</p>}
        </form>
      )}
      <button type="button" onClick={handleClose}>
        close
      </button>
    </dialog>
  );
}

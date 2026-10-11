import { describe, it, expect } from "vitest";
import { vaultPaymentsAsRecords, mergePaymentLists } from "./vaultPayments";

const ADDRESS = "0x17564734b5225fD427c227BEB8E349663699B477";

const state = {
  address: "0xa9e2dc607ded8a82eba3346aab9a3598162c3bc8",
  payments: [
    {
      id: 3,
      to: ADDRESS,
      amountFormatted: "1001",
      memoText: "HOLD-TEST",
      createdAt: 1760000300,
      status: "Pending",
    },
    {
      id: 2,
      to: ADDRESS,
      amountFormatted: "9.999979",
      memoText: "",
      createdAt: 1760000200,
      status: "Executed",
    },
    {
      id: 1,
      to: ADDRESS,
      amountFormatted: "1001",
      memoText: "REJECT-TEST",
      createdAt: 1760000100,
      status: "Rejected",
    },
    {
      id: 0,
      to: ADDRESS,
      amountFormatted: "5",
      memoText: "",
      createdAt: 1760000000,
      status: "None",
    },
  ],
};

describe("vaultPaymentsAsRecords", () => {
  it("returns an empty list when there is no vault state", () => {
    expect(vaultPaymentsAsRecords(null)).toEqual([]);
    expect(vaultPaymentsAsRecords({})).toEqual([]);
  });

  it("maps vault statuses to the app's statuses and skips unknown ones", () => {
    const records = vaultPaymentsAsRecords(state);
    expect(records.map((r) => r.id)).toEqual([
      "VAULT-3",
      "VAULT-2",
      "VAULT-1",
    ]);
    expect(records.map((r) => r.status)).toEqual([
      "Pending",
      "Completed",
      "Rejected",
    ]);
  });

  it("builds display fields and marks the source as the vault", () => {
    const [pending, executed] = vaultPaymentsAsRecords(state);
    expect(pending.source).toBe("vault");
    expect(pending.recipient).toBe("0x1756...B477");
    expect(pending.address).toBe(ADDRESS);
    expect(pending.amount).toBe(1001);
    expect(pending.memo).toBe("HOLD-TEST");
    expect(pending.date).toBe(new Date(1760000300 * 1000).toISOString());
    expect(executed.amount).toBe(9.999979);
    expect(executed.memo).toBe("No memo");
  });
});

describe("mergePaymentLists", () => {
  const appPayments = [
    { id: "PAY-B", date: new Date(1760000250 * 1000).toISOString() },
    { id: "PAY-A", date: new Date(1760000050 * 1000).toISOString() },
  ];
  const vaultPayments = vaultPaymentsAsRecords(state);

  it("sorts both lists together, newest first", () => {
    const merged = mergePaymentLists(appPayments, vaultPayments);
    expect(merged.map((p) => p.id)).toEqual([
      "VAULT-3",
      "PAY-B",
      "VAULT-2",
      "VAULT-1",
      "PAY-A",
    ]);
  });

  it("does not change the lists it is given", () => {
    const before = appPayments.map((p) => p.id);
    mergePaymentLists(appPayments, vaultPayments);
    expect(appPayments.map((p) => p.id)).toEqual(before);
  });
});

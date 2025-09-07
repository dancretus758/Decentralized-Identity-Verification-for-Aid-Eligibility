import { describe, it, expect, beforeEach } from "vitest";

const ERR_DUPLICATE_IDENTITY = 100;
const ERR_INVALID_HASH = 101;
const ERR_NOT_REGISTERED = 102;
const ERR_ALREADY_REVOKED = 103;
const ERR_REGISTRATION_EXPIRED = 106;
const ERR_INVALID_METADATA = 107;
const ERR_CONTRACT_PAUSED = 108;
const ERR_UNAUTHORIZED = 109;
const ERR_INVALID_EXPIRY = 110;

interface IdentityData {
  hash: string; // Simulate buff as string for simplicity
  timestamp: number;
  expiry: number;
  metadata: string | null;
  revoked: boolean;
}

class IdentityRegistryMock {
  state: {
    identities: Map<string, IdentityData>;
    hashToPrincipal: Map<string, string>;
    contractAdmin: string;
    isPaused: boolean;
    maxMetadataSize: number;
  };
  blockHeight: number;
  txSender: string;

  constructor() {
    this.state = {
      identities: new Map<string, IdentityData>(),
      hashToPrincipal: new Map<string, string>(),
      contractAdmin: "ST1ADMIN",
      isPaused: false,
      maxMetadataSize: 128,
    };
    this.blockHeight = 0;
    this.txSender = "ST1USER";
  }

  reset() {
    this.state = {
      identities: new Map<string, IdentityData>(),
      hashToPrincipal: new Map<string, string>(),
      contractAdmin: "ST1ADMIN",
      isPaused: false,
      maxMetadataSize: 128,
    };
    this.blockHeight = 0;
    this.txSender = "ST1USER";
  }

  setTxSender(sender: string) {
    this.txSender = sender;
  }

  advanceBlock(blocks: number) {
    this.blockHeight += blocks;
  }

  pauseContract(): { ok: boolean; value: number | boolean } {
    if (this.txSender !== this.state.contractAdmin) {
      return { ok: false, value: ERR_UNAUTHORIZED };
    }
    this.state.isPaused = true;
    return { ok: true, value: true };
  }

  unpauseContract(): { ok: boolean; value: number | boolean } {
    if (this.txSender !== this.state.contractAdmin) {
      return { ok: false, value: ERR_UNAUTHORIZED };
    }
    this.state.isPaused = false;
    return { ok: true, value: true };
  }

  updateAdmin(newAdmin: string): { ok: boolean; value: number | boolean } {
    if (this.txSender !== this.state.contractAdmin) {
      return { ok: false, value: ERR_UNAUTHORIZED };
    }
    this.state.contractAdmin = newAdmin;
    return { ok: true, value: true };
  }

  setMaxMetadataSize(newSize: number): { ok: boolean; value: number | boolean } {
    if (this.txSender !== this.state.contractAdmin) {
      return { ok: false, value: ERR_UNAUTHORIZED };
    }
    this.state.maxMetadataSize = newSize;
    return { ok: true, value: true };
  }

  registerIdentity(
    identityHash: string,
    expiry: number,
    metadata: string | null
  ): { ok: boolean; value: number | boolean } {
    if (this.state.isPaused) {
      return { ok: false, value: ERR_CONTRACT_PAUSED };
    }
    if (identityHash.length !== 64) {
      return { ok: false, value: ERR_INVALID_HASH };
    }
    if (expiry <= this.blockHeight) {
      return { ok: false, value: ERR_INVALID_EXPIRY };
    }
    if (metadata && metadata.length > this.state.maxMetadataSize * 2) {
      return { ok: false, value: ERR_INVALID_METADATA };
    }
    if (this.state.hashToPrincipal.has(identityHash)) {
      return { ok: false, value: ERR_DUPLICATE_IDENTITY };
    }
    if (this.state.identities.has(this.txSender)) {
      return { ok: false, value: ERR_DUPLICATE_IDENTITY };
    }
    this.state.identities.set(this.txSender, {
      hash: identityHash,
      timestamp: this.blockHeight,
      expiry,
      metadata,
      revoked: false,
    });
    this.state.hashToPrincipal.set(identityHash, this.txSender);
    return { ok: true, value: true };
  }

  updateIdentity(
    newHash: string,
    newExpiry: number,
    newMetadata: string | null
  ): { ok: boolean; value: number | boolean } {
    if (this.state.isPaused) {
      return { ok: false, value: ERR_CONTRACT_PAUSED };
    }
    const current = this.state.identities.get(this.txSender);
    if (!current) {
      return { ok: false, value: ERR_NOT_REGISTERED };
    }
    if (current.revoked) {
      return { ok: false, value: ERR_ALREADY_REVOKED };
    }
    if (newHash.length !== 64) {
      return { ok: false, value: ERR_INVALID_HASH };
    }
    if (newExpiry <= this.blockHeight) {
      return { ok: false, value: ERR_INVALID_EXPIRY };
    }
    if (newMetadata && newMetadata.length > this.state.maxMetadataSize * 2) {
      return { ok: false, value: ERR_INVALID_METADATA };
    }
    this.state.hashToPrincipal.delete(current.hash);
    if (this.state.hashToPrincipal.has(newHash)) {
      return { ok: false, value: ERR_DUPLICATE_IDENTITY };
    }
    this.state.identities.set(this.txSender, {
      hash: newHash,
      timestamp: this.blockHeight,
      expiry: newExpiry,
      metadata: newMetadata,
      revoked: false,
    });
    this.state.hashToPrincipal.set(newHash, this.txSender);
    return { ok: true, value: true };
  }

  revokeIdentity(): { ok: boolean; value: number | boolean } {
    if (this.state.isPaused) {
      return { ok: false, value: ERR_CONTRACT_PAUSED };
    }
    const current = this.state.identities.get(this.txSender);
    if (!current) {
      return { ok: false, value: ERR_NOT_REGISTERED };
    }
    if (current.revoked) {
      return { ok: false, value: ERR_ALREADY_REVOKED };
    }
    this.state.identities.set(this.txSender, { ...current, revoked: true });
    return { ok: true, value: true };
  }

  isIdentityRegistered(user: string): boolean {
    const data = this.state.identities.get(user);
    return !!data && !data.revoked && this.blockHeight < data.expiry;
  }

  getIdentityDetails(user: string): { ok: boolean; value: IdentityData | number } {
    const data = this.state.identities.get(user);
    if (!data) {
      return { ok: false, value: ERR_NOT_REGISTERED };
    }
    if (data.revoked) {
      return { ok: false, value: ERR_ALREADY_REVOKED };
    }
    if (this.blockHeight >= data.expiry) {
      return { ok: false, value: ERR_REGISTRATION_EXPIRED };
    }
    return { ok: true, value: data };
  }

  getIdentityHash(user: string): { ok: boolean; value: string | number } {
    const details = this.getIdentityDetails(user);
    if (!details.ok) {
      return details as { ok: boolean; value: number };
    }
    return { ok: true, value: (details.value as IdentityData).hash };
  }

  getOwnerOfHash(hash: string): { ok: boolean; value: string | undefined } {
    return { ok: true, value: this.state.hashToPrincipal.get(hash) };
  }
}

describe("IdentityRegistry", () => {
  let contract: IdentityRegistryMock;

  beforeEach(() => {
    contract = new IdentityRegistryMock();
    contract.setTxSender("ST1USER");
  });

  it("should register identity with valid params", () => {
    const result = contract.registerIdentity("a".repeat(64), 100, null);
    expect(result).toEqual({ ok: true, value: true });
    expect(contract.isIdentityRegistered("ST1USER")).toBe(true);
  });

  it("should reject registration with invalid hash length", () => {
    const result = contract.registerIdentity("short", 100, null);
    expect(result).toEqual({ ok: false, value: ERR_INVALID_HASH });
  });

  it("should reject registration with invalid expiry", () => {
    const result = contract.registerIdentity("a".repeat(64), 0, null);
    expect(result).toEqual({ ok: false, value: ERR_INVALID_EXPIRY });
  });

  it("should reject duplicate registration for same user", () => {
    contract.registerIdentity("a".repeat(64), 100, null);
    const result = contract.registerIdentity("b".repeat(64), 100, null);
    expect(result).toEqual({ ok: false, value: ERR_DUPLICATE_IDENTITY });
  });

  it("should reject duplicate hash across users", () => {
    contract.registerIdentity("a".repeat(64), 100, null);
    contract.setTxSender("ST2USER");
    const result = contract.registerIdentity("a".repeat(64), 100, null);
    expect(result).toEqual({ ok: false, value: ERR_DUPLICATE_IDENTITY });
  });

  it("should allow update of identity", () => {
    contract.registerIdentity("a".repeat(64), 100, null);
    const result = contract.updateIdentity("b".repeat(64), 200, "meta");
    expect(result).toEqual({ ok: true, value: true });
    const details = contract.getIdentityDetails("ST1USER");
    expect(details.ok).toBe(true);
    expect((details.value as IdentityData).hash).toBe("b".repeat(64));
    expect((details.value as IdentityData).expiry).toBe(200);
  });

  it("should reject update if not registered", () => {
    const result = contract.updateIdentity("b".repeat(64), 200, null);
    expect(result).toEqual({ ok: false, value: ERR_NOT_REGISTERED });
  });

  it("should allow revocation", () => {
    contract.registerIdentity("a".repeat(64), 100, null);
    const result = contract.revokeIdentity();
    expect(result).toEqual({ ok: true, value: true });
    expect(contract.isIdentityRegistered("ST1USER")).toBe(false);
  });

  it("should reject revocation if already revoked", () => {
    contract.registerIdentity("a".repeat(64), 100, null);
    contract.revokeIdentity();
    const result = contract.revokeIdentity();
    expect(result).toEqual({ ok: false, value: ERR_ALREADY_REVOKED });
  });

  it("should return expired if block height exceeds expiry", () => {
    contract.registerIdentity("a".repeat(64), 50, null);
    contract.advanceBlock(60);
    const details = contract.getIdentityDetails("ST1USER");
    expect(details).toEqual({ ok: false, value: ERR_REGISTRATION_EXPIRED });
  });

  it("should pause and prevent registrations", () => {
    contract.setTxSender("ST1ADMIN");
    contract.pauseContract();
    contract.setTxSender("ST1USER");
    const result = contract.registerIdentity("a".repeat(64), 100, null);
    expect(result).toEqual({ ok: false, value: ERR_CONTRACT_PAUSED });
  });

  it("should unpause and allow operations", () => {
    contract.setTxSender("ST1ADMIN");
    contract.pauseContract();
    contract.unpauseContract();
    contract.setTxSender("ST1USER");
    const result = contract.registerIdentity("a".repeat(64), 100, null);
    expect(result).toEqual({ ok: true, value: true });
  });

  it("should update admin correctly", () => {
    contract.setTxSender("ST1ADMIN");
    const result = contract.updateAdmin("ST2ADMIN");
    expect(result).toEqual({ ok: true, value: true });
    expect(contract.state.contractAdmin).toBe("ST2ADMIN");
  });

  it("should reject admin update from non-admin", () => {
    const result = contract.updateAdmin("ST2ADMIN");
    expect(result).toEqual({ ok: false, value: ERR_UNAUTHORIZED });
  });

  it("should set max metadata size", () => {
    contract.setTxSender("ST1ADMIN");
    const result = contract.setMaxMetadataSize(256);
    expect(result).toEqual({ ok: true, value: true });
    expect(contract.state.maxMetadataSize).toBe(256);
  });

  it("should reject metadata exceeding max size", () => {
    const longMeta = "a".repeat(300);
    const result = contract.registerIdentity("a".repeat(64), 100, longMeta);
    expect(result).toEqual({ ok: false, value: ERR_INVALID_METADATA });
  });

  it("should get owner of hash", () => {
    contract.registerIdentity("a".repeat(64), 100, null);
    const result = contract.getOwnerOfHash("a".repeat(64));
    expect(result).toEqual({ ok: true, value: "ST1USER" });
  });

  it("should get identity hash", () => {
    contract.registerIdentity("a".repeat(64), 100, null);
    const result = contract.getIdentityHash("ST1USER");
    expect(result).toEqual({ ok: true, value: "a".repeat(64) });
  });
});
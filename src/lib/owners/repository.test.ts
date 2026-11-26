import { beforeEach, describe, expect, test } from "vitest";
import type { Db } from "@/db/create-db";
import { createTestDb } from "@/db/test-utils";
import { saveInvoice } from "@/lib/invoices/repository";
import { emptyDraft } from "@/lib/invoices/test-fixtures";
import {
  archiveOwner,
  createOwner,
  deleteOwner,
  getOwner,
  getOwnerSeal,
  listOwners,
  restoreOwner,
  updateOwner,
} from "./repository";
import type { OwnerInput } from "./validation";

function input(overrides: Partial<OwnerInput> = {}): OwnerInput {
  return {
    name: "山田 太郎",
    tradeName: "やまだデザイン",
    postalCode: "1500001",
    address1: "東京都渋谷区神宮前",
    address2: "1-2-3 サンプルビル4F",
    phone: "03-1234-5678",
    email: "taro@example.com",
    bankName: "やよい銀行",
    bankCode: "0123",
    branchName: "渋谷支店",
    branchCode: "456",
    accountType: "ordinary",
    accountNumber: "1234567",
    accountHolder: "ヤマダデザイン ヤマダタロウ",
    ...overrides,
  };
}

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let db: Db;

beforeEach(() => {
  db = createTestDb();
});

function onlyId() {
  const [owner] = listOwners(db, { archived: false });
  return owner.id;
}

describe("事業主の作成・変更", () => {
  test("作成した事業主が作成順に一覧に並ぶ。データ印の有無がわかる", () => {
    createOwner(db, input({ name: "A" }), { type: "keep" });
    createOwner(db, input({ name: "B" }), { type: "replace", data: png });
    expect(
      listOwners(db, { archived: false }).map((o) => [o.name, o.hasSeal]),
    ).toEqual([
      ["A", false],
      ["B", true],
    ]);
  });

  test("一覧と詳細にはデータ印の画像を含めない", () => {
    createOwner(db, input(), { type: "replace", data: png });
    expect(listOwners(db, { archived: false })[0]).not.toHaveProperty("seal");
    expect(getOwner(db, onlyId())).not.toHaveProperty("seal");
  });

  test("データ印の画像を取得できる", () => {
    createOwner(db, input(), { type: "replace", data: png });
    expect(getOwnerSeal(db, onlyId())).toEqual(png);
  });

  test("変更でデータ印を keep なら残り、remove なら消え、replace なら差し替わる", () => {
    createOwner(db, input(), { type: "replace", data: png });
    const id = onlyId();

    updateOwner(db, id, input({ name: "山田 花子" }), { type: "keep" });
    expect(getOwner(db, id)).toMatchObject({
      name: "山田 花子",
      hasSeal: true,
    });

    const other = Buffer.concat([png, Buffer.from([1])]);
    updateOwner(db, id, input(), { type: "replace", data: other });
    expect(getOwnerSeal(db, id)).toEqual(other);

    updateOwner(db, id, input(), { type: "remove" });
    expect(getOwner(db, id)?.hasSeal).toBe(false);
    expect(getOwnerSeal(db, id)).toBeUndefined();
  });
});

describe("アーカイブ・削除", () => {
  test("アーカイブすると一覧から消えてアーカイブ一覧に出る。元に戻せる", () => {
    createOwner(db, input(), { type: "keep" });
    const id = onlyId();

    archiveOwner(db, id);
    expect(listOwners(db, { archived: false })).toHaveLength(0);
    expect(listOwners(db, { archived: true }).map((o) => o.id)).toEqual([id]);

    restoreOwner(db, id);
    expect(listOwners(db, { archived: false }).map((o) => o.id)).toEqual([id]);
  });

  test("削除するとデータが消える", () => {
    createOwner(db, input(), { type: "keep" });
    const id = onlyId();
    deleteOwner(db, id);
    expect(getOwner(db, id)).toBeUndefined();
  });
});

describe("請求書で使っている事業主（spec.md 4.1）", () => {
  test("アーカイブも削除もできない", () => {
    createOwner(db, input(), { type: "keep" });
    const id = onlyId();
    saveInvoice(db, undefined, emptyDraft({ ownerId: id }));

    expect(archiveOwner(db, id)).toEqual({
      error: "この事業主は請求書で使われているため、アーカイブできません",
    });
    expect(deleteOwner(db, id)).toEqual({
      error: "この事業主は請求書で使われているため、削除できません",
    });
    expect(getOwner(db, id)).toMatchObject({ archivedAt: null });
  });
});

import { beforeEach, describe, expect, test } from "vitest";
import type { Db } from "@/db/create-db";
import { createTestDb } from "@/db/test-utils";
import {
  archiveClient,
  createClient,
  deleteClient,
  getClient,
  listClients,
  restoreClient,
  updateClient,
} from "./repository";
import type { ClientInput } from "./validation";

function input(overrides: Partial<ClientInput> = {}): ClientInput {
  return {
    name: "サンプル産業株式会社",
    code: "ABC",
    department: null,
    contactName: null,
    paymentTermType: "next_month_end",
    paymentTermDay: null,
    feeBearer: "none",
    rounding: "floor",
    ...overrides,
  };
}

let db: Db;

beforeEach(() => {
  db = createTestDb();
});

function idOf(code: string) {
  const client = [
    ...listClients(db, { archived: false }),
    ...listClients(db, { archived: true }),
  ].find((c) => c.code === code);
  if (!client) throw new Error(`not found: ${code}`);
  return client.id;
}

describe("取引先の作成", () => {
  test("作成した取引先が一覧に取引先コード順で並ぶ", () => {
    createClient(db, input({ code: "XYZ", name: "B社" }));
    createClient(db, input({ code: "ABC", name: "A社" }));
    expect(listClients(db, { archived: false }).map((c) => c.code)).toEqual([
      "ABC",
      "XYZ",
    ]);
  });

  test("取引先コードが重複していたら作成できない", () => {
    createClient(db, input());
    expect(createClient(db, input({ name: "別会社" }))).toEqual({
      ok: false,
      errors: { code: "この取引先コードは既に使われています" },
    });
    expect(listClients(db, { archived: false })).toHaveLength(1);
  });

  test("アーカイブ済みの取引先とも取引先コードは重複できない", () => {
    createClient(db, input());
    archiveClient(db, idOf("ABC"));
    expect(createClient(db, input()).ok).toBe(false);
  });
});

describe("取引先の変更", () => {
  test("内容を変更できる", () => {
    createClient(db, input());
    const id = idOf("ABC");
    expect(
      updateClient(db, id, input({ name: "新社名", rounding: "ceil" })),
    ).toEqual({
      ok: true,
    });
    expect(getClient(db, id)).toMatchObject({
      name: "新社名",
      rounding: "ceil",
    });
  });

  test("自分自身の取引先コードはそのまま使える", () => {
    createClient(db, input());
    expect(updateClient(db, idOf("ABC"), input()).ok).toBe(true);
  });

  test("他の取引先の取引先コードには変更できない", () => {
    createClient(db, input({ code: "ABC" }));
    createClient(db, input({ code: "XYZ" }));
    expect(updateClient(db, idOf("XYZ"), input({ code: "ABC" }))).toEqual({
      ok: false,
      errors: { code: "この取引先コードは既に使われています" },
    });
  });
});

describe("アーカイブ・削除", () => {
  test("アーカイブすると一覧から消えてアーカイブ一覧に出る。元に戻せる", () => {
    createClient(db, input());
    const id = idOf("ABC");

    archiveClient(db, id);
    expect(listClients(db, { archived: false })).toHaveLength(0);
    expect(listClients(db, { archived: true }).map((c) => c.id)).toEqual([id]);

    restoreClient(db, id);
    expect(listClients(db, { archived: false }).map((c) => c.id)).toEqual([id]);
    expect(listClients(db, { archived: true })).toHaveLength(0);
  });

  test("削除するとデータが消える", () => {
    createClient(db, input());
    const id = idOf("ABC");
    deleteClient(db, id);
    expect(getClient(db, id)).toBeUndefined();
  });
});

import { beforeEach, describe, expect, test } from "vitest";
import type { Db } from "@/db/create-db";
import { createTestDb } from "@/db/test-utils";
import {
  archiveInvoice,
  calcTotal,
  deleteInvoice,
  getInvoice,
  isClientInUse,
  isOwnerInUse,
  copyInvoice,
  listInvoices,
  restoreInvoice,
  saveInvoice,
} from "./repository";
import { emptyDraft, insertClient, insertOwner } from "./test-fixtures";

let db: Db;

beforeEach(() => {
  db = createTestDb();
});

function save(id: number | undefined, ...args: Parameters<typeof emptyDraft>) {
  const result = saveInvoice(db, id, emptyDraft(...args));
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return getInvoice(db, result.id)!;
}

describe("作成中の保存", () => {
  test("何も入力していなくても保存できる。未採番", () => {
    const invoice = save(undefined);
    expect(invoice).toMatchObject({ invoiceNumber: null, items: [] });
  });

  test("明細を行番号順に保存し、変更時は置き換える", () => {
    const item = (position: number, description: string) => ({
      position,
      description,
      quantity: 100,
      unit: "式",
      unitPrice: 1000,
    });
    const created = save(undefined, { items: [item(0, "A"), item(3, "B")] });
    expect(created.items.map((i) => [i.position, i.description])).toEqual([
      [0, "A"],
      [3, "B"],
    ]);

    const updated = save(created.id, { items: [item(1, "C")] });
    expect(updated.items.map((i) => [i.position, i.description])).toEqual([
      [1, "C"],
    ]);
  });
});

describe("請求番号（spec.md 7.2）", () => {
  test("取引先と請求日がそろったら採番する", () => {
    const clientId = insertClient(db, { code: "ABC" });
    expect(save(undefined, { clientId }).invoiceNumber).toBeNull();
    expect(
      save(undefined, { issueDate: "2026-11-30" }).invoiceNumber,
    ).toBeNull();
    expect(
      save(undefined, { clientId, issueDate: "2026-11-30" }).invoiceNumber,
    ).toBe("INV-ABC-202611-001");
  });

  test("確定していない請求書の番号は連番に含めないので、作成中どうしは同じ番号になりうる", () => {
    const clientId = insertClient(db);
    const a = save(undefined, { clientId, issueDate: "2026-11-01" });
    const b = save(undefined, { clientId, issueDate: "2026-11-30" });
    expect([a.invoiceNumber, b.invoiceNumber]).toEqual([
      "INV-ABC-202611-001",
      "INV-ABC-202611-001",
    ]);
  });

  test("請求日の年月か取引先が変わったら振り直す", () => {
    const abc = insertClient(db, { code: "ABC" });
    const xyz = insertClient(db, { code: "XYZ" });
    const invoice = save(undefined, { clientId: abc, issueDate: "2026-11-30" });

    expect(
      save(invoice.id, { clientId: abc, issueDate: "2026-12-01" })
        .invoiceNumber,
    ).toBe("INV-ABC-202612-001");
    expect(
      save(invoice.id, { clientId: xyz, issueDate: "2026-12-01" })
        .invoiceNumber,
    ).toBe("INV-XYZ-202612-001");
    expect(
      save(invoice.id, { clientId: null, issueDate: "2026-12-01" })
        .invoiceNumber,
    ).toBeNull();
  });
});

describe("支払い期限（spec.md 7.1）", () => {
  test("手動変更していなければ取引先と対象期間から算出する", () => {
    const clientId = insertClient(db, { paymentTermType: "next_month_end" });
    const invoice = save(undefined, {
      clientId,
      periodType: "range",
      periodStart: "2026-11-01",
      periodEnd: "2026-11-15",
      dueDate: "2026-01-01",
    });
    expect(invoice.dueDate).toBe("2026-12-31");
  });

  test("手動変更していれば入力した日を保つ", () => {
    const clientId = insertClient(db);
    const invoice = save(undefined, {
      clientId,
      periodType: "month",
      periodMonth: "2026-11",
      dueDate: "2027-01-10",
      dueDateManual: true,
    });
    expect(invoice).toMatchObject({
      dueDate: "2027-01-10",
      dueDateManual: true,
    });
  });

  test("取引先か対象期間が未入力なら入力値のまま", () => {
    const invoice = save(undefined, {
      periodType: "month",
      periodMonth: "2026-11",
      dueDate: null,
    });
    expect(invoice.dueDate).toBeNull();
  });
});

describe("選択できる取引先・事業主", () => {
  test("存在しない・アーカイブ済みの取引先や事業主は選べない", () => {
    const archived = insertClient(db, { archivedAt: new Date() });
    expect(
      saveInvoice(db, undefined, emptyDraft({ clientId: archived })),
    ).toEqual({
      ok: false,
      errors: { clientId: "選択した取引先は使えません。選択し直してください" },
    });
    expect(saveInvoice(db, undefined, emptyDraft({ ownerId: 999 }))).toEqual({
      ok: false,
      errors: { ownerId: "選択した事業主は使えません。選択し直してください" },
    });
  });
});

describe("一覧", () => {
  test("新しい順に、取引先名と合計（取引先の端数処理）を表示する", () => {
    const clientId = insertClient(db, { name: "A社", rounding: "ceil" });
    save(undefined, { subject: "1件目" });
    save(undefined, {
      clientId,
      subject: "2件目",
      items: [
        {
          position: 0,
          description: "x",
          quantity: 125,
          unit: "時間",
          unitPrice: 333,
        },
        {
          position: 1,
          description: "y",
          quantity: 100,
          unit: "式",
          unitPrice: null,
        },
      ],
    });
    expect(listInvoices(db, { archived: false })).toEqual([
      expect.objectContaining({
        subject: "2件目",
        clientName: "A社",
        total: 417,
      }),
      expect.objectContaining({
        subject: "1件目",
        clientName: null,
        total: null,
      }),
    ]);
  });

  test("税込なら合計に消費税相当額を含める", () => {
    const clientId = insertClient(db, { rounding: "floor" });
    save(undefined, {
      clientId,
      taxMode: "included",
      items: [
        {
          position: 0,
          description: "x",
          quantity: 100,
          unit: "式",
          unitPrice: 1234,
        },
      ],
    });
    // 1234 + 123（123.4 を切り捨て）
    expect(listInvoices(db, { archived: false })[0].total).toBe(1357);
  });

  test("アーカイブすると一覧から消えてアーカイブ一覧に出る。元に戻せる。削除できる", () => {
    const { id } = save(undefined);
    archiveInvoice(db, id);
    expect(listInvoices(db, { archived: false })).toEqual([]);
    expect(listInvoices(db, { archived: true }).map((r) => r.id)).toEqual([id]);
    restoreInvoice(db, id);
    expect(listInvoices(db, { archived: false }).map((r) => r.id)).toEqual([
      id,
    ]);
    deleteInvoice(db, id);
    expect(getInvoice(db, id)).toBeUndefined();
  });
});

describe("取引先・事業主が使われているか（spec.md 4.1）", () => {
  test("アーカイブ済みを含め、請求書で使っていれば使用中", () => {
    const clientId = insertClient(db);
    const ownerId = insertOwner(db);
    expect(isClientInUse(db, clientId)).toBe(false);
    expect(isOwnerInUse(db, ownerId)).toBe(false);

    const { id } = save(undefined, { clientId, ownerId });
    archiveInvoice(db, id);
    expect(isClientInUse(db, clientId)).toBe(true);
    expect(isOwnerInUse(db, ownerId)).toBe(true);

    deleteInvoice(db, id);
    expect(isClientInUse(db, clientId)).toBe(false);
  });
});

test("calcTotal は数量か単価が未入力の行を除いて合計する", () => {
  expect(
    calcTotal(
      [
        { quantity: 100, unitPrice: 50000 },
        { quantity: 300, unitPrice: 8000 },
        { quantity: null, unitPrice: 100 },
      ],
      "floor",
    ),
  ).toBe(74000);
});

describe("コピー（spec.md 7.1）", () => {
  test("内容をすべて引き継いだ新しい請求書を作る", () => {
    const clientId = insertClient(db);
    const ownerId = insertOwner(db);
    const { id } = save(undefined, {
      clientId,
      ownerId,
      issueDate: "2026-11-30",
      subject: "Webサイト保守",
      periodType: "month",
      periodMonth: "2026-11",
      dueDate: "2027-01-10",
      dueDateManual: true,
      notes: "備考",
      taxMode: "included",
      items: [
        {
          position: 1,
          description: "保守",
          quantity: 150,
          unit: "時間",
          unitPrice: 5000,
        },
      ],
    });
    const copiedId = copyInvoice(db, id);
    expect(copiedId).not.toBe(id);
    // ID・作成日時などを除いた内容が同じ
    const content = (invoiceId: number) => {
      const {
        id: _id,
        createdAt: _c,
        updatedAt: _u,
        items,
        ...fields
      } = getInvoice(db, invoiceId)!;
      return {
        ...fields,
        items: items.map(({ id: _i, invoiceId: _v, ...item }) => item),
      };
    };
    expect(content(copiedId)).toEqual(content(id));
  });

  test("元の請求書はそのまま残る", () => {
    const { id } = save(undefined, { subject: "元" });
    copyInvoice(db, id);
    expect(listInvoices(db, { archived: false }).map((r) => r.subject)).toEqual(
      ["元", "元"],
    );
  });
});

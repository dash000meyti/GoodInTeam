import { describe, expect, it } from "vitest";
// Next's own reader of the id format. If an upgrade changes the format, the
// comparison below fails before the proxy rule can misclassify anything.
import {
  SERVER_REFERENCE_ID_LENGTH as NEXT_ID_LENGTH,
  extractInfoFromServerReferenceId,
} from "next/dist/shared/lib/server-reference-info";
import {
  SERVER_REFERENCE_ID_LENGTH,
  actionHeaderIds,
  formNamesCacheReference,
  isCacheReferenceId,
} from "./server-reference";

const hex = (n: number) => n.toString(16).padStart(2, "0");
/** A well-formed id with the given info byte. */
const idWith = (infoByte: number) => hex(infoByte) + "ab".repeat(20);

const ACTION = idWith(0x40);
const CACHED = idWith(0xc0);

describe("isCacheReferenceId", () => {
  it("agrees with Next.js for every info byte", () => {
    expect(SERVER_REFERENCE_ID_LENGTH).toBe(NEXT_ID_LENGTH);
    for (let byte = 0; byte <= 0xff; byte++) {
      const id = idWith(byte);
      expect(id).toHaveLength(NEXT_ID_LENGTH);
      const next = extractInfoFromServerReferenceId(id).type;
      expect(isCacheReferenceId(id), id).toBe(next === "use-cache");
      // The rule may never refuse a real action.
      if (next === "server-action") expect(isCacheReferenceId(id), id).toBe(false);
    }
  });

  it("ignores letter case", () => {
    expect(isCacheReferenceId(CACHED.toUpperCase())).toBe(true);
    expect(isCacheReferenceId(ACTION.toUpperCase())).toBe(false);
  });

  it.each([null, undefined, "", "c0", CACHED.slice(1), `${CACHED}0`, `c0${"zz".repeat(20)}`])(
    "is false for %j (not a server reference id)",
    (value) => {
      expect(isCacheReferenceId(value)).toBe(false);
    },
  );
});

describe("actionHeaderIds", () => {
  it("splits a repeated header", () => {
    expect(actionHeaderIds(` ${ACTION} , ${CACHED}`)).toEqual([ACTION, CACHED]);
    expect(actionHeaderIds(null)).toEqual([]);
  });
});

describe("formNamesCacheReference", () => {
  const form = (fields: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    return fd;
  };

  it("finds a cache reference in an action field name", () => {
    expect(formNamesCacheReference(form({ [`$ACTION_ID_${CACHED}`]: "" }))).toBe(true);
    expect(formNamesCacheReference(form({ [`$ACTION_ID_${ACTION}`]: "", email: "a@b.co" }))).toBe(
      false,
    );
  });

  it("finds a cache reference in an action descriptor", () => {
    expect(
      formNamesCacheReference(
        form({ $ACTION_REF_1: "", "$ACTION_1:0": `{"id":"${CACHED}","bound":null}` }),
      ),
    ).toBe(true);
    expect(
      formNamesCacheReference(
        form({
          $ACTION_REF_1: "",
          "$ACTION_1:0": `{"id":"${ACTION}","bound":"$@1"}`,
          "$ACTION_1:1": "[]",
        }),
      ),
    ).toBe(false);
  });

  it("reads descriptors the way a JSON parser does", () => {
    // A later duplicate key, an outlined value and an escaped character all
    // end up as the same id once parsed.
    const escaped = `\\u00${hex(CACHED.charCodeAt(0))}${CACHED.slice(1)}`;
    expect(
      formNamesCacheReference(
        form({ $ACTION_REF_1: "", "$ACTION_1:0": `{"id":"${ACTION}","id":"${escaped}"}` }),
      ),
    ).toBe(true);
    expect(
      formNamesCacheReference(
        form({
          $ACTION_REF_1: "",
          "$ACTION_1:0": `{"id":"${ACTION}","id":"$1"}`,
          "$ACTION_1:1": `"${CACHED}"`,
        }),
      ),
    ).toBe(true);
  });

  it("ignores ordinary fields", () => {
    expect(formNamesCacheReference(form({ note: CACHED, email: "a@b.co" }))).toBe(false);
    expect(formNamesCacheReference(new FormData())).toBe(false);
  });
});

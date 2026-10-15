import { describe, expect, it } from "vitest";
import { BACKUP_FORMAT, parseBackup, parseEnv, serializeEnv, toCsv } from "./formats";
import {
  cleanPayload,
  emptyPayload,
  normalizePayload,
  primarySecretOf,
  searchTextOf,
  subtitleOf,
} from "./item-types";

describe(".env", () => {
  it("parses comments, export, quotes and inline comments", () => {
    const text = [
      "# database",
      "export DB_HOST=localhost",
      "DB_PORT = 5432 # default",
      'DB_PASS="p@ss w#rd \\"x\\""',
      "SINGLE='a $b \\n'",
      "EMPTY=",
      'MULTI="line1',
      'line2"',
      "invalid line",
      "1BAD=x",
      "DB_HOST=override",
    ].join("\n");
    expect(parseEnv(text)).toEqual([
      { key: "DB_HOST", value: "override" },
      { key: "DB_PORT", value: "5432" },
      { key: "DB_PASS", value: 'p@ss w#rd "x"' },
      { key: "SINGLE", value: "a $b \\n" },
      { key: "EMPTY", value: "" },
      { key: "MULTI", value: "line1\nline2" },
    ]);
  });

  it("round-trips through serializeEnv", () => {
    const pairs = [
      { key: "URL", value: "postgres://u:p@h:5432/db?ssl=true" },
      { key: "TOKEN", value: 'with space "and quotes" \\ backslash' },
      { key: "NL", value: "a\nb" },
      { key: "EMPTY", value: "" },
    ];
    const text = serializeEnv(pairs);
    expect(text.split("\n")[0]).toBe("URL=postgres://u:p@h:5432/db?ssl=true");
    expect(parseEnv(text)).toEqual(pairs);
  });
});

describe("csv", () => {
  it("quotes cells with commas, quotes and newlines", () => {
    expect(
      toCsv(
        ["a", "b"],
        [
          ["x,y", 'say "hi"'],
          ["line\nbreak", "plain"],
        ],
      ),
    ).toBe('a,b\r\n"x,y","say ""hi"""\r\n"line\nbreak",plain');
  });
});

describe("backup file", () => {
  const valid = {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: "2026-01-01T00:00:00.000Z",
    keys: {
      kdf: "PBKDF2-SHA256",
      iterations: 600000,
      salt: "AAAAAAAAAAAAAAAAAAAAAA==",
      wrappedKey: "x",
      wrapIv: "y",
      recoverySalt: null,
      recoveryWrappedKey: null,
      recoveryIv: null,
    },
    items: [{ id: "a", type: "login", favorite: true, ciphertext: "c", iv: "i", projectId: null }],
  };
  it("accepts our format and normalises items", () => {
    const b = parseBackup(valid)!;
    expect(b.items[0]).toMatchObject({ id: "a", favorite: true, clientId: null });
  });
  it("rejects anything else", () => {
    expect(parseBackup(null)).toBeNull();
    expect(parseBackup({ ...valid, format: "other" })).toBeNull();
    expect(parseBackup({ ...valid, items: [{ id: 1 }] })).toBeNull();
    expect(parseBackup({ ...valid, keys: { ...valid.keys, salt: 3 } })).toBeNull();
  });
});

describe("payload helpers", () => {
  it("normalises untrusted decrypted JSON", () => {
    const p = normalizePayload(
      {
        type: "nope",
        title: 5,
        fields: { username: "sara", password: null },
        custom: [null, { label: "PIN", value: 1234, concealed: 1 }],
      },
      "login",
    );
    expect(p).toEqual({
      v: 1,
      type: "login",
      title: "5",
      fields: { username: "sara" },
      custom: [{ label: "PIN", value: "1234", concealed: true }],
      env: [],
    });
  });

  it("cleans payloads before encryption", () => {
    const p = cleanPayload({
      ...emptyPayload("login"),
      title: "  GitHub ",
      fields: { username: "sara", password: "", host: "should be dropped" },
      custom: [{ label: "", value: "", concealed: false }],
      env: [{ key: "X", value: "1" }],
    });
    expect(p).toEqual({ ...emptyPayload("login"), title: "GitHub", fields: { username: "sara" } });
  });

  it("builds subtitles, quick-copy secrets and search text without secrets", () => {
    const login = {
      ...emptyPayload("login"),
      title: "GitHub",
      fields: { username: "sara", url: "https://github.com/login", password: "hunter2" },
    };
    expect(subtitleOf(login)).toBe("sara · github.com");
    expect(primarySecretOf(login)).toBe("hunter2");
    expect(searchTextOf(login)).toContain("github.com");
    expect(searchTextOf(login)).not.toContain("hunter2");
    const card = { ...emptyPayload("card"), fields: { number: "6037 9912 3456 7890" } };
    expect(subtitleOf(card)).toBe("•••• 7890");
  });
});

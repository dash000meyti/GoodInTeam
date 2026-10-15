import { describe, expect, it } from "vitest";
import {
  joinIds,
  mergeFieldControlProps,
  type FieldControlContext,
  type FieldControlProps,
} from "./field-control";

const none: FieldControlProps = {};

const ctx: FieldControlContext = {
  controlId: "f1-control",
  labelId: "f1-label",
  messageId: "f1-message",
  invalid: false,
};

describe("joinIds", () => {
  it("joins, trims and dedupes", () => {
    expect(joinIds("a", undefined, " b  a ", null, "c")).toBe("a b c");
  });
  it("returns undefined when empty", () => {
    expect(joinIds(undefined, "", "  ")).toBeUndefined();
  });
});

describe("mergeFieldControlProps", () => {
  it("returns props untouched outside a Field", () => {
    const props = { id: "x", placeholder: "p" };
    expect(mergeFieldControlProps(null, props)).toBe(props);
  });

  it("gives a control the field's id and description", () => {
    expect(mergeFieldControlProps(ctx, { name: "title" })).toEqual({
      name: "title",
      id: "f1-control",
      "aria-describedby": "f1-message",
    });
  });

  it("keeps an explicit id (Field htmlFor + Input id)", () => {
    expect(mergeFieldControlProps(ctx, { id: "title" }).id).toBe("title");
  });

  it("combines aria-describedby with the control's own", () => {
    expect(mergeFieldControlProps(ctx, { "aria-describedby": "own" })["aria-describedby"]).toBe(
      "own f1-message",
    );
  });

  it("omits aria-describedby when there is no hint or error", () => {
    const out = mergeFieldControlProps({ ...ctx, messageId: undefined }, none);
    expect(out).not.toHaveProperty("aria-describedby");
  });

  it("marks invalid fields, unless the control decides itself", () => {
    const invalid = { ...ctx, invalid: true };
    expect(mergeFieldControlProps(invalid, none)["aria-invalid"]).toBe(true);
    expect(mergeFieldControlProps(invalid, { "aria-invalid": false })["aria-invalid"]).toBe(false);
    expect(mergeFieldControlProps(ctx, none)).not.toHaveProperty("aria-invalid");
  });

  it("announces a required field unless the control is natively required", () => {
    const req = { ...ctx, required: true };
    expect(mergeFieldControlProps(req, none)["aria-required"]).toBe(true);
    expect(mergeFieldControlProps(req, { required: true })).not.toHaveProperty("aria-required");
    expect(mergeFieldControlProps(ctx, none)).not.toHaveProperty("aria-required");
  });

  it("labels groups with aria-labelledby instead of taking the id", () => {
    const out = mergeFieldControlProps(ctx, none, "group");
    expect(out.id).toBeUndefined();
    expect(out["aria-labelledby"]).toBe("f1-label");
    expect(
      mergeFieldControlProps(ctx, { "aria-labelledby": "mine" }, "group")["aria-labelledby"],
    ).toBe("mine");
  });
});

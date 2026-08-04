import type { TwilicValue } from "@twilic/core";

export function toTwilicValue(value: unknown): TwilicValue {
  if (value === undefined) {
    return null;
  }
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "string" ||
    value instanceof Uint8Array
  ) {
    return value as TwilicValue;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => toTwilicValue(entry)) as TwilicValue;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, TwilicValue> = {};
    for (const [key, entry] of Object.entries(record)) {
      if (entry !== undefined) {
        out[key] = toTwilicValue(entry);
      }
    }
    return out;
  }
  throw new Error(`twai: unsupported value type ${typeof value}`);
}

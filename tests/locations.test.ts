import { describe, expect, it } from "vitest"

import { normalizeLocation } from "@/lib/locations"

describe("normalizeLocation", () => {
  it("canonicalizes known alternate spellings", () => {
    expect(normalizeLocation("UK")).toBe("United Kingdom")
    expect(normalizeLocation("Brasil")).toBe("Brazil")
  })

  it("passes through locations without a replacement", () => {
    expect(normalizeLocation("France")).toBe("France")
    expect(normalizeLocation("United Kingdom")).toBe("United Kingdom")
  })
})

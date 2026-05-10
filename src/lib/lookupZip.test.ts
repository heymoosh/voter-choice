import { describe, it, expect } from "vitest";
import { lookupZip } from "./lookupZip";

describe("lookupZip", () => {
  it("returns a single state for a single-state zip", () => {
    expect(lookupZip("73301")).toEqual(["TX"]);
  });

  it("returns multiple states for a multi-state zip", () => {
    const result = lookupZip("86515");
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
    expect(result).toHaveLength(2);
  });

  it("returns empty array for unknown zip", () => {
    expect(lookupZip("00001")).toEqual([]);
  });

  it("returns empty array for non-5-digit input", () => {
    expect(lookupZip("123")).toEqual([]);
    expect(lookupZip("123456")).toEqual([]);
  });

  it("returns empty array for non-numeric input", () => {
    expect(lookupZip("abcde")).toEqual([]);
  });

  it("returns California for a CA zip", () => {
    expect(lookupZip("90210")).toEqual(["CA"]);
  });

  // ── Phase 2 NE + DC batch zip tests ────────────────────────────────────

  it("returns Maine for a ME zip (04101 - Portland)", () => {
    expect(lookupZip("04101")).toEqual(["ME"]);
  });

  it("returns Vermont for a VT zip (05401 - Burlington)", () => {
    expect(lookupZip("05401")).toEqual(["VT"]);
  });

  it("returns Massachusetts for a MA zip (02101 - Boston)", () => {
    expect(lookupZip("02101")).toEqual(["MA"]);
  });

  it("returns Rhode Island for a RI zip (02903 - Providence)", () => {
    expect(lookupZip("02903")).toEqual(["RI"]);
  });

  it("returns Connecticut for a CT zip (06103 - Hartford)", () => {
    expect(lookupZip("06103")).toEqual(["CT"]);
  });

  it("returns New Jersey for a NJ zip (07102 - Newark)", () => {
    expect(lookupZip("07102")).toEqual(["NJ"]);
  });

  it("returns Delaware for a DE zip (19901 - Dover)", () => {
    expect(lookupZip("19901")).toEqual(["DE"]);
  });

  it("returns Maryland for a MD zip (21201 - Baltimore)", () => {
    expect(lookupZip("21201")).toEqual(["MD"]);
  });

  it("returns Pennsylvania for a PA zip (17101 - Harrisburg)", () => {
    expect(lookupZip("17101")).toEqual(["PA"]);
  });

  it("returns DC for a DC zip (20001 - Washington, D.C.)", () => {
    expect(lookupZip("20001")).toEqual(["DC"]);
  });

  // ── Phase 2 SE batch zip tests ───────────────────────────────────────────

  it("returns Alabama for an AL zip (35004 - Birmingham area)", () => {
    expect(lookupZip("35004")).toEqual(["AL"]);
  });

  it("returns Arkansas for an AR zip (72201 - Little Rock)", () => {
    expect(lookupZip("72201")).toEqual(["AR"]);
  });

  it("returns Kentucky for a KY zip (40601 - Frankfort)", () => {
    expect(lookupZip("40601")).toEqual(["KY"]);
  });

  it("returns Louisiana for a LA zip (70801 - Baton Rouge)", () => {
    expect(lookupZip("70801")).toEqual(["LA"]);
  });

  it("returns Mississippi for a MS zip (39201 - Jackson)", () => {
    expect(lookupZip("39201")).toEqual(["MS"]);
  });

  it("returns Oklahoma for an OK zip (73102 - Oklahoma City)", () => {
    expect(lookupZip("73102")).toEqual(["OK"]);
  });

  it("returns South Carolina for a SC zip (29201 - Columbia)", () => {
    expect(lookupZip("29201")).toEqual(["SC"]);
  });

  it("returns Tennessee for a TN zip (37201 - Nashville)", () => {
    expect(lookupZip("37201")).toEqual(["TN"]);
  });

  it("returns Virginia for a VA zip (23219 - Richmond)", () => {
    expect(lookupZip("23219")).toEqual(["VA"]);
  });

  it("returns West Virginia for a WV zip (25301 - Charleston)", () => {
    expect(lookupZip("25301")).toEqual(["WV"]);
  });

  // ── West + Mountain batch (Phase 2 W agent) zip tests ───────────────────

  it("returns Alaska for an AK zip (99501 - Anchorage)", () => {
    expect(lookupZip("99501")).toEqual(["AK"]);
  });

  it("returns Colorado for a CO zip (80203 - Denver)", () => {
    expect(lookupZip("80203")).toEqual(["CO"]);
  });

  it("returns Hawaii for a HI zip (96813 - Honolulu)", () => {
    expect(lookupZip("96813")).toEqual(["HI"]);
  });

  it("returns Idaho for an ID zip (83702 - Boise)", () => {
    expect(lookupZip("83702")).toEqual(["ID"]);
  });

  it("returns Montana for a MT zip (59601 - Helena)", () => {
    expect(lookupZip("59601")).toEqual(["MT"]);
  });

  it("returns Nevada for a NV zip (89701 - Carson City)", () => {
    expect(lookupZip("89701")).toEqual(["NV"]);
  });

  it("returns Oregon for an OR zip (97301 - Salem)", () => {
    expect(lookupZip("97301")).toEqual(["OR"]);
  });

  it("returns Utah for a UT zip (84101 - Salt Lake City)", () => {
    expect(lookupZip("84101")).toEqual(["UT"]);
  });

  it("returns Washington for a WA zip (98501 - Olympia)", () => {
    expect(lookupZip("98501")).toEqual(["WA"]);
  });

  it("returns Wyoming for a WY zip (82001 - Cheyenne)", () => {
    expect(lookupZip("82001")).toEqual(["WY"]);
  });

  // ── MW batch (Phase 2) zip tests ─────────────────────────────────────────

  it("returns Illinois for an IL zip (60601 - Chicago)", () => {
    expect(lookupZip("60601")).toEqual(["IL"]);
  });

  it("returns Indiana for an IN zip (46204 - Indianapolis)", () => {
    expect(lookupZip("46204")).toEqual(["IN"]);
  });

  it("returns Iowa for an IA zip (50309 - Des Moines)", () => {
    expect(lookupZip("50309")).toEqual(["IA"]);
  });

  it("returns Kansas for a KS zip (66603 - Topeka)", () => {
    expect(lookupZip("66603")).toEqual(["KS"]);
  });

  it("returns Michigan for a MI zip (48901 - Lansing)", () => {
    expect(lookupZip("48901")).toEqual(["MI"]);
  });

  it("returns Minnesota for a MN zip (55101 - Saint Paul)", () => {
    expect(lookupZip("55101")).toEqual(["MN"]);
  });

  it("returns Missouri for a MO zip (65101 - Jefferson City)", () => {
    expect(lookupZip("65101")).toEqual(["MO"]);
  });

  it("returns Nebraska for a NE zip (68501 - Lincoln)", () => {
    expect(lookupZip("68501")).toEqual(["NE"]);
  });

  it("returns North Dakota for a ND zip (58501 - Bismarck)", () => {
    expect(lookupZip("58501")).toEqual(["ND"]);
  });

  it("returns Ohio for an OH zip (43215 - Columbus)", () => {
    expect(lookupZip("43215")).toEqual(["OH"]);
  });

  it("returns South Dakota for a SD zip (57501 - Pierre)", () => {
    expect(lookupZip("57501")).toEqual(["SD"]);
  });

  it("returns Wisconsin for a WI zip (53701 - Madison)", () => {
    expect(lookupZip("53701")).toEqual(["WI"]);
  });
});

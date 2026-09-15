import { describe, expect, it, vi } from "vitest";
import { actionFor, profile } from "@vsh/content";
import { Presentation } from "./presentation.js";

function setup() {
  const callbacks = {
    change: vi.fn(),
    route: vi.fn(),
    preferences: vi.fn(),
    link: vi.fn(),
    sound: vi.fn(),
  };
  return { model: new Presentation(callbacks), ...callbacks };
}

describe("profile presentation", () => {
  it("keeps shoulder navigation separate from actions and opens links only on confirm", () => {
    const { model, link } = setup();
    expect(actionFor("profile")).toEqual({ kind: "profile" });
    model.open({ kind: "profile" });
    model.command("r1");
    model.command("right");
    expect(model.top).toEqual({ kind: "profile", tab: 1, selected: 1 });
    expect(link).not.toHaveBeenCalled();
    model.command("decide");
    expect(link).toHaveBeenCalledWith(profile.website);
    model.command("l1");
    expect(model.top).toEqual({ kind: "profile", tab: 0, selected: 1 });
  });

  it("returns from details to the selected profile tab and clears the route on exit", () => {
    const { model, route } = setup();
    model.open({ kind: "profile" });
    model.profileTab(1);
    model.select(2);
    model.confirm();
    expect(model.top).toEqual({ kind: "document", id: "profile" });
    model.back();
    expect(model.top).toEqual({ kind: "profile", tab: 1, selected: 2 });
    expect(route).toHaveBeenLastCalledWith("profile");
    model.back();
    expect(route).toHaveBeenLastCalledWith(undefined);
    model.restore("profile");
    expect(model.top).toEqual({ kind: "profile", tab: 0, selected: 0 });
  });
});

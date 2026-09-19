// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, Badge } from "../components";

describe("Shared React UI Components", () => {
  describe("Button Component", () => {
    it("should successfully render button with child text", () => {
      render(<Button>Submit Track</Button>);
      const buttonEl = screen.getByRole("button", { name: /submit track/i });
      expect(buttonEl).toBeDefined();
    });

    it("should trigger custom onClick handler when clicked", () => {
      const clickHandler = vi.fn();
      render(<Button onClick={clickHandler}>Click Me</Button>);

      const buttonEl = screen.getByRole("button", { name: /click me/i });
      fireEvent.click(buttonEl);

      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    it("should show disabled state and prevent clicks when disabled", () => {
      const clickHandler = vi.fn();
      render(
        <Button disabled onClick={clickHandler}>
          Blocked
        </Button>,
      );

      const buttonEl = screen.getByRole("button", { name: /blocked/i });
      expect((buttonEl as HTMLButtonElement).disabled).toBe(true);

      fireEvent.click(buttonEl);
      expect(clickHandler).not.toHaveBeenCalled();
    });
  });

  describe("Badge Component", () => {
    it("should render content and match its styling parameters", () => {
      const { container } = render(<Badge variant="success">Active</Badge>);
      expect(screen.getByText("Active")).toBeDefined();
      expect(container.firstChild).toBeDefined();

      // Ensure it contains standard green background and text styling classes
      const badgeClassList = (container.firstChild as HTMLElement).className;
      expect(badgeClassList).toContain("bg-green-500");
    });
  });
});

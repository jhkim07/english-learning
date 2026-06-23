/**
 * @jest-environment jsdom
 */

// Mock next-auth to avoid real auth in tests
jest.mock("@/auth", () => ({
  auth: jest.fn().mockResolvedValue(null),
  signIn: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import { render, screen } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";

describe("LoginPage", () => {
  it("renders the login card with Google button", async () => {
    const page = await LoginPage({
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByText("AI 영어 학습")).toBeInTheDocument();
    expect(screen.getByText("Google로 시작하기")).toBeInTheDocument();
  });

  it("renders error message for OAuthAccountNotLinked", async () => {
    const page = await LoginPage({
      searchParams: Promise.resolve({ error: "OAuthAccountNotLinked" }),
    });
    render(page);

    expect(
      screen.getByText("이미 다른 방법으로 가입된 이메일입니다.")
    ).toBeInTheDocument();
  });
});

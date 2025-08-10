import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
// Prepare a controllable mock for useProfile from ../Settings used by AccountPage
const updateAccountMock = jest
  .fn()
  .mockResolvedValue({ success: true, message: "ok" });

jest.mock("../../Settings", () => {
  return {
    useProfile: () => ({
      userData: { id: "user-1", username: "john", email: "john@example.com" },
      loading: false,
      updateProfile: jest.fn(),
      updateAccount: updateAccountMock,
      changePassword: jest.fn(),
      uploadAvatar: jest.fn(),
      deleteAvatar: jest.fn(),
      errorMessage: null,
    }),
  };
});

import AccountPage from "../AccountPage";
import { MemoryRouter } from "react-router-dom";

const navigateMock = jest.fn();
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,

    Navigate: ({ to }: { to: string }) => {
      navigateMock(to);
      return null;
    },
  };
});

describe("AccountPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock.mockClear();
    try {
      (localStorage.getItem as unknown as jest.Mock).mockReturnValue('token-123');
    } catch {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn().mockReturnValue('token-123'),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        configurable: true,
        writable: true,
      });
    }
  });

  it("changes username and email when save changes button clicked", async () => {
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    );

    const usernameInput = screen.getByLabelText("Username", {
      selector: "input",
    });
    const emailInput = screen.getByLabelText("Email", { selector: "input" });

    // Change values
    fireEvent.change(usernameInput, { target: { value: "jane" } });
    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });

    // Submit form
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    // Expect API call with new values and success feedback
    await waitFor(() => {
      expect(updateAccountMock).toHaveBeenCalled();
      expect(updateAccountMock.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          username: expect.any(String),
          email: expect.any(String),
        })
      );
    });
    expect(
      await screen.findByText(/changes saved successfully/i)
    ).toBeInTheDocument();
  });

  it("shows error message on failed update", async () => {
    updateAccountMock.mockRejectedValueOnce(new Error("Failed to update"));

    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    );

    const usernameInput = screen.getByLabelText("Username", {
      selector: "input",
    });
    const emailInput = screen.getByLabelText("Email", { selector: "input" });

    // Change values
    fireEvent.change(usernameInput, { target: { value: "jane" } });
    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });

    // Submit form
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    // Expect API call with new values and error feedback
    await waitFor(() => {
      expect(updateAccountMock).toHaveBeenCalled();
      expect(updateAccountMock.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          username: expect.any(String),
          email: expect.any(String),
        })
      );
    });
    expect(await screen.findByText(/failed to update/i)).toBeInTheDocument();
  });

  it('resend verification email when button clicked', async () => {
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    );

    await user.click(screen.getByText(/Resend Verification Email/i));
    
    await waitFor(() => {
    expect(screen.getByText(/Verification email sent successfully!/i)).toBeInTheDocument();
    });
  });

});

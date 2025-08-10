import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

const changePasswordMock = jest.fn().mockResolvedValue({ success: true });

jest.mock("../../FetchEndpoint");
import { fetchEndpoint } from "../../FetchEndpoint";
const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

import PasswordPage from "../PasswordPage";
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

describe("PasswordPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetch.mockReset();
    try {
      (localStorage.getItem as unknown as jest.Mock).mockReturnValue(
        "token-123"
      );
    } catch {
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: jest.fn().mockReturnValue("token-123"),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        configurable: true,
        writable: true,
      });
    }
  });

  it("changes password successfully", async () => {
    mockedFetch.mockResolvedValueOnce({ success: true });
    render(
      <MemoryRouter>
        <PasswordPage />
      </MemoryRouter>
    );

    await user.type(
      screen.getByLabelText(/current password/i, { selector: "input" }),
      "oldPass!23"
    );
    await user.type(
      screen.getByLabelText(/^new password$/i, { selector: "input" }),
      "NewPass!23"
    );
    await user.type(
      screen.getByLabelText(/confirm new password/i, { selector: "input" }),
      "NewPass!23"
    );

    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByText(/password changed successfully/i)
    ).toBeInTheDocument();
    // Inputs cleared
    expect(
      screen.getByLabelText(/current password/i, { selector: "input" })
    ).toHaveValue("");
    expect(
      screen.getByLabelText(/^new password$/i, { selector: "input" })
    ).toHaveValue("");
    expect(
      screen.getByLabelText(/confirm new password/i, { selector: "input" })
    ).toHaveValue("");
  });

  it("shows error when new password doesnt match", async () => {
    render(
      <MemoryRouter>
        <PasswordPage />
      </MemoryRouter>
    );

    await user.type(
      screen.getByLabelText(/current password/i, { selector: "input" }),
      "wrongPass!23"
    );
    await user.type(
      screen.getByLabelText(/^new password$/i, { selector: "input" }),
      "NewPass!23"
    );
    await user.type(
      screen.getByLabelText(/confirm new password/i, { selector: "input" }),
      "NewPass123"
    );

    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByText(/new password and confirmation do not match/i)
    ).toBeInTheDocument();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("shows error when password doesnt match criteria", async () => {
    render(
      <MemoryRouter>
        <PasswordPage />
      </MemoryRouter>
    );

    await user.type(
      screen.getByLabelText(/current password/i, { selector: "input" }),
      "oldPass!23"
    );
    await user.type(
      screen.getByLabelText(/^new password$/i, { selector: "input" }),
      "short"
    );
    await user.type(
      screen.getByLabelText(/confirm new password/i, { selector: "input" }),
      "short"
    );

    await user.click(screen.getByRole("button", { name: /update password/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      /Password must be at least 8 characters long/i
    );

    expect(mockedFetch).not.toHaveBeenCalled();
  });
});

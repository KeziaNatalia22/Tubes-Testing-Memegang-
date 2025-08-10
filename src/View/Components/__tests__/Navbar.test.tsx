import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

jest.mock("../../FetchEndpoint");
import { fetchEndpoint } from "../../FetchEndpoint";
const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

let authState: any = { isAuthenticated: false, userData: null, logout: jest.fn() };
let modalState: any = {
  openLoginModal: jest.fn(),
  openRegisterModal: jest.fn(),
  openCreatePostModal: jest.fn(),
};

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => authState,
}));
jest.mock("../../contexts/ModalContext", () => ({
  useModal: () => modalState,
}));

const navigateMock = jest.fn();
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

import Navbar from "../Navbar";

describe("Navbar", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    authState = { isAuthenticated: false, userData: null, logout: jest.fn() };
  });

  it("shows login/signup when unauthenticated and opens modals", async () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /log in/i }));
    expect(modalState.openLoginModal).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /sign up/i }));
    expect(modalState.openRegisterModal).toHaveBeenCalled();
  });

  it("debounces search typing and navigates with results", async () => {
    mockedFetch.mockResolvedValueOnce([{ id: 1 }]);

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const input = screen.getByRole("textbox", { name: /search/i });
    await user.type(input, "cats");

    // Wait for debounce to elapse and navigation call
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith("/search?query=cats", "GET"));
    expect(navigateMock).toHaveBeenCalledWith("/", { state: { searchResults: [{ id: 1 }], searchQuery: "cats" } });
  });

  it("search submit calls fetch immediately and navigates", async () => {
    mockedFetch.mockResolvedValueOnce([{ id: 2 }]);

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const input = screen.getByRole("textbox", { name: /search/i });
    await user.type(input, "dogs");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith("/search?query=dogs", "GET"));
    expect(navigateMock).toHaveBeenCalledWith("/", { state: { searchResults: [{ id: 2 }], searchQuery: "dogs" } });
  });

  it("shows authenticated actions, opens menu and logs out", async () => {
    authState = {
      isAuthenticated: true,
      userData: { id: "u1", username: "john", name: "John", profilePicture: "avatar.jpg", role: "user" },
      logout: jest.fn(),
    };

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    // Post button opens create post modal
    await user.click(screen.getByRole("button", { name: /post/i }));
    expect(modalState.openCreatePostModal).toHaveBeenCalled();

    // Open account menu
    await user.click(screen.getByRole("button", { name: /account/i }));
    // Click Logout in menu
    await user.click(await screen.findByRole("menuitem", { name: /logout/i }));
    expect(authState.logout).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("renders avatar src via uploads path when profilePicture present", async () => {
    authState = {
      isAuthenticated: true,
      userData: { id: "u1", username: "john", name: "John", profilePicture: "avatar.png", role: "user" },
      logout: jest.fn(),
    };

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const avatarBtn = screen.getByRole("button", { name: /account/i });
    const img = avatarBtn.querySelector("img") as HTMLImageElement;
    expect(img?.src).toContain("/uploads/avatars/avatar.png");
  });
});

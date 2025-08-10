import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

jest.mock("../../FetchEndpoint");
import { fetchEndpoint } from "../../FetchEndpoint";
const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

let openLoginModalMock = jest.fn();

// Make auth mock dynamic so we can switch per test
let authState: any = { isAuthenticated: false, token: null, userData: null };

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

jest.mock("../../contexts/ModalContext", () => ({
  useModal: () => ({ openLoginModal: openLoginModalMock }),
}));

// Mock PostCard to simple buttons to trigger callbacks
jest.mock("../../Components/PostCard", () => (props: any) => {
  return (
    <div data-testid={`post-${props.postId}`}>
      <span data-testid={`title-${props.postId}`}>{props.title}</span>
      <div data-testid={`saved-${props.postId}`}>{String(!!props.isSaved)}</div>
      <button onClick={props.onCommentClick}>Comment</button>
      <button onClick={props.onSaveClick}>Save</button>
    </div>
  );
});

const navigateMock = jest.fn();
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ username: "john" }),
  };
});

import Profile from "../Profile";

describe("Profile", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetch.mockReset();
  authState = { isAuthenticated: false, token: null, userData: null };

    // Token for /profile/me
    try {
      (localStorage.getItem as unknown as jest.Mock).mockReturnValue("token-123");
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

  it("loads and shows user info, tabs, and handles unauth save (opens login)", async () => {
    // 1) /profile/me
    mockedFetch.mockResolvedValueOnce({ username: "currentUser" });
    // 2) /profile/john
    mockedFetch.mockResolvedValueOnce({
      id: "u1",
      username: "john",
      email: "john@example.com",
      profilePicture: "avatar.jpg",
    });
    // 3) /profile/john/post
    mockedFetch.mockResolvedValueOnce([
      {
        id: "p1",
        title: "First Post",
        image_url: "/img.jpg",
        user_id: "u1",
        name: "john",
        createdAt: "2025-01-01T00:00:00.000Z",
        commentsCount: 0,
        upvotes: 0,
        downvotes: 0,
        tags: [],
        profilePicture: "avatar.jpg",
      },
    ]);
    // 4) /profile/john/comment
    mockedFetch.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    // Renders header info
    await waitFor(() => expect(screen.getByText("john")).toBeInTheDocument());
    expect(screen.getByText("john@example.com")).toBeInTheDocument();

    // PostCard mocked renders
    expect(await screen.findByTestId("post-p1")).toBeInTheDocument();
    expect(screen.getByTestId("title-p1")).toHaveTextContent("First Post");

    // Unauth save opens login modal
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(openLoginModalMock).toHaveBeenCalled();

    // Switch to Comments tab
    await user.click(screen.getByRole("tab", { name: /comments/i }));
    expect(await screen.findByText(/no comments yet/i)).toBeInTheDocument();
  });

  it("renders avatar from uploads path", async () => {
    mockedFetch.mockResolvedValueOnce({ username: "currentUser" });
    mockedFetch.mockResolvedValueOnce({
      id: "u1",
      username: "john",
      email: "john@example.com",
      profilePicture: "avatar.jpg",
    });
    mockedFetch.mockResolvedValueOnce([
      {
        id: "p1",
        title: "First Post",
        image_url: "/img.jpg",
        user_id: "u1",
        name: "john",
        createdAt: "2025-01-01T00:00:00.000Z",
        commentsCount: 0,
        upvotes: 0,
        downvotes: 0,
        tags: [],
        profilePicture: "avatar.jpg",
      },
    ]);
    mockedFetch.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("john")).toBeInTheDocument());
    const avatarImg = screen.getByAltText("john") as HTMLImageElement;
    expect(avatarImg.src).toContain("/uploads/avatars/avatar.jpg");
  });

  it("navigates to post detail when clicking Comment", async () => {
    mockedFetch.mockResolvedValueOnce({ username: "currentUser" });
    mockedFetch.mockResolvedValueOnce({
      id: "u1",
      username: "john",
      email: "john@example.com",
      profilePicture: "avatar.jpg",
    });
    mockedFetch.mockResolvedValueOnce([
      {
        id: "p1",
        title: "First Post",
        image_url: "/img.jpg",
        user_id: "u1",
        name: "john",
        createdAt: "2025-01-01T00:00:00.000Z",
        commentsCount: 0,
        upvotes: 0,
        downvotes: 0,
        tags: [],
        profilePicture: "avatar.jpg",
      },
    ]);
    mockedFetch.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await screen.findByTestId("post-p1");
    await user.click(screen.getByRole("button", { name: /comment/i }));
    expect(navigateMock).toHaveBeenCalledWith("/post/p1");
  });

  it("shows delete for own comment and removes after confirm", async () => {
    // currentUser is john
    mockedFetch.mockResolvedValueOnce({ username: "john" });
    mockedFetch.mockResolvedValueOnce({
      id: "u1",
      username: "john",
      email: "john@example.com",
      profilePicture: "avatar.jpg",
    });
    mockedFetch.mockResolvedValueOnce([]); // posts
    mockedFetch.mockResolvedValueOnce([
      {
        id: "c1",
        postId: "p1",
        content: "my comment",
        createdAt: "2025-01-01T00:00:00.000Z",
        user: { username: "john" },
      },
      {
        id: "c2",
        postId: "p1",
        content: "other comment",
        createdAt: "2025-01-01T00:00:00.000Z",
        user: { username: "alice" },
      },
    ]);
    // DELETE call
    mockedFetch.mockResolvedValueOnce({ success: true });

    const originalConfirm = window.confirm;
    // Confirm deletion
    window.confirm = jest.fn(() => true);

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    // Switch to Comments tab
    await user.click(await screen.findByRole("tab", { name: /comments/i }));
    // Only one delete button should be visible (for john's own comment)
    const deleteBtns = await screen.findAllByRole("button", { name: /delete/i });
    expect(deleteBtns).toHaveLength(1);

    // Click delete and expect API called and comment removed
    await user.click(deleteBtns[0]);
    await waitFor(() => expect(mockedFetch).toHaveBeenLastCalledWith(
      "/comments/c1",
      "DELETE",
      "token-123"
    ));
    // my comment removed, other stays
    await waitFor(() => expect(screen.queryByText("my comment")).not.toBeInTheDocument());
    expect(screen.getByText("other comment")).toBeInTheDocument();

    // restore
    window.confirm = originalConfirm;
  });
});
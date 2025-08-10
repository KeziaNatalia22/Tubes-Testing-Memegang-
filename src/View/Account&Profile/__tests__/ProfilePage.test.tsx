import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

const updateProfileMock = jest.fn().mockResolvedValue({ success: true });
const uploadAvatarMock = jest.fn().mockResolvedValue({
  success: true,
  data: { profilePicture: "avatar-new.jpg" },
});
const deleteAvatarMock = jest.fn().mockResolvedValue({ success: true });

jest.mock("../../Settings", () => ({
  useProfile: () => ({
    userData: {
      id: "u1",
      name: "John Doe",
      bio: "Hi there",
      profilePicture: "avatar.jpg",
    },
    loading: false,
    updateProfile: updateProfileMock,
    uploadAvatar: uploadAvatarMock,
    deleteAvatar: deleteAvatarMock,
  }),
}));

const navigateMock = jest.fn();
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

import ProfileSettings from "../ProfilePage";

describe("ProfileSettings (ProfilePage)", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves display name and about", async () => {
    render(
      <MemoryRouter>
        <ProfileSettings />
      </MemoryRouter>
    );

    // Change fields
    await user.clear(screen.getByLabelText(/display name/i, { selector: "input" }));
    await user.type(screen.getByLabelText(/display name/i, { selector: "input" }), "Jane");
    await user.clear(screen.getByLabelText(/about/i, { selector: "textarea" }));
    await user.type(screen.getByLabelText(/about/i, { selector: "textarea" }), "About Jane");

    // Submit
    await user.click(screen.getByRole("button", { name: /save changes/i }));

  await waitFor(() => expect(updateProfileMock).toHaveBeenCalled());

    expect(await screen.findByText(/profile updated successfully/i)).toBeInTheDocument();
  });

  it("uploads selected photo after Change Photo", async () => {
    const { container } = render(
      <MemoryRouter>
        <ProfileSettings />
      </MemoryRouter>
    );

    // Open file picker and select a file
    await user.click(screen.getByRole("button", { name: /change photo/i }));
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["avatar-bytes"], "avatar-new.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Upload button should appear once a file is selected
    const uploadBtn = await screen.findByRole("button", { name: /upload/i });
    await user.click(uploadBtn);

  await waitFor(() => expect(uploadAvatarMock).toHaveBeenCalled());
    // Optionally assert it was called with a FormData instance
    // expect(uploadAvatarMock.mock.calls[0][0]).toBeInstanceOf(FormData);

    // Success alert appears
    expect(
      await screen.findByText(/profile picture uploaded successfully/i)
    ).toBeInTheDocument();

    // After successful upload, Upload button should disappear (avatar cleared)
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /upload/i })).not.toBeInTheDocument();
    });
  });

  it("removes photo when clicking Remove Photo", async () => {
    render(
      <MemoryRouter>
        <ProfileSettings />
      </MemoryRouter>
    );

    // Button is visible initially because avatarUrl comes from userData.profilePicture
    const removeBtn = await screen.findByRole("button", { name: /remove photo/i });
    await user.click(removeBtn);

    await waitFor(() => expect(deleteAvatarMock).toHaveBeenCalled());

    // Success alert appears
    expect(
      await screen.findByText(/profile picture deleted successfully/i)
    ).toBeInTheDocument();

  // Keep it simple: we verified API call and success feedback
  });
});
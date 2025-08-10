/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ModalProvider, useModal } from '../ModalContext';

function ModalConsumer() {
  const m = useModal();
  return (
    <div>
      <div data-testid="state-login">{String(m.isLoginModalOpen)}</div>
      <div data-testid="state-register">{String(m.isRegisterModalOpen)}</div>
      <div data-testid="state-forgot">{String(m.isForgotPasswordModalOpen)}</div>
      <div data-testid="state-reset">{String(m.isResetPasswordModalOpen)}</div>
      <div data-testid="state-create">{String(m.isCreatePostModalOpen)}</div>
      <div data-testid="state-edit">{String(m.isEditPostModalOpen)}</div>
      <div data-testid="edit-title">{m.editPostData?.titleEdit ?? ''}</div>

      <button onClick={m.openLoginModal}>openLogin</button>
      <button onClick={m.switchToRegister}>switchToRegister</button>
      <button onClick={m.openForgotPasswordModal}>openForgot</button>
      <button onClick={m.openResetPasswordModal}>openReset</button>
      <button onClick={m.openCreatePostModal}>openCreate</button>
      <button
        onClick={() =>
          m.openEditPostModal({
            postId: 'p1',
            imageUrlEdit: 'img.jpg',
            titleEdit: 'Edit Title',
            tagsEdit: ['t1'],
          })
        }
      >
        openEdit
      </button>
      <button onClick={m.closeLoginModal}>closeLogin</button>
      <button onClick={m.closeEditPostModal}>closeEdit</button>
    </div>
  );
}

describe('ModalContext', () => {
  it('opens, switches, and closes modals; stores edit data', async () => {
    render(
      <ModalProvider>
        <ModalConsumer />
      </ModalProvider>
    );

    // Initial state
    expect(screen.getByTestId('state-login')).toHaveTextContent('false');
    expect(screen.getByTestId('state-register')).toHaveTextContent('false');
    expect(screen.getByTestId('state-forgot')).toHaveTextContent('false');
    expect(screen.getByTestId('state-reset')).toHaveTextContent('false');
    expect(screen.getByTestId('state-create')).toHaveTextContent('false');
    expect(screen.getByTestId('state-edit')).toHaveTextContent('false');
    expect(screen.getByTestId('edit-title')).toHaveTextContent('');

    // Open login
    await userEvent.click(screen.getByRole('button', { name: 'openLogin' }));
    expect(screen.getByTestId('state-login')).toHaveTextContent('true');
    expect(screen.getByTestId('state-register')).toHaveTextContent('false');

    // Switch to register
    await userEvent.click(screen.getByRole('button', { name: 'switchToRegister' }));
    expect(screen.getByTestId('state-register')).toHaveTextContent('true');
    expect(screen.getByTestId('state-login')).toHaveTextContent('false');

    // Open forgot then reset
    await userEvent.click(screen.getByRole('button', { name: 'openForgot' }));
    expect(screen.getByTestId('state-forgot')).toHaveTextContent('true');
    await userEvent.click(screen.getByRole('button', { name: 'openReset' }));
    expect(screen.getByTestId('state-reset')).toHaveTextContent('true');

    // Open create post
    await userEvent.click(screen.getByRole('button', { name: 'openCreate' }));
    expect(screen.getByTestId('state-create')).toHaveTextContent('true');

    // Open edit with data
    await userEvent.click(screen.getByRole('button', { name: 'openEdit' }));
    expect(screen.getByTestId('state-edit')).toHaveTextContent('true');
    expect(screen.getByTestId('edit-title')).toHaveTextContent('Edit Title');

    // Close edit and login
    await userEvent.click(screen.getByRole('button', { name: 'closeEdit' }));
    expect(screen.getByTestId('state-edit')).toHaveTextContent('false');
    expect(screen.getByTestId('edit-title')).toHaveTextContent('');
    await userEvent.click(screen.getByRole('button', { name: 'closeLogin' }));
    expect(screen.getByTestId('state-login')).toHaveTextContent('false');
  });
});

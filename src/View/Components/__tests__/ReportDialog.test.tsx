/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ReportDialog from '../ReportDialog';

describe('ReportDialog', () => {
  it('validates when no reason is selected', async () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(<ReportDialog open onClose={onClose} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /Report/i }));
    expect(screen.getByText(/Please select a reason/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires comment when reason is other', async () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(<ReportDialog open onClose={onClose} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByLabelText(/Other/i));
    await userEvent.click(screen.getByRole('button', { name: /Report/i }));
    expect(screen.getByText(/provide a comment/i)).toBeInTheDocument();

    const comment = screen.getByLabelText(/Please specify/i);
    await userEvent.type(comment, 'extra context');
    await userEvent.click(screen.getByRole('button', { name: /Report/i }));

    expect(onSubmit).toHaveBeenCalledWith('other', 'extra context');
  });

  it('submits report with valid reason', async () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(<ReportDialog open onClose={onClose} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByLabelText(/Spam/i));
    await userEvent.click(screen.getByRole('button', { name: /Report/i }));
    expect(onSubmit).toHaveBeenCalledWith('spam', '');

    await userEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

});

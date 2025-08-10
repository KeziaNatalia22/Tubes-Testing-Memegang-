/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SearchForm from '../SearchForm';
import { fetchEndpoint } from '../FetchEndpoint';

jest.mock('../FetchEndpoint');

// Mock useSearchParams
const mockGet = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: () => [{ get: mockGet }],
}));

describe('SearchForm', () => {
  const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders and switches tabs', async () => {
    mockGet.mockReturnValue(null);
    render(<SearchForm onSubmit={jest.fn()} />);

    // default heading
    expect(screen.getByRole('heading', { name: /Search/i })).toBeInTheDocument();

    // switch to posts and tags
    await userEvent.click(screen.getByRole('button', { name: /Posts/i }));
    expect(screen.getByRole('button', { name: /Posts/i })).toHaveStyle({ backgroundColor: 'rgb(0, 123, 255)' });
    await userEvent.click(screen.getByRole('button', { name: /Tags/i }));
    expect(screen.getByRole('button', { name: /Tags/i })).toHaveStyle({ backgroundColor: 'rgb(0, 123, 255)' });
  });

  it('fetches results on query param and displays them', async () => {
    mockGet.mockReturnValue('react');

    // Mock fetchEndpoint like a fetch() response the component expects
    const json = jest.fn().mockResolvedValue({
      users: [{ username: 'alice' }],
      posts: [{ title: 'Hello' }],
      tags: [{ name: 'js' }],
    });
    (mockedFetch as any).mockResolvedValue({ ok: true, json });

    render(<SearchForm onSubmit={jest.fn()} />);

  // Users visible by default
  expect(await screen.findByText('alice')).toBeInTheDocument();

  // Switch to Posts and Tags to see their items
  await userEvent.click(screen.getByRole('button', { name: /Posts/i }));
  expect(screen.getByText('Hello')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Tags/i }));
  expect(screen.getByText('js')).toBeInTheDocument();

    // Called with encoded query
    expect(mockedFetch).toHaveBeenCalledWith('/search?query=react', 'GET', null);
  });
});

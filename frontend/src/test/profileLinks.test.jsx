import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import ProfileLinks from '../components/ProfileLinks';
import getErrorMessage from '../utils/getErrorMessage';

describe('ProfileLinks', () => {
  test('renders nothing at all when there are no links', () => {
    const { container } = render(<ProfileLinks />);
    expect(container).toBeEmptyDOMElement();
  });

  test('shows the portfolio before GitHub', () => {
    render(<ProfileLinks websiteUrl="https://ada.dev" githubUrl="https://github.com/ada" />);
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'https://ada.dev',
      'https://github.com/ada',
    ]);
  });

  test('shows GitHub on its own when there is no portfolio', () => {
    render(<ProfileLinks githubUrl="https://github.com/ada" />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  test('strips the scheme and trailing slash from the label but not the href', () => {
    render(<ProfileLinks websiteUrl="https://www.ada.dev/" />);
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('ada.dev');
    expect(link).toHaveAttribute('href', 'https://www.ada.dev/');
  });

  test('opens in a new tab without handing the opener over', () => {
    render(<ProfileLinks websiteUrl="https://ada.dev" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});

describe('getErrorMessage', () => {
  // Every branch here exists because some failure never reaches the API's own
  // error handler, and collapsing them all to "Something went wrong" is what
  // this function was written to avoid.
  test('prefers the API message', () => {
    expect(
      getErrorMessage({ response: { status: 400, data: { message: 'Title is required' } } })
    ).toBe('Title is required');
  });

  test('covers a rate-limit response with no usable body', () => {
    expect(getErrorMessage({ response: { status: 429, data: '' } })).toMatch(/too many/i);
  });

  test('covers a server error', () => {
    expect(getErrorMessage({ response: { status: 503, data: {} } })).toMatch(
      /server ran into a problem/i
    );
  });

  test('covers a request that never got a response', () => {
    expect(getErrorMessage({ request: {} })).toMatch(/can't reach the server/i);
  });

  test('covers a timeout', () => {
    expect(getErrorMessage({ code: 'ECONNABORTED' })).toMatch(/timed out/i);
  });
});

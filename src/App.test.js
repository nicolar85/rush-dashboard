import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the login screen with the main title', () => {
  render(<App />);
  const titleElement = screen.getByText(/RUSH Dashboard/i);
  expect(titleElement).toBeInTheDocument();
});

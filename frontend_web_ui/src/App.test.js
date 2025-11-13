import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders chat header", () => {
  render(<App />);
  const heading = screen.getByText(/Hello, how can I help\?/i);
  expect(heading).toBeInTheDocument();
});

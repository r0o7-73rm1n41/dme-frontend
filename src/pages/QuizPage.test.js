// frontend/src/pages/QuizPage.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import QuizPage from './QuizPage';

// Mock the API
jest.mock('../utils/api');
jest.mock('../context/AlertContext', () => ({
  showAlert: jest.fn()
}));

const mockUser = {
  _id: 'test-user-id',
  name: 'Test User'
};

const MockAuthProvider = ({ children }) => (
  <AuthContext.Provider value={{ user: mockUser }}>
    {children}
  </AuthContext.Provider>
);

describe('QuizPage Component', () => {
  test('renders loading state initially', () => {
    render(
      <BrowserRouter>
        <MockAuthProvider>
          <QuizPage />
        </MockAuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Loading Quiz...')).toBeInTheDocument();
  });

  test('has proper CSS classes applied', () => {
    const { container } = render(
      <BrowserRouter>
        <MockAuthProvider>
          <QuizPage />
        </MockAuthProvider>
      </BrowserRouter>
    );

    expect(container.querySelector('.quiz-container')).toBeInTheDocument();
    expect(container.querySelector('.quiz-wrapper')).toBeInTheDocument();
    expect(container.querySelector('.quiz-loading')).toBeInTheDocument();
  });
});
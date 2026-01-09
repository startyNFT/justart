# Testing Guide

This project uses Jest and React Testing Library for testing.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (reruns on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are organized alongside the code they test:

```
lib/
├── constants.ts
└── __tests__/
    └── constants.test.ts

components/
├── SkeletonGrid.tsx
└── __tests__/
    └── SkeletonGrid.test.tsx
```

## Test Categories

### Unit Tests
- **Location**: `lib/__tests__/`
- **Purpose**: Test individual functions and utilities
- **Examples**: rate-limit.test.ts, constants.test.ts

### Component Tests
- **Location**: `components/__tests__/`
- **Purpose**: Test React components in isolation
- **Examples**: SkeletonGrid.test.tsx, ErrorBoundary.test.tsx

### Integration Tests (Future)
- Test multiple components working together
- Test API routes with mocked dependencies

## Writing Tests

### Component Test Example

```tsx
import { render, screen } from '@testing-library/react'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

### Utility Function Test Example

```ts
import { myUtilFunction } from '../myUtil'

describe('myUtilFunction', () => {
  it('should return expected result', () => {
    const result = myUtilFunction('input')
    expect(result).toBe('expected output')
  })
})
```

## Test Utilities

### Available Matchers

From `@testing-library/jest-dom`:
- `toBeInTheDocument()` - Element is in the DOM
- `toHaveClass()` - Element has CSS class
- `toHaveStyle()` - Element has inline styles
- `toBeVisible()` - Element is visible
- `toBeDisabled()` - Element is disabled

### Mocking

```ts
// Mock a module
jest.mock('../api', () => ({
  fetchData: jest.fn(),
}))

// Mock a function
const mockFn = jest.fn()
mockFn.mockReturnValue('mocked value')
```

## Coverage Goals

- **Statements**: > 70%
- **Branches**: > 60%
- **Functions**: > 70%
- **Lines**: > 70%

Priority areas for testing:
1. Core utilities (rate limiting, constants)
2. Reusable components
3. API routes
4. Critical user flows

## Configuration Files

- `jest.config.ts` - Main Jest configuration
- `jest.setup.ts` - Test environment setup and global mocks

## Best Practices

1. **Test behavior, not implementation**
   - Focus on what the user sees and does
   - Avoid testing internal state or implementation details

2. **Use descriptive test names**
   ```ts
   // Good
   it('should display error message when form validation fails', () => {})

   // Bad
   it('test 1', () => {})
   ```

3. **Arrange-Act-Assert pattern**
   ```ts
   it('should do something', () => {
     // Arrange - set up test data
     const input = 'test'

     // Act - perform action
     const result = myFunction(input)

     // Assert - verify result
     expect(result).toBe('expected')
   })
   ```

4. **Keep tests isolated**
   - Each test should be independent
   - Use `beforeEach` to reset state
   - Don't rely on test execution order

5. **Mock external dependencies**
   - Mock API calls
   - Mock database queries
   - Mock browser APIs when needed

## Continuous Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Before deployment

Failed tests will block deployment to production.

## Troubleshooting

### Tests fail with "Cannot find module"
- Run `npm install` to install dependencies
- Check that import paths use `@/` alias correctly

### Tests timeout
- Increase timeout: `jest.setTimeout(10000)`
- Check for unresolved promises
- Ensure async operations complete

### Coverage not accurate
- Check `.gitignore` patterns
- Verify `collectCoverageFrom` in jest.config.ts

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

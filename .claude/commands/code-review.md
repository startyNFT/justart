# Code Review Command

Perform a comprehensive code review of the recent changes or current codebase state. Focus on:

## Performance
- Identify unnecessary re-renders, inefficient loops, or blocking operations
- Check for unoptimized database queries (N+1 queries, missing indexes)
- Look for large bundle sizes, unoptimized images, or missing lazy loading
- Review caching strategies and network request efficiency
- Check for memory leaks or resource management issues

## Code Quality & Cleanliness
- Review code organization, readability, and maintainability
- Check for proper error handling and edge cases
- Identify code duplication or opportunities for refactoring
- Verify consistent code style and naming conventions
- Look for unused imports, variables, or dead code
- Check for proper TypeScript typing (avoid `any`, use proper interfaces)
- Review component structure and separation of concerns

## Security Best Practices
- Check for OWASP Top 10 vulnerabilities:
  - SQL Injection (parameterized queries, input validation)
  - XSS (Cross-Site Scripting) - proper escaping and sanitization
  - CSRF (Cross-Site Request Forgery) protection
  - Authentication and session management issues
  - Insecure direct object references
  - Security misconfigurations
  - Sensitive data exposure (API keys, passwords in code)
  - Missing access controls
  - Using components with known vulnerabilities
  - Insufficient logging and monitoring
- Review API endpoint security (authentication, rate limiting, input validation)
- Check for secure environment variable handling
- Verify proper CORS configuration
- Look for insecure dependencies or outdated packages

## Output Format
For each issue found:
1. **Severity**: Critical / High / Medium / Low
2. **Category**: Performance / Quality / Security
3. **Location**: File path and line numbers
4. **Description**: What the issue is
5. **Recommendation**: How to fix it
6. **Example**: Show the problematic code and suggested improvement if applicable

If no major issues are found, provide a summary of what was reviewed and confirm best practices are being followed.

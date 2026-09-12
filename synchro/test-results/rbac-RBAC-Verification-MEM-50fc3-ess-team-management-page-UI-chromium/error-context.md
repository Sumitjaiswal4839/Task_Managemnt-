# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rbac.spec.ts >> RBAC Verification >> MEMBER Role >> MEMBER cannot access team management page UI
- Location: tests\e2e\rbac.spec.ts:67:9

# Error details

```
AggregateError: apiRequestContext.post: connect ECONNREFUSED ::1:3000
connect ECONNREFUSED 127.0.0.1:3000
Call log:
  - → POST http://localhost:3000/api/auth/login
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.8010.12 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - content-type: application/json
    - content-length: 49

```
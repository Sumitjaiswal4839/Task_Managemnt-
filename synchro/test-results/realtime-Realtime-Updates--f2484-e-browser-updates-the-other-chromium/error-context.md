# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: realtime.spec.ts >> Realtime Updates >> task update in one browser updates the other
- Location: tests\e2e\realtime.spec.ts:9:7

# Error details

```
Test timeout of 120000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - link "Synchro Synchro" [ref=e5] [cursor=pointer]:
        - /url: /
        - img "Synchro" [ref=e7]
        - generic [ref=e8]: Synchro
      - heading "Sign in to your workspace" [level=1] [ref=e9]
      - paragraph [ref=e10]: Enter your credentials or choose a pre-configured test account below
    - generic [ref=e11]:
      - paragraph [ref=e12]: 1-Click Demo Accounts
      - generic [ref=e13]:
        - button "Admin" [ref=e14]
        - button "Manager" [ref=e19]
        - button "Member" [ref=e26]
    - generic [ref=e31]: An unexpected network error occurred. Please try again.
    - generic [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]: Email address
        - textbox "name@example.com" [ref=e42]: admin@test.com
      - generic [ref=e43]:
        - generic [ref=e44]: Password
        - textbox "••••••••" [ref=e49]: Admin123!
      - button "Sign in" [ref=e50]
    - paragraph [ref=e53]:
      - text: Don't have an account?
      - link "Register here" [ref=e54] [cursor=pointer]:
        - /url: /register
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e60] [cursor=pointer]
  - alert [ref=e64]
```
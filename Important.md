Bilkul. Ab project clear hai. Tumhe **Collaborative Task Management Application with Authentication + Role-Based Features** banana hai.

Isko simple **Trello/Jira-lite** type application samjho — users login karenge, workspace/team mein tasks create/manage karenge, aur different roles ke according unko different permissions milengi.

## 🎯 Project ka core idea

Ek application jahan:

**Admin/Manager**

* Team members manage kare
* Tasks create kare
* Tasks assign kare
* Task status/priority change kare
* Team ka work monitor kare

**Member**

* Apne assigned tasks dekhe
* Task status update kare
* Comments/additional information de
* Apne tasks manage kare

---

# 🏗️ Recommended Tech Stack

Tumhare challenge ke according main ye stack use karunga:

```text
Frontend
   ↓
Next.js + React + Tailwind CSS
   ↓
API / Backend
   ↓
Next.js API Routes
   ↓
PostgreSQL
   ↓
Prisma ORM
```

Authentication ke liye:

```text
NextAuth/Auth.js
```

Deployment:

```text
Frontend + API → Vercel
Database       → Neon / Supabase PostgreSQL
```

Ye stack tumhare specified **React + Next.js + Node.js + PostgreSQL** requirements ke saath achhe se fit hota hai.

---

# 🔐 1. Authentication

Sabse pehle proper authentication.

### Pages

```text
/login
/register
/forgot-password   (optional)
```

Register:

```text
Name
Email
Password
Confirm Password
```

Login:

```text
Email
Password
```

Password ko **plain text mein database mein kabhi store nahi karna**.

---

# 👥 2. Role-Based Access Control

At least 2 roles rakho:

```text
ADMIN
MEMBER
```

Agar project ko thoda stronger banana hai:

```text
ADMIN
MANAGER
MEMBER
```

### Example permissions

| Feature            | Admin | Manager |  Member |
| ------------------ | ----: | ------: | ------: |
| Create task        |     ✅ |       ✅ |       ❌ |
| Assign task        |     ✅ |       ✅ |       ❌ |
| Delete task        |     ✅ |       ✅ |       ❌ |
| View all tasks     |     ✅ |       ✅ | Limited |
| Update own task    |     ✅ |       ✅ |       ✅ |
| Change task status |     ✅ |       ✅ |       ✅ |
| Manage users       |     ✅ |       ❌ |       ❌ |
| Change roles       |     ✅ |       ❌ |       ❌ |

This is what will demonstrate **role-based features** properly.

---

# 📋 3. Task Management

This is the heart of your application.

Each task could contain:

```text
Task
 ├── ID
 ├── Title
 ├── Description
 ├── Status
 ├── Priority
 ├── Due Date
 ├── Created By
 ├── Assigned To
 ├── Created At
 └── Updated At
```

### Status

```text
TODO
IN_PROGRESS
DONE
```

### Priority

```text
LOW
MEDIUM
HIGH
```

---

# 🖥️ 4. Dashboard

After login:

```text
------------------------------------------------
| TaskFlow                    👤 Sumit   Logout |
------------------------------------------------
|                                              |
|  Total Tasks     Pending    In Progress Done |
|      24             8          10       6    |
|                                              |
------------------------------------------------
| Tasks                                        |
|                                              |
| Search 🔍       Status ▼     Priority ▼      |
|                                              |
| ┌──────────────────────────────────────────┐ |
| | Build Login Page                         | |
| | HIGH • IN PROGRESS                       | |
| | Assigned: Rahul          Due: Sep 15     | |
| └──────────────────────────────────────────┘ |
|                                              |
------------------------------------------------
```

Dashboard should immediately tell the evaluator:

**"This is a real task management application."**

---

# 📝 5. Create Task

Admin/Manager gets:

```text
Create Task

Title
Description

Priority
[ Low ▼ ]

Status
[ Todo ▼ ]

Assign To
[ Select Member ▼ ]

Due Date

[ Create Task ]
```

Backend:

```text
POST /api/tasks
```

---

# 🔄 6. Update Task

Member should be able to update the task assigned to them.

For example:

```text
TODO
 ↓
IN_PROGRESS
 ↓
DONE
```

You can make this visually attractive with a Kanban board:

```text
┌─────────────┬──────────────┬──────────────┐
│    TODO     │ IN PROGRESS  │     DONE     │
├─────────────┼──────────────┼──────────────┤
│ Task A      │ Task C       │ Task E       │
│ Task B      │ Task D       │ Task F       │
│             │              │              │
└─────────────┴──────────────┴──────────────┘
```

**Kanban board = very good visual feature for this project.**

---

# 💬 7. Collaboration

Because project specifically says **collaborative**, don't make it just a CRUD task manager.

Add comments.

Task:

```text
Build Login Page
```

Comments:

```text
Rahul:
I've completed the UI.

Sumit:
Great. Please connect it with the API.

Rahul:
Done. Pushed the changes.
```

Database:

```text
comments
---------
id
task_id
user_id
content
created_at
```

This gives you a genuine collaboration component.

---

# 🔔 8. Activity / Audit Log

This is an **excellent extra feature** if you have time.

For example:

```text
Activity

Rahul assigned "Login Page" to Amit
Amit changed "Login Page" → In Progress
Sumit changed priority → High
Rahul added a comment
Amit completed "Login Page"
```

Database:

```text
activities
----------
id
user_id
task_id
action
created_at
```

This makes the application look much more professional.

---

# 🗄️ 9. Database Design

I'd use roughly these tables:

```text
users
   │
   ├──────────────┐
   │              │
   ↓              ↓
tasks          comments
   │
   ↓
activities
```

More specifically:

```text
users
-----
id
name
email
password
role
created_at
updated_at
```

```text
tasks
-----
id
title
description
status
priority
due_date
created_by
assigned_to
created_at
updated_at
```

```text
comments
--------
id
task_id
user_id
content
created_at
```

```text
activities
----------
id
task_id
user_id
action
created_at
```

---

# 🔌 10. API Structure

Don't put everything into random files.

Something like:

```text
/api
   /auth
      login
      register

   /tasks
      GET
      POST

   /tasks/[id]
      GET
      PUT
      DELETE

   /tasks/[id]/comments
      GET
      POST

   /users
      GET
      PUT
```

Example:

```http
GET /api/tasks
POST /api/tasks
GET /api/tasks/:id
PUT /api/tasks/:id
DELETE /api/tasks/:id
```

---

# 🎨 11. UI Pages

I'd build these:

```text
/login
/register

/dashboard

/tasks
/tasks/[id]

/team

/profile
```

Admin additionally:

```text
/admin/users
```

---

# ⭐ Features Priority

Since you only have around **24 hours**, don't waste time building 30 features.

### 🔴 MUST HAVE

These should definitely work:

* Registration
* Login/logout
* Authentication protection
* Role-based authorization
* Create task
* Assign task
* View tasks
* Update task
* Delete task
* Status
* Priority
* PostgreSQL database
* Responsive UI
* GitHub README

### 🟡 SHOULD HAVE

If time permits:

* Search
* Filtering
* Sorting
* Comments
* Dashboard statistics
* Due dates
* Kanban board

### 🟢 BONUS

Only after everything above works:

* Activity logs
* Notifications
* Dark mode
* Drag & drop
* Real-time updates

**Don't start with bonus features.**

---

# 📁 Recommended Project Structure

For Next.js App Router:

```text
task-manager/
│
├── app/
│   ├── login/
│   ├── register/
│   ├── dashboard/
│   ├── tasks/
│   │   └── [id]/
│   ├── team/
│   │
│   └── api/
│       ├── auth/
│       ├── tasks/
│       ├── users/
│       └── comments/
│
├── components/
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   ├── TaskCard.jsx
│   ├── TaskForm.jsx
│   ├── TaskTable.jsx
│   └── CommentSection.jsx
│
├── lib/
│   ├── prisma.js
│   ├── auth.js
│   └── permissions.js
│
├── prisma/
│   └── schema.prisma
│
├── public/
│
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

# 🚀 24-Hour Execution Plan

### Hour 0–1

Project setup:

```bash
npx create-next-app
```

Install:

```text
Prisma
PostgreSQL client
Auth
Tailwind
```

---

### Hour 1–3

Database:

```text
User
Task
Comment
Activity
```

Create Prisma schema → migration → verify DB.

---

### Hour 3–6

Authentication:

```text
Register
Login
Logout
Protected routes
Session
```

---

### Hour 6–9

Task CRUD:

```text
Create
Read
Update
Delete
```

---

### Hour 9–11

RBAC:

```text
ADMIN
MANAGER
MEMBER
```

Test permissions carefully.

---

### Hour 11–14

Dashboard:

```text
Total Tasks
Todo
In Progress
Completed

Task list
Search
Filter
```

---

### Hour 14–17

Collaboration:

```text
Task details
Comments
Assignment
Status updates
```

---

### Hour 17–19

UI polish:

```text
Responsive
Loading states
Error messages
Empty states
Modal/forms
```

---

### Hour 19–21

Testing.

Create test accounts:

```text
admin@test.com
manager@test.com
member@test.com
```

Test each role.

---

### Hour 21–22

Deploy:

```text
GitHub
    ↓
Vercel
    ↓
PostgreSQL
```

---

### Hour 22–23

README:

```text
Project overview
Features
Tech stack
Installation
Environment variables
Database setup
API documentation
Role permissions
Screenshots
Demo credentials
```

---

### Hour 23–24

Record demo video.

**Important:** Don't spend 20 minutes explaining code.

Show:

```text
Register/Login
      ↓
Dashboard
      ↓
Admin creates task
      ↓
Assigns member
      ↓
Member logs in
      ↓
Member sees task
      ↓
Changes status
      ↓
Adds comment
      ↓
Admin sees updated task
```

That single flow demonstrates almost your entire project.

---

## 🏆 What I'd aim for

Your final application should feel like:

> **"A lightweight Jira/Trello-style collaborative workspace with secure authentication and role-based task management."**

Not:

> "I made a CRUD todo app."

That distinction matters a lot for evaluation.

### And one more thing

**Don't start coding blindly yet.** Since this is a timed challenge, we can build it systematically. I can take you from **empty folder → database → authentication → RBAC → APIs → UI → deployment → final submission**, one step at a time, with the actual code and commands.

If you're ready, **next I would set up the project architecture and database schema first**, because that prevents a lot of problems later.

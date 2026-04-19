# 🎨 ArtVerse — Online Virtual Exhibition Platform

A full-stack platform for hosting and participating in virtual **Art & Photography** exhibitions.

🌐 **Live Demo:** *(add your Render URL here after deployment)*

---

## ✨ Features

### 👁️ Visitor
- Browse gallery with search & category filter (Art / Photography)
- View exhibit details with full media display
- Like, Comment & Share exhibits

### 🎨 Creator (Artist / Photographer)
- Register as a Creator
- Upload exhibits via image/video URL
- Manage own profile and submissions
- Track approval status (Pending / Approved / Rejected)

### ⚡ Admin
- Dashboard with stats (users, exhibits, comments)
- Approve / Reject exhibit submissions
- Manage all users (change role, ban/unban, delete)
- Delete any content

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | HTML5, Vanilla CSS (Dark Glassmorphism), Vanilla JS |
| Backend | Node.js + Express.js |
| Database | MongoDB (Atlas in production) |
| Auth | JWT + bcryptjs |

---

## 🚀 Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/aryanoffi-07/Online-Virtual-Exhibition-Platform.git
cd Online-Virtual-Exhibition-Platform

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 4. Create admin account
node createAdmin.js

# 5. Start the server
npm start
```

Open: `http://localhost:5500`

---

## ⚙️ Environment Variables

Create a `.env` file (see `.env.example`):

```
PORT=5500
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/virtual_exhibition
JWT_SECRET=your_strong_secret_key_here
```

---

## 🔑 Default Admin Credentials

After running `node createAdmin.js`:

| Field | Value |
|---|---|
| Email | `admin@artverse.com` |
| Password | `admin123` |

> ⚠️ Change the password after first login in production!

---

## 📁 Project Structure

```
├── server.js              # Express entry point
├── createAdmin.js         # Admin seed script
├── middleware/
│   └── auth.js            # JWT middleware
├── models/
│   ├── User.js
│   ├── Exhibit.js
│   └── Comment.js
├── routes/
│   ├── auth.js            # /api/auth
│   ├── exhibits.js        # /api/exhibits
│   ├── users.js           # /api/users
│   └── admin.js           # /api/admin
└── public/                # Frontend (static)
    ├── index.html         # Gallery
    ├── login.html
    ├── register.html
    ├── profile.html
    ├── exhibit.html
    ├── admin.html
    ├── css/style.css
    └── js/
        ├── api.js
        ├── auth.js
        ├── browse.js
        ├── exhibit.js
        ├── profile.js
        └── admin.js
```

---

## 🌐 Deployment (Render + MongoDB Atlas)

See deployment guide below or follow the steps in `DEPLOY.md`.

---

## 📄 License

MIT

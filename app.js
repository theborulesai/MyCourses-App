// My Courses App - Final Project
// Node.js + Express backend with role-based auth and course approval

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();

// load the course catalog from JSON file
let courseCatalog = [];
try {
    const rawData = fs.readFileSync(path.join(__dirname, 'data', 'courses.json'));
    courseCatalog = JSON.parse(rawData);
    console.log("Loaded " + courseCatalog.length + " courses from catalog");
} catch (err) {
    console.error("Error loading courses.json:", err.message);
}

// middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// session config
app.use(session({
    secret: 'mycourses-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1800000 } // 30 min session
}));

// default users (role: 'student' or 'professor')
let users = [
    { username: 'admin', password: 'admin123', name: 'Admin User', role: 'professor' },
    { username: 'student', password: 'student123', name: 'Student User', role: 'student' },
    { username: 'sainath', password: 'pass123', name: 'Sainath', role: 'student' },
    { username: 'prof1', password: 'prof123', name: 'Dr. Suvadip Hazra', role: 'professor' },
    { username: 'prof2', password: 'prof123', name: 'Dr. Girish Revadigar', role: 'professor' }
];

// shared enrollments storage (simulates database)
let enrollments = [];
let enrollmentIdCounter = 1;

// ---- auth helpers ----
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) return next();
    return res.status(401).json({ error: 'Please login first' });
}

function isProfessor(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'professor') return next();
    return res.status(403).json({ error: 'Professors only' });
}

// =============================================
//  AUTH ROUTES
// =============================================

// POST /login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        req.session.user = { username: user.username, name: user.name, role: user.role };
        console.log(user.role.toUpperCase() + " logged in: " + user.name);
        res.json({ success: true, user: req.session.user });
    } else {
        res.status(401).json({ error: 'Invalid username or password' });
    }
});

// POST /register - sign up with role selection
app.post('/register', (req, res) => {
    const { username, password, name, role } = req.body;

    if (!username || !password || !name || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (role !== 'student' && role !== 'professor') {
        return res.status(400).json({ error: 'Role must be student or professor' });
    }

    const exists = users.find(u => u.username === username);
    if (exists) {
        return res.status(409).json({ error: 'Username already taken' });
    }

    users.push({ username, password, name, role });
    console.log("New " + role + " registered: " + username);
    res.status(201).json({ success: true, message: 'Account created! You can now sign in.' });
});

// POST /logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.json({ success: true });
    });
});

// GET /session
app.get('/session', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// =============================================
//  COURSE CATALOG ROUTES
// =============================================

app.get('/courses', isAuthenticated, (req, res) => {
    res.json(courseCatalog);
});

app.get('/course/:id', isAuthenticated, (req, res) => {
    const courseId = parseInt(req.params.id);
    const course = courseCatalog.find(c => c.id === courseId);
    if (course) res.json(course);
    else res.status(404).json({ error: 'Course not found' });
});

// =============================================
//  STUDENT: ENROLLMENT ROUTES
// =============================================

// GET /mycourses - student's enrolled courses
app.get('/mycourses', isAuthenticated, (req, res) => {
    const username = req.session.user.username;
    const myCourses = enrollments.filter(e => e.studentUsername === username);
    res.json(myCourses);
});

// POST /course - student enrolls (status = Pending Approval)
app.post('/course', isAuthenticated, (req, res) => {
    const { title, details, semester, enrollstatus } = req.body;
    const user = req.session.user;

    if (!title || !details || !semester) {
        return res.status(400).json({ error: 'Title, details, and semester are required' });
    }

    const enrollment = {
        id: enrollmentIdCounter++,
        studentUsername: user.username,
        studentName: user.name,
        courseTitle: title,
        courseDetails: details,
        semester: semester,
        enrollstatus: enrollstatus || 'Pending Approval',
        approvedBy: null,
        requestDate: new Date().toISOString()
    };

    enrollments.push(enrollment);
    console.log("Course enrolled: " + title + " by " + user.name + " [" + enrollment.enrollstatus + "]");
    res.status(201).json({ success: true, message: 'Course added', course: enrollment });
});

// PUT /course/:id - edit enrollment
app.put('/course/:id', isAuthenticated, (req, res) => {
    const courseId = parseInt(req.params.id);
    const { title, details, semester, enrollstatus } = req.body;

    const index = enrollments.findIndex(e => e.id === courseId);
    if (index === -1) return res.status(404).json({ error: 'Course not found' });

    if (title) enrollments[index].courseTitle = title;
    if (details) enrollments[index].courseDetails = details;
    if (semester) enrollments[index].semester = semester;
    if (enrollstatus) enrollments[index].enrollstatus = enrollstatus;

    res.json({ success: true, message: 'Course updated', course: enrollments[index] });
});

// DELETE /course/:id - remove enrollment
app.delete('/course/:id', isAuthenticated, (req, res) => {
    const courseId = parseInt(req.params.id);
    const index = enrollments.findIndex(e => e.id === courseId);
    if (index === -1) return res.status(404).json({ error: 'Course not found' });

    const removed = enrollments.splice(index, 1);
    res.json({ success: true, message: 'Course removed', course: removed[0] });
});

// =============================================
//  PROFESSOR: APPROVAL ROUTES
// =============================================

// GET /all-enrollments - professor sees all student enrollments
app.get('/all-enrollments', isProfessor, (req, res) => {
    res.json(enrollments);
});

// PUT /approve/:id - professor approves enrollment
app.put('/approve/:id', isProfessor, (req, res) => {
    const id = parseInt(req.params.id);
    const index = enrollments.findIndex(e => e.id === id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    enrollments[index].enrollstatus = 'Approved';
    enrollments[index].approvedBy = req.session.user.name;
    console.log("APPROVED: " + enrollments[index].courseTitle + " for " + enrollments[index].studentName);
    res.json({ success: true, enrollment: enrollments[index] });
});

// PUT /reject/:id - professor rejects enrollment
app.put('/reject/:id', isProfessor, (req, res) => {
    const id = parseInt(req.params.id);
    const index = enrollments.findIndex(e => e.id === id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    enrollments[index].enrollstatus = 'Rejected';
    enrollments[index].approvedBy = req.session.user.name;
    console.log("REJECTED: " + enrollments[index].courseTitle + " for " + enrollments[index].studentName);
    res.json({ success: true, enrollment: enrollments[index] });
});

// =============================================
//  SERVE PAGES
// =============================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log('');
    console.log('==========================================');
    console.log(' My Courses App is running!');
    console.log(' Open http://localhost:' + PORT + ' in browser');
    console.log('==========================================');
    console.log('');
});

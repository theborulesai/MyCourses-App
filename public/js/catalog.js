// catalog.js - course catalog with enrollment (goes to Pending Approval)

let allCourses = [];
let selectedCourse = null;

// auth check
fetch('/session').then(r => r.json()).then(data => {
    if (!data.loggedIn) {
        window.location.href = '/login.html';
    } else {
        document.getElementById('userName').textContent = '👤 ' + data.user.name;
        loadCourses();
    }
}).catch(() => window.location.href = '/login.html');

function loadCourses() {
    fetch('/courses').then(r => r.json()).then(courses => {
        allCourses = courses;
        displayCourses(courses);
    });
}

function displayCourses(courses) {
    const container = document.getElementById('courseList');
    if (courses.length === 0) {
        container.innerHTML = '<p class="loading-text">No courses found.</p>';
        return;
    }

    let html = '';
    courses.forEach(course => {
        html += `
            <div class="course-card">
                <h3>${course.title}</h3>
                <p>${course.details}</p>
                <div class="card-footer">
                    <span class="semester-badge">${course.semester}</span>
                    <span class="status-badge status-open">${course.enrollstatus}</span>
                </div>
                <button class="enroll-btn" onclick="openEnrollModal(${course.id})" style="margin-top:12px;">
                    Enroll Now
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

// filters
document.getElementById('semesterFilter').addEventListener('change', filterCourses);
document.getElementById('searchBox').addEventListener('input', filterCourses);

function filterCourses() {
    const sem = document.getElementById('semesterFilter').value;
    const search = document.getElementById('searchBox').value.toLowerCase();
    let filtered = allCourses;
    if (sem !== 'all') filtered = filtered.filter(c => c.semester === sem);
    if (search) filtered = filtered.filter(c => c.title.toLowerCase().includes(search) || c.details.toLowerCase().includes(search));
    displayCourses(filtered);
}

// enroll modal
function openEnrollModal(id) {
    selectedCourse = allCourses.find(c => c.id === id);
    if (!selectedCourse) return;
    document.getElementById('modalCourseInfo').innerHTML = `
        <div style="margin-bottom:15px;">
            <h3 style="color:#1a237e;margin-bottom:8px;">${selectedCourse.title}</h3>
            <p style="color:#555;font-size:0.9em;">${selectedCourse.details}</p>
            <p style="margin-top:10px;"><span class="semester-badge">${selectedCourse.semester}</span></p>
        </div>
    `;
    document.getElementById('enrollModal').style.display = 'flex';
}

document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('enrollModal').style.display = 'none';
});

document.getElementById('enrollModal').addEventListener('click', function(e) {
    if (e.target === this) this.style.display = 'none';
});

document.getElementById('confirmEnroll').addEventListener('click', function() {
    if (!selectedCourse) return;

    fetch('/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: selectedCourse.title,
            details: selectedCourse.details,
            semester: selectedCourse.semester,
            enrollstatus: 'Pending Approval'
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showToast('Enrollment submitted! Waiting for professor approval.', 'success');
            document.getElementById('enrollModal').style.display = 'none';
            selectedCourse = null;
        } else {
            showToast(data.error || 'Failed', 'error');
        }
    });
});

// logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    fetch('/logout', { method: 'POST' }).then(() => window.location.href = '/login.html');
});

function showToast(msg, type) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

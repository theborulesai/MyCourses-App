// mycourses.js - student view of enrolled courses with approval status

let editingCourseId = null;
let deletingCourseId = null;

// auth check
fetch('/session').then(r => r.json()).then(data => {
    if (!data.loggedIn) {
        window.location.href = '/login.html';
    } else {
        document.getElementById('userName').textContent = '👤 ' + data.user.name;
        loadMyCourses();
    }
}).catch(() => window.location.href = '/login.html');

function loadMyCourses() {
    fetch('/mycourses').then(r => r.json()).then(courses => displayMyCourses(courses));
}

function displayMyCourses(courses) {
    const tbody = document.getElementById('coursesBody');
    document.getElementById('courseCount').textContent = courses.length + ' course(s)';

    if (courses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">No courses enrolled. Browse the <a href="/catalog.html">catalog</a>!</td></tr>';
        return;
    }

    let html = '';
    courses.forEach(c => {
        let statusClass = 'status-enrolled';
        if (c.enrollstatus === 'Pending Approval') statusClass = 'status-inprogress';
        else if (c.enrollstatus === 'Approved') statusClass = 'status-completed';
        else if (c.enrollstatus === 'Rejected') statusClass = 'status-dropped';

        html += `
            <tr>
                <td>${c.id}</td>
                <td><strong>${c.courseTitle}</strong></td>
                <td>${c.courseDetails}</td>
                <td><span class="semester-badge">${c.semester}</span></td>
                <td><span class="status-badge ${statusClass}">${c.enrollstatus}</span></td>
                <td>${c.approvedBy || '—'}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-edit" onclick="openEditModal(${c.id})">Edit</button>
                        <button class="btn btn-delete" onclick="openDeleteModal(${c.id}, '${c.courseTitle.replace(/'/g, "\\'")}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// Add Course
document.getElementById('addCourseBtn').addEventListener('click', function() {
    editingCourseId = null;
    document.getElementById('modalTitle').textContent = 'Add New Course';
    document.getElementById('courseForm').reset();
    document.getElementById('saveBtn').textContent = 'Add Course';
    document.getElementById('courseModal').style.display = 'flex';
});

// Edit
function openEditModal(id) {
    fetch('/mycourses').then(r => r.json()).then(courses => {
        const c = courses.find(x => x.id === id);
        if (!c) return;
        editingCourseId = id;
        document.getElementById('modalTitle').textContent = 'Edit Course';
        document.getElementById('courseTitle').value = c.courseTitle;
        document.getElementById('courseDetails').value = c.courseDetails;
        document.getElementById('courseSemester').value = c.semester;
        document.getElementById('courseStatus').value = c.enrollstatus;
        document.getElementById('saveBtn').textContent = 'Update';
        document.getElementById('courseModal').style.display = 'flex';
    });
}

document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('courseModal').style.display = 'none';
    editingCourseId = null;
});

document.getElementById('courseModal').addEventListener('click', function(e) {
    if (e.target === this) { this.style.display = 'none'; editingCourseId = null; }
});

// Save
document.getElementById('courseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
        title: document.getElementById('courseTitle').value.trim(),
        details: document.getElementById('courseDetails').value.trim(),
        semester: document.getElementById('courseSemester').value,
        enrollstatus: document.getElementById('courseStatus').value
    };

    if (!data.title || !data.details || !data.semester) return showToast('Fill all fields', 'error');

    const url = editingCourseId ? '/course/' + editingCourseId : '/course';
    const method = editingCourseId ? 'PUT' : 'POST';

    fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            showToast(editingCourseId ? 'Updated!' : 'Course added!', 'success');
            document.getElementById('courseModal').style.display = 'none';
            editingCourseId = null;
            loadMyCourses();
        }
    });
});

// Delete
function openDeleteModal(id, title) {
    deletingCourseId = id;
    document.getElementById('deleteMsg').textContent = 'Remove "' + title + '"?';
    document.getElementById('deleteModal').style.display = 'flex';
}

document.getElementById('confirmDelete').addEventListener('click', function() {
    if (!deletingCourseId) return;
    fetch('/course/' + deletingCourseId, { method: 'DELETE' }).then(r => r.json()).then(data => {
        if (data.success) {
            showToast('Course removed', 'success');
            document.getElementById('deleteModal').style.display = 'none';
            deletingCourseId = null;
            loadMyCourses();
        }
    });
});

document.getElementById('cancelDelete').addEventListener('click', () => {
    document.getElementById('deleteModal').style.display = 'none';
    deletingCourseId = null;
});

// Logout
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

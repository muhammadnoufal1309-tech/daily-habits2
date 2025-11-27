// ==================== VARIABEL & ELEMEN DOM ====================
// Mendapatkan elemen-elemen HTML yang akan di manipulasi
const taskInput = document.getElementById("taskInput"); // Input text untuk tugas baru
const addBtn = document.getElementById("addBtn"); // Tombol tambah tugas
const taskList = document.getElementById("taskList"); // Container daftar tugas
const filterBtns = document.querySelectorAll(".filter-btn"); // Tombol-tombol filter

let currentFilter = "all"; // Menyimpan filter yang aktif: all, active, completed
let deadlineCheckInterval; // Interval untuk pengecekan deadline

// ==================== SISTEM DEADLINE ====================

// FUNGSI: Mengurutkan tugas berdasarkan deadline terdekat
function sortTasksByDeadline(tasks) {
  return tasks.sort((a, b) => {
    // Tugas tanpa deadline ditampilkan di akhir
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;

    return new Date(a.deadline) - new Date(b.deadline);
  });
}

// FUNGSI: Memperbarui prioritas berdasarkan deadline
function updatePriorityBasedOnDeadline() {
  const tasks = getTasksFromStorage();
  const now = new Date();

  tasks.forEach((task) => {
    if (task.deadline && !task.completed) {
      const deadline = new Date(task.deadline);
      const timeDiff = deadline - now;
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Jika deadline kurang dari 24 jam, set prioritas tinggi
      if (hoursDiff <= 24 && task.priority !== "high") {
        task.priority = "high";
      }
      // Jika deadline kurang dari 72 jam, set prioritas sedang (kecuali sudah tinggi)
      else if (hoursDiff <= 72 && task.priority === "low") {
        task.priority = "medium";
      }
    }
  });

  localStorage.setItem("tasks", JSON.stringify(tasks));
  filterTasks(); // Refresh tampilan
}

// FUNGSI: Mengecek deadline yang mendekati
function checkApproachingDeadlines() {
  const tasks = getTasksFromStorage();
  const now = new Date();
  const approachingTasks = [];

  tasks.forEach((task) => {
    if (task.deadline && !task.completed) {
      const deadline = new Date(task.deadline);
      const timeDiff = deadline - now;
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Notifikasi untuk deadline dalam 1 jam
      if (hoursDiff <= 1 && hoursDiff > 0) {
        approachingTasks.push(task);
      }
    }
  });

  if (approachingTasks.length > 0) {
    showNotification(
      `⚠️ ${approachingTasks.length} tugas mendekati deadline dalam 1 jam!`
    );
  }
}

// FUNGSI: Format tanggal untuk ditampilkan
function formatDeadline(deadlineString) {
  if (!deadlineString) return "-";

  const deadline = new Date(deadlineString);
  const now = new Date();
  const timeDiff = deadline - now;

  // Jika deadline sudah lewat
  if (timeDiff < 0) {
    return "⏰ Terlewat";
  }

  const hoursDiff = timeDiff / (1000 * 60 * 60);

  if (hoursDiff < 1) {
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    return `⏰ ${minutesDiff} menit lagi`;
  } else if (hoursDiff < 24) {
    return `⏰ ${Math.floor(hoursDiff)} jam lagi`;
  } else {
    const daysDiff = Math.floor(hoursDiff / 24);
    return `⏰ ${daysDiff} hari lagi`;
  }
}

// ==================== SISTEM PENGINGAT TUGAS ====================

// FUNGSI: Mengecek tugas yang belum selesai
function checkPendingTasks() {
  const tasks = getTasksFromStorage();
  const pendingTasks = tasks.filter((task) => !task.completed);

  if (pendingTasks.length > 0) {
    showNotification(
      `⏳ Anda memiliki ${pendingTasks.length} tugas yang belum selesai!`
    );
  }
}

// FUNGSI NOTIFIKASI
function showNotification(message) {
  if (!("Notification" in window)) {
    console.log("Browser tidak support notifications");
    return;
  }

  if (Notification.permission === "granted") {
    new Notification("📝 Daily Habits Reminder", {
      body: message,
      icon: "/favicon.ico",
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("📝 Daily Habits Reminder", {
          body: message,
        });
      }
    });
  }
}

// JALANKAN PENGINGAT SETIAP 1 JAM
setInterval(checkPendingTasks, 1 * 60 * 60 * 1000); // 1 jam dalam milidetik

// ==================== EVENT LISTENERS ====================

// Memuat tugas dari localStorage saat halaman pertama kali dibuka
document.addEventListener("DOMContentLoaded", loadTasks);

// Event untuk tombol tambah (klik dan enter)
addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    addTask();
  }
});

// Event untuk tombol filter
filterBtns.forEach((btn) => {
  btn.addEventListener("click", function () {
    // Hapus status active dari semua tombol filter
    filterBtns.forEach((b) => b.classList.remove("active"));
    // Tambah status active ke tombol yang diklik
    this.classList.add("active");
    // Update filter yang aktif
    currentFilter = this.getAttribute("data-filter");
    // Tampilkan tugas sesuai filter
    filterTasks();
  });
});

// ==================== FUNGSI UTAMA ====================

// FUNGSI 1: Menambah tugas baru
function addTask() {
  const taskText = taskInput.value.trim(); // Ambil text dari input
  const deadlineInput = document.getElementById("deadlineInput").value;

  // Validasi: pastikan input tidak kosong
  if (taskText === "") {
    alert("Silakan masukkan tugas!");
    return;
  }

  // Buat objek tugas baru
  const task = {
    id: Date.now(), // ID unik berdasarkan timestamp
    text: taskText,
    completed: false, // Status belum selesai
    priority: document.getElementById("prioritySelect").value, // Prioritas dari dropdown
    deadline: deadlineInput || null, // Deadline dari input
    createdAt: new Date().toISOString(), // Waktu pembuatan
  };

  // Tambah tugas ke tampilan dan simpan ke storage
  addTaskToDOM(task);
  saveTaskToStorage(task);

  // Reset input dan fokus kembali
  taskInput.value = "";
  taskInput.focus();

  // Periksa apakah daftar kosong
  checkEmptyState();
}

// FUNGSI 2: Menampilkan tugas ke dalam DOM
function addTaskToDOM(task) {
  // Buat elemen <li> baru
  const li = document.createElement("li");
  li.setAttribute("data-id", task.id); // Simpan ID tugas sebagai atribut
  li.classList.add(`priority-${task.priority}`); // Tambah class prioritas untuk warna border

  // Jika tugas sudah selesai, tambah class completed
  if (task.completed) {
    li.classList.add("completed");
  }

  // Isi konten elemen <li> dengan checkbox, text tugas, deadline, dan tombol hapus
  li.innerHTML = `
          <input type="checkbox" ${task.completed ? "checked" : ""}>
          <span class="task-text">${task.text}</span>
          <span class="deadline-text">${formatDeadline(task.deadline)}</span>
          <button class="delete-btn">Hapus</button>
      `;

  // Event untuk checkbox (toggle status selesai/belum)
  const checkbox = li.querySelector('input[type="checkbox"]');
  checkbox.addEventListener("change", toggleTask);

  // Event untuk tombol hapus
  const deleteBtn = li.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", deleteTask);

  // Tambah elemen <li> ke dalam daftar
  taskList.appendChild(li);
}

// FUNGSI 3: Mengubah status tugas (selesai/belum)
function toggleTask(e) {
  const li = e.target.parentElement; // Dapatkan elemen <li> parent
  const taskId = li.getAttribute("data-id"); // Dapatkan ID tugas

  // Ambil semua tugas dari storage
  let tasks = getTasksFromStorage();

  // Update status tugas yang sesuai
  tasks = tasks.map((task) => {
    if (task.id == taskId) {
      task.completed = !task.completed; // Toggle status
    }
    return task;
  });

  // Simpan perubahan ke localStorage
  localStorage.setItem("tasks", JSON.stringify(tasks));

  // Update tampilan
  li.classList.toggle("completed");

  // Jika filter aktif bukan "all", refresh tampilan
  if (currentFilter !== "all") {
    filterTasks();
  }
}

// FUNGSI 4: Menghapus tugas
function deleteTask(e) {
  const li = e.target.parentElement;
  const taskId = li.getAttribute("data-id");

  // Hapus dari tampilan
  li.remove();

  // Hapus dari storage
  removeTaskFromStorage(taskId);

  // Periksa apakah daftar sekarang kosong
  checkEmptyState();
}

// FUNGSI 5: Memfilter tugas berdasarkan status
function filterTasks() {
  let tasks = getTasksFromStorage();

  // Urutkan tugas berdasarkan deadline
  tasks = sortTasksByDeadline(tasks);

  // Filter tugas berdasarkan currentFilter
  const filteredTasks = tasks.filter((task) => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  // Kosongkan daftar dan tampilkan tugas yang difilter
  taskList.innerHTML = "";
  filteredTasks.forEach((task) => addTaskToDOM(task));

  // Periksa state kosong
  checkEmptyState();
}

// FUNGSI 6: Mengecek dan menampilkan pesan jika daftar kosong
function checkEmptyState() {
  const tasks = getTasksFromStorage();

  // Filter tugas sesuai filter yang aktif
  const filteredTasks = tasks.filter((task) => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  // Hapus pesan kosong yang sudah ada (jika ada)
  const oldMsg = taskList.querySelector(".empty-state");
  if (oldMsg) oldMsg.remove();

  // Jika tidak ada tugas yang sesuai filter, tampilkan pesan
  if (filteredTasks.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";

    // Sesuaikan pesan berdasarkan filter yang aktif
    if (currentFilter === "all") {
      emptyState.textContent = "Tidak ada tugas. Tambahkan tugas baru!";
    } else if (currentFilter === "active") {
      emptyState.textContent = "Tidak ada tugas aktif. Selamat!";
    } else {
      emptyState.textContent =
        "Tidak ada tugas yang selesai. Ayo kerjakan tugasmu!";
    }

    taskList.appendChild(emptyState);
  }
}

// FUNGSI 7: Memuat tugas dari localStorage saat halaman dimuat
function loadTasks() {
  const tasks = getTasksFromStorage();
  const sortedTasks = sortTasksByDeadline(tasks);
  sortedTasks.forEach((task) => addTaskToDOM(task));
  checkEmptyState();

  // Mulai pengecekan deadline setiap 5 menit
  updatePriorityBasedOnDeadline();
  setInterval(updatePriorityBasedOnDeadline, 5 * 60 * 1000);
  setInterval(checkApproachingDeadlines, 5 * 60 * 1000);
  checkApproachingDeadlines(); // Cek sekali saat load
}

// ==================== FUNGSI STORAGE ====================

// FUNGSI 8: Mendapatkan semua tugas dari localStorage
function getTasksFromStorage() {
  let tasks;
  // Jika belum ada data, buat array kosong
  if (localStorage.getItem("tasks") === null) {
    tasks = [];
  } else {
    // Parse data dari string JSON ke array object
    tasks = JSON.parse(localStorage.getItem("tasks"));
  }
  return tasks;
}

// FUNGSI 9: Menyimpan tugas ke localStorage
function saveTaskToStorage(task) {
  const tasks = getTasksFromStorage();
  tasks.push(task); // Tambah tugas baru ke array
  localStorage.setItem("tasks", JSON.stringify(tasks)); // Simpan ke localStorage
}

// FUNGSI 10: Menghapus tugas dari localStorage
function removeTaskFromStorage(id) {
  let tasks = getTasksFromStorage();
  // Filter: simpan hanya tugas yang ID-nya tidak sama dengan yang dihapus
  tasks = tasks.filter((task) => task.id != id);
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

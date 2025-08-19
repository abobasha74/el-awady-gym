// app.js - uses Firebase v10 modular SDK from CDN

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// ========= Firebase Init =========
const firebaseConfig = {
  apiKey: "AIzaSyDn47iK0-PYpqQe1EUqxNpV7_Lx4xztVYU",
  authDomain: "el-awady-gym.firebaseapp.com",
  projectId: "el-awady-gym",
  storageBucket: "el-awady-gym.firebasestorage.app",
  messagingSenderId: "775271057126",
  appId: "1:775271057126:web:9003413610b554c2349d27",
  measurementId: "G-PNEXGL5X6V",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ========= Elements =========
const authSection = document.getElementById("auth-section");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const authError = document.getElementById("auth-error");
const signoutBtn = document.getElementById("signout-btn");

// Tabs
const tabButtons = document.querySelectorAll(".tab");
const panels = {
  "add-member": document.getElementById("tab-add-member"),
  "active-members": document.getElementById("tab-active-members"),
  "expired-members": document.getElementById("tab-expired-members"),
};

// Add member form
const addForm = document.getElementById("add-form");
const addMsg = document.getElementById("add-msg");

// Tables & Search & Pagination
const searchInput = document.getElementById("search-input");
const activeTableBody = document.querySelector("#active-table tbody");
const expiredTableBody = document.querySelector("#expired-table tbody");
const activePageEl = document.getElementById("active-page");
const expiredPageEl = document.getElementById("expired-page");
let activePage = 1;
let expiredPage = 1;
const PAGE_SIZE = 8;

// Edit dialog
const editDialog = document.getElementById("edit-dialog");
const editForm = document.getElementById("edit-form");
const editName = document.getElementById("edit-name");
const editPaid = document.getElementById("edit-paid");
const editNextPay = document.getElementById("edit-next-pay");
let editingDocId = null;

// ========= Helpers =========
const membersCol = collection(db, "members");

/** عرض التاريخ كـ 20/6/2025 */
function fmtDate(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    // هنخلي العرض أرقام يوم/شهر/سنة
    return dt.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function isExpired(endDateStr) {
  if (!endDateStr) return false;
  const today = new Date();
  const end = new Date(endDateStr);
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end < today;
}

function clearTable(tbody) {
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
}

/** أصغر memberId فاضي (يستغل الفراغات) */
async function getNextMemberId() {
  const snapshot = await getDocs(query(membersCol, orderBy("memberId", "asc")));
  let expected = 1;
  for (const d of snapshot.docs) {
    const id = Number(d.data().memberId) || 0;
    if (id > expected) break; // لقينا فراغ
    if (id === expected) expected++; // نكمّل
  }
  return expected; // إمّا أصغر فراغ أو آخر رقم + 1 لو مفيش فراغ
}

function renderRow(member) {
  const tr = document.createElement("tr");

  const tdId = document.createElement("td");
  tdId.textContent = member.memberId ?? "";

  const tdName = document.createElement("td");
  tdName.textContent = member.name ?? "";

  const tdStart = document.createElement("td");
  tdStart.textContent = fmtDate(member.startDate);

  const tdEnd = document.createElement("td");
  tdEnd.textContent = fmtDate(member.endDate);

  const tdPaid = document.createElement("td");
  tdPaid.textContent = (member.paidAmount ?? 0) + " ج.م";

  const tdEdit = document.createElement("td");
  const aEdit = document.createElement("button");
  aEdit.className = "btn";
  aEdit.textContent = "تعديل";
  aEdit.addEventListener("click", () => openEdit(member));
  tdEdit.appendChild(aEdit);

  const tdDelete = document.createElement("td");
  const delBtn = document.createElement("button");
  delBtn.className = "btn danger";
  delBtn.textContent = "حذف";
  delBtn.addEventListener("click", async () => {
    const ok = confirm(`هل أنت متأكد من حذف العضو رقم ${member.memberId}؟`);
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "members", member.id));
      await loadTables();
    } catch (e) {
      console.error(e);
      alert("تعذر حذف العضو");
    }
  });
  tdDelete.appendChild(delBtn);

  tr.append(tdId, tdName, tdStart, tdEnd, tdPaid, tdEdit, tdDelete);
  return tr;
}

// ========= Auth =========
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    authError.textContent = err.message.includes("auth/invalid-credential")
      ? "بيانات الدخول غير صحيحة"
      : err.message || "حدث خطأ";
  }
});

signoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    authSection.classList.add("hidden");
    dashboard.classList.remove("hidden");
    loadTables();
  } else {
    dashboard.classList.add("hidden");
    authSection.classList.remove("hidden");
  }
});

// ========= Tabs =========
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    Object.values(panels).forEach((p) => p.classList.remove("show"));
    const tab = btn.dataset.tab;
    if (tab === "add-member") panels["add-member"].classList.add("show");
    if (tab === "active-members")
      panels["active-members"].classList.add("show");
    if (tab === "expired-members")
      panels["expired-members"].classList.add("show");
  });
});

// ========= Add Member =========
addForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  addMsg.textContent = "";

  const name = document.getElementById("member-name").value.trim();
  const startDateStr = document.getElementById("start-date").value;
  const paidAmount =
    parseInt(document.getElementById("paid-amount").value, 10) || 0;

  if (!name || !startDateStr) {
    addMsg.textContent = "من فضلك أكمل جميع البيانات";
    return;
  }

  // نحسب endDate = آخر يوم في نفس شهر startDate
  const startDate = new Date(startDateStr);
  const endDate = new Date(
    startDate.getFullYear(),
    startDate.getMonth() + 1,
    0
  );

  try {
    const memberId = await getNextMemberId();

    await addDoc(membersCol, {
      memberId,
      name,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      paidAmount,
      createdAt: serverTimestamp(),
    });

    addMsg.textContent = `تمت إضافة المشترك برقم ${memberId}`;
    addForm.reset();
    await loadTables();
  } catch (err) {
    addMsg.textContent = "حدث خطأ أثناء الإضافة";
    console.error(err);
  }
});

// ========= Load & Render =========
async function fetchAllMembers() {
  const snapshot = await getDocs(query(membersCol, orderBy("memberId", "asc")));
  const list = [];
  snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
  return list;
}

let cachedMembers = [];

async function loadTables() {
  cachedMembers = await fetchAllMembers();
  renderTables();
}

function renderTables() {
  const term = (searchInput.value || "").trim();
  const re = term
    ? new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    : null;

  const filtered = !re
    ? cachedMembers
    : cachedMembers.filter((m) => {
        return re.test(String(m.memberId)) || re.test(m.name || "");
      });

  const active = filtered.filter((m) => !isExpired(m.endDate));
  const expired = filtered.filter((m) => isExpired(m.endDate));

  renderPaged(active, activeTableBody, activePageEl, activePage);
  renderPaged(expired, expiredTableBody, expiredPageEl, expiredPage);
}

function renderPaged(items, tbody, pageEl, page) {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  if (page > pages) page = pages;
  const start = (page - 1) * PAGE_SIZE;
  const slice = items.slice(start, start + PAGE_SIZE);
  clearTable(tbody);
  slice.forEach((m) => tbody.appendChild(renderRow(m)));
  pageEl.textContent = String(page);
}

document.querySelectorAll(".pagination .btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const t = btn.getAttribute("data-page");
    if (t === "prev" && activePage > 1) activePage--;
    if (t === "next") activePage++;
    if (t === "prev-exp" && expiredPage > 1) expiredPage--;
    if (t === "next-exp") expiredPage++;
    renderTables();
  });
});

searchInput?.addEventListener("input", () => {
  activePage = 1;
  expiredPage = 1;
  renderTables();
});

// ========= Edit =========
function openEdit(member) {
  editingDocId = member.id;
  editName.value = member.name || "";
  editPaid.value = member.paidAmount ?? 0;
  editNextPay.value = member.endDate || "";
  editDialog.showModal();
}

editForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = editName.value.trim();
  const paidAmount = parseInt(editPaid.value, 10) || 0;
  const endDate = editNextPay.value;
  if (!editingDocId) return;
  try {
    await updateDoc(doc(db, "members", editingDocId), {
      name,
      paidAmount,
      endDate,
    });
    editDialog.close();
    await loadTables();
  } catch (err) {
    console.error(err);
  }
});

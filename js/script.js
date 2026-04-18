/* Main script */

// --- Global state ------------------------------------------
let names = [];          // all loaded names
let lastGroups = [];     // last generated result
let groupLeaders = [];   // groupLeaders[i] = leader name for group i (or null)
let leaderMode = 'none'; // 'none' | 'random' | 'manual'

// --- DOM elements ------------------------------------------
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const manualInput = document.getElementById('manualInput');
const addManualBtn = document.getElementById('addManualBtn');
const manualTextarea = document.getElementById('manualTextarea');
const addTextareaBtn = document.getElementById('addTextareaBtn');
const nameListDiv = document.getElementById('nameList');
const nameListSection = document.getElementById('nameListSection');
const configSection = document.getElementById('configSection');
const countBadge = document.getElementById('countBadge');
const searchInput = document.getElementById('searchInput');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const groupSizeInput = document.getElementById('groupSize');
const groupTitleInput = document.getElementById('groupTitle');
const generateBtn = document.getElementById('generateBtn');
const regenerateBtn = document.getElementById('regenerateBtn');
const resultsSection = document.getElementById('resultsSection');
const groupsDiv = document.getElementById('groups');
const downloadBtn = document.getElementById('downloadBtn');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const copyBtn = document.getElementById('copyBtn');
const themeToggle = document.getElementById('themeToggle');
const segmentBtns = document.querySelectorAll('.segment-btn');

// --- Dark / light theme ------------------------------------
(function initTheme() {
    const saved = localStorage.getItem('gm-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    themeToggle.querySelector('.theme-icon').textContent = saved === 'dark' ? 'light_mode' : 'dark_mode';
})();

// --- Leader mode selector ----------------------------------
segmentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        segmentBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        leaderMode = btn.dataset.mode;
        // If groups already displayed, re-render to show/hide dropdowns
        if (lastGroups.length) {
            if (leaderMode === 'random') {
                // Assign a random leader to each group
                groupLeaders = lastGroups.map(g => g[Math.floor(Math.random() * g.length)]);
            } else if (leaderMode === 'none') {
                groupLeaders = new Array(lastGroups.length).fill(null);
            }
            // 'manual' keeps existing groupLeaders as-is
            displayGroups(lastGroups);
        }
    });
});

themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('gm-theme', next);
    themeToggle.querySelector('.theme-icon').textContent = next === 'dark' ? 'light_mode' : 'dark_mode';
});

// --- Toast notifications -----------------------------------
let toastTimer = null;
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// --- CSV / Excel header normalisation ----------------------
function normalizeHeader(str) {
    return str
        .toString()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-zA-Z]/g, '')
        .toLowerCase();
}

// --- Drag & Drop -------------------------------------------
dropZone.addEventListener('click', (e) => {
    if (!e.target.closest('.file-btn')) fileInput.click();
});

dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});

['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-active');
    });
});

['dragleave', 'dragend', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
    });
});

dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length) processFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processFile(e.target.files[0]);
});

// --- File processing ---------------------------------------
function processFile(file) {
    const validExts = ['.csv', '.xlsx', '.xls'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExts.includes(ext)) {
        showToast('Unsupported format. Please use CSV, XLSX or XLS.', 'error');
        return;
    }

    const reader = new FileReader();

    if (ext === '.csv') {
        reader.onload = (evt) => {
            const text = evt.target.result;
            const parsed = parseCSV(text);
            mergeNames(parsed);
        };
        reader.readAsText(file);
    } else {
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            const parsed = parseExcelRows(rows);
            mergeNames(parsed);
        };
        reader.readAsArrayBuffer(file);
    }
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return [];
    const headerCols = lines[0].split(/,|;/).map(h => normalizeHeader(h.trim()));
    const lastNameIdx = headerCols.findIndex(h => h.startsWith('nom') || h.startsWith('last'));
    const firstNameIdx = headerCols.findIndex(h => h.startsWith('prenom') || h.startsWith('first'));

    if (lastNameIdx !== -1 || firstNameIdx !== -1) {
        return lines.slice(1).map(line => {
            const cols = line.split(/,|;/);
            const firstName = firstNameIdx !== -1 ? (cols[firstNameIdx] || '').trim() : '';
            const lastName = lastNameIdx !== -1 ? (cols[lastNameIdx] || '').trim() : '';
            return (firstName || lastName) ? `${lastName} ${firstName}`.trim() : null;
        }).filter(Boolean);
    }
    return lines.map(l => l.trim()).filter(Boolean);
}

function parseExcelRows(rows) {
    if (!rows.length) return [];
    const headers = rows[0].map(h => normalizeHeader(h));
    const lastNameIdx = headers.findIndex(h => h.startsWith('nom') || h.startsWith('last'));
    const firstNameIdx = headers.findIndex(h => h.startsWith('prenom') || h.startsWith('first'));

    if (lastNameIdx !== -1 || firstNameIdx !== -1) {
        const combined = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const firstName = firstNameIdx !== -1 ? (row[firstNameIdx] || '').toString().trim() : '';
            const lastName = lastNameIdx !== -1 ? (row[lastNameIdx] || '').toString().trim() : '';
            const full = `${lastName} ${firstName}`.trim();
            if (full) combined.push(full);
        }
        return combined;
    }
    return rows.flat().map(n => n && n.toString().trim()).filter(Boolean);
}

// --- Merge names (deduplication) ---------------------------
function mergeNames(newNames) {
    const existing = new Set(names.map(n => n.toLowerCase()));
    let added = 0;
    newNames.forEach(name => {
        if (!existing.has(name.toLowerCase())) {
            names.push(name);
            existing.add(name.toLowerCase());
            added++;
        }
    });
    displayNameList();
    showToast(`${added} participant(s) added.`, 'success');
}

// --- Name list rendering -----------------------------------
function displayNameList() {
    nameListDiv.innerHTML = '';
    searchInput.value = '';

    names.forEach((name, i) => {
        const item = createNameItem(name, i);
        nameListDiv.appendChild(item);
    });

    nameListSection.style.display = names.length ? 'block' : 'none';
    configSection.style.display = names.length ? 'block' : 'none';
    updateCount();
}

function createNameItem(name, index) {
    const label = document.createElement('label');
    label.className = 'name-item checked';
    label.style.animationDelay = `${Math.min(index * 0.03, 0.5)}s`;
    label.setAttribute('data-name', name.toLowerCase());

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'nameCheck';
    cb.value = name;
    cb.checked = true;
    cb.setAttribute('aria-label', name);
    cb.addEventListener('change', () => {
        label.classList.toggle('checked', cb.checked);
        updateCount();
    });

    const span = document.createElement('span');
    span.className = 'name-label';
    span.textContent = name;

    label.appendChild(cb);
    label.appendChild(span);
    return label;
}

function updateCount() {
    const total = document.querySelectorAll('.nameCheck').length;
    const checked = document.querySelectorAll('.nameCheck:checked').length;
    countBadge.textContent = `${checked} / ${total} selected`;
}

// --- Search ------------------------------------------------
searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    document.querySelectorAll('.name-item').forEach(item => {
        const name = item.getAttribute('data-name') || '';
        item.classList.toggle('hidden-search', q && !name.includes(q));
    });
});

// --- Select / Deselect all ---------------------------------
selectAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.nameCheck').forEach(cb => {
        cb.checked = true;
        cb.closest('.name-item').classList.add('checked');
    });
    updateCount();
});

deselectAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.nameCheck').forEach(cb => {
        cb.checked = false;
        cb.closest('.name-item').classList.remove('checked');
    });
    updateCount();
});

// --- Clear list --------------------------------------------
clearAllBtn.addEventListener('click', () => {
    names = [];
    displayNameList();
    resultsSection.style.display = 'none';
    regenerateBtn.style.display = 'none';
    fileInput.value = '';
    showToast('List cleared.', 'info');
});

// --- Manual entry ------------------------------------------
addManualBtn.addEventListener('click', () => {
    const val = manualInput.value.trim();
    if (!val) return;
    const newNames = val.split(',').map(n => n.trim()).filter(Boolean);
    mergeNames(newNames);
    manualInput.value = '';
});

manualInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addManualBtn.click();
});

addTextareaBtn.addEventListener('click', () => {
    const val = manualTextarea.value.trim();
    if (!val) return;
    const newNames = val.split(/\n|,/).map(n => n.trim()).filter(Boolean);
    mergeNames(newNames);
    manualTextarea.value = '';
});

// --- Group generation --------------------------------------
generateBtn.addEventListener('click', generateGroups);
regenerateBtn.addEventListener('click', generateGroups);

function generateGroups() {
    const groupSize = parseInt(groupSizeInput.value, 10);
    const checkedBoxes = Array.from(document.querySelectorAll('.nameCheck:checked'));
    const selectedNames = checkedBoxes.map(cb => cb.value);

    if (!selectedNames.length) {
        showToast('Please select at least one participant.', 'error');
        return;
    }
    if (!groupSize || groupSize < 1) {
        showToast('Please enter a valid group size.', 'error');
        return;
    }
    if (groupSize > selectedNames.length) {
        showToast(`Not enough participants for groups of ${groupSize}.`, 'error');
        return;
    }

    // Fisher-Yates shuffle
    const shuffled = [...selectedNames];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const groups = [];
    for (let i = 0; i < shuffled.length; i += groupSize) {
        groups.push(shuffled.slice(i, i + groupSize));
    }

    lastGroups = groups;

    // Assign leaders based on mode
    if (leaderMode === 'random') {
        groupLeaders = groups.map(g => g[Math.floor(Math.random() * g.length)]);
    } else {
        groupLeaders = new Array(groups.length).fill(null);
    }

    displayGroups(groups);
    regenerateBtn.style.display = 'inline-flex';

    // Scroll to results
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// --- Group display -----------------------------------------
function displayGroups(groups) {
    groupsDiv.innerHTML = '';
    resultsSection.style.display = 'block';

    groups.forEach((group, i) => {
        const card = document.createElement('div');
        card.className = 'group-card';
        card.setAttribute('role', 'listitem');
        card.style.animationDelay = `${i * 0.07}s`;

        const badgeEl = document.createElement('span');
        badgeEl.className = 'group-count-badge';
        badgeEl.textContent = `${group.length} members`;

        const titleEl = document.createElement('div');
        titleEl.className = 'group-title';
        titleEl.textContent = 'Group';

        const numEl = document.createElement('div');
        numEl.className = 'group-number';
        numEl.textContent = String(i + 1).padStart(2, '0');

        const ul = document.createElement('ul');
        ul.className = 'group-members';
        ul.id = `group-members-${i}`;

        function renderMembers(leaderName) {
            ul.innerHTML = '';
            group.forEach(name => {
                const li = document.createElement('li');
                li.className = 'group-member' + (name === leaderName ? ' is-leader' : '');

                const avatar = document.createElement('div');
                avatar.className = 'member-avatar';
                avatar.textContent = getInitials(name);

                const nameSpan = document.createElement('span');
                nameSpan.textContent = name;

                li.appendChild(avatar);
                li.appendChild(nameSpan);

                if (name === leaderName) {
                    const star = document.createElement('span');
                    star.className = 'leader-star';
                    star.textContent = ' ★';
                    li.appendChild(star);
                }

                ul.appendChild(li);
            });
        }
        renderMembers(groupLeaders[i]);

        // Leader selection dropdown — visible only in 'manual' mode
        const leaderRow = document.createElement('div');
        leaderRow.className = 'leader-select-row';
        leaderRow.style.display = leaderMode === 'manual' ? 'flex' : 'none';

        const leaderLabel = document.createElement('span');
        leaderLabel.className = 'leader-select-label';
        leaderLabel.textContent = '★ Chef';

        const leaderSelect = document.createElement('select');
        leaderSelect.className = 'leader-select';
        leaderSelect.setAttribute('aria-label', `Group leader for group ${i + 1}`);

        const noneOption = document.createElement('option');
        noneOption.value = '';
        noneOption.textContent = '— None —';
        leaderSelect.appendChild(noneOption);

        group.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            if (name === groupLeaders[i]) opt.selected = true;
            leaderSelect.appendChild(opt);
        });

        leaderSelect.addEventListener('change', () => {
            groupLeaders[i] = leaderSelect.value || null;
            renderMembers(groupLeaders[i]);
        });

        leaderRow.appendChild(leaderLabel);
        leaderRow.appendChild(leaderSelect);

        card.appendChild(badgeEl);
        card.appendChild(titleEl);
        card.appendChild(numEl);
        card.appendChild(ul);
        card.appendChild(leaderRow);
        groupsDiv.appendChild(card);
    });
}

function getInitials(name) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();
}

// --- Copy to clipboard -------------------------------------
copyBtn.addEventListener('click', () => {
    if (!lastGroups.length) return;
    const title = groupTitleInput.value.trim() || 'Groups';
    const text = lastGroups.map((group, i) =>
        `Group ${i + 1}:\n${group.map(n => `  - ${n}`).join('\n')}`
    ).join('\n\n');

    navigator.clipboard.writeText(`${title}\n${'─'.repeat(title.length)}\n\n${text}`)
        .then(() => showToast('Copied to clipboard.', 'success'))
        .catch(() => showToast('Failed to copy.', 'error'));
});

// --- PDF download ------------------------------------------
downloadBtn.addEventListener('click', () => {
    if (!lastGroups.length) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const title = groupTitleInput.value.trim() || 'Generated groups';
    const now = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

    // Color palette for groups
    const palette = [
        [99, 102, 241],   // indigo
        [139, 92, 246],   // violet
        [236, 72, 153],   // pink
        [6, 182, 212],    // cyan
        [16, 185, 129],   // emerald
        [245, 158, 11],   // amber
        [239, 68, 68],    // red
        [59, 130, 246],   // blue
    ];

    const totalPages = () => doc.internal.getNumberOfPages();

    // Page background
    doc.setFillColor(240, 244, 255);
    doc.rect(0, 0, 210, 297, 'F');

    // Header band
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 35, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 14, 18);

    // Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 240);
    doc.text(now, 14, 26);

    // Stats
    const totalPeople = lastGroups.flat().length;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`${lastGroups.length} groups • ${totalPeople} participants`, 14, 32);

    // Groups layout
    const colCount = 2;
    const cardW = 86;
    const marginLeft = 14;
    const startY = 45;
    const colGap = 10;

    let col = 0;
    let yPos = startY;

    lastGroups.forEach((group, idx) => {
        const color = palette[idx % palette.length];
        const leader = groupLeaders[idx] || null;
        const x = marginLeft + col * (cardW + colGap);

        // Card background
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, yPos, cardW, 6 + group.length * 7 + 4, 3, 3, 'F');

        // Color side bar
        doc.setFillColor(...color);
        doc.roundedRect(x, yPos, 3, 6 + group.length * 7 + 4, 2, 2, 'F');

        // Group title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...color);
        doc.text(`Group ${idx + 1}`, x + 7, yPos + 5.5);

        // Members badge
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 140);
        doc.text(`${group.length} members`, x + cardW - 5, yPos + 5.5, { align: 'right' });

        // Member list
        group.forEach((name, ni) => {
            const isLeader = name === leader;
            const yMember = yPos + 12.5 + ni * 7;

            if (isLeader) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(180, 83, 9);  // amber-dark
                doc.text(`★ ${name}`, x + 7, yMember);
            } else {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(40, 40, 60);
                doc.text(`• ${name}`, x + 7, yMember);
            }
        });

        // Advance position
        col++;
        if (col >= colCount) {
            col = 0;
            yPos += 6 + group.length * 7 + 10;
        }

        // New page if needed
        if (yPos > 260 && idx < lastGroups.length - 1) {
            doc.addPage();
            doc.setFillColor(240, 244, 255);
            doc.rect(0, 0, 210, 297, 'F');
            yPos = 14;
            col = 0;
        }
    });

    // Footer
    for (let i = 1; i <= totalPages(); i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 180);
        doc.text(`GroupMaker — Page ${i} / ${totalPages()}`, 105, 292, { align: 'center' });
    }

    const filename = `${title.replace(/[^a-zA-Z0-9_\- ]/g, '_').trim()}.pdf`;
    doc.save(filename);
    showToast('PDF downloaded.', 'success');
});

// --- Excel download ----------------------------------------
downloadExcelBtn.addEventListener('click', () => {
    if (!lastGroups.length) return;
    const title = groupTitleInput.value.trim() || 'Generated groups';

    // Build rows: [Group, Leader, Member]
    const rows = [['Group', 'Leader', 'Member']];
    lastGroups.forEach((group, idx) => {
        const leader = groupLeaders[idx] || null;
        group.forEach(name => {
            rows.push([
                `Group ${idx + 1}`,
                name === leader ? '★ ' + name : '',
                name
            ]);
        });
        // Separator row between groups
        rows.push(['', '', '']);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
        { wch: 12 },  // Group
        { wch: 28 },  // Leader
        { wch: 28 },  // Member
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Groups');
    const filename = `${title.replace(/[^a-zA-Z0-9_\- ]/g, '_').trim()}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast('Excel file downloaded.', 'success');
});

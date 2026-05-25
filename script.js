// ИНИЦИАЛИЗАЦИЯ ДАННЫХ
let users = JSON.parse(localStorage.getItem('sgc_users')) || [];
let messages = JSON.parse(localStorage.getItem('sgc_messages')) || {};
let userGames = JSON.parse(localStorage.getItem('sgc_games')) || {};
let currentUser = null;
let matchesInterval = null;
let newsInterval = null;

function saveAll() {
    localStorage.setItem('sgc_users', JSON.stringify(users));
    localStorage.setItem('sgc_messages', JSON.stringify(messages));
    localStorage.setItem('sgc_games', JSON.stringify(userGames));
}

if (users.length === 0) {
    users.push({ username: 'SGC', email: 'creator@sgc.com', password: 'sgc2024', steam: '', friends: [], privacy: 'public', role: 'creator' });
    users.push({ username: 'Admin', email: 'admin@sgc.com', password: 'admin123', steam: '', friends: [], privacy: 'public', role: 'admin' });
    users.push({ username: 'ProGamer', email: 'pro@sgc.com', password: '123', steam: '', friends: [], privacy: 'public', role: 'user' });
    saveAll();
}

function generateCaptcha() { var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'; var r = ''; for (var i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)]; return r; }
function refreshCaptchas() { var lc = document.getElementById('loginCaptchaCode'); var rc = document.getElementById('regCaptchaCode'); if (lc) lc.innerText = generateCaptcha(); if (rc) rc.innerText = generateCaptcha(); }
function addFriend(cn, fn) { var u = users.find(u => u.username === cn); var f = users.find(u => u.username === fn); if (!u || !f || u.friends.includes(fn)) return false; u.friends.push(fn); if (!f.friends.includes(cn)) f.friends.push(cn); saveAll(); return true; }
function removeFriend(cn, fn) { var u = users.find(u => u.username === cn); if (u) u.friends = u.friends.filter(f => f !== fn); var f = users.find(u => u.username === fn); if (f) f.friends = f.friends.filter(f => f !== cn); saveAll(); }
function getFriends(un) { var u = users.find(u => u.username === un); return u ? u.friends : []; }
function getChatKey(a, b) { return [a, b].sort().join(':'); }
function sendMessage(to, text) { if (!currentUser || !text.trim()) return; var key = getChatKey(currentUser.username, to); if (!messages[key]) messages[key] = []; messages[key].push({ from: currentUser.username, to: to, text: text.trim(), time: new Date().toISOString() }); saveAll(); }
function getMessagesWith(f) { if (!currentUser) return []; var key = getChatKey(currentUser.username, f); return messages[key] || []; }
function addGame(un, gn, gu) { if (!userGames[un]) userGames[un] = []; userGames[un].push({ name: gn, url: gu }); saveAll(); }
function removeGame(un, idx) { if (userGames[un]) userGames[un].splice(idx, 1); saveAll(); }
function getGames(un) { return userGames[un] || []; }
function changeUsername(oldN, newN) { var u = users.find(u => u.username === oldN); if (!u) return false; u.username = newN; saveAll(); return true; }
function changePassword(un, oldP, newP) { var u = users.find(u => u.username === un); if (!u || u.password !== oldP) return false; u.password = newP; saveAll(); return true; }
function updatePrivacy(un, p) { var u = users.find(u => u.username === un); if (u) { u.privacy = p; saveAll(); return true; } return false; }
function updateSteam(un, s) { var u = users.find(u => u.username === un); if (u) { u.steam = s; saveAll(); return true; } return false; }

// НОВОСТИ (обновляются каждые 5 минут)
async function fetchNews() {
    try {
        const response = await fetch('https://hacker-news.firebaseio.com/v0/newstories.json?print=pretty');
        const data = await response.json();
        const topIds = data.slice(0, 6);
        const articles = [];
        for (let id of topIds) {
            const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json?print=pretty`);
            const item = await itemRes.json();
            if (item && item.title) {
                articles.push({
                    title: item.title,
                    date: new Date(item.time * 1000).toLocaleDateString(),
                    excerpt: item.text ? item.text.substring(0, 120) + '...' : 'Новости киберспорта CS2',
                    url: item.url || '#'
                });
            }
        }
        renderArticles(articles);
        return articles;
    } catch (error) {
        const fallback = [
            { title: "Обновление CS2: новые карты", date: new Date().toLocaleDateString(), excerpt: "Valve анонсировала крупное обновление", url: "#" },
            { title: "FACEIT лига для новичков", date: new Date().toLocaleDateString(), excerpt: "Платформа запускает отдельную лигу", url: "#" },
            { title: "Настройка прицела в CS2", date: new Date().toLocaleDateString(), excerpt: "Советы от профессионалов", url: "#" }
        ];
        renderArticles(fallback);
        return fallback;
    }
}

function renderArticles(articles) {
    const container = document.getElementById('articlesContainer');
    if (container) {
        container.innerHTML = articles.map(a => 
            '<div class="article-card" onclick="window.open(\'' + a.url + '\', \'_blank\')">' +
            '<div class="article-title">' + a.title + '</div>' +
            '<div class="article-date">📅 ' + a.date + '</div>' +
            '<div class="article-excerpt">' + a.excerpt + '</div>' +
            '</div>'
        ).join('');
    }
}

// МАТЧИ И ЭФИРЫ (обновляются каждые 30 секунд)
function loadMatches() {
    var now = new Date();
    var cm = now.getHours() * 60 + now.getMinutes();
    var matches = [
        { t1: "Falcons", t2: "Legacy", tour: "CS Asia Championships", ts: "09:00", tm: 9 * 60, stream: "https://player.twitch.tv/?channel=esl_csgo" },
        { t1: "MOUZ", t2: "MIBR", tour: "CS Asia Championships", ts: "06:00", tm: 6 * 60, stream: "https://player.twitch.tv/?channel=esl_csgo" },
        { t1: "Spirit", t2: "Virtus.pro", tour: "ESL Pro League", ts: "14:00", tm: 14 * 60, stream: "https://player.twitch.tv/?channel=faceit" },
        { t1: "NaVi", t2: "FaZe", tour: "IEM Dallas", ts: "17:00", tm: 17 * 60, stream: "https://player.twitch.tv/?channel/esl_csgo" },
        { t1: "G2", t2: "Team Liquid", tour: "BLAST Premier", ts: "20:00", tm: 20 * 60, stream: "https://player.twitch.tv/?channel/blastpremier" }
    ];
    
    var container = document.getElementById('matchesContainer');
    if (container) {
        container.innerHTML = '<div class="match-list">' + matches.map(function(mt) {
            var s, sc;
            if (cm < mt.tm) { s = 'СКОРО'; sc = 'status-upcoming'; }
            else if (cm >= mt.tm && cm < mt.tm + 120) { s = '🔴 ИДЁТ'; sc = 'status-live'; }
            else { s = '✅ ЗАВЕРШЁН'; sc = 'status-finished'; }
            var liveAttr = (cm >= mt.tm && cm < mt.tm + 120) ? 'style="border-color:#ff5555;"' : '';
            return '<div class="match-card" onclick="showStream(\'' + mt.stream + '\', \'' + mt.t1 + ' vs ' + mt.t2 + '\')" ' + liveAttr + '>' +
                '<div class="match-title">' + mt.t1 + ' vs ' + mt.t2 + '</div>' +
                '<div class="match-status ' + sc + '">' + s + '</div>' +
                '<div class="match-time">' + mt.ts + ' MSK | ' + mt.tour + '</div>' +
                '</div>';
        }).join('') + '</div>';
    }
    
    // Обновляем список стримов
    var liveStreamsContainer = document.getElementById('liveStreamsList');
    if (liveStreamsContainer) {
        var liveMatches = matches.filter(function(mt) { return cm >= mt.tm && cm < mt.tm + 120; });
        if (liveMatches.length === 0) {
            liveStreamsContainer.innerHTML = '<div class="guest-message" style="padding:20px;">Нет LIVE матчей</div>';
        } else {
            liveStreamsContainer.innerHTML = liveMatches.map(function(mt) {
                return '<div class="match-card" onclick="showStream(\'' + mt.stream + '\', \'' + mt.t1 + ' vs ' + mt.t2 + '\')" style="border-color:#ff5555;">' +
                    '<div class="match-title">🔴 ' + mt.t1 + ' vs ' + mt.t2 + '</div>' +
                    '<div class="match-time">Прямой эфир</div>' +
                    '</div>';
            }).join('');
        }
    }
}

function showStream(streamUrl, matchName) {
    var streamContainer = document.getElementById('embeddedStream');
    if (streamContainer) {
        streamContainer.innerHTML = '<div class="embedded-stream"><iframe src="' + streamUrl + '&autoplay=true" allowfullscreen></iframe></div><div style="padding:8px; background:#1e1e2a; display:flex; justify-content:space-between;"><span style="color:#ff5555;">🔴 LIVE</span><span>' + matchName + '</span><button onclick="closeStream()">Закрыть</button></div>';
    }
    var floatFrame = document.getElementById('liveStreamFrame');
    if (floatFrame) {
        floatFrame.src = streamUrl + '&autoplay=true';
    }
    var floatInfo = document.querySelector('.live-float-info');
    if (floatInfo) {
        floatInfo.innerHTML = '<span>' + matchName + '</span><span>Прямой эфир</span>';
    }
}

function closeStream() {
    var streamContainer = document.getElementById('embeddedStream');
    if (streamContainer) {
        streamContainer.innerHTML = '<h3>Выберите матч для просмотра</h3><p style="margin: 15px 0; color: #888;">Нажмите на любой LIVE матч в списке ниже</p><div id="liveStreamsList" class="match-list"></div><div style="background: #0a0a0f; border-radius: 12px; padding: 20px; margin-top: 10px;"><div style="font-size: 48px; margin-bottom: 10px;">🎬</div><p>Стрим откроется здесь</p></div>';
        loadMatches();
    }
}

// НАВИГАЦИЯ
function showPage(page) {
    var pages = ['main', 'articles', 'esports', 'friends', 'games', 'settings', 'support', 'admin'];
    pages.forEach(function(p) { var el = document.getElementById(p + 'Page'); if (el) el.classList.add('hidden'); });
    document.getElementById(page + 'Page').classList.remove('hidden');
    if (page === 'articles') fetchNews();
    if (page === 'esports') loadMatches();
    if (page === 'friends') { updateMyFriendsList(); populateFriendSelect(); }
    if (page === 'games') updateGamesList();
    if (page === 'settings' && currentUser) loadSettingsData();
    if (page === 'admin') updateAdminPanel();
}
function closeModal(m) { document.getElementById(m).classList.add('hidden'); }
function showModal(m) { refreshCaptchas(); document.getElementById(m).classList.remove('hidden'); }

function updateAdminPanel() {
    document.getElementById('totalUsers').innerText = users.length;
    var totalGames = 0; Object.keys(userGames).forEach(function(k) { totalGames += userGames[k].length; });
    document.getElementById('totalGames').innerText = totalGames;
    document.getElementById('userList').innerHTML = users.map(function(u) { return '<div>' + u.username + (u.role === 'creator' ? ' [СОЗДАТЕЛЬ]' : (u.role === 'admin' ? ' [АДМИН]' : '')) + '</div>'; }).join('');
}

function updateProfileSidebar() {
    var c = document.getElementById('profileSidebar');
    if (!currentUser) { c.innerHTML = '<div class="glass-card guest-message">Войдите в профиль</div>'; return; }
    c.innerHTML = '<div class="glass-card"><div style="text-align:center;"><div style="font-size:48px;">🎮</div><div style="font-size:20px; color:#00ff88;">' + currentUser.username + '</div><div style="font-size:12px;">' + currentUser.email + '</div></div></div>';
    var sc = document.getElementById('steamBlock');
    var ud = users.find(u => u.username === currentUser.username);
    if (sc) { if (ud && ud.steam) sc.innerHTML = '<div class="glass-card"><h3>Steam</h3><a href="' + ud.steam + '" target="_blank">Профиль Steam</a></div>'; else sc.innerHTML = '<div class="glass-card guest-message">Steam не привязан</div>'; }
    document.getElementById('achievementsContent').innerHTML = '<div class="glass-card"><h3>Достижения</h3><ul><li>Первый вход</li><li>Добавлена игра</li></ul></div>';
}
function updateFriendsSidebar() {
    var c = document.getElementById('friendsListSidebar');
    if (!currentUser) { c.innerHTML = '<div class="glass-card guest-message">Войдите в профиль</div>'; return; }
    var f = getFriends(currentUser.username);
    if (f.length === 0) c.innerHTML = '<div class="glass-card guest-message">Нет друзей</div>';
    else c.innerHTML = '<div class="glass-card"><h3>Друзья</h3>' + f.map(function(fr) { return '<div class="friend-item"><span>' + fr + '</span><button class="danger-btn" onclick="removeFriendFromList(\'' + fr + '\')">Удалить</button></div>'; }).join('') + '</div>';
}
function updateFeed() {
    var fd = document.getElementById('feedContent');
    if (!currentUser) { fd.innerHTML = '<div class="glass-card guest-message">Войдите в профиль</div>'; return; }
    fd.innerHTML = '<div class="glass-card guest-message">Нет постов от друзей</div>';
}
function updateMyFriendsList() {
    var c = document.getElementById('myFriendsList');
    if (!currentUser) return;
    var f = getFriends(currentUser.username);
    if (f.length === 0) c.innerHTML = '<div class="guest-message">Нет друзей</div>';
    else c.innerHTML = f.map(function(fr) { return '<div class="friend-item"><span>' + fr + '</span><button class="danger-btn" onclick="removeFriendFromList(\'' + fr + '\')">Удалить</button></div>'; }).join('');
}
function updateGamesList() {
    var c = document.getElementById('myGamesList');
    if (!currentUser) return;
    var g = getGames(currentUser.username);
    if (g.length === 0) c.innerHTML = '<div class="guest-message">Нет игр</div>';
    else c.innerHTML = g.map(function(gm, idx) { return '<div class="game-card"><span><strong>' + gm.name + '</strong></span><div><button onclick="window.open(\'' + gm.url + '\', \'_blank\')">Играть</button><button class="danger-btn" onclick="removeGameFromList(' + idx + ')">Удалить</button></div></div>'; }).join('');
}
function updateChatUI() {
    var s = document.getElementById('chatFriendSelect');
    if (!s || !s.value) { document.getElementById('chatArea').style.display = 'none'; return; }
    document.getElementById('chatArea').style.display = 'block';
    var msgs = getMessagesWith(s.value);
    var cd = document.getElementById('chatMessages');
    cd.innerHTML = msgs.map(function(m) { return '<div class="chat-message ' + (m.from === currentUser.username ? 'sent' : 'received') + '"><strong>' + (m.from === currentUser.username ? 'Вы' : m.from) + '</strong>: ' + m.text + '<br><small>' + new Date(m.time).toLocaleTimeString() + '</small></div>'; }).join('');
    cd.scrollTop = cd.scrollHeight;
}
function populateFriendSelect() {
    if (!currentUser) return;
    var f = getFriends(currentUser.username);
    var c = document.getElementById('chatFriendSelectBlock');
    if (f.length === 0) { c.innerHTML = '<div class="guest-message">Нет друзей для чата</div>'; return; }
    c.innerHTML = '<select id="chatFriendSelect" style="width:100%; margin-bottom:10px;"><option value="">-- Выберите друга --</option>' + f.map(function(fr) { return '<option value="' + fr + '">' + fr + '</option>'; }).join('') + '</select>';
    document.getElementById('chatFriendSelect').onchange = updateChatUI;
}
function loadSettingsData() {
    var u = users.find(u => u.username === currentUser.username);
    if (u) { document.getElementById('privacySetting').value = u.privacy; document.getElementById('steamLink').value = u.steam || ''; }
}
function switchTab(tab) {
    var mt = document.getElementById('matchesTab');
    var st = document.getElementById('streamTab');
    var ht = document.getElementById('hltvTab');
    var btns = document.querySelectorAll('.tab-btn');
    btns.forEach(function(btn) { btn.classList.remove('active'); });
    if (tab === 'matches') { mt.classList.add('active'); st.classList.remove('active'); ht.classList.remove('active'); btns[0].classList.add('active'); }
    else if (tab === 'stream') { mt.classList.remove('active'); st.classList.add('active'); ht.classList.remove('active'); btns[1].classList.add('active'); }
    else if (tab === 'hltv') { mt.classList.remove('active'); st.classList.remove('active'); ht.classList.add('active'); btns[2].classList.add('active'); }
}
function toggleFloat() { var c = document.querySelector('.live-float-content'); if (c) c.style.display = c.style.display === 'none' ? 'block' : 'none'; }
function closeFloat(e) { e.stopPropagation(); document.getElementById('liveFloat').style.display = 'none'; }

window.removeFriendFromList = function(fn) { if (confirm('Удалить ' + fn + '?')) { removeFriend(currentUser.username, fn); updateMyFriendsList(); updateFriendsSidebar(); populateFriendSelect(); updateFeed(); } };
window.removeGameFromList = function(idx) { if (confirm('Удалить игру?')) { removeGame(currentUser.username, idx); updateGamesList(); } };
window.showStream = showStream;
window.closeStream = closeStream;

function loginUser() {
    var u = document.getElementById('loginUsername').value;
    var p = document.getElementById('loginPassword').value;
    var ci = document.getElementById('loginCaptchaInput').value;
    var cc = document.getElementById('loginCaptchaCode').innerText;
    if (ci !== cc) { alert('Неверный код'); refreshCaptchas(); return; }
    var user = users.find(function(us) { return us.username === u && us.password === p; });
    if (!user) { alert('Неверный логин'); return; }
    currentUser = { username: user.username, email: user.email, role: user.role };
    localStorage.setItem('sgc_current', JSON.stringify(currentUser));
    closeModal('loginModal');
    loadCurrentUser();
    updateUI();
}
function registerUser() {
    var u = document.getElementById('regUsername').value;
    var e = document.getElementById('regEmail').value;
    var p = document.getElementById('regPassword').value;
    var ci = document.getElementById('regCaptchaInput').value;
    var cc = document.getElementById('regCaptchaCode').innerText;
    if (ci !== cc) { alert('Неверный код'); refreshCaptchas(); return; }
    if (!u || !e || !p) { alert('Заполните поля'); return; }
    if (users.find(function(us) { return us.username === u; })) { alert('Никнейм занят'); return; }
    users.push({ username: u, email: e, password: p, steam: '', friends: [], privacy: 'public', role: 'user' });
    saveAll();
    alert('Регистрация успешна!');
    closeModal('registerModal');
    showModal('loginModal');
}
function logoutUser() { currentUser = null; localStorage.removeItem('sgc_current'); updateUI(); }
function loadCurrentUser() { var s = localStorage.getItem('sgc_current'); if (s) { currentUser = JSON.parse(s); } }
function updateUI() {
    if (currentUser) {
        document.getElementById('usernameDisplay').innerText = currentUser.username;
        document.getElementById('authButtons').classList.add('hidden');
        document.getElementById('userInfo').classList.remove('hidden');
        var al = document.getElementById('adminLink');
        if (currentUser.username === 'SGC' || currentUser.role === 'admin') al.classList.remove('hidden');
        else al.classList.add('hidden');
        updateProfileSidebar(); updateFriendsSidebar(); updateFeed(); updateMyFriendsList(); populateFriendSelect(); updateGamesList();
    } else {
        document.getElementById('authButtons').classList.remove('hidden');
        document.getElementById('userInfo').classList.add('hidden');
        updateProfileSidebar(); updateFriendsSidebar(); updateFeed();
    }
}
function setupSettingsListeners() {
    document.getElementById('changeUsernameBtn')?.addEventListener('click', function() {
        var nn = document.getElementById('newUsername').value;
        if (!nn) { alert('Введите никнейм'); return; }
        if (changeUsername(currentUser.username, nn)) { currentUser.username = nn; localStorage.setItem('sgc_current', JSON.stringify(currentUser)); updateUI(); alert('Никнейм изменён'); }
        else alert('Ошибка');
    });
    document.getElementById('changePasswordBtn')?.addEventListener('click', function() {
        var op = document.getElementById('oldPassword').value;
        var np = document.getElementById('newPassword').value;
        var cf = document.getElementById('confirmPassword').value;
        if (np !== cf) { alert('Пароли не совпадают'); return; }
        if (changePassword(currentUser.username, op, np)) { alert('Пароль изменён'); }
        else alert('Неверный пароль');
    });
    document.getElementById('savePrivacyBtn')?.addEventListener('click', function() { updatePrivacy(currentUser.username, document.getElementById('privacySetting').value); alert('Сохранено'); });
    document.getElementById('saveSteamBtn')?.addEventListener('click', function() { updateSteam(currentUser.username, document.getElementById('steamLink').value); alert('Сохранено'); });
}
function setupAdminListener() {
    document.getElementById('doAdminAction')?.addEventListener('click', function() { alert('Действие выполнено'); });
}
function setupEventListeners() {
    document.getElementById('showLoginBtn')?.addEventListener('click', function() { showModal('loginModal'); });
    document.getElementById('showRegisterBtn')?.addEventListener('click', function() { showModal('registerModal'); });
    document.getElementById('doLoginBtn')?.addEventListener('click', loginUser);
    document.getElementById('doRegisterBtn')?.addEventListener('click', registerUser);
    document.getElementById('logoutBtn')?.addEventListener('click', logoutUser);
    document.getElementById('searchFriendBtn')?.addEventListener('click', function() {
        var q = document.getElementById('searchFriendInput').value;
        if (!q) return;
        var r = users.filter(function(u) { return u.username.toLowerCase().includes(q.toLowerCase()) && u.username !== currentUser?.username; });
        var con = document.getElementById('searchResults');
        if (r.length === 0) con.innerHTML = '<div class="guest-message">Не найдено</div>';
        else con.innerHTML = r.map(function(ru) { return '<div class="search-result" onclick="addFriendFromSearch(\'' + ru.username + '\')">' + ru.username + '</div>'; }).join('');
    });
    document.getElementById('sendMessageBtn')?.addEventListener('click', function() {
        var s = document.getElementById('chatFriendSelect');
        var i = document.getElementById('chatInput');
        if (s && s.value && i.value.trim()) { sendMessage(s.value, i.value); i.value = ''; updateChatUI(); }
    });
    document.getElementById('addGameBtn')?.addEventListener('click', function() {
        var n = document.getElementById('gameNameInput').value;
        var u = document.getElementById('gameUrlInput').value;
        if (n && u) { addGame(currentUser.username, n, u); updateGamesList(); document.getElementById('gameNameInput').value = ''; document.getElementById('gameUrlInput').value = ''; }
        else alert('Введите данные');
    });
    document.getElementById('sendSupportBtn')?.addEventListener('click', function() { alert('Отправлено!'); });
}
window.addFriendFromSearch = function(fn) {
    if (addFriend(currentUser.username, fn)) { alert(fn + ' добавлен'); document.getElementById('searchResults').innerHTML = ''; updateMyFriendsList(); updateFriendsSidebar(); populateFriendSelect(); updateFeed(); }
    else alert('Ошибка');
};

// ЗАПУСК
document.addEventListener('DOMContentLoaded', function() {
    loadCurrentUser();
    updateUI();
    setupEventListeners();
    setupSettingsListeners();
    setupAdminListener();
    fetchNews();
    loadMatches();
    refreshCaptchas();
    if (matchesInterval) clearInterval(matchesInterval);
    matchesInterval = setInterval(function() { loadMatches(); }, 30000);
    if (newsInterval) clearInterval(newsInterval);
    newsInterval = setInterval(function() { fetchNews(); }, 300000);
});
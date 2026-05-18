// firebase-app-compat.js 및 firebase-firestore-compat.js 가 먼저 로드되어야 합니다.

// 전달해주신 Firebase 설정 정보
const firebaseConfig = {
    apiKey: "AIzaSyC6tlVVRsGZuT5zRz9VPbrRA8HPWM5wFNU",
    authDomain: "my-company-web-721.firebaseapp.com",
    projectId: "my-company-web-721",
    storageBucket: "my-company-web-721.firebasestorage.app",
    messagingSenderId: "180154682292",
    appId: "1:180154682292:web:42417f0b1628db7a37c0e1"
};

// 파이어베이스 초기화 및 파이어스토어(DB) 연결
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentReadId = null;
let currentPostData = null; // 읽기/수정/삭제 시 비밀번호 대조를 위해 임시 보관

// 날짜 포맷팅 함수
function getTodayString() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
}

// 1. 실시간 게시글 목록 동기화 (onSnapshot)
// 누군가 글을 쓰거나 추천을 누르면 이 함수가 자동으로 다시 실행되어 화면을 갱신합니다.
db.collection("posts").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    const tbody = document.getElementById('board-tbody');
    tbody.innerHTML = '';
    
    if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="5">등록된 게시글이 없습니다. 첫 글의 주인공이 되어보세요!</td></tr>';
        return;
    }

    // Numbering (가장 최근 글 번호가 크도록)
    let idx = snapshot.size;
    
    snapshot.forEach((doc) => {
        const post = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx--}</td>
            <td class="title" onclick="readPost('${doc.id}')">${post.title}</td>
            <td>${post.author}</td>
            <td>${post.date}</td>
            <td>${post.likes || 0}</td>
        `;
        tbody.appendChild(tr);
    });
});

// 화면 전환 헬퍼 함수들
function showList() {
    document.getElementById('view-list').style.display = 'block';
    document.getElementById('view-read').style.display = 'none';
    document.getElementById('view-write').style.display = 'none';
}

function showWrite() {
    document.getElementById('view-list').style.display = 'none';
    document.getElementById('view-read').style.display = 'none';
    document.getElementById('view-write').style.display = 'block';
    
    // 입력창 초기화
    document.getElementById('edit-id').value = '';
    document.getElementById('write-title').value = '';
    document.getElementById('write-author').value = '';
    document.getElementById('write-password').value = '';
    document.getElementById('write-content').value = '';
}

// 2. 글 저장 로직 (생성 & 수정) -> Firebase 연동
async function savePost() {
    const idField = document.getElementById('edit-id').value;
    const title = document.getElementById('write-title').value.trim();
    const author = document.getElementById('write-author').value.trim();
    const password = document.getElementById('write-password').value.trim();
    const content = document.getElementById('write-content').value.trim();

    if(!title || !author || !password || !content) {
        alert("모든 항목(제목, 작성자, 비밀번호, 내용)을 입력해주세요.");
        return;
    }

    try {
        if(idField) {
            // [수정 모드]
            await db.collection("posts").doc(idField).update({
                title: title,
                author: author,
                password: password,
                content: content
            });
            alert("게시글이 성공적으로 수정되었습니다.");
        } else {
            // [새 글 작성 모드]
            await db.collection("posts").add({
                title: title,
                author: author,
                password: password,
                content: content,
                date: getTodayString(),
                likes: 0,
                // 서버 시간을 기록하여 정확한 정렬을 유지합니다.
                createdAt: firebase.firestore.FieldValue.serverTimestamp() 
            });
            alert("게시글이 등록되었습니다.");
        }
        showList();
    } catch (error) {
        console.error("Error saving post: ", error);
        alert("게시글 저장 중 오류가 발생했습니다.");
    }
}

// 3. 게시글 읽기 -> Firebase 연동
async function readPost(id) {
    try {
        const docRef = db.collection("posts").doc(id);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const post = docSnap.data();
            currentReadId = id;
            currentPostData = post;
            
            document.getElementById('read-title').innerText = post.title;
            document.getElementById('read-meta').innerText = `작성자: ${post.author} | 작성일: ${post.date}`;
            document.getElementById('read-content').innerText = post.content;
            document.getElementById('read-likes').innerText = post.likes || 0;

            document.getElementById('view-list').style.display = 'none';
            document.getElementById('view-read').style.display = 'block';
            document.getElementById('view-write').style.display = 'none';
        } else {
            alert("삭제되거나 존재하지 않는 게시글입니다.");
        }
    } catch (error) {
        console.error("Error reading post: ", error);
    }
}

// 4. 게시글 추천 (Like) -> Firebase 실시간 업데이트 (localStorage로 중복 방지)
async function likePost() {
    if (!currentReadId) return;

    // 로컬 스토리지에서 이미 추천한 게시글 목록을 가져옴
    let likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || [];
    
    // 이미 추천한 게시글인지 확인
    if (likedPosts.includes(currentReadId)) {
        alert("이미 추천한 게시글입니다.");
        return;
    }

    try {
        const docRef = db.collection("posts").doc(currentReadId);
        // 서버 측에서 안전하게 원자적(Atomic)으로 숫자 1을 증가시킵니다.
        await docRef.update({
            likes: firebase.firestore.FieldValue.increment(1)
        });
        
        // 추천 기록을 로컬 스토리지에 저장하여 다음 번엔 추천하지 못하도록 막음
        likedPosts.push(currentReadId);
        localStorage.setItem('likedPosts', JSON.stringify(likedPosts));

        // 사용자가 기다리지 않도록 로컬 UI 즉시 업데이트
        currentPostData.likes = (currentPostData.likes || 0) + 1;
        document.getElementById('read-likes').innerText = currentPostData.likes;
        alert("이 게시글을 추천했습니다!");
    } catch (error) {
        console.error("Error liking post: ", error);
    }
}

// 5. 게시글 수정 (비밀번호 검증)
function promptEdit() {
    if (!currentPostData) return;

    const inputPwd = prompt("게시글을 수정하려면 설정하신 비밀번호를 입력하세요:");
    if(inputPwd === currentPostData.password) {
        // 비밀번호 일치 시 수정 폼으로 데이터 이동
        document.getElementById('edit-id').value = currentReadId;
        document.getElementById('write-title').value = currentPostData.title;
        document.getElementById('write-author').value = currentPostData.author;
        document.getElementById('write-password').value = currentPostData.password;
        document.getElementById('write-content').value = currentPostData.content;

        document.getElementById('view-list').style.display = 'none';
        document.getElementById('view-read').style.display = 'none';
        document.getElementById('view-write').style.display = 'block';
    } else if(inputPwd !== null) {
        alert("비밀번호가 일치하지 않습니다. 다시 확인해주세요.");
    }
}

// 6. 게시글 삭제 (비밀번호 검증) -> Firebase 연동
async function promptDelete() {
    if (!currentPostData) return;

    const inputPwd = prompt("게시글을 완전히 삭제하려면 비밀번호를 입력하세요:");
    if(inputPwd === currentPostData.password) {
        if(confirm("정말 이 게시글을 삭제하시겠습니까? 서버에서 영구 삭제됩니다.")) {
            try {
                await db.collection("posts").doc(currentReadId).delete();
                alert("게시글이 삭제되었습니다.");
                currentReadId = null;
                currentPostData = null;
                showList(); 
            } catch (error) {
                console.error("Error deleting post: ", error);
            }
        }
    } else if(inputPwd !== null) {
        alert("비밀번호가 일치하지 않습니다.");
    }
}

// 초기 로드 시 자동으로 onSnapshot 리스너가 작동하여 데이터를 불러옵니다.
showList();

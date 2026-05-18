document.addEventListener('DOMContentLoaded', () => {
    const textElement = document.getElementById('dynamic-text');
    if (!textElement) return;

    // 변경될 텍스트 배열
    const phrases = [
        "BEYOND THE LIMITS OF MACHINE",
        "WHERE INTELLIGENCE MEETS STEEL",
        "THE FUTURE MOVES ON ITS OWN"
    ];
    
    // 각 텍스트에 적용될 3가지 다른 애니메이션 세트
    const animClasses = [
        { in: 'anim-slide-up-in', out: 'anim-slide-up-out' },
        { in: 'anim-slide-side-in', out: 'anim-slide-side-out' },
        { in: 'anim-zoom-in', out: 'anim-zoom-out' }
    ];

    let currentIndex = 0;

    // 초기 상태: 첫 번째 텍스트 인 애니메이션 적용
    textElement.classList.add(animClasses[0].in);

    // 4.5초마다 텍스트 변경
    setInterval(() => {
        // 1. 현재 텍스트 아웃 애니메이션 적용
        const currentAnim = animClasses[currentIndex];
        textElement.classList.remove(currentAnim.in);
        textElement.classList.add(currentAnim.out);
        
        // 2. 아웃 애니메이션 완료 후 (0.8초) 새 텍스트로 교체
        setTimeout(() => {
            textElement.classList.remove(currentAnim.out);
            
            // 다음 인덱스로 이동
            currentIndex = (currentIndex + 1) % phrases.length;
            const nextAnim = animClasses[currentIndex];
            
            // 텍스트 변경 및 다음 인 애니메이션 적용
            textElement.innerText = phrases[currentIndex];
            textElement.classList.add(nextAnim.in);
        }, 800); 

    }, 4500); // 전체 사이클 4.5초
});

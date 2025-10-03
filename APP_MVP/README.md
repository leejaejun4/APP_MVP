개발 일지 (Expo + Firebase MVP 앱)
2025-10-01
프로젝트 생성

npx create-expo-app 명령어로 Expo 프로젝트 생성

기본 구조 확인: app/ 디렉토리 기반의 file-based routing

Firebase 연동 시작

Firebase 콘솔에서 프로젝트(mvp-app-d5859) 생성

firebase.js 파일에 SDK 초기화 코드 작성

Firebase SDK 설치:

npm install firebase

2025-10-02
Authentication (로그인/회원가입)

Firebase Authentication → 이메일/비밀번호 로그인 방식 활성화

login.tsx, register.tsx 화면 구현

RootLayout에서 onAuthStateChanged로 로그인 상태 감지 후

로그인 상태 → (tabs) 화면 진입

비로그인 상태 → login, register 화면 표시

오류 해결

storageBucket 값이 잘못 설정되어 Firebase Storage 접근 불가

Firebase 콘솔에서 올바른 값 확인 후 .env 수정

Expo 환경 변수 적용을 위해 EXPO_PUBLIC_ prefix 사용

.gitignore에 .env 추가하여 보안 유지

2025-10-03
Firestore 게시글 작성/조회

new-post.tsx → Firestore posts 컬렉션에 문서 추가 구현

index.tsx → 홈 화면에서 posts 목록 불러오기 (orderBy("createdAt", "desc"))

/post/[id].tsx → 게시글 상세 화면 구현

실시간 구독(onSnapshot) 적용

댓글 작성 기능 추가

iOS 노치 대응

상단 잘림 문제 발생

해결: SafeAreaView + KeyboardAvoidingView 적용

모든 주요 화면(HomeScreen, PostDetailScreen, NewPostScreen) 반영

Firebase Storage 이미지 업로드 문제

Expo iOS에서 ph:// URI 문제로 업로드 실패

해결 시도:

expo-image-manipulator로 ph:// → file:// 변환

변환된 URI를 fetch(uri).blob() 후 uploadBytes로 업로드

여전히 에러 발생:

FirebaseError: Firebase Storage: An unknown error occurred, please check the error payload for server response. (storage/unknown)


원인 추정:

Firebase Storage 보안 규칙 제한

Expo Go 환경에서 업로드 제한

진행 중 / 미해결 과제

이미지 업로드 실패

글 작성은 성공하지만 이미지 첨부 불가

Blob 변환까지는 성공 (size 정상 표시)

Firebase Storage 보안 규칙 및 Expo 빌드 환경 추가 확인 필요

Expo Go 제한

Expo Go 환경에서는 일부 네이티브 기능 제한

해결 방법: 개발 빌드(npx expo run:ios / npx expo run:android) 사용 권장

앞으로 해야 할 일

Firebase Storage 보안 규칙 수정:

allow read, write: if request.auth != null;


Expo 개발 빌드 환경에서 이미지 업로드 재확인

Storage 업로드 로직 디버깅 (blob 변환 → uploadBytes 과정 점검)
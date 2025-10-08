# APP_MVP
개발 일지 (Expo + Firebase MVP 앱)

프로젝트 기간: 2025-10-01 ~ 2025-10-08
기술 스택: Expo (React Native) + Firebase (Auth, Firestore, Storage)
주요 기능: 로그인 / 게시글 CRUD / 댓글 / 이미지 업로드

2025-10-01
프로젝트 생성 및 기본 세팅

Expo 프로젝트 생성

npx create-expo-app APP_MVP


app/ 디렉토리 기반의 file-based routing 구조 확인

기본 화면(Home, Tabs) 정상 렌더링 확인

Firebase 연동 시작

Firebase 콘솔에서 새 프로젝트(mvp-app-d5859) 생성

Firebase SDK 설치

npm install firebase


firebase.js 파일 생성 및 초기화 코드 작성

.env 환경변수 파일 추가 후 EXPO_PUBLIC_ 접두사 적용

.gitignore에 .env 등록 (보안 관리)

2025-10-02
Firebase Authentication (로그인 / 회원가입)

이메일 / 비밀번호 로그인 방식 활성화

Firebase Authentication 설정에서 Email/Password 로그인 허용

로그인 화면(login.tsx), 회원가입 화면(register.tsx) 구현

RootLayout.tsx에서 onAuthStateChanged로 로그인 상태 감지

로그인 상태일 경우 → (tabs) 페이지로 이동

비로그인 상태일 경우 → 로그인 / 회원가입 화면 표시

오류: Firebase Storage 접근 불가

현상
이미지 업로드 시 Firebase Storage 연결 실패

원인
.env 파일 내 EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET 값 오타

해결
Firebase 콘솔에서 storageBucket 주소 확인 후 .env 수정
(예: mvp-app-d5859.appspot.com)

보안 조치
.env는 .gitignore에 추가하여 Git에 노출되지 않도록 설정

2025-10-03
Firestore 게시글 작성 / 조회 기능 구현

게시글 작성(new-post.tsx)

Firestore posts 컬렉션에 문서 추가 (addDoc)

serverTimestamp()로 생성 시각 저장

홈(index.tsx)

orderBy("createdAt", "desc")로 최신순 정렬

onSnapshot을 사용하여 실시간 구독 적용

게시글 상세(post/[id].tsx)

Firestore 문서 실시간 조회

댓글 작성 기능 추가 (하위 컬렉션 comments 사용)

댓글 등록 시 addDoc(collection(db, "posts", id, "comments")) 호출

iOS 노치 대응

문제
iPhone에서 SafeArea가 적용되지 않아 상단 UI가 노치에 겹침

해결

주요 화면(HomeScreen, PostDetailScreen, NewPostScreen)에
SafeAreaView + KeyboardAvoidingView 구조 적용

iOS에서는 behavior="padding" 사용

paddingTop 조정으로 안정적인 상단 여백 확보

Firebase Storage 이미지 업로드 문제 발생

현상
iOS에서 선택된 이미지 URI가 ph:// 형태로 반환되어
Firebase Storage 업로드 시 오류 발생

FirebaseError: storage/unknown


원인 분석

iOS의 ImagePicker가 반환하는 ph:// URI는 blob 변환 불가

Firebase Storage 보안 규칙이 제한적

Expo Go 환경에서는 Storage 업로드 기능 일부 제한

시도한 해결

expo-image-manipulator를 사용하여 ph:// → file:// 변환 및 JPEG 압축

변환된 URI를 fetch(uri).blob()으로 변환

uploadBytesResumable 대신 uploadBytes로 업로드 단순화

여전히 오류 발생 (storage/unknown)

추가 원인 추정

Storage Rules에서 인증 조건이 너무 제한적

Expo Go가 ArrayBuffer 기반 Blob을 완전히 지원하지 않음

진행 중 / 미해결 과제 (2025-10-03 기준)

Firebase Storage 업로드 실패 (Blob 생성은 성공하지만 서버 응답 오류 발생)

Firestore에는 게시글이 정상 등록되지만 이미지 첨부 불가

Storage 보안 규칙 및 Expo 환경 제한 추가 확인 필요

앞으로의 조치 계획

Firebase Storage 보안 규칙 수정

allow read, write: if request.auth != null;


Expo 개발 빌드 실행

npx expo run:ios
npx expo run:android


(Expo Go에서는 Storage 업로드 제한이 있음)

Storage 업로드 디버깅

Blob 크기 및 변환 결과 콘솔 출력

uploadBytes 호출 전 업로드 경로 확인

2025-10-04 ~ 2025-10-07
UI / UX 개선

iOS 스타일에 맞춘 폰트, 버튼, 색상 조정

ActivityIndicator로 업로드 중 상태 표시

Alert.alert 메시지 한글화

게시글 업로드 완료 후 router.replace("/")로 홈 이동

2025-10-08
Firebase Storage 업로드 최종 수정

환경 유지
기존 .env 주소(mvp-app-d5859.appspot.com) 그대로 사용

최종 수정된 업로드 로직

const response = await fetch(manipulated.uri);
const blob = await response.blob();
await uploadBytes(storageRef, blob);
const imageUrl = await getDownloadURL(storageRef);


uploadBytesResumable 제거

fetch().blob() 방식으로 업로드 안정화

결과

이미지 정상 업로드

Firestore 내 imageUrl 필드 정상 저장

게시글 목록 및 상세 페이지에서 이미지 정상 표시 확인

iPhone 노치 및 스크롤 짤림 해결

문제
ScrollView와 KeyboardAvoidingView가 충돌하여 이미지 세로가 잘림

해결

SafeAreaView 안에 KeyboardAvoidingView + ScrollView 병합

paddingTop: Platform.OS === "ios" ? 40 : 20 적용

paddingBottom: 120으로 하단 탭바 및 키보드 영역 여유 확보

resizeMode="cover"로 이미지 비율 유지

결과
iPhone 노치 영역에서도 정상 표시
스크롤 시 콘텐츠가 완전히 표시되고, 댓글 입력 시 키보드 겹침 없음

현재 상태 (2025-10-08 기준)
항목	상태
Firebase Auth (로그인/회원가입)	완료
Firestore CRUD (게시글/댓글)	완료
Firebase Storage (이미지 업로드)	정상 작동
iOS SafeArea 대응	완료
Expo 환경 변수 (.env)	기존 Storage 주소 그대로 사용
Expo Go 테스트	이미지 업로드 정상 작동 확인
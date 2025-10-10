**MVP**
개발 일지 (Expo + Firebase MVP 앱)

기간: 2025-10-01 ~ 2025-10-10
스택: Expo(React Native) + Firebase(Auth, Firestore, Storage)
주요 기능: 로그인 / 게시글 CRUD / 댓글 / 이미지 업로드

2025-10-10 — Firebase 모듈 충돌 및 버전 정렬
증상

Expo 실행 시 [Error: Component auth has not been registered yet]

iOS Expo Go에서 Firebase Auth 초기화 실패

Metro 로그에 리액트 버전 불일치 경고
react 19.2.0 / react-native-renderer 19.1.0

원인 분석

RN 전용 패키지 혼입
@react-native-firebase/*가 설치되어 Expo 환경과 충돌

React 버전 불일치
Expo SDK 요구 버전(19.1.0)과 실제 설치(19.2.0) 상이

캐시 영향
node_modules/.cache, OS 메트로 캐시 잔존으로 잘못된 번들 경로가 재사용

조치

충돌 패키지 제거

npm uninstall @react-native-firebase/app
npm uninstall @react-native-firebase/storage
npm uninstall firebase


Metro·Node 캐시 초기화

rmdir /s /q node_modules\.cache
rmdir /s /q "%LOCALAPPDATA%\Temp\metro-cache"


React 버전 정렬(Expo 권장)

npm install react@19.1.0 react-dom@19.1.0


Firebase 웹 SDK 재설치

npm install firebase@9.22.2


firebase.js 정비

// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);


번들러 캐시 초기화 후 실행

npx expo start -c

결과

Component auth has not been registered yet 해소

Expo Go에서 Auth 정상 초기화

Firestore·Storage 정상 동작

React / RN Renderer 버전 일치(19.1.0)

Metro 캐시 경고 소멸

추가 확인

Expo Router 경고(missing default export)는 일부 화면의 export default 누락 때문
예:

export default function HomeScreen() {
  return <View><Text>Home</Text></View>;
}

현재 상태(2025-10-10)
항목	상태
Firebase Auth(로그인/회원가입)	정상
Firestore CRUD(게시글/댓글)	정상
Firebase Storage(이미지 업로드)	정상
iOS SafeArea 대응	완료
Expo 환경 변수(.env)	정상
React / RN Renderer	일치(19.1.0)
Firebase 모듈 충돌	해결
Metro 캐시	정리 완료
다음 조치

Expo Router 경고 정리
_layout.tsx, index.tsx, 게시글 관련 파일의 export default 점검

버전 고정

{
  "dependencies": {
    "firebase": "9.22.2",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
}


RN 전용 Firebase 패키지 재설치 방지 가이드 유지

Expo Dev Client로 iOS 빌드 확인
Auth/Firestore/Storage 통합 동작 최종 점검

메모 — 무한 로딩 관련

무한 로딩 현상은 Firestore 구성 요소의 영향이었다. 보안 규칙, 인덱스, 컬렉션 경로, 쿼리 조건 등 설정을 정비한 뒤 로딩이 해소되었다. 같은 유형의 이슈를 줄이기 위해 다음을 점검 항목으로 추가했다.

컬렉션·도큐먼트 경로 상수화

필드 인덱스 필요 시 콘솔에서 생성 여부 확인

보안 규칙에서 읽기/쓰기 조건과 인증 상태 일치 확인

실시간 구독 시 언서브스크립션 누락 방지 및 로딩 타임아웃 가드 추가
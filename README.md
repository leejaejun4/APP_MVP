개발 일지 (Expo + Firebase MVP 앱)
프로젝트 기간: 2025-10-01 ~ 2025-10-10
기술 스택: Expo (React Native) + Firebase (Auth, Firestore, Storage)
주요 기능: 로그인 / 게시글 CRUD / 댓글 / 이미지 업로드

2025-10-10
Firebase 모듈 충돌 및 버전 불일치 문제 발생
문제 현상

Expo 앱 실행 시 다음 오류 발생

[Error: Component auth has not been registered yet]


iOS Expo Go 실행 시 Firebase Auth 초기화 실패

Metro 로그에 React 버전 불일치 경고 출력

Incompatible React versions: react 19.2.0 / react-native-renderer 19.1.0

원인 분석

잘못된 Firebase 모듈 설치

기존에 사용하던 firebase@9.x 대신 @react-native-firebase/app 및 관련 모듈이 설치됨

해당 모듈은 Expo 환경에서 지원되지 않으며, RN 전용 네이티브 모듈(auth/dist/rn/...)을 불러오면서 충돌 발생

React 버전 불일치

Expo SDK가 요구하는 react@19.1.0과 달리 react@19.2.0이 자동 설치되어 Renderer 불일치로 인한 Metro 번들 오류 발생

Metro 캐시 잔존

node_modules/.cache 및 Windows Metro 캐시가 남아있어 RN용 Firebase 빌드(auth/dist/rn/...)가 계속 로드됨

해결 과정

Firebase 관련 패키지 제거

npm uninstall @react-native-firebase/app
npm uninstall @react-native-firebase/storage
npm uninstall firebase


Metro 및 Node 캐시 초기화

rmdir /s /q node_modules\.cache
rmdir /s /q "%LOCALAPPDATA%\Temp\metro-cache"


React 버전 맞추기 (Expo 권장 버전)

npm install react@19.1.0 react-dom@19.1.0


Firebase 웹 SDK 재설치

npm install firebase@9.22.2


firebase.js 수정

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


Expo 번들러 캐시 초기화 및 실행

npx expo start -c

결과

Component auth has not been registered yet 오류 해결

Expo Go에서 Firebase Auth 정상 초기화 확인

Firestore 및 Storage 기능 정상 작동

React / React Native Renderer 버전 일치 (19.1.0)

Metro 캐시 관련 경고 사라짐

추가 확인 사항

Expo Router 경고(missing default export)는 일부 화면 파일에 export default 누락으로 발생
→ 각 화면 컴포넌트의 export 방식 점검 필요

export default function HomeScreen() {
    return <View><Text>Home</Text></View>;
}

현재 상태 (2025-10-10 기준)
항목	상태
Firebase Auth (로그인/회원가입)	정상 작동
Firestore CRUD (게시글/댓글)	정상 작동
Firebase Storage (이미지 업로드)	정상 작동
iOS SafeArea 대응	완료
Expo 환경 변수 (.env)	정상 유지
React / RN Renderer 버전	일치 (19.1.0)
Firebase 모듈 충돌	해결
Metro 캐시 잔존	제거 완료
다음 조치 계획

Expo Router 경고 정리

각 화면 파일의 export 누락 확인 및 수정

_layout.tsx, index.tsx, 게시글.tsx 등에서 export default 확인

버전 고정 관리

package.json 내 Firebase 및 React 버전 고정

"firebase": "9.22.2",
"react": "19.1.0",
"react-dom": "19.1.0"


불필요한 RN 전용 Firebase 모듈 설치 방지

빌드 테스트

Expo Dev Client 환경에서 iOS 실행 테스트

Auth / Firestore / Storage 연동 최종 검증
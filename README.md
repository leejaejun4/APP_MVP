# **MVP 개발 일지 (Expo + Firebase 기반 커뮤니티 앱)**

> **프로젝트 개요**  
> React Native 환경에서 Firebase를 활용한 MVP 커뮤니티 앱 개발
>
> **주요 기능:** 로그인 / 게시글 CRUD / 댓글 / 이미지 업로드
>
> **개발 기간:** 2025-10-01 ~ 2025-10-10  
> **기술 스택:** Expo (React Native) + Firebase (Auth, Firestore, Storage)

---

## **이슈 요약 (2025-10-10)**

### 증상

- Expo 실행 시 다음 오류 발생
  [Error: Component auth has not been registered yet]


- iOS Expo Go에서 Firebase Auth 초기화 실패
- Metro 로그에 React 버전 불일치 경고
  react 19.2.0 / react-native-renderer 19.1.0

---

## **원인 분석**

| 구분                | 원인                                                  | 설명                                                      |
| ------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| RN 전용 패키지 혼입 | `@react-native-firebase/*` 사용                       | Expo 환경은 Web SDK 기반이므로 RN 전용 패키지와 충돌 발생 |
| React 버전 불일치   | Expo SDK 요구 버전(19.1.0)과 설치 버전(19.2.0) 불일치 | React / Renderer 버전 불일치로 Auth 모듈 초기화 실패      |
| 캐시 영향           | Metro / Node / OS 캐시 잔존                           | 잘못된 번들 경로를 재사용하며 컴포넌트 로드 실패          |

---

## **조치 내역**

### 충돌 패키지 제거

```bash
npm uninstall @react-native-firebase/app
npm uninstall @react-native-firebase/storage
npm uninstall firebase
Metro · Node 캐시 초기화
bash

rmdir /s /q node_modules\.cache
rmdir /s /q "%LOCALAPPDATA%\Temp\metro-cache"
React 버전 정렬 (Expo 권장)
bash

npm install react@19.1.0 react-dom@19.1.0
Firebase 웹 SDK 재설치
bash

npm install firebase@9.22.2
firebase.js 정비
javascript

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
6️⃣ 번들러 캐시 초기화 후 실행

npx expo start -c

✅ 결과
항목	상태	비고
Firebase Auth (로그인/회원가입)	✅ 정상	Expo Go에서 인증 정상 작동
Firestore CRUD (게시글/댓글)	✅ 정상	CRUD 기능 정상 작동
Firebase Storage (이미지 업로드)	✅ 정상	업로드 및 URL fetch 정상
React / RN Renderer	✅ 일치 (19.1.0)	경고 해소
Firebase 모듈 충돌	✅ 해결 완료	RN 전용 패키지 제거
Metro 캐시	✅ 정리 완료	번들링 정상
Expo 환경 변수 (.env)	✅ 정상 적용	EXPO_PUBLIC_* 변수 반영
iOS SafeArea	✅ 대응 완료	레이아웃 정상 출력

추가 확인 사항
Expo Router 경고
missing default export 경고는 일부 화면 파일에 export default 누락으로 발생.

예시 수정:

export default function HomeScreen() {
  return <View><Text>Home</Text></View>;
}
현재 상태 (2025-10-10 기준)
항목	상태
Firebase Auth (로그인/회원가입)	정상
Firestore CRUD (게시글/댓글)	정상
Firebase Storage (이미지 업로드)	정상
iOS SafeArea 대응	완료
Expo 환경 변수 (.env)	정상
React / RN Renderer	일치 (19.1.0)
Firebase 모듈 충돌	해결
Metro 캐시	정리 완료

다음 조치
 Expo Router 경고 정리 (_layout.tsx, index.tsx, 게시글 관련 파일 점검)

 RN 전용 Firebase 패키지 재설치 방지 가이드 유지

 Expo Dev Client를 통한 iOS 빌드 검증

 Auth / Firestore / Storage 통합 테스트 최종 점검

메모 — 무한 로딩 관련 분석
현상:
Firestore에서 데이터 로드 시 무한 로딩 발생.

원인:

보안 규칙 불일치

인덱스 미생성

컬렉션 경로 불일치

쿼리 조건 과도

조치 및 예방 가이드:

컬렉션·도큐먼트 경로 상수화

복합 쿼리(where + orderBy) 사용 시 인덱스 생성 여부 확인

보안 규칙(auth != null)과 인증 로직 일치 확인

onSnapshot() 실시간 구독 시 unsubscribe 누락 방지

로딩 타임아웃 가드(setTimeout) 추가

버전 고정 (package.json)
json
{
  "dependencies": {
    "firebase": "9.22.2",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
}
최종 결론
✅ Expo + Firebase 구조 안정화 완료
✅ React / RN Renderer 버전 일치
✅ Auth / Firestore / Storage 정상 작동
✅ 무한 로딩 및 인덱스 이슈 해결
✅ iOS Expo Go에서 정상 동작 확인

결론:
Expo 환경에서 Firebase Web SDK를 기반으로 안정적인 Auth, Firestore, Storage 통합이 가능함을 검증.
RN 전용 모듈 혼입 및 버전 불일치 문제를 해결하며,
MVP 수준의 완성도 있는 커뮤니티 앱 아키텍처 구축 완료.

📚 작성일: 2025-10-10

```

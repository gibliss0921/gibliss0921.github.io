# Log Capture Web

RisuAI용 Log Capture 플러그인을 독립 웹사이트로 사용할 수 있게 정리한 정적 웹 버전입니다.

## 사용법

1. `index.html`과 `app.js`를 같은 폴더에 둡니다.
2. GitHub 저장소에 업로드합니다.
3. **Settings → Pages → Deploy from a branch**에서 배포할 브랜치를 선택합니다.
4. 공개된 `*.github.io` 주소로 접속합니다.

## 웹 버전에서 달라진 점

- RisuAI 없이 바로 실행됩니다.
- 캐릭터/모델/프리셋 정보는 직접 입력합니다.
- 프리셋/마지막 디자인 설정은 브라우저 `localStorage`에 저장됩니다.
- 로그/배경 사진은 별도 서버로 업로드하지 않습니다.
- Canvas 렌더링 및 PNG 저장 기능은 원본 구조를 유지합니다.

## 주의

웹폰트는 jsDelivr CDN에서 불러옵니다. 처음 사용하는 글꼴은 인터넷 연결이 필요할 수 있습니다.

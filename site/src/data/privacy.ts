// Privacy policy copy (EN/KO), rendered by PrivacyPage.astro. Update `updated` and the sections when a tool is added or removed.
import type { Lang } from "../i18n/utils";

export interface PrivacySection {
  heading: string;
  body: string[];
  bullets?: string[];
  /** Shows the "Change cookie settings" button after this section. */
  reset?: boolean;
}

export const CONTACT_EMAIL = "danielkimdev24@gmail.com";

export const PRIVACY: Record<Lang, { updated: string; intro: string[]; sections: PrivacySection[] }> = {
  en: {
    updated: "Last updated 2026-10-25",
    intro: [
      "This is the website for toonstrip, an open-source project run by Daniel Kim. There are no accounts or ads, and nothing here is sold. This page lists what is collected, and by whom. The toonstrip packages themselves run in your browser and collect nothing.",
    ],
    sections: [
      {
        heading: "Google Analytics",
        body: [
          "The site uses Google Analytics 4 to see which pages are read and how people arrive. It loads only after you press Accept in the cookie banner, and only on the live site. If you decline, no analytics tag loads and no analytics cookies are set. Declining after accepting stops the tag from the next page load; cookies already set stay until they expire.",
        ],
        bullets: [
          "Collected: pages viewed (the full address, including any query string), referrer, approximate location, browser, device and screen size, language, and interaction events such as outbound clicks and scrolls.",
          "Cookies: _ga and a second cookie starting with _ga_, which identify a browser anonymously across visits.",
          "IP address: Google Analytics 4 does not log or store IP addresses; Google receives it with the request that delivers the tag.",
          "Processor: Google, under Google’s privacy policy (policies.google.com/privacy). Data may be processed outside your country.",
          "Opting out: press Decline, or use a content blocker, your browser’s tracking protection, or the Google Analytics opt-out add-on (tools.google.com/dlpage/gaoptout).",
        ],
        reset: true,
      },
      {
        heading: "Cloudflare",
        body: [
          "The site is served by Cloudflare Pages. Cloudflare processes requests and keeps technical logs (such as IP address, requested address and browser) to run and secure the service. Cloudflare Web Analytics, if enabled, counts visits without cookies or fingerprinting. See Cloudflare’s privacy policy (cloudflare.com/privacypolicy).",
        ],
      },
      {
        heading: "The playground",
        body: [
          "The playground runs entirely in your browser: the strip you edit, and any asset packs you load, are not uploaded to this site. Your work is autosaved on your device only. A share link carries the strip in the part of the address after the “#”, which your browser does not send to this site’s server, and Google Analytics records the address without it; still, do not put anything private in a strip you share, because anyone with the link can read it. Fonts are served from this site, not from a third party.",
        ],
      },
      {
        heading: "Stored in your browser",
        body: ["These stay on your device and are never sent anywhere by this site:"],
        bullets: [
          "theme: your light or dark choice.",
          "lang: your language choice.",
          "pm: your preferred package manager for install snippets.",
          "toonstrip-playground: the playground’s autosave (your strip and loaded packs).",
          "toonstrip-consent: your cookie choice (accepted or declined).",
        ],
      },
      {
        heading: "Links to other sites",
        body: ["Links to GitHub, npm and other sites are governed by their own policies."],
      },
      {
        heading: "Your rights and contact",
        body: [
          "Depending on where you live (for example under the GDPR or Korea’s PIPA) you may be able to ask what is held about you or have it deleted. Analytics data is anonymous and tied only to a browser cookie, so clearing cookies is the practical way to reset it.",
          `Contact: ${CONTACT_EMAIL}`,
        ],
      },
    ],
  },
  ko: {
    updated: "최종 수정일 2026-10-25",
    intro: [
      "이 사이트는 Daniel Kim이 운영하는 오픈소스 프로젝트 toonstrip의 웹사이트입니다. 회원가입이나 광고는 없고, 수집한 정보를 판매하지 않습니다. 이 페이지는 어떤 정보를 누가 수집하는지 정리한 것입니다. toonstrip 패키지 자체는 브라우저에서 실행되며 아무것도 수집하지 않습니다.",
    ],
    sections: [
      {
        heading: "Google Analytics",
        body: [
          "어떤 페이지가 읽히고 방문자가 어떻게 유입되는지 파악하려고 Google Analytics 4를 사용합니다. 쿠키 배너에서 ‘동의’를 누른 뒤에만, 그리고 실제 운영 사이트에서만 로드됩니다. ‘거부’하면 분석 태그가 로드되지 않고 분석 쿠키도 설정되지 않습니다. 동의 후에 거부로 바꾸면 다음 페이지부터 태그가 로드되지 않으며, 이미 설정된 쿠키는 만료될 때까지 남습니다.",
        ],
        bullets: [
          "수집 항목: 방문한 페이지(쿼리 문자열을 포함한 전체 주소), 유입 경로, 대략적인 위치, 브라우저, 기기와 화면 크기, 언어, 외부 링크 클릭·스크롤 같은 상호작용 이벤트.",
          "쿠키: _ga와 _ga_로 시작하는 두 번째 쿠키. 방문 사이에 브라우저를 익명으로 구분합니다.",
          "IP 주소: Google Analytics 4는 IP 주소를 기록하거나 저장하지 않습니다. 다만 태그를 전달하는 요청에는 Google이 IP를 받습니다.",
          "처리자: Google (Google 개인정보처리방침: policies.google.com/privacy). 데이터는 거주 국가 밖에서 처리될 수 있습니다.",
          "거부 방법: ‘거부’ 버튼을 누르거나, 콘텐츠 차단 프로그램, 브라우저의 추적 방지 기능, Google Analytics 차단 부가기능(tools.google.com/dlpage/gaoptout)을 사용하세요.",
        ],
        reset: true,
      },
      {
        heading: "Cloudflare",
        body: [
          "사이트는 Cloudflare Pages로 제공됩니다. Cloudflare는 서비스 운영과 보안을 위해 요청을 처리하고 IP 주소, 요청 주소, 브라우저 같은 기술 로그를 보관합니다. 사용 설정된 경우 Cloudflare Web Analytics는 쿠키나 핑거프린팅 없이 방문 수만 집계합니다. Cloudflare 개인정보처리방침: cloudflare.com/privacypolicy.",
        ],
      },
      {
        heading: "플레이그라운드",
        body: [
          "플레이그라운드는 전부 사용자의 브라우저에서 실행됩니다. 편집하는 스트립과 불러온 에셋 팩은 이 사이트로 업로드되지 않으며, 작업 내용은 사용자의 기기에만 자동 저장됩니다. 공유 링크는 스트립을 주소의 “#” 뒷부분에 담는데, 브라우저는 이 부분을 이 사이트의 서버로 보내지 않고, Google Analytics도 이 부분을 뺀 주소만 기록합니다. 그래도 링크가 있으면 누구나 내용을 볼 수 있으므로, 공유할 스트립에 비공개 정보를 넣지 마세요. 글꼴은 제3자가 아닌 이 사이트에서 제공합니다.",
        ],
      },
      {
        heading: "브라우저에 저장되는 값",
        body: ["아래 값은 사용자의 기기에만 저장되며, 이 사이트가 어디로도 전송하지 않습니다."],
        bullets: [
          "theme: 라이트·다크 선택.",
          "lang: 언어 선택.",
          "pm: 설치 안내에서 선호하는 패키지 매니저.",
          "toonstrip-playground: 플레이그라운드 자동 저장(스트립과 불러온 팩).",
          "toonstrip-consent: 쿠키 선택(동의 또는 거부).",
        ],
      },
      {
        heading: "다른 사이트로의 링크",
        body: ["GitHub, npm 등 다른 사이트로 연결되는 링크에는 해당 사이트의 정책이 적용됩니다."],
      },
      {
        heading: "권리와 문의",
        body: [
          "거주 지역에 따라(예: GDPR, 한국 개인정보 보호법) 보유 정보의 열람이나 삭제를 요청할 수 있습니다. 분석 데이터는 익명이며 브라우저 쿠키에만 연결되므로, 쿠키를 지우는 것이 초기화하는 가장 현실적인 방법입니다.",
          `문의: ${CONTACT_EMAIL}`,
        ],
      },
    ],
  },
};

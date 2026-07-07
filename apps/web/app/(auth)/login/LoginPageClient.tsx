"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  clearAuth,
  type CurrentUser,
  fetchApi,
  getCurrentUser,
  getToken,
  readErrorMessage,
  setAuth,
} from "../../../lib/api";
import {
  resolveAuthenticatedEntryPath,
  resolveAuthenticatedUserEntryPath,
} from "../../../lib/public-entry";
import {
  MANAGEMENT_SITE_BRAND,
  PUBLIC_SITE_BRAND,
} from "../../../lib/site-brand";
import {
  buildWecomLoginUrl,
  isWecomBrowser,
  WECOM_LEGACY_LOGIN_STATE,
  WECOM_LOGIN_ACTION_STORAGE_KEY,
  WECOM_LOGIN_RETURN_PATH_STORAGE_KEY,
  WECOM_LOGIN_STATE_STORAGE_KEY,
  type WecomConfig,
  type WecomLoginAction,
} from "../../../lib/wecom-auth";
import styles from "./page.module.css";

type LoginAuthPayload = {
  accessToken?: string;
  token?: string;
  user: CurrentUser;
};

function displayUserName(user: CurrentUser) {
  return user.displayName || user.name || user.username;
}

function userNeedsWecomBinding(user: CurrentUser | null) {
  return Boolean(user && !user.wecomUserId);
}

function resolveSafeReturnPath(
  value: string | null | undefined,
  fallback: string,
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/login")
  ) {
    return fallback;
  }

  return value;
}

function PublicStoryScene() {
  return (
    <svg
      className={styles.storyScene}
      viewBox="0 0 760 430"
      role="presentation"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="skyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff0dd" />
          <stop offset="45%" stopColor="#f7f7cf" />
          <stop offset="100%" stopColor="#d6f5cf" />
        </linearGradient>
        <linearGradient id="meadowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8ee29d" />
          <stop offset="100%" stopColor="#3d9d56" />
        </linearGradient>
        <linearGradient id="hillGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8fd893" />
          <stop offset="100%" stopColor="#53985f" />
        </linearGradient>
      </defs>

      <rect
        x="0"
        y="0"
        width="760"
        height="430"
        fill="url(#skyGradient)"
        rx="42"
      />

      <g className={styles.cloudDrift}>
        <ellipse
          cx="118"
          cy="82"
          rx="46"
          ry="20"
          fill="rgba(255,255,255,0.75)"
        />
        <ellipse
          cx="156"
          cy="74"
          rx="36"
          ry="18"
          fill="rgba(255,255,255,0.62)"
        />
        <ellipse
          cx="604"
          cy="98"
          rx="44"
          ry="18"
          fill="rgba(255,255,255,0.68)"
        />
        <ellipse
          cx="640"
          cy="90"
          rx="32"
          ry="14"
          fill="rgba(255,255,255,0.54)"
        />
      </g>

      <circle cx="592" cy="92" r="44" fill="rgba(255,209,109,0.65)" />

      <path
        d="M0 268 C90 210 150 214 236 254 C312 286 392 284 470 248 C552 210 640 214 760 278 V430 H0 Z"
        fill="url(#hillGradient)"
        opacity="0.52"
      />
      <path
        d="M0 320 C122 284 220 294 318 326 C426 360 548 344 760 300 V430 H0 Z"
        fill="url(#meadowGradient)"
      />
      <path
        d="M120 338 C212 310 292 316 376 346 C456 374 540 370 640 336"
        fill="none"
        stroke="rgba(252,239,213,0.72)"
        strokeLinecap="round"
        strokeWidth="18"
      />

      <g className={styles.grandmaFocus}>
        <ellipse
          cx="512"
          cy="242"
          rx="92"
          ry="118"
          fill="rgba(255,241,214,0.18)"
        />
        <ellipse
          className={`${styles.orbitTrail} ${styles.orbitTrailOuter}`}
          cx="522"
          cy="214"
          rx="58"
          ry="32"
          fill="none"
          stroke="rgba(255,255,255,0.42)"
          strokeDasharray="12 14"
          strokeWidth="4"
        />
        <ellipse
          className={`${styles.orbitTrail} ${styles.orbitTrailInner}`}
          cx="522"
          cy="214"
          rx="40"
          ry="22"
          fill="none"
          stroke="rgba(255, 235, 171, 0.32)"
          strokeDasharray="6 12"
          strokeWidth="3"
        />
      </g>

      <g className={styles.flowerBob}>
        <path
          d="M138 360 L138 388"
          stroke="#3d7d4d"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="138" cy="354" r="10" fill="#ff8fb5" />
        <circle cx="126" cy="354" r="7" fill="#ffd479" />
        <circle cx="149" cy="354" r="7" fill="#ffcfda" />

        <path
          d="M626 344 L626 384"
          stroke="#3d7d4d"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="626" cy="338" r="11" fill="#ff8fb5" />
        <circle cx="614" cy="338" r="7" fill="#ffd479" />
        <circle cx="638" cy="338" r="7" fill="#9bf1b7" />
      </g>

      <g className={styles.grandpaSway}>
        <circle cx="242" cy="176" r="24" fill="#ffe8cf" />
        <path
          d="M222 206 C212 240 214 282 222 320 L282 320 C286 282 284 236 266 204 Z"
          fill="#3c8355"
        />
        <path
          d="M238 224 C220 236 206 256 198 290"
          fill="none"
          stroke="#3c8355"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M266 222 C284 236 296 256 302 286"
          fill="none"
          stroke="#3c8355"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M238 320 L218 376"
          fill="none"
          stroke="#2f5f3d"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M268 320 L286 376"
          fill="none"
          stroke="#2f5f3d"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M308 230 L318 380"
          fill="none"
          stroke="#8e6541"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M300 214 C306 222 310 228 314 236"
          fill="none"
          stroke="#ffe8cf"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </g>

      <g className={styles.grandmaSway}>
        <circle cx="510" cy="166" r="24" fill="#ffe4d6" />
        <path
          d="M480 194 C468 246 470 296 456 338 H564 C550 292 548 242 540 194 Z"
          fill="#ff7f98"
        />
        <path
          d="M496 220 C472 234 456 252 446 292"
          fill="none"
          stroke="#ff7f98"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M532 218 C556 234 572 252 582 292"
          fill="none"
          stroke="#ff7f98"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M494 202 C506 212 520 214 534 202"
          fill="none"
          stroke="#fff0df"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M494 338 L476 384"
          fill="none"
          stroke="#74454e"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M528 338 L546 384"
          fill="none"
          stroke="#74454e"
          strokeWidth="13"
          strokeLinecap="round"
        />
      </g>

      <g transform="translate(522 214)">
        <g className={styles.butterflyOrbit}>
          <g transform="translate(46 -2)">
            <g className={styles.butterflyFloat}>
              <ellipse cx="-11" cy="0" rx="13" ry="18" fill="#ff8db8" />
              <ellipse cx="11" cy="0" rx="13" ry="18" fill="#ffd96d" />
              <ellipse cx="-8" cy="18" rx="10" ry="13" fill="#88efaa" />
              <ellipse cx="8" cy="18" rx="10" ry="13" fill="#ffd1e2" />
              <rect
                x="-2"
                y="-8"
                width="4"
                height="42"
                rx="99"
                fill="#2f5138"
              />
              <circle cx="-24" cy="12" r="4" fill="rgba(255,255,255,0.6)" />
              <circle cx="-34" cy="18" r="2.5" fill="rgba(255,231,168,0.55)" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

function ManagementStoryScene() {
  return (
    <svg
      className={`${styles.storyScene} ${styles.managementScene}`}
      viewBox="0 0 760 430"
      role="presentation"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="managementSkyGradient"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#fff8d6" />
          <stop offset="44%" stopColor="#fff1c6" />
          <stop offset="82%" stopColor="#d8f6c0" />
          <stop offset="100%" stopColor="#9cdb82" />
        </linearGradient>
        <linearGradient
          id="managementHorizonGradient"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="rgba(255, 234, 182, 0.9)" />
          <stop offset="100%" stopColor="rgba(255, 234, 182, 0)" />
        </linearGradient>
        <linearGradient
          id="managementSunGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#fff8d5" />
          <stop offset="38%" stopColor="#ffe98f" />
          <stop offset="100%" stopColor="#ffc65d" />
        </linearGradient>
        <linearGradient
          id="managementGroundBack"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#7dcc75" />
          <stop offset="100%" stopColor="#5d9f46" />
        </linearGradient>
        <linearGradient
          id="managementGroundFront"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#84d770" />
          <stop offset="100%" stopColor="#2f7e44" />
        </linearGradient>
        <radialGradient id="managementFigureGlow" cx="50%" cy="44%" r="42%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="48%" stopColor="rgba(255,248,210,0.44)" />
          <stop offset="100%" stopColor="rgba(255,248,210,0)" />
        </radialGradient>
      </defs>

      <rect
        x="0"
        y="0"
        width="760"
        height="430"
        rx="42"
        fill="url(#managementSkyGradient)"
      />

      <rect
        className={styles.managementHorizonGlow}
        x="0"
        y="116"
        width="760"
        height="180"
        fill="url(#managementHorizonGradient)"
      />

      <g className={styles.managementCloudDrift}>
        <ellipse
          cx="108"
          cy="92"
          rx="52"
          ry="19"
          fill="rgba(255,255,255,0.66)"
        />
        <ellipse
          cx="156"
          cy="84"
          rx="34"
          ry="16"
          fill="rgba(255,255,255,0.54)"
        />
        <ellipse
          cx="614"
          cy="116"
          rx="60"
          ry="22"
          fill="rgba(255,255,255,0.62)"
        />
        <ellipse
          cx="664"
          cy="104"
          rx="34"
          ry="14"
          fill="rgba(255,255,255,0.46)"
        />
      </g>

      <g className={styles.managementSunAura}>
        <circle cx="576" cy="96" r="94" fill="rgba(255, 235, 155, 0.24)" />
        <circle cx="576" cy="96" r="68" fill="rgba(255, 241, 194, 0.38)" />
      </g>

      <g className={styles.managementSunRays}>
        <line x1="576" y1="8" x2="576" y2="42" />
        <line x1="576" y1="150" x2="576" y2="184" />
        <line x1="488" y1="96" x2="522" y2="96" />
        <line x1="630" y1="96" x2="664" y2="96" />
        <line x1="516" y1="36" x2="540" y2="60" />
        <line x1="612" y1="132" x2="636" y2="156" />
        <line x1="516" y1="156" x2="540" y2="132" />
        <line x1="612" y1="60" x2="636" y2="36" />
      </g>

      <circle
        className={styles.managementSunCore}
        cx="576"
        cy="96"
        r="44"
        fill="url(#managementSunGradient)"
      />

      <g className={styles.managementSparkles}>
        <circle cx="466" cy="70" r="3.5" />
        <circle cx="434" cy="132" r="2.5" />
        <circle cx="340" cy="102" r="3" />
        <circle cx="286" cy="158" r="2.5" />
        <circle cx="626" cy="28" r="3.5" />
        <circle cx="666" cy="152" r="3" />
      </g>

      <path
        d="M0 248 C118 212 222 214 312 242 C418 274 560 268 760 198 V430 H0 Z"
        fill="url(#managementGroundBack)"
        opacity="0.88"
      />
      <path
        className={styles.managementGrassBack}
        d="M0 304 C86 280 194 280 294 314 C416 356 590 352 760 278 V430 H0 Z"
        fill="url(#managementGroundFront)"
      />
      <path
        className={styles.managementGrassFront}
        d="M0 338 C108 322 238 318 362 344 C514 376 660 374 760 338 V430 H0 Z"
        fill="#2e7f43"
      />

      <g className={styles.managementFigureDrift}>
        <ellipse
          cx="380"
          cy="244"
          rx="116"
          ry="136"
          fill="url(#managementFigureGlow)"
        />
        <ellipse
          cx="380"
          cy="276"
          rx="78"
          ry="38"
          fill="rgba(255,255,255,0.18)"
        />
        <g className={styles.managementFigure}>
          <circle
            cx="380"
            cy="154"
            r="28"
            fill="rgba(255,255,255,0.2)"
            stroke="rgba(255,255,255,0.72)"
            strokeWidth="4"
          />
          <path
            className={styles.managementFigureCore}
            d="M380 184 C356 210 348 248 352 286 C356 322 366 348 380 368 C394 348 404 322 408 286 C412 248 404 210 380 184 Z"
            fill="rgba(255,255,255,0.18)"
            stroke="rgba(255,255,255,0.82)"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            className={styles.managementFigureArmLeft}
            d="M370 214 C326 184 302 164 276 130"
            fill="none"
            stroke="rgba(255,255,255,0.84)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            className={styles.managementFigureArmRight}
            d="M390 214 C434 184 458 164 484 130"
            fill="none"
            stroke="rgba(255,255,255,0.84)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M370 366 L346 414"
            fill="none"
            stroke="rgba(255,255,255,0.76)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M390 366 L414 414"
            fill="none"
            stroke="rgba(255,255,255,0.76)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <circle
            className={styles.managementHeartGlow}
            cx="380"
            cy="248"
            r="14"
            fill="rgba(255,248,201,0.95)"
          />
        </g>
      </g>
    </svg>
  );
}

export default function LoginPageClient({
  initialEntryHost,
  initialManagementEntry,
  initialHost,
}: {
  initialEntryHost: string;
  initialManagementEntry: boolean;
  initialHost?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [wecomLoading, setWecomLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [requiresWecomBinding, setRequiresWecomBinding] = useState(false);
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [returningUserName, setReturningUserName] = useState("");
  const [wecomConfig, setWecomConfig] = useState<WecomConfig | null>(null);
  const [wecomBrowser, setWecomBrowser] = useState(false);
  const autoWecomLoginStartedRef = useRef(false);

  const defaultEntryPath = useMemo(
    () => resolveAuthenticatedEntryPath(initialHost),
    [initialHost],
  );
  const hasExplicitReturnPath = useMemo(
    () => Boolean(searchParams.get("next")),
    [searchParams],
  );
  const loginReturnPath = useMemo(
    () => resolveSafeReturnPath(searchParams.get("next"), defaultEntryPath),
    [defaultEntryPath, searchParams],
  );
  const brand = useMemo(
    () => (initialManagementEntry ? MANAGEMENT_SITE_BRAND : PUBLIC_SITE_BRAND),
    [initialManagementEntry],
  );
  const showWecomBindingModal =
    hasSavedSession && requiresWecomBinding && !showCredentialForm;

  function resolveReturnPathForUser(user: CurrentUser | null | undefined) {
    if (hasExplicitReturnPath) {
      return loginReturnPath;
    }

    return resolveAuthenticatedUserEntryPath(user, initialHost);
  }

  useEffect(() => {
    setWecomBrowser(isWecomBrowser());
  }, []);

  useEffect(() => {
    const token = getToken();
    const currentUser = getCurrentUser();

    if (!token || !currentUser) {
      if (token || currentUser) {
        clearAuth();
      }
      setHasSavedSession(false);
      setRequiresWecomBinding(false);
      setReturningUserName("");
      return;
    }

    setHasSavedSession(true);
    setRequiresWecomBinding(userNeedsWecomBinding(currentUser));
    setReturningUserName(displayUserName(currentUser));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWecomConfig() {
      try {
        const response = await fetchApi("/wecom/config");
        if (!response.ok) {
          return;
        }

        const config = (await response.json()) as WecomConfig;
        if (!cancelled) {
          setWecomConfig(config);
        }
      } catch {
        if (!cancelled) {
          setWecomConfig(null);
        }
      }
    }

    loadWecomConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state) {
      return;
    }

    let cancelled = false;

    async function loginWithWecomCode() {
      setWecomLoading(true);
      setError("");

      try {
        const expectedState = window.sessionStorage.getItem(
          WECOM_LOGIN_STATE_STORAGE_KEY,
        );
        const loginAction =
          window.sessionStorage.getItem(WECOM_LOGIN_ACTION_STORAGE_KEY) ===
          "bind"
            ? "bind"
            : "login";
        const storedReturnPath = window.sessionStorage.getItem(
          WECOM_LOGIN_RETURN_PATH_STORAGE_KEY,
        );
        const returnPath = resolveSafeReturnPath(
          storedReturnPath,
          resolveReturnPathForUser(null),
        );
        window.sessionStorage.removeItem(WECOM_LOGIN_STATE_STORAGE_KEY);
        window.sessionStorage.removeItem(WECOM_LOGIN_ACTION_STORAGE_KEY);
        window.sessionStorage.removeItem(WECOM_LOGIN_RETURN_PATH_STORAGE_KEY);
        const isLegacyLoginState =
          !expectedState &&
          loginAction === "login" &&
          state === WECOM_LEGACY_LOGIN_STATE;
        if (
          !isLegacyLoginState &&
          (!expectedState || expectedState !== state)
        ) {
          throw new Error("企业微信登录状态校验失败，请重新扫码登录");
        }

        if (loginAction === "bind") {
          if (!getToken()) {
            throw new Error("请先使用账号密码登录，再完成企业微信绑定");
          }

          const payload = await apiFetch<LoginAuthPayload>("/wecom/bind", {
            method: "POST",
            body: JSON.stringify({ code }),
          });
          setAuth(payload);
          if (!cancelled) {
            router.replace(
              hasExplicitReturnPath
                ? returnPath
                : resolveReturnPathForUser(payload.user),
            );
          }
          return;
        }

        const response = await fetchApi("/wecom/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }

        const payload = (await response.json()) as LoginAuthPayload;
        setAuth(payload);
        if (!cancelled) {
          router.replace(
            hasExplicitReturnPath
              ? returnPath
              : resolveReturnPathForUser(payload.user),
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "企业微信登录失败",
          );
        }
      } finally {
        if (!cancelled) {
          setWecomLoading(false);
        }
      }
    }

    loginWithWecomCode();

    return () => {
      cancelled = true;
    };
  }, [hasExplicitReturnPath, initialHost, loginReturnPath, router, searchParams]);

  function handleContinueIntoWorkspace() {
    router.replace(resolveReturnPathForUser(getCurrentUser()));
  }

  function handleSwitchAccount() {
    clearAuth();
    setHasSavedSession(false);
    setRequiresWecomBinding(false);
    setShowCredentialForm(true);
    setReturningUserName("");
    setUsername("");
    setPassword("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetchApi("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = (await response.json()) as LoginAuthPayload;
      setAuth(payload);

      if (userNeedsWecomBinding(payload.user)) {
        setHasSavedSession(true);
        setRequiresWecomBinding(true);
        setReturningUserName(displayUserName(payload.user));
        setShowCredentialForm(false);
        setPassword("");
        return;
      }

      router.replace(resolveReturnPathForUser(payload.user));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "登录失败",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleWecomLogin(action: WecomLoginAction = "login") {
    if (action === "bind" && (!getToken() || !getCurrentUser())) {
      setError("请先使用账号密码登录，再完成企业微信绑定");
      return;
    }

    if (!wecomConfig?.enabled || !wecomConfig.corpId || !wecomConfig.agentId) {
      setError("企业微信登录尚未配置完整");
      return;
    }

    setError("");
    setWecomLoading(true);

    try {
      window.location.assign(
        buildWecomLoginUrl(wecomConfig, action, {
          mode: wecomBrowser ? "oauth" : "qr",
          returnPath: hasExplicitReturnPath ? loginReturnPath : null,
        }),
      );
    } catch (requestError) {
      setWecomLoading(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "企业微信登录回调地址不可用",
      );
    }
  }

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (
      code ||
      state ||
      autoWecomLoginStartedRef.current ||
      !wecomBrowser ||
      hasSavedSession ||
      showCredentialForm ||
      wecomLoading ||
      loading
    ) {
      return;
    }

    if (!wecomConfig?.enabled || !wecomConfig.corpId || !wecomConfig.agentId) {
      return;
    }

    autoWecomLoginStartedRef.current = true;
    handleWecomLogin("login");
  }, [
    hasSavedSession,
    loading,
    searchParams,
    showCredentialForm,
    wecomBrowser,
    wecomConfig,
    wecomLoading,
  ]);

  return (
    <main
      className={`${styles.page} ${initialManagementEntry ? styles.pageManagement : ""}`}
    >
      <div className={styles.pageGlow} aria-hidden="true">
        <span className={`${styles.glow} ${styles.glowOne}`} />
        <span className={`${styles.glow} ${styles.glowTwo}`} />
        <span className={`${styles.glow} ${styles.glowThree}`} />
      </div>

      <div className={styles.shell}>
        <section
          className={`${styles.hero} ${
            initialManagementEntry ? styles.heroManagement : ""
          }`}
        >
          <div className={styles.heroCopy}>
            <p className={styles.companyName}>{brand.loginCompanyName}</p>
            <div className={styles.titleBlock}>
              <span className={styles.sloganLabel}>
                {brand.loginSloganLabel}
              </span>
              <h1 className={styles.heroTitle}>
                {brand.loginHeroTitleLines.map((line) => (
                  <span className={styles.heroTitleLine} key={line}>
                    {line}
                  </span>
                ))}
              </h1>
            </div>
            <p className={styles.heroLead}>{brand.loginHeroLead}</p>
          </div>

          <div className={styles.storyStage} aria-hidden="true">
            {initialManagementEntry ? (
              <ManagementStoryScene />
            ) : (
              <PublicStoryScene />
            )}
          </div>

          {initialManagementEntry ? (
            <div className={styles.managementFooter}>
              <span className={styles.managementFooterLabel}>
                {brand.organizationListLabel}
              </span>
              <p className={styles.managementFooterText}>
                {brand.organizationList.join("、")}
              </p>
            </div>
          ) : null}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <span className={styles.panelBadge}>{brand.loginPanelBadge}</span>
            <h2>{brand.loginPanelTitle}</h2>
            <p>
              从 <strong>{initialEntryHost}</strong>{" "}
              {brand.loginPanelDescription}
            </p>
          </div>

          {hasSavedSession && !showCredentialForm ? (
            <div className={styles.returningSessionCard}>
              <span className={styles.returningSessionEyebrow}>
                {requiresWecomBinding ? "需要绑定企业微信" : "欢迎回来"}
              </span>
              <h3 className={styles.returningSessionTitle}>
                {requiresWecomBinding
                  ? returningUserName
                    ? `${returningUserName}，完成企业微信绑定`
                    : "完成企业微信绑定"
                  : returningUserName
                    ? `${returningUserName}，继续进入今天的工作`
                    : "继续进入今天的工作"}
              </h3>
              <p className={styles.returningSessionDescription}>
                {requiresWecomBinding
                  ? wecomBrowser
                    ? "这个系统账号还没有绑定企业微信。请用本人企业微信完成授权绑定，之后就能进入协作空间。"
                    : "这个系统账号还没有绑定企业微信。请用本人企业微信扫码完成绑定，之后就能进入协作空间。"
                  : "这台设备上的登录仍在有效期内，你可以直接继续进入协作空间；如需更换账号，也可以重新登录。"}
              </p>

              {error ? (
                <div className={styles.errorMessage}>{error}</div>
              ) : null}

              <div className={styles.returningSessionActions}>
                {requiresWecomBinding ? (
                  <button
                    className={styles.wecomButton}
                    type="button"
                    onClick={() => handleWecomLogin("bind")}
                    disabled={wecomLoading || !wecomConfig?.enabled}
                  >
                    {!wecomConfig?.enabled
                      ? "企业微信入口未配置"
                      : wecomLoading
                        ? wecomBrowser
                          ? "正在打开授权..."
                          : "正在打开扫码..."
                        : wecomBrowser
                          ? "一键绑定企业微信"
                          : "扫码绑定企业微信"}
                  </button>
                ) : (
                  <button
                    className={styles.submitButton}
                    type="button"
                    onClick={handleContinueIntoWorkspace}
                  >
                    以利他之心进入工作
                  </button>
                )}
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={handleSwitchAccount}
                >
                  重新登录其他账号
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.loginStack}>
              {wecomConfig?.enabled ? (
                <button
                  className={styles.wecomButton}
                  type="button"
                  onClick={() => handleWecomLogin("login")}
                  disabled={wecomLoading || loading}
                >
                  {wecomLoading
                    ? "企业微信登录中..."
                    : wecomBrowser
                      ? "企业微信一键登录"
                      : "企业微信扫码登录"}
                </button>
              ) : null}

              <div className={styles.loginDivider}>
                <span>或使用账号密码</span>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.field} htmlFor="username">
                  <span>用户名</span>
                  <input
                    id="username"
                    className={styles.input}
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="请输入用户名"
                  />
                </label>

                <label className={styles.field} htmlFor="password">
                  <span>密码</span>
                  <input
                    id="password"
                    className={styles.input}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="请输入密码"
                  />
                </label>

                {error ? (
                  <div className={styles.errorMessage}>{error}</div>
                ) : null}

                <button
                  className={styles.submitButton}
                  type="submit"
                  disabled={loading || wecomLoading}
                >
                  {loading ? "登录中..." : brand.loginButtonLabel}
                </button>
              </form>
            </div>
          )}

          <p className={styles.panelFooter}>{brand.loginFooter}</p>
        </section>
      </div>

      {showWecomBindingModal ? (
        <div
          className={styles.wecomBindOverlay}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.wecomBindModal}>
            <span className={styles.wecomBindBadge}>企业微信绑定</span>
            <div className={styles.wecomBindHeading}>
              <h3>请绑定本人企业微信</h3>
              <p>
                {returningUserName || "当前账号"}{" "}
                已通过密码验证。首次进入系统前，请
                {wecomBrowser ? "完成企业微信授权绑定" : "扫码完成企业微信绑定"}
                。
              </p>
            </div>

            {error ? <div className={styles.errorMessage}>{error}</div> : null}

            <div className={styles.wecomBindActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={handleSwitchAccount}
              >
                更换账号
              </button>
              <button
                className={styles.wecomButton}
                type="button"
                onClick={() => handleWecomLogin("bind")}
                disabled={wecomLoading || !wecomConfig?.enabled}
              >
                {!wecomConfig?.enabled
                  ? "企业微信入口未配置"
                  : wecomLoading
                    ? wecomBrowser
                      ? "正在打开授权..."
                      : "正在打开扫码..."
                    : wecomBrowser
                      ? "一键绑定企业微信"
                      : "扫码绑定企业微信"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

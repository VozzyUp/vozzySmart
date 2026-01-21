'use client';

import { useEffect, useState, ReactNode } from 'react';
import Script from 'next/script';
import { TelegramSDKProvider, useTelegramSDK } from '@/components/telegram/TelegramSDKProvider';
import { usePathname, useRouter } from 'next/navigation';

// =============================================================================
// INNER LAYOUT (dentro do Provider)
// =============================================================================

function TelegramLayoutInner({ children }: { children: ReactNode }) {
  const { isReady, isMock, user, isLinked, isDark } = useTelegramSDK();
  const pathname = usePathname();
  const router = useRouter();

  // Redirecionar para página de link se não estiver vinculado
  useEffect(() => {
    if (!isReady) return;

    const isLinkPage = pathname === '/tg/link';

    if (!isLinked && !isLinkPage) {
      router.replace('/tg/link');
    } else if (isLinked && isLinkPage) {
      router.replace('/tg');
    }
  }, [isReady, isLinked, pathname, router]);

  // Loading state
  if (!isReady) {
    return (
      <div className="min-h-screen bg-[var(--tg-theme-bg-color)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--tg-theme-button-color)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--tg-theme-hint-color)] text-sm">
            Carregando SmartZap...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)]">
      {/* Mock indicator */}
      {isMock && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-black text-xs text-center py-1 font-medium">
          🤖 MODO SIMULADOR • {user?.firstName} • {isDark ? 'Dark' : 'Light'}
        </div>
      )}

      {/* Content with padding for mock indicator */}
      <div className={isMock ? 'pt-6' : ''}>
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN LAYOUT
// =============================================================================

export default function TelegramLayout({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  // Evitar hydration mismatch e aguardar script do Telegram
  useEffect(() => {
    setMounted(true);

    // Função para verificar se o SDK está disponível
    const checkTelegramSDK = () => {
      if (typeof window !== 'undefined') {
        // Se window.Telegram existe, o script carregou
        if (window.Telegram?.WebApp) {
          console.log('📱 Telegram WebApp SDK detected');
          setSdkReady(true);
          return true;
        }
      }
      return false;
    };

    // Verificar imediatamente
    if (checkTelegramSDK()) return;

    // Polling para verificar quando o script carregar (max 3 segundos)
    let attempts = 0;
    const maxAttempts = 30; // 30 * 100ms = 3 segundos
    const interval = setInterval(() => {
      attempts++;
      if (checkTelegramSDK() || attempts >= maxAttempts) {
        clearInterval(interval);
        if (attempts >= maxAttempts) {
          console.log('⚠️ Telegram SDK not found, using mock mode');
          setSdkReady(true); // Continua em mock mode
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Carregar Eruda em dev para debug
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('eruda').then((eruda) => {
        eruda.default.init();
        console.log('🔧 Eruda debug console loaded');
      }).catch(() => {
        // Eruda não instalado, ignorar
      });
    }
  }, []);

  if (!mounted || !sdkReady) {
    return (
      <>
        {/* Script oficial do Telegram - carrega no head */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400 text-sm">Conectando ao Telegram...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Script oficial do Telegram - mantém aqui também para garantir */}
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <TelegramSDKProvider>
        <TelegramLayoutInner>{children}</TelegramLayoutInner>
      </TelegramSDKProvider>
    </>
  );
}

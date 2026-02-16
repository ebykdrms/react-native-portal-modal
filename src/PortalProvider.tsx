import { createContext, useCallback, useMemo, useState } from 'react';
import type { FC, PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

// Host'a taşınan portal içeriklerini key bazlı saklarız.
// Örn: { 1: <ModalA />, 2: <ModalB /> }
type PortalRegistry = Record<number, ReactNode>;

type PortalContextType = {
  // Yeni bir portal içeriği ekler
  mount: (key: number, node: ReactNode) => void;
  // Var olan portal içeriğini günceller
  update: (key: number, node: ReactNode) => void;
  // Portal içeriğini host'tan kaldırır
  unmount: (key: number) => void;
};

// Portal API'si bu context ile uygulamanın her yerinden erişilebilir.
export const PortalContext = createContext<PortalContextType | null>(null);

export const PortalProvider: FC<PropsWithChildren> = ({ children }) => {
  // Aktif tüm portal node'ları burada tutulur.
  const [portals, setPortals] = useState<PortalRegistry>({});

  const mount = useCallback((key: number, node: ReactNode) => {
    // Yeni node eklenir veya aynı key üstüne yazılır.
    setPortals((prev) => ({ ...prev, [key]: node }));
  }, []);

  const update = useCallback((key: number, node: ReactNode) => {
    setPortals((prev) => {
      // Aynı referans ise gereksiz state güncellemesini engelle.
      if (prev[key] === node) {
        return prev;
      }
      return { ...prev, [key]: node };
    });
  }, []);

  const unmount = useCallback((key: number) => {
    setPortals((prev) => {
      // İlgili key'i silip kalanları koru.
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Context value'nun her render'da yeni obje olmasını engeller.
  const contextValue = useMemo(
    () => ({ mount, update, unmount }),
    [mount, update, unmount]
  );

  return (
    <PortalContext.Provider value={contextValue}>
      {/* Normal uygulama ağacı */}
      {children}

      {/*
        Portal Host Katmanı:
        - Bu katman ekranın en üstünde absolute konumda durur.
        - Portal ile mount edilen tüm içerikler burada render edilir.
      */}
      <View pointerEvents="box-none" style={styles.host}>
        {Object.keys(portals).map((key) => (
          // Her portal item tam ekran absolute container içinde render edilir.
          <View key={key} style={styles.item}>
            {portals[Number(key)]}
          </View>
        ))}
      </View>
    </PortalContext.Provider>
  );
};

const styles = StyleSheet.create({
  host: {
    // Tüm ekranı kaplayan en üst katman
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    pointerEvents: 'box-none',
  },
  item: {
    // Her portal içeriği host içinde tam ekran yer kaplar.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

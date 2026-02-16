import { useContext, useEffect, useRef } from 'react';
import type { FC, ReactNode } from 'react';
import { PortalContext } from './PortalProvider';

type PortalProps = {
  // Portal içine yazılan içerik (ör: modal JSX'i)
  children: ReactNode;
};

// Her Portal örneğine benzersiz bir key üretmek için sayaç.
// Provider tarafında mount/update/unmount işlemleri bu key ile eşleşir.
let portalKeyCounter = 0;

const createPortalKey = () => {
  portalKeyCounter += 1;
  return portalKeyCounter;
};

const Portal: FC<PortalProps> = ({ children }) => {
  // PortalProvider'ın sunduğu mount/update/unmount API'sine erişiyoruz.
  const portal = useContext(PortalContext);

  // Key'i component ömrü boyunca sabit tutmak için ref kullanıyoruz.
  // Böylece her render'da farklı key oluşmaz.
  const keyRef = useRef<number>(createPortalKey());

  // İlk mount anında en güncel children'ı garanti etmek için ayrı ref tutuyoruz.
  const latestChildrenRef = useRef<ReactNode>(children);
  latestChildrenRef.current = children;

  useEffect(() => {
    // Provider yoksa (örn. test ortamı) sessizce çık.
    if (!portal) return;

    const key = keyRef.current;

    // Portal node'unu host katmanına ekle.
    portal.mount(key, latestChildrenRef.current);

    // Component unmount olduğunda host'tan kaldır.
    return () => {
      portal.unmount(key);
    };
  }, [portal]);

  useEffect(() => {
    if (!portal) return;

    // children değiştiğinde aynı key ile host içeriğini güncelle.
    portal.update(keyRef.current, children);
  }, [children, portal]);

  // Portal component'i kendi bulunduğu yerde UI çizmez;
  // içerik provider içindeki host'a taşınır.
  return null;
};

export default Portal;

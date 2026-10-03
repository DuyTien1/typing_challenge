import { useState, useEffect, useCallback } from 'react';
import { HeavenlyDaoDecree } from '../types';
import { subscribeToDaoDecrees } from '../utils/heavenlyDaoBot';
import { soundFx } from '../utils/audio';

export function useDaoDecree() {
  const [decrees, setDecrees] = useState<HeavenlyDaoDecree[]>([]);
  const [activeDaoDecreePopup, setActiveDaoDecreePopup] = useState<HeavenlyDaoDecree | null>(null);
  const [isChronicleOpen, setIsChronicleOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToDaoDecrees((newDecree) => {
      setDecrees((prev) => {
        if (prev.some((d) => d.id === newDecree.id)) return prev;
        return [newDecree, ...prev].slice(0, 100);
      });

      // Show high priority popup for penalties, breakthrough, or records
      if (newDecree.eventType === 'penalty' || newDecree.eventType === 'record' || newDecree.eventType === 'breakthrough') {
        setActiveDaoDecreePopup(newDecree);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const openChronicle = useCallback(() => {
    soundFx.playKeyClick();
    setIsChronicleOpen(true);
  }, []);

  const closeChronicle = useCallback(() => {
    soundFx.playKeyClick();
    setIsChronicleOpen(false);
  }, []);

  const dismissPopup = useCallback(() => {
    setActiveDaoDecreePopup(null);
  }, []);

  return {
    decrees,
    setDecrees,
    activeDaoDecreePopup,
    setActiveDaoDecreePopup,
    isChronicleOpen,
    setIsChronicleOpen,
    openChronicle,
    closeChronicle,
    dismissPopup,
  };
}

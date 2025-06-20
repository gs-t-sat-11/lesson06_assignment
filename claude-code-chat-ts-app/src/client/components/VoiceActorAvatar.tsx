import React, { useEffect, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import type { NijivoiceActor } from '@shared/types';
import styles from './VoiceActorAvatar.module.css';

interface VoiceActorAvatarProps {
  size?: 'small' | 'large';
  className?: string;
}

export const VoiceActorAvatar: React.FC<VoiceActorAvatarProps> = ({ 
  size = 'small',
  className = '' 
}) => {
  const { settings } = useSettings();
  const [selectedActor, setSelectedActor] = useState<NijivoiceActor | null>(null);

  useEffect(() => {
    if (settings.nijivoiceActorId) {
      const storageKey = 'claude-code-chat-voice-actors';
      const cached = localStorage.getItem(storageKey);
      
      if (cached) {
        try {
          const data = JSON.parse(cached);
          const actors = data.actors || [];
          const actor = actors.find((a: NijivoiceActor) => a.id === settings.nijivoiceActorId);
          if (actor) {
            setSelectedActor(actor);
          }
        } catch (error) {
          console.error('Failed to parse cached voice actors:', error);
        }
      }
    } else {
      setSelectedActor(null);
    }
  }, [settings.nijivoiceActorId]);

  if (!selectedActor) {
    return null;
  }

  const imageUrl = selectedActor.smallImageUrl || selectedActor.pictureUrl || selectedActor.picture_url || '';

  return (
    <div className={`${styles.container} ${styles[size]} ${className}`}>
      <img 
        src={imageUrl} 
        alt={selectedActor.name}
        className={styles.image}
      />
      {size === 'large' && (
        <div className={styles.info}>
          <div className={styles.name}>{selectedActor.name}</div>
          {selectedActor.styles && selectedActor.styles.length > 0 && (
            <div className={styles.style}>{selectedActor.styles[0].name}</div>
          )}
        </div>
      )}
    </div>
  );
};
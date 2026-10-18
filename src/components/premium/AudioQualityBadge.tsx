/**
 * Sheba Sound — Audio Quality Badge
 * -----------------------------------
 * Displays the current streaming quality tier (HQ or Standard)
 * as a small badge/chip in the player UI.
 */

import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import HdIcon from '@mui/icons-material/Hd';

interface AudioQualityBadgeProps {
  quality: 'high' | 'standard';
  size?: 'small' | 'medium';
}

const AudioQualityBadge: React.FC<AudioQualityBadgeProps> = ({
  quality,
  size = 'small',
}) => {
  const isHQ = quality === 'high';

  return (
    <Tooltip
      title={
        isHQ
          ? 'High Quality (320kbps) — Premium'
          : 'Standard Quality (128kbps)'
      }
      arrow
    >
      <Chip
        icon={isHQ ? <HdIcon sx={{ fontSize: 14 }} /> : undefined}
        label={isHQ ? 'HQ' : 'SD'}
        size={size}
        sx={{
          height: size === 'small' ? 18 : 22,
          fontSize: size === 'small' ? '0.6rem' : '0.7rem',
          fontWeight: 800,
          letterSpacing: '0.05em',
          bgcolor: isHQ
            ? 'rgba(243,156,18,0.2)'
            : (t) =>
                t.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.06)',
          color: isHQ ? '#F39C12' : 'text.disabled',
          border: isHQ ? '1px solid rgba(243,156,18,0.4)' : 'none',
          '& .MuiChip-icon': {
            color: '#F39C12',
            ml: 0.3,
          },
          '& .MuiChip-label': {
            px: 0.6,
          },
        }}
      />
    </Tooltip>
  );
};

export default AudioQualityBadge;

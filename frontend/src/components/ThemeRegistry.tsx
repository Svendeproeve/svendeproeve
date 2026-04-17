'use client';

import * as React from 'react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider, alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import theme from '@/theme';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [cache] = React.useState(() => {
    const cache = createCache({ key: 'mui' });
    cache.compat = true;
    return cache;
  });

  useServerInsertedHTML(() => {
    const styles = Object.values(cache.inserted)
      .filter((style) => typeof style === 'string')
      .join('');

    if (!styles) return null;

    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${Object.keys(cache.inserted).join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={themeArg => ({
            '*': {
              scrollbarWidth: 'thin',
              scrollbarColor: `${alpha(themeArg.palette.common.white, 0.22)} transparent`,
            },
            '*::-webkit-scrollbar': {
              width: 8,
              height: 8,
            },
            '*::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '*::-webkit-scrollbar-thumb': {
              backgroundColor: alpha(themeArg.palette.common.white, 0.18),
              borderRadius: 999,
              border: '2px solid transparent',
              backgroundClip: 'padding-box',
            },
            '*::-webkit-scrollbar-thumb:hover': {
              backgroundColor: alpha(themeArg.palette.common.white, 0.3),
            },
          })}
        />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}

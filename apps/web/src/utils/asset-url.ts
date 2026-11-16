/**
 * Normalizes asset paths (including OKF relative paths like `./assets/covers/foo.png`
 * or `../assets/images/bar.png`) into server-resolvable URLs (`/api/assets/by-path/...`).
 */
export function resolveMindAssetUrl(rawUrl: string | undefined | null): string {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return '';

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/api/')
  ) {
    return trimmed;
  }

  // Strip leading ./ or ../ segments from relative OKF bundle paths
  const normalized = trimmed.replace(/^(\.\.?\/)+/, '').replace(/^\/+/, '');
  if (normalized.startsWith('assets/')) {
    return `/api/assets/by-path/${normalized}`;
  }

  return trimmed;
}

export interface CoverPreset {
  id: string;
  label: string;
  background: string;
}

/**
 * Curated Mind Light pastel & calm gradient/solid presets (no dark-blue AI tones).
 */
export const MIND_COVER_PRESETS: CoverPreset[] = [
  {
    id: 'preset:sky',
    label: 'Céu Sereno',
    background: 'linear-gradient(135deg, #d0ebff 0%, #e7f5ff 55%, #f3f0ff 100%)',
  },
  {
    id: 'preset:sage',
    label: 'Sálvia',
    background: 'linear-gradient(135deg, #d3f9d8 0%, #ebfbee 60%, #e6fcf5 100%)',
  },
  {
    id: 'preset:warm',
    label: 'Areia Quente',
    background: 'linear-gradient(135deg, #ffe8cc 0%, #fff4e6 55%, #fff9db 100%)',
  },
  {
    id: 'preset:rose',
    label: 'Quartzo',
    background: 'linear-gradient(135deg, #ffdeeb 0%, #fff0f6 60%, #f8f0fc 100%)',
  },
  {
    id: 'preset:lavender',
    label: 'Lavanda',
    background: 'linear-gradient(135deg, #e5dbff 0%, #f3f0ff 60%, #edf2ff 100%)',
  },
  {
    id: 'preset:stone',
    label: 'Papel Neutro',
    background: 'linear-gradient(135deg, #e9ecef 0%, #f1f3f5 55%, #f8f9fa 100%)',
  },
];

export function resolveCoverVisual(
  coverUrl: string | undefined | null,
): { kind: 'none' | 'css' | 'image'; value: string } {
  const trimmed = (coverUrl ?? '').trim();
  if (!trimmed) {
    return { kind: 'none', value: '' };
  }

  const preset = MIND_COVER_PRESETS.find((item) => item.id === trimmed);
  if (preset) {
    return { kind: 'css', value: preset.background };
  }

  if (
    trimmed.startsWith('linear-gradient(') ||
    trimmed.startsWith('radial-gradient(') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('rgb(') ||
    trimmed.startsWith('rgba(')
  ) {
    return { kind: 'css', value: trimmed };
  }

  return { kind: 'image', value: resolveMindAssetUrl(trimmed) };
}
